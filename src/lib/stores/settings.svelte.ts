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

const state = $state<{ value: SettingsState; pristine: PristineMap | null }>({
	value: { status: 'loading' },
	pristine: null
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
	const map: PristineMap = new Map();
	for (const k of Object.keys(s) as (keyof Settings)[]) {
		map.set(k, fieldKey(s, k));
	}
	return map;
};

const computeDirtyKeys = (current: Settings, pristine: PristineMap): Set<keyof Settings> => {
	const out = new Set<keyof Settings>();
	// Iterate the *current* keys: a brand-new field added by the firmware
	// after the snapshot would otherwise read as "missing" and false-positive
	// dirty if iterated from pristine. The pristine map covers the baseline.
	for (const k of Object.keys(current) as (keyof Settings)[]) {
		const fresh = fieldKey(current, k);
		if (pristine.get(k) !== fresh) out.add(k);
	}
	// timePerScreen is derived from timerSeconds — never report it on its own.
	out.delete('timePerScreen');
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
		if (state.value.status !== 'ready' || state.pristine === null) return new Set();
		return computeDirtyKeys(state.value.data, state.pristine);
	},
	get isDirty(): boolean {
		return this.dirtyKeys.size > 0;
	},
	isFieldDirty(key: keyof Settings): boolean {
		return this.dirtyKeys.has(key);
	},
	async load(): Promise<void> {
		try {
			const raw = await getSettings();
			const data = deriveTimePerScreen(raw);
			state.value = { status: 'ready', data };
			state.pristine = buildPristine(data);
		} catch (err) {
			state.value = { status: 'error', error: (err as Error).message };
			state.pristine = null;
		}
	},
	async save(patch: Partial<Settings>): Promise<ApiResult<SettingsErrorBody>> {
		const res = await patchSettings(patch);
		if (state.value.status === 'ready') {
			const data = deriveTimePerScreen({ ...state.value.data, ...patch });
			state.value = { status: 'ready', data };
			// The device accepted the PATCH, so the new working copy becomes
			// the pristine baseline. A failed save leaves the form dirty so
			// the user can retry or reset.
			if (res.ok) state.pristine = buildPristine(data);
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
