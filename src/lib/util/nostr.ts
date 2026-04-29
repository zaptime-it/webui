import * as nip19 from 'nostr-tools/nip19';
import { fetchRelayInformation, type RelayInformation } from 'nostr-tools/nip11';
import { Relay } from 'nostr-tools';

export const isValidHexPubKey = (pubkey: string): boolean => /^[0-9a-f]{64}$/i.test(pubkey);

export const isValidNpub = (npub: string): boolean => {
	try {
		const { type, data } = nip19.decode(npub);
		return type === 'npub' && data.length === 64;
	} catch {
		return false;
	}
};

export const getPubKey = (input: string): string | null => {
	try {
		if (isValidHexPubKey(input)) return input;
		const { type, data } = nip19.decode(input);
		if (type === 'npub' && data.length === 64) return data;
		return null;
	} catch {
		return null;
	}
};

export const isValidNostrRelayUrl = (url: string): boolean => {
	const trimmed = url.trim();
	if (!trimmed.startsWith('wss://')) return false;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'wss:' && parsed.hostname.length > 0;
	} catch {
		return false;
	}
};

export const fetchNostrRelayInfo = async (url: string): Promise<RelayInformation | null> => {
	try {
		return await fetchRelayInformation(url);
	} catch {
		return null;
	}
};

export const isValidNostrRelay = async (url: string): Promise<boolean> => {
	try {
		const relay: Relay = await Relay.connect(url);
		if (relay.connected) {
			relay.close();
			return true;
		}
		return false;
	} catch {
		return false;
	}
};
