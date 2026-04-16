/**
 * Regression tests for the SSE "lost connection" overlay.
 *
 * An earlier revision derived the overlay state from `isUpdating`, which is
 * only briefly true when a `status` frame arrives, so the overlay would
 * flicker on even while the EventSource was happily streaming. The store now
 * exposes a dedicated `connected` flag that tracks the EventSource lifecycle
 * directly. These tests lock that behaviour in place by intercepting the
 * SSE handler wiring.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

type Handlers = {
	onOpen?: () => void;
	onStatus: (data: unknown) => void;
	onDisconnect?: () => void;
};
let capturedHandlers: Handlers | null = null;

vi.mock('$lib/api/sse', () => ({
	connectStatusStream: (h: Handlers) => {
		capturedHandlers = h;
		return () => {
			capturedHandlers = null;
		};
	}
}));

vi.mock('$lib/api/client', () => ({
	getStatus: vi.fn()
}));

const loadStore = async () => {
	const { statusStore } = await import('./status.svelte');
	return statusStore;
};

describe('statusStore.connected', () => {
	beforeEach(() => {
		capturedHandlers = null;
		vi.resetModules();
	});

	test('starts disconnected', async () => {
		const store = await loadStore();
		expect(store.connected).toBe(false);
	});

	test('flips to connected on SSE open', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		expect(store.connected).toBe(true);
	});

	test('stays connected while status frames arrive', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		capturedHandlers?.onStatus({ espFreeHeap: 1, espHeapSize: 2, isUpdating: false });
		expect(store.connected).toBe(true);
		expect(store.isUpdating).toBe(false);
	});

	test('flips to disconnected when the stream drops', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		expect(store.connected).toBe(true);
		capturedHandlers?.onDisconnect?.();
		expect(store.connected).toBe(false);
	});

	test('explicit disconnect clears the flag', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		store.disconnect();
		expect(store.connected).toBe(false);
	});
});
