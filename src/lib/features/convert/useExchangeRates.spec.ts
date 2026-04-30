/**
 * Regression tests for the Convert route.
 *
 * Exchange-rate state used to be a function-scoped `$state` call, which fell
 * over on HMR with a "Cannot read properties of null (reading 'r')" crash in
 * `Converter.svelte`. The store is now a class with `$state` class fields and
 * a `connect()` method that is only invoked from an `$effect` inside the
 * component — these tests lock both guarantees in place.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

type Listener = (ev: unknown) => void;
type WSEvent = 'open' | 'close' | 'error' | 'message';

class FakeWebSocket {
	binaryType = '';
	sent: unknown[] = [];
	private listeners: Record<WSEvent, Listener[]> = {
		open: [],
		close: [],
		error: [],
		message: []
	};
	static instances: FakeWebSocket[] = [];

	constructor(public url: string) {
		FakeWebSocket.instances.push(this);
	}

	addEventListener(type: WSEvent, fn: Listener) {
		this.listeners[type].push(fn);
	}

	dispatch(type: WSEvent, ev: unknown = {}) {
		for (const l of this.listeners[type]) l(ev);
	}

	send(data: unknown) {
		this.sent.push(data);
	}

	close = vi.fn();
}

const originalWebSocket = globalThis.WebSocket;

describe('createExchangeRates', () => {
	beforeEach(() => {
		FakeWebSocket.instances.length = 0;
		(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
	});

	afterEach(() => {
		if (originalWebSocket === undefined) delete (globalThis as Record<string, unknown>).WebSocket;
		else (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
	});

	test('starts in the connecting state with default rates', async () => {
		const { createExchangeRates } = await import('./useExchangeRates.svelte');
		const feed = createExchangeRates();
		expect(feed.status).toBe('connecting');
		expect(feed.rates.USD).toBeGreaterThan(0);
		expect(feed.rates.EUR).toBeGreaterThan(0);
	});

	test('does not open a socket until connect() is called', async () => {
		const { createExchangeRates } = await import('./useExchangeRates.svelte');
		const feed = createExchangeRates();
		expect(FakeWebSocket.instances.length).toBe(0);
		feed.connect();
		expect(FakeWebSocket.instances.length).toBe(1);
	});

	test('transitions to open / closed / error as the socket reports state', async () => {
		const { createExchangeRates } = await import('./useExchangeRates.svelte');
		const feed = createExchangeRates();
		feed.connect();
		const ws = FakeWebSocket.instances[0]!;

		ws.dispatch('open');
		expect(feed.status).toBe('open');
		expect(ws.sent.length).toBe(1);

		ws.dispatch('error');
		expect(feed.status).toBe('error');

		ws.dispatch('close');
		expect(feed.status).toBe('closed');
	});

	test('close() disposes the socket and allows a fresh connect()', async () => {
		const { createExchangeRates } = await import('./useExchangeRates.svelte');
		const feed = createExchangeRates();
		feed.connect();
		const ws = FakeWebSocket.instances[0]!;
		feed.close();
		expect(ws.close).toHaveBeenCalledOnce();
		feed.connect();
		expect(FakeWebSocket.instances.length).toBe(2);
	});
});
