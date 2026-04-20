/**
 * Rune-based settings store. Replaces the old `writable<PartialSettings>` +
 * `settings.isLoaded` sentinel with a discriminated union (`SettingsState`)
 * that TypeScript can narrow, so sections stop sprinkling
 * `if (!$settings.isLoaded) …` guards.
 */

import { getSettings, patchSettings } from '$lib/api/client';
import type { Settings, SettingsState } from '$lib/types/settings';

const state = $state<{ value: SettingsState; pristine: string | null }>({
	value: { status: 'loading' },
	pristine: null
});

const derived = $derived.by(() => state.value);

const deriveTimePerScreen = (s: Settings): Settings => ({
	...s,
	timePerScreen: Math.floor(s.timerSeconds / 60)
});

// The pristine snapshot is stored as a JSON string so `isDirty` becomes a
// single `stringify(current) !== pristine` comparison. Settings is a fixed
// ~100-field object, so the serialisation cost is sub-millisecond and gets
// cached by Svelte's derived machinery. Using JSON stringify over a deep
// object compare also means array reorders (screens, actCurrencies) flag
// dirty automatically without any field-aware comparison logic.
const snapshot = (s: Settings): string => JSON.stringify(s);

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
	get isDirty(): boolean {
		if (state.value.status !== 'ready' || state.pristine === null) return false;
		return snapshot(state.value.data) !== state.pristine;
	},
	async load(): Promise<void> {
		try {
			const raw = await getSettings();
			const data = deriveTimePerScreen(raw);
			state.value = { status: 'ready', data };
			state.pristine = snapshot(data);
		} catch (err) {
			state.value = { status: 'error', error: (err as Error).message };
			state.pristine = null;
		}
	},
	async save(patch: Partial<Settings>): Promise<Response> {
		const res = await patchSettings(patch);
		if (state.value.status === 'ready') {
			const data = deriveTimePerScreen({ ...state.value.data, ...patch });
			state.value = { status: 'ready', data };
			// The device accepted the PATCH, so the new working copy becomes
			// the pristine baseline. A failed save leaves the form dirty so
			// the user can retry or reset.
			if (res.ok) state.pristine = snapshot(data);
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
