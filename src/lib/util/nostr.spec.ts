import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
	isValidHexPubKey,
	isValidNpub,
	getPubKey,
	isValidNostrRelayUrl,
	fetchNostrRelayInfo
} from './nostr';
import { fetchRelayInformation } from 'nostr-tools/nip11';

vi.mock('nostr-tools/nip11', () => ({
	fetchRelayInformation: vi.fn()
}));

describe('nostr utils', () => {
	test('validates 64-char hex pubkey', () => {
		expect(isValidHexPubKey('a'.repeat(64))).toBe(true);
		expect(isValidHexPubKey('x'.repeat(64))).toBe(false);
		expect(isValidHexPubKey('deadbeef')).toBe(false);
	});

	test('validates npub strings', () => {
		expect(isValidNpub('npub1k5f85zx0xdskyayqpfpc0zq6n7vwqjuuxugkayk72fgynp34cs3qfcvqg2')).toBe(
			true
		);
		expect(isValidNpub('npub1garbage')).toBe(false);
	});

	test('converts npub to hex pubkey', () => {
		const hex = getPubKey('npub1k5f85zx0xdskyayqpfpc0zq6n7vwqjuuxugkayk72fgynp34cs3qfcvqg2');
		expect(hex).toBe('b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422');
	});

	describe('fetchNostrRelayInfo', () => {
		const mockedFetch = vi.mocked(fetchRelayInformation);
		beforeEach(() => {
			mockedFetch.mockReset();
		});

		test('returns relay information on success', async () => {
			const info = {
				name: 'Test Relay',
				description: '',
				pubkey: '',
				contact: '',
				supported_nips: [1, 11],
				software: 'strfry',
				version: '1.0.0'
			};
			mockedFetch.mockResolvedValue(info);
			expect(await fetchNostrRelayInfo('wss://relay.example.com')).toEqual(info);
		});

		test('returns null when the relay does not implement NIP-11', async () => {
			mockedFetch.mockRejectedValue(new Error('404 Not Found'));
			expect(await fetchNostrRelayInfo('wss://relay.example.com')).toBeNull();
		});
	});

	describe('isValidNostrRelayUrl', () => {
		test('accepts wss:// URLs with a hostname', () => {
			expect(isValidNostrRelayUrl('wss://relay.damus.io')).toBe(true);
			expect(isValidNostrRelayUrl('wss://relay.example.com/v1')).toBe(true);
			expect(isValidNostrRelayUrl('wss://relay.example.com:443')).toBe(true);
		});

		test('trims surrounding whitespace before validating', () => {
			expect(isValidNostrRelayUrl('  wss://relay.damus.io  ')).toBe(true);
		});

		test('rejects non-wss schemes', () => {
			expect(isValidNostrRelayUrl('ws://relay.damus.io')).toBe(false);
			expect(isValidNostrRelayUrl('https://relay.damus.io')).toBe(false);
			expect(isValidNostrRelayUrl('http://relay.damus.io')).toBe(false);
			expect(isValidNostrRelayUrl('relay.damus.io')).toBe(false);
		});

		test('rejects empty or malformed input', () => {
			expect(isValidNostrRelayUrl('')).toBe(false);
			expect(isValidNostrRelayUrl('   ')).toBe(false);
			expect(isValidNostrRelayUrl('wss://')).toBe(false);
			expect(isValidNostrRelayUrl('wss:// ')).toBe(false);
		});
	});
});
