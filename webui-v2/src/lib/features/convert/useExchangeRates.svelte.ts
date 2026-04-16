/**
 * Live BTC exchange-rate hook. Opens a single WebSocket to the public
 * BTClock feed and exposes a reactive `rates` object plus the connection
 * `status`. The hook is disposed when callers invoke `close()` (usually
 * from an `onDestroy`).
 */

import { encode, decode } from 'msgpack-es';

const DEFAULT_RATES = {
	USD: 57798,
	GBP: 44236,
	AUD: 86552,
	JPY: 8221088,
	EUR: 52347,
	CAD: 78508
};

export type ConversionCurrency = keyof typeof DEFAULT_RATES;

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

class ExchangeRatesStore {
	rates = $state<Record<string, number>>({ ...DEFAULT_RATES });
	status = $state<ConnectionStatus>('connecting');
	private socket: WebSocket | null = null;

	connect() {
		if (typeof window === 'undefined' || this.socket) return;
		const socket = new WebSocket('ws://ws.btclock.dev/api/v2/ws');
		socket.binaryType = 'arraybuffer';
		this.socket = socket;

		socket.addEventListener('open', () => {
			this.status = 'open';
			const payload = encode({
				type: 'subscribe',
				eventType: 'price',
				currencies: Object.keys(DEFAULT_RATES)
			});
			socket.send(payload as unknown as ArrayBuffer);
		});

		socket.addEventListener('message', (event) => {
			try {
				const data = decode(event.data) as { price?: Record<string, number> };
				if (data.price) {
					this.rates = { ...this.rates, ...data.price };
				}
			} catch (err) {
				console.error('exchange rates decode error', err);
			}
		});

		socket.addEventListener('close', () => {
			this.status = 'closed';
		});
		socket.addEventListener('error', () => {
			this.status = 'error';
		});
	}

	close() {
		this.socket?.close();
		this.socket = null;
	}
}

export const createExchangeRates = () => new ExchangeRatesStore();
