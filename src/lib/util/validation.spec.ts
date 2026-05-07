import { describe, test, expect } from 'vitest';
import { validateSettings } from './validation';
import type { Settings } from '$lib/types/settings';

const fakeSettings = (overrides: Partial<Settings> = {}): Settings =>
	({
		nostrPubKey: '',
		nostrZapPubkey: '',
		nostrZapPubkeys: [],
		...overrides
	}) as unknown as Settings;

const messages = { invalidNostrPubkey: 'Invalid pubkey' };

describe('validateSettings', () => {
	test('returns no errors for null data', () => {
		expect(validateSettings(null, messages)).toEqual([]);
	});

	test('returns no errors when both pubkeys are empty', () => {
		expect(validateSettings(fakeSettings(), messages)).toEqual([]);
	});

	test('returns no errors for valid 64-hex pubkeys', () => {
		const valid = 'a'.repeat(64);
		expect(
			validateSettings(
				fakeSettings({
					nostrPubKey: valid,
					nostrZapPubkey: valid,
					nostrZapPubkeys: [valid]
				}),
				messages
			)
		).toEqual([]);
	});

	test('flags an invalid nostrPubKey', () => {
		const errs = validateSettings(
			fakeSettings({ nostrPubKey: 'npub-something-bad' }),
			messages
		);
		expect(errs).toHaveLength(1);
		expect(errs[0]).toMatchObject({
			id: 'nostrPubKey',
			section: 'dataSource',
			field: 'nostrPubKey',
			message: 'Invalid pubkey'
		});
	});

	test('flags an invalid nostrZapPubkeys entry under the extra section', () => {
		const errs = validateSettings(fakeSettings({ nostrZapPubkeys: ['not-hex'] }), messages);
		expect(errs).toHaveLength(1);
		expect(errs[0]?.section).toBe('extra');
		// Index encoded in the id so the anchor link can focus the offending chip.
		expect(errs[0]?.id).toBe('nostrZapPubkeys-0');
		expect(errs[0]?.field).toBe('nostrZapPubkeys');
	});

	test('flags every malformed nostrZapPubkeys entry, indexed', () => {
		const valid = 'a'.repeat(64);
		const errs = validateSettings(
			fakeSettings({
				nostrZapPubkeys: [valid, 'bad1', valid, 'bad2']
			}),
			messages
		);
		expect(errs.map((e) => e.id)).toEqual(['nostrZapPubkeys-1', 'nostrZapPubkeys-3']);
	});

	test('skips empty strings in nostrZapPubkeys (form noise)', () => {
		// A user mid-paste shouldn't see a top-of-form error before they
		// finish typing — empty entries are tolerated and dropped server-side.
		expect(validateSettings(fakeSettings({ nostrZapPubkeys: ['', ''] }), messages)).toEqual([]);
	});

	test('reports both nostrPubKey and nostrZapPubkeys errors with stable order', () => {
		const errs = validateSettings(
			fakeSettings({
				nostrPubKey: 'bad1',
				nostrZapPubkeys: ['bad2']
			}),
			messages
		);
		expect(errs.map((e) => e.id)).toEqual(['nostrPubKey', 'nostrZapPubkeys-0']);
	});
});
