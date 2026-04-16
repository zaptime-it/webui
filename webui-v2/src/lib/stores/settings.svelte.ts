/**
 * Rune-based settings store. Replaces the old `writable<PartialSettings>` +
 * `settings.isLoaded` sentinel with a discriminated union (`SettingsState`)
 * that TypeScript can narrow, so sections stop sprinkling
 * `if (!$settings.isLoaded) …` guards.
 */

import { getSettings, patchSettings } from '$lib/api/client';
import type { Settings, SettingsState } from '$lib/types/settings';

const state = $state<{ value: SettingsState }>({ value: { status: 'loading' } });

const derived = $derived.by(() => state.value);

const deriveTimePerScreen = (s: Settings): Settings => ({
	...s,
	timePerScreen: Math.floor(s.timerSeconds / 60)
});

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
	async load(): Promise<void> {
		try {
			const raw = await getSettings();
			state.value = { status: 'ready', data: deriveTimePerScreen(raw) };
		} catch (err) {
			state.value = { status: 'error', error: (err as Error).message };
		}
	},
	async save(patch: Partial<Settings>): Promise<Response> {
		const res = await patchSettings(patch);
		if (state.value.status === 'ready') {
			state.value = {
				status: 'ready',
				data: deriveTimePerScreen({ ...state.value.data, ...patch })
			};
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
