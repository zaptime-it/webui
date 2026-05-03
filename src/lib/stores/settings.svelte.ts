/**
 * Rune-based settings store. Replaces the old `writable<PartialSettings>` +
 * `settings.isLoaded` sentinel with a discriminated union (`SettingsState`)
 * that TypeScript can narrow, so sections stop sprinkling
 * `if (!$settings.isLoaded) …` guards.
 *
 * Dirty tracking is per-field: each top-level key is compared against the
 * pristine baseline on demand. `dirtyKeys` is the Set of keys that differ
 * (so `isDirty` is just `dirtyKeys.size > 0`), and callers can test
 * individual keys via `isFieldDirty('foo')` — useful for per-field
 * "requires restart" warnings and the upcoming form-level validation
 * summary, which both need to know exactly *which* fields changed.
 */

import { getSettings, patchSettings } from '$lib/api/client';
import type { ApiResult, SettingsErrorBody } from '$lib/api/client';
import type { Settings, SettingsState } from '$lib/types/settings';

type PristineMap = Map<keyof Settings, string>;

const state = $state<{
	value: SettingsState;
	pristine: PristineMap | null;
	// Set by checkRemoteDrift() when the device's current /api/settings
	// disagrees with our pristine baseline (another tab saved, firmware
	// rebooted with reset settings, factory reset). Cleared on the next
	// successful load() or save().
	hasRemoteDrift: boolean;
	// Set when a PATCH response carried `rebootRequired: true` (the patch
	// staged a boot-only field; live system still runs the old value
	// until a reboot). Sticky — subsequent runtime-only patches don't
	// clear it because the earlier boot-only change is still pending.
	// Cleared on restartClock() success, dismiss, or full page reload.
	hasPendingReboot: boolean;
}>({
	value: { status: 'loading' },
	pristine: null,
	hasRemoteDrift: false,
	hasPendingReboot: false
});

const derived = $derived.by(() => state.value);

const deriveTimePerScreen = (s: Settings): Settings => ({
	...s,
	timePerScreen: Math.floor(s.timerSeconds / 60)
});

// One JSON.stringify per top-level field. For primitives this is a single
// `${value}`-equivalent; for `screens` and `dnd` it serialises the nested
// object/array so reorders + nested edits are caught. Cheaper than
// stringifying the whole Settings on every read because we only re-encode
// the *current* field when computing the diff for it.
const fieldKey = (s: Settings, k: keyof Settings): string => {
	const v = s[k];
	return typeof v === 'object' ? JSON.stringify(v) : String(v);
};

const buildPristine = (s: Settings): PristineMap => {
	// Plain Map is correct here — pristine is replaced wholesale by load() /
	// save(); we never mutate it in place from a reactive context, so the
	// SvelteMap reactivity is unnecessary overhead.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const map: PristineMap = new Map();
	for (const k of Object.keys(s) as (keyof Settings)[]) {
		map.set(k, fieldKey(s, k));
	}
	return map;
};

const computeDirtyKeys = (current: Settings, pristine: PristineMap): Set<keyof Settings> => {
	// Plain Set: this is a fresh result computed on every getter read.
	// Callers consume it by iteration / `.has()`; nothing observes
	// per-element changes, so SvelteSet would just add a notification
	// frame for every `.add` we do here.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const out = new Set<keyof Settings>();
	// Iterate the *current* keys: a brand-new field added by the firmware
	// after the snapshot would otherwise read as "missing" and false-positive
	// dirty if iterated from pristine. The pristine map covers the baseline.
	for (const k of Object.keys(current) as (keyof Settings)[]) {
		const fresh = fieldKey(current, k);
		if (pristine.get(k) !== fresh) out.add(k);
	}
	return out;
};

export const settingsStore = {
	get state() {
		return derived;
	},
	get data(): Settings | null {
		return state.value.status === 'ready' ? state.value.data : null;
	},
	get isReady(): boolean {
		return state.value.status === 'ready';
	},
	get dirtyKeys(): Set<keyof Settings> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		if (state.value.status !== 'ready' || state.pristine === null) return new Set();
		return computeDirtyKeys(state.value.data, state.pristine);
	},
	get isDirty(): boolean {
		return this.dirtyKeys.size > 0;
	},
	isFieldDirty(key: keyof Settings): boolean {
		return this.dirtyKeys.has(key);
	},
	/**
	 * Best-effort detection that another tab (or the device itself) has
	 * mutated settings since we last loaded. The firmware doesn't expose
	 * a version field, so we re-fetch and compare against pristine: any
	 * differing key means the baseline is stale. Returns true when drift
	 * is detected; sets `hasRemoteDrift` so the UI can surface a banner.
	 *
	 * Note: this is a heuristic, not a CAS — two tabs racing identical
	 * edits will not collide. A real fix needs a firmware-side version /
	 * If-Match-style PATCH guard. Until then, focus-based revalidation
	 * catches the common "I forgot a tab was open" case.
	 */
	async checkRemoteDrift(): Promise<boolean> {
		if (state.value.status !== 'ready' || state.pristine === null) return false;
		try {
			const fresh = deriveTimePerScreen(await getSettings());
			const stale = computeDirtyKeys(fresh, state.pristine);
			// Drop derived keys + any keys the user has actively edited locally
			// (those are *expected* to differ; reporting them as drift would
			// false-alarm on every dirty form).
			const localDirty = computeDirtyKeys(state.value.data, state.pristine);
			for (const k of localDirty) stale.delete(k);
			state.hasRemoteDrift = stale.size > 0;
			return state.hasRemoteDrift;
		} catch {
			return false;
		}
	},
	get hasRemoteDrift(): boolean {
		return state.hasRemoteDrift;
	},
	dismissRemoteDrift() {
		state.hasRemoteDrift = false;
	},
	get hasPendingReboot(): boolean {
		return state.hasPendingReboot;
	},
	clearPendingReboot() {
		state.hasPendingReboot = false;
	},
	async load(): Promise<void> {
		try {
			const raw = await getSettings();
			const data = deriveTimePerScreen(raw);
			state.value = { status: 'ready', data };
			state.pristine = buildPristine(data);
			state.hasRemoteDrift = false;
		} catch (err) {
			console.error('[settingsStore] failed to load /api/settings:', err);
			state.value = { status: 'error', error: (err as Error).message };
			state.pristine = null;
			state.hasRemoteDrift = false;
		}
	},
	async save(patch: Partial<Settings>): Promise<ApiResult<SettingsErrorBody>> {
		// Snapshot the working copy as it was at submit time so the new
		// pristine reflects what the device actually accepted, not edits
		// the user made while the PATCH was in flight. We do NOT replace
		// state.value.data — that would clobber those mid-flight edits.
		const submitSnapshot =
			state.value.status === 'ready' ? deriveTimePerScreen({ ...state.value.data }) : null;
		const res = await patchSettings(patch);
		if (res.ok && submitSnapshot) {
			state.pristine = buildPristine(submitSnapshot);
			state.hasRemoteDrift = false;
			if (res.body?.rebootRequired) state.hasPendingReboot = true;
		}
		return res;
	},
	update(patch: Partial<Settings>): void {
		if (state.value.status !== 'ready') return;
		state.value = {
			status: 'ready',
			data: deriveTimePerScreen({ ...state.value.data, ...patch })
		};
	},
	/** Mutates a single field by path, used by `<Field bind:value>` helpers. */
	set<K extends keyof Settings>(key: K, value: Settings[K]): void {
		if (state.value.status !== 'ready') return;
		state.value = {
			status: 'ready',
			data: deriveTimePerScreen({ ...state.value.data, [key]: value })
		};
	}
};
