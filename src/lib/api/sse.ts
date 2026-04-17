/**
 * EventSource wrapper for the BTClock `/events` stream.
 *
 * Ported verbatim from the original reconnect loop in src/routes/+page.svelte.
 * Callers receive a disposer that closes the current connection and cancels
 * the reconnect timer.
 */

import { eventsUrl } from './client';

export interface SseHandlers {
	onStatus: (data: unknown) => void;
	onOpen?: () => void;
	onDisconnect?: () => void;
}

export const connectStatusStream = (handlers: SseHandlers): (() => void) => {
	let active = true;
	let current: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	const connect = () => {
		if (!active) return;
		const evt = new EventSource(eventsUrl());
		current = evt;

		evt.addEventListener('open', () => handlers.onOpen?.());

		evt.addEventListener('status', (e: MessageEvent) => {
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
				reconnectTimer = setTimeout(connect, 5000);
			}
		});

		evt.addEventListener('error', (err) => {
			console.error('EventSource failed:', err);
			handlers.onDisconnect?.();
			evt.close();
			reconnectTimer = setTimeout(connect, 1000);
		});
	};

	connect();

	return () => {
		active = false;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		current?.close();
	};
};
