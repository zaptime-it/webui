import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	computeBackoffMs,
	connectStatusStream,
	SSE_BACKOFF_INITIAL_MS,
	SSE_BACKOFF_MAX_MS,
	SSE_CLEAN_RECONNECT_MS
} from './sse';

describe('computeBackoffMs', () => {
	test('first error uses the initial delay', () => {
		expect(computeBackoffMs(0)).toBe(SSE_BACKOFF_INITIAL_MS);
	});

	test('doubles each attempt', () => {
		expect(computeBackoffMs(1)).toBe(SSE_BACKOFF_INITIAL_MS * 2);
		expect(computeBackoffMs(2)).toBe(SSE_BACKOFF_INITIAL_MS * 4);
		expect(computeBackoffMs(3)).toBe(SSE_BACKOFF_INITIAL_MS * 8);
		expect(computeBackoffMs(4)).toBe(SSE_BACKOFF_INITIAL_MS * 16);
	});

	test('caps at SSE_BACKOFF_MAX_MS', () => {
		expect(computeBackoffMs(10)).toBe(SSE_BACKOFF_MAX_MS);
		expect(computeBackoffMs(50)).toBe(SSE_BACKOFF_MAX_MS);
	});
});

describe('reconnect constants', () => {
	test('clean reconnect (closing frame) is independent of backoff', () => {
		// A "closing" frame is a graceful handoff from the firmware (e.g.
		// LFS swap during OTA finalisation), so it shouldn't escalate.
		expect(SSE_CLEAN_RECONNECT_MS).toBe(5000);
	});

	test('exponential backoff stays below 1 minute', () => {
		// Bounded so an idle laptop never spends more than a minute
		// between reconnect attempts.
		expect(SSE_BACKOFF_MAX_MS).toBeLessThanOrEqual(60000);
	});
});

/**
 * connectStatusStream is the reconnect brain of the live status feed and
 * jsdom ships no EventSource, so drive it with a fake that records every
 * instance and lets the test emit `open` / `status` / `message` / `error`
 * frames. Fake timers make the backoff schedule observable: a reconnect is
 * "a new FakeEventSource instance appearing after we advance the clock".
 */
type Listener = (e: unknown) => void;
class FakeEventSource {
	static instances: FakeEventSource[] = [];
	url: string;
	closed = false;
	private listeners: Record<string, Listener[]> = {};
	constructor(url: string) {
		this.url = url;
		FakeEventSource.instances.push(this);
	}
	addEventListener(type: string, cb: Listener) {
		(this.listeners[type] ??= []).push(cb);
	}
	close() {
		this.closed = true;
	}
	emit(type: string, event: unknown) {
		(this.listeners[type] ?? []).forEach((cb) => cb(event));
	}
}

const latest = () => FakeEventSource.instances.at(-1)!;
const emitStatus = (es: FakeEventSource, payload: unknown) =>
	es.emit('status', { data: JSON.stringify(payload) });

describe('connectStatusStream', () => {
	const OriginalEventSource = globalThis.EventSource;
	let consoleErr: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		FakeEventSource.instances = [];
		(globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
		// The error/parse paths log to console.error by design; silence it so
		// the test output stays clean and we can assert it fired.
		consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		(globalThis as unknown as { EventSource: unknown }).EventSource = OriginalEventSource;
		consoleErr.mockRestore();
		vi.useRealTimers();
	});

	test('opens a connection immediately and forwards parsed status frames', () => {
		const onStatus = vi.fn();
		const onOpen = vi.fn();
		const dispose = connectStatusStream({ onStatus, onOpen });

		expect(FakeEventSource.instances).toHaveLength(1);
		latest().emit('open', new Event('open'));
		expect(onOpen).toHaveBeenCalledOnce();

		emitStatus(latest(), { espFreeHeap: 42 });
		expect(onStatus).toHaveBeenCalledWith({ espFreeHeap: 42 });

		dispose();
	});

	test('a malformed status frame is swallowed (no throw, onStatus not called)', () => {
		const onStatus = vi.fn();
		const dispose = connectStatusStream({ onStatus });

		expect(() => latest().emit('status', { data: '{not valid json' })).not.toThrow();
		expect(onStatus).not.toHaveBeenCalled();
		expect(consoleErr).toHaveBeenCalled();

		dispose();
	});

	test('an error closes the socket and reconnects with exponential backoff', () => {
		const onStatus = vi.fn();
		const onDisconnect = vi.fn();
		const dispose = connectStatusStream({ onStatus, onDisconnect });

		const es1 = latest();
		es1.emit('error', new Event('error'));
		expect(onDisconnect).toHaveBeenCalledOnce();
		expect(es1.closed).toBe(true);

		// First reconnect lands at exactly 1000 ms (computeBackoffMs(0)).
		vi.advanceTimersByTime(SSE_BACKOFF_INITIAL_MS - 1);
		expect(FakeEventSource.instances).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(2);

		// Second consecutive error doubles the delay to 2000 ms.
		latest().emit('error', new Event('error'));
		vi.advanceTimersByTime(SSE_BACKOFF_INITIAL_MS * 2 - 1);
		expect(FakeEventSource.instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(3);

		dispose();
	});

	test('a successful status frame resets the backoff counter', () => {
		const onStatus = vi.fn();
		const dispose = connectStatusStream({ onStatus });

		latest().emit('error', new Event('error'));
		vi.advanceTimersByTime(SSE_BACKOFF_INITIAL_MS);
		expect(FakeEventSource.instances).toHaveLength(2);

		// Frame arrives on the reconnected socket → next blip starts at 1 s again.
		emitStatus(latest(), { ok: true });
		expect(onStatus).toHaveBeenCalledWith({ ok: true });

		latest().emit('error', new Event('error'));
		vi.advanceTimersByTime(SSE_BACKOFF_INITIAL_MS - 1);
		expect(FakeEventSource.instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(3);

		dispose();
	});

	test('a "closing" message reconnects cleanly after 5 s without escalating', () => {
		const onStatus = vi.fn();
		const onDisconnect = vi.fn();
		const dispose = connectStatusStream({ onStatus, onDisconnect });

		const es1 = latest();
		es1.emit('message', { data: 'closing' });
		expect(onDisconnect).toHaveBeenCalledOnce();
		expect(es1.closed).toBe(true);

		vi.advanceTimersByTime(SSE_CLEAN_RECONNECT_MS - 1);
		expect(FakeEventSource.instances).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(2);

		dispose();
	});

	test('a non-closing default message is ignored', () => {
		const onStatus = vi.fn();
		const onDisconnect = vi.fn();
		const dispose = connectStatusStream({ onStatus, onDisconnect });

		latest().emit('message', { data: 'ping' });
		expect(onDisconnect).not.toHaveBeenCalled();
		vi.advanceTimersByTime(SSE_CLEAN_RECONNECT_MS * 2);
		expect(FakeEventSource.instances).toHaveLength(1);

		dispose();
	});

	test('the disposer closes the socket and cancels a pending reconnect', () => {
		const onStatus = vi.fn();
		const dispose = connectStatusStream({ onStatus });

		const es1 = latest();
		es1.emit('error', new Event('error')); // schedules a reconnect
		dispose();

		expect(es1.closed).toBe(true);
		vi.advanceTimersByTime(60_000);
		// No new connection after disposal — the pending timer was cancelled.
		expect(FakeEventSource.instances).toHaveLength(1);
	});
});
