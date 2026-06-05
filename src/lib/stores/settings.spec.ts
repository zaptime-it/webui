/**
 * isDirty tracks whether the working settings differ from the pristine
 * snapshot established on the last successful load or save. The form
 * surfaces this to gate the Save button and show an "Unsaved changes"
 * indicator. These tests lock the state transitions in place because
 * getting any of them wrong (dirty-after-load, clean-after-failed-save,
 * dirty-lost-on-reset) is the kind of UX regression that slips past
 * casual manual QA — the indicator still renders, it just lies.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
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
	let consoleErr: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.resetModules();
		getSettingsMock.mockReset();
		patchSettingsMock.mockReset();
		// load() logs failures via console.error by design; several tests in
		// this block deliberately reject the fetch (network error, ValiError),
		// so silence the expected noise to keep the run output clean.
		consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErr.mockRestore();
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
		data.screens = [data.screens[1]!, data.screens[0]!];
		expect(store.isDirty).toBe(true);
	});

	test('clears dirty after a successful save', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		patchSettingsMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			statusText: 'OK',
			body: null,
			text: ''
		});
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
		patchSettingsMock.mockResolvedValueOnce({
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			body: { error: 'fontName:unknown' },
			text: '{"error":"fontName:unknown"}'
		});
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		await store.save({ stealFocus: true });
		expect(store.isDirty).toBe(true);
	});

	test('reloading from the API resets pristine to the fresh snapshot', async () => {
		// Called by the Reset button. After reload the working copy is the
		// API truth again, so nothing's dirty.
		getSettingsMock
			.mockResolvedValueOnce(sampleSettings())
			.mockResolvedValueOnce(sampleSettings());
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

	test('hasSchemaMismatch flips on Valibot parse failure, not on network errors', async () => {
		// Routes the banner that asks users to re-flash via the web flasher.
		// A plain network error must NOT trigger it — that would point the
		// user at the wrong remediation when the device is just unreachable.
		const { ValiError } = await import('valibot');
		// Minimal ValiError shape — we only assert isValiError() recognises it.
		const issue = {
			kind: 'schema',
			type: 'object',
			input: undefined,
			expected: 'Object',
			received: 'undefined',
			message: 'Invalid type'
		};
		// Cast through unknown — the issue tuple type is a deeply
		// parameterised generic; we only need isValiError() to recognise
		// the instance, not the full type fidelity.
		getSettingsMock.mockRejectedValueOnce(
			new (ValiError as unknown as new (issues: unknown[]) => Error)([issue])
		);
		const store = await loadStore();
		await store.load();
		expect(store.isReady).toBe(false);
		expect(store.hasSchemaMismatch).toBe(true);
	});

	test('hasSchemaMismatch stays false on plain network errors', async () => {
		getSettingsMock.mockRejectedValueOnce(new Error('network'));
		const store = await loadStore();
		await store.load();
		expect(store.isReady).toBe(false);
		expect(store.hasSchemaMismatch).toBe(false);
	});

	test('hasSchemaMismatch clears on a subsequent successful load', async () => {
		const { ValiError } = await import('valibot');
		const issue = {
			kind: 'schema',
			type: 'object',
			input: undefined,
			expected: 'Object',
			received: 'undefined',
			message: 'Invalid type'
		};
		// Cast through unknown — the issue tuple type is a deeply
		// parameterised generic; we only need isValiError() to recognise
		// the instance, not the full type fidelity.
		getSettingsMock.mockRejectedValueOnce(
			new (ValiError as unknown as new (issues: unknown[]) => Error)([issue])
		);
		const store = await loadStore();
		await store.load();
		expect(store.hasSchemaMismatch).toBe(true);
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		await store.load();
		expect(store.hasSchemaMismatch).toBe(false);
	});
});

describe('settingsStore.dirtyKeys (per-field)', () => {
	beforeEach(() => {
		vi.resetModules();
		getSettingsMock.mockReset();
		patchSettingsMock.mockReset();
	});

	test('reports the exact key that changed', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		expect([...store.dirtyKeys]).toEqual(['stealFocus']);
		expect(store.isFieldDirty('stealFocus')).toBe(true);
		expect(store.isFieldDirty('numScreens')).toBe(false);
	});

	test('handles nested object diffs (dnd.startHour) without false negatives', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		const data = store.data!;
		data.dnd = { ...data.dnd, startHour: 23 };
		expect(store.isFieldDirty('dnd')).toBe(true);
	});

	test('handles array reorders (screens) without false negatives', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		const data = store.data!;
		data.screens = [data.screens[1]!, data.screens[0]!];
		expect(store.isFieldDirty('screens')).toBe(true);
	});

	test('multi-field edits accumulate independently', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		store.set('timerSeconds', 600);
		const keys = [...store.dirtyKeys].sort();
		// `set('timerSeconds', 600)` recomputes timePerScreen via
		// deriveTimePerScreen, so both keys diff against pristine. Both
		// are included in dirtyKeys — the form treats timePerScreen as a
		// first-class edit so a keystroke in the minutes input flips
		// `isDirty` immediately, before the change/blur event syncs
		// timerSeconds.
		expect(keys).toContain('stealFocus');
		expect(keys).toContain('timerSeconds');
		expect(keys).toContain('timePerScreen');
	});

	test('checkRemoteDrift detects another tab having saved a different value', async () => {
		// Initial load establishes pristine. We then issue a fresh GET and
		// see a different `numScreens` — that's drift, regardless of local
		// edits.
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		expect(store.hasRemoteDrift).toBe(false);

		const evolved = sampleSettings();
		(evolved as unknown as { numScreens: number }).numScreens = 4;
		getSettingsMock.mockResolvedValueOnce(evolved);
		const drifted = await store.checkRemoteDrift();
		expect(drifted).toBe(true);
		expect(store.hasRemoteDrift).toBe(true);
	});

	test('checkRemoteDrift ignores keys the local user is currently editing', async () => {
		// If the local form is dirty on `stealFocus`, a fresh GET that also
		// shows a different `stealFocus` is *expected* — that's our own
		// pending edit, not someone else's. Drift should only fire on
		// fields the user hasn't touched.
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);

		const evolved = sampleSettings();
		(evolved as unknown as { stealFocus: boolean }).stealFocus = true;
		getSettingsMock.mockResolvedValueOnce(evolved);
		const drifted = await store.checkRemoteDrift();
		expect(drifted).toBe(false);
	});

	test('dismissRemoteDrift clears the flag', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		const store = await loadStore();
		await store.load();
		const evolved = sampleSettings();
		(evolved as unknown as { numScreens: number }).numScreens = 4;
		getSettingsMock.mockResolvedValueOnce(evolved);
		await store.checkRemoteDrift();
		expect(store.hasRemoteDrift).toBe(true);
		store.dismissRemoteDrift();
		expect(store.hasRemoteDrift).toBe(false);
	});

	test('successful save clears dirtyKeys back to empty', async () => {
		getSettingsMock.mockResolvedValueOnce(sampleSettings());
		patchSettingsMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			statusText: 'OK',
			body: null,
			text: ''
		});
		const store = await loadStore();
		await store.load();
		store.set('stealFocus', true);
		expect(store.dirtyKeys.size).toBe(1);
		await store.save({ stealFocus: true });
		expect(store.dirtyKeys.size).toBe(0);
	});
});
