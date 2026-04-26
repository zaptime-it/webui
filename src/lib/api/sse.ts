/**
 * EventSource wrapper for the BTClock `/events` stream.
 *
 * Reconnects with exponential backoff: a flaky AP used to hammer the device
 * with one reconnect per second, which both wasted device CPU and prevented
 * the connection from ever stabilising. The current shape doubles the delay
 * after each failure (1 s → 2 s → 4 s … capped at 30 s) and resets on the
 * first frame that arrives after a successful reconnect, so a momentary
 * blip recovers fast and a real outage stops thrashing.
 *
 * Callers receive a disposer that closes the current connection and cancels
 * the reconnect timer.
 */

import { eventsUrl } from './client';

export interface SseHandlers {
	onStatus: (data: unknown) => void;
	onOpen?: () => void;
	onDisconnect?: () => void;
}

export const SSE_BACKOFF_INITIAL_MS = 1000;
export const SSE_BACKOFF_MAX_MS = 30000;
// Triggered by the firmware sending an `event: message data: closing` frame
// before a clean shutdown. Doesn't escalate the backoff because the device
// is asking for a deliberate reconnect, not failing.
export const SSE_CLEAN_RECONNECT_MS = 5000;

export const computeBackoffMs = (attempt: number): number =>
	Math.min(SSE_BACKOFF_INITIAL_MS * 2 ** attempt, SSE_BACKOFF_MAX_MS);

export const connectStatusStream = (handlers: SseHandlers): (() => void) => {
	let active = true;
	let current: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	// 0 right after a successful frame; bumped on every error reconnect so
	// the next delay grows. A "closing" message resets it to 0 because
	// that's a clean handoff, not a failure.
	let errorAttempts = 0;

	const scheduleReconnect = (delayMs: number) => {
		if (!active) return;
		reconnectTimer = setTimeout(connect, delayMs);
	};

	const connect = () => {
		if (!active) return;
		const evt = new EventSource(eventsUrl());
		current = evt;

		evt.addEventListener('open', () => handlers.onOpen?.());

		evt.addEventListener('status', (e: MessageEvent) => {
			// First successful status frame after a reconnect — clear the
			// failure counter so the next blip starts from 1 s again.
			errorAttempts = 0;
			try {
				handlers.onStatus(JSON.parse(e.data));
			} catch (err) {
				console.error('SSE status parse error', err);
			}
		});

		evt.addEventListener('message', (e: MessageEvent) => {
			if (e.data === 'closing') {
				handlers.onDisconnect?.();
				evt.close();
				errorAttempts = 0;
				scheduleReconnect(SSE_CLEAN_RECONNECT_MS);
			}
		});

		evt.addEventListener('error', (err) => {
			console.error('EventSource failed:', err);
			handlers.onDisconnect?.();
			evt.close();
			const delay = computeBackoffMs(errorAttempts);
			errorAttempts++;
			scheduleReconnect(delay);
		});
	};

	connect();

	return () => {
		active = false;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		current?.close();
	};
};
