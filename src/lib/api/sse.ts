/**
 * EventSource wrapper for the BTClock `/events` stream.
 *
 * Reconnects with exponential backoff after transport errors to avoid
 * hammering a flaky AP/device link.
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
export const SSE_CLEAN_RECONNECT_MS = 5000;

export const computeBackoffMs = (attempt: number): number =>
	Math.min(SSE_BACKOFF_INITIAL_MS * 2 ** attempt, SSE_BACKOFF_MAX_MS);

export const connectStatusStream = (handlers: SseHandlers): (() => void) => {
	let active = true;
	let current: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
