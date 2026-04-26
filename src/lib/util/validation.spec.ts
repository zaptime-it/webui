import { describe, test, expect } from 'vitest';
import { validateSettings } from './validation';
import type { Settings } from '$lib/types/settings';

const fakeSettings = (overrides: Partial<Settings> = {}): Settings =>
	({
		nostrPubKey: '',
		nostrZapPubkey: '',
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
			validateSettings(fakeSettings({ nostrPubKey: valid, nostrZapPubkey: valid }), messages)
		).toEqual([]);
	});

	test('flags an invalid nostrPubKey', () => {
		const errs = validateSettings(fakeSettings({ nostrPubKey: 'npub-something-bad' }), messages);
		expect(errs).toHaveLength(1);
		expect(errs[0]).toMatchObject({
			id: 'nostrPubKey',
			section: 'dataSource',
			field: 'nostrPubKey',
			message: 'Invalid pubkey'
		});
	});

	test('flags an invalid nostrZapPubkey under the extra section', () => {
		const errs = validateSettings(fakeSettings({ nostrZapPubkey: 'not-hex' }), messages);
		expect(errs).toHaveLength(1);
		expect(errs[0].section).toBe('extra');
		expect(errs[0].id).toBe('nostrZapPubkey');
	});

	test('reports both errors with stable order when both are invalid', () => {
		const errs = validateSettings(
			fakeSettings({ nostrPubKey: 'bad1', nostrZapPubkey: 'bad2' }),
			messages
		);
		expect(errs.map((e) => e.id)).toEqual(['nostrPubKey', 'nostrZapPubkey']);
	});
});
