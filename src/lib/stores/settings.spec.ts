/**
 * isDirty tracks whether the working settings differ from the pristine
 * snapshot established on the last successful load or save. The form
 * surfaces this to gate the Save button and show an "Unsaved changes"
 * indicator. These tests lock the state transitions in place because
 * getting any of them wrong (dirty-after-load, clean-after-failed-save,
 * dirty-lost-on-reset) is the kind of UX regression that slips past
 * casual manual QA — the indicator still renders, it just lies.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Settings } from './../types/settings';

const sampleSettings = (): Settings =>
	({
		numScreens: 7,
		timerSeconds: 1800,
		timerRunning: true,
		dataSource: 0,
		screens: [
			{ id: 0, name: 'Block Height', enabled: true, order: 0 },
			{ id: 3, name: 'Time', enabled: true, order: 1 }
		],
		actCurrencies: ['USD', 'EUR'],
		availableCurrencies: ['USD', 'EUR', 'JPY'],
		stealFocus: false,
		dnd: {
			enabled: false,
			dndTimeEnabled: false,
			startHour: 22,
			startMinute: 0,
			endHour: 8,
			endMinute: 0
		}
		// Cast-to-any is fine — the full Settings shape has ~100 fields and
		// the store only stringify-compares whatever is present.
	}) as unknown as Settings;

const getSettingsMock = vi.fn();
const patchSettingsMock = vi.fn();

vi.mock('$lib/api/client', () => ({
	getSettings: (...args: unknown[]) => getSettingsMock(...args),
	patchSettings: (...args: unknown[]) => patchSettingsMock(...args)
}));

const loadStore = async () => {
	const { settingsStore } = await import('./settings.svelte');
	return settingsStore;
};

describe('settingsStore.isDirty', () => {
	beforeEach(() => {
		vi.resetModules();
		getSettingsMock.mockReset();
		patchSettingsMock.mockReset();
	});

	test('starts clean before any load', async () => {
		const store = await loadStore();
		expect(store.isDirty).toBe(false);
	});

	test('is clean immediately after a successful load', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		expect(store.isDirty).toBe(false);
	});

	test('flips to dirty when a field is mutated via the store', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		expect(store.isDirty).toBe(true);
	});

	test('flips to dirty when screens are reordered in place', async () => {
		// Reordering is the whole point of this feature — the dirty check
		// must see a reshuffled `screens[]` as changed even though the set
		// of members is identical. JSON-string comparison handles this for
		// free, but the coverage is cheap insurance against anyone swapping
		// in a set-based comparison later.
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		const data = store.data!;
		data.screens = [data.screens[1], data.screens[0]];
		expect(store.isDirty).toBe(true);
	});

	test('clears dirty after a successful save', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		patchSettingsMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		expect(store.isDirty).toBe(true);
		await store.save({ stealFocus: true });
		expect(store.isDirty).toBe(false);
	});

	test('keeps dirty when the save fails', async () => {
		// A rejected PATCH leaves the form in its edited state so the user
		// can retry or reset. Silently pristining the snapshot would strand
		// the user's edits without any signal that the server refused them.
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		patchSettingsMock.mockResolvedValueOnce(new Response('nope', { status: 400 }));
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		await store.save({ stealFocus: true });
		expect(store.isDirty).toBe(true);
	});

	test('reloading from the API resets pristine to the fresh snapshot', async () => {
		// Called by the Reset button. After reload the working copy is the
		// API truth again, so nothing's dirty.
		getSettingsMock.mockResolvedValueOnce(sampleSettings()).mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		expect(store.isDirty).toBe(true);
		await store.load();
		expect(store.isDirty).toBe(false);
	});

	test('load failure clears pristine so the UI does not lie', async () => {
		// If the fetch throws, state.pristine is cleared. isDirty returns
		// false because there's nothing sensible to compare against.
		getSettingsMock.mockRejectedValueOnce(new Error('network'));
		const store = await loadStore();
		await store.load();
		expect(store.isReady).toBe(false);
		expect(store.isDirty).toBe(false);
	});
});
