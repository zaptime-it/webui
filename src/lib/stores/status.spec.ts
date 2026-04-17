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

	/**
	 * Regression: clicking "Restart" (or any other momentary disconnect)
	 * used to leave the "Lost connection" overlay stuck on forever. The
	 * flow was: onDisconnect stamps `isFake: true` on the current status
	 * frame → onOpen flips `connected` back to `true` → but nothing ever
	 * clears `isFake`, and the Status overlay gates on
	 * `connected && !isFake`. Lock in that reopening the stream drops
	 * the stale `isFake` marker, both on the `open` event and on the
	 * first subsequent `status` frame.
	 */
	test('reopening the stream clears the stale isFake marker (fixed on onOpen)', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		capturedHandlers?.onStatus({ espFreeHeap: 1, espHeapSize: 2, isUpdating: false });
		capturedHandlers?.onDisconnect?.();
		expect(store.data?.isFake).toBe(true);
		capturedHandlers?.onOpen?.();
		expect(store.connected).toBe(true);
		expect(store.data?.isFake).toBe(false);
	});

	test('a fresh status frame after disconnect clears isFake even if onOpen is skipped', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		capturedHandlers?.onStatus({ espFreeHeap: 1, espHeapSize: 2, isUpdating: false });
		capturedHandlers?.onDisconnect?.();
		expect(store.data?.isFake).toBe(true);
		capturedHandlers?.onStatus({ espFreeHeap: 3, espHeapSize: 4, isUpdating: true });
		expect(store.connected).toBe(true);
		expect(store.data?.isFake).toBe(false);
		expect(store.data?.espFreeHeap).toBe(3);
	});

	test('an incoming frame that explicitly declares isFake is still respected', async () => {
		const store = await loadStore();
		store.connect();
		capturedHandlers?.onOpen?.();
		capturedHandlers?.onStatus({ espFreeHeap: 1, espHeapSize: 2, isFake: true });
		expect(store.data?.isFake).toBe(true);
	});
});
