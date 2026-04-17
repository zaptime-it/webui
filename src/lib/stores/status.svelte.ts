/**
 * Rune-based status store. Owns the SSE connection lifecycle and exposes
 * derived fields (free-memory percent, wifi bar colour) so the UI doesn't
 * reimplement them in each component.
 */

import { browser } from '$app/environment';
import { getStatus } from '$lib/api/client';
import { connectStatusStream } from '$lib/api/sse';
import type { Status, StatusState } from '$lib/types/status';

const state = $state<{ value: StatusState; isUpdating: boolean; connected: boolean }>({
	value: { status: 'loading' },
	isUpdating: false,
	connected: false
});

const mergeStatus = (incoming: Partial<Status>) => {
	if (state.value.status === 'ready') {
		const merged = { ...state.value.data, ...incoming } as Status;
		// A server-pushed status frame is by definition live, so drop any
		// stale `isFake` flag left by a previous `markDisconnected()` unless
		// the incoming frame opts in explicitly. Without this, a reconnect
		// would never clear the "Lost connection" overlay because the
		// firmware doesn't echo `isFake: false` back on every frame.
		if (!('isFake' in incoming)) merged.isFake = false;
		state.value = { status: 'ready', data: merged };
	} else {
		state.value = { status: 'ready', data: incoming as Status };
	}
};

const markConnected = () => {
	state.connected = true;
	// Clear the stale `isFake` marker from the previous disconnect so the
	// overlay disappears as soon as the stream reopens, even before the
	// first `status` frame arrives.
	if (state.value.status === 'ready' && state.value.data.isFake) {
		state.value = {
			status: 'ready',
			data: { ...state.value.data, isFake: false }
		};
	}
};

const markDisconnected = () => {
	if (state.value.status !== 'ready') return;
	state.value = {
		status: 'ready',
		data: { ...state.value.data, isFake: true }
	};
};

let disposer: (() => void) | null = null;

export const statusStore = {
	get state(): StatusState {
		return state.value;
	},
	get data(): Status | null {
		return state.value.status === 'ready' ? state.value.data : null;
	},
	get isUpdating(): boolean {
		return state.isUpdating;
	},
	get connected(): boolean {
		return state.connected;
	},
	get memoryFreePercent(): number {
		const d = this.data;
		if (!d || !d.espHeapSize) return 0;
		return Math.floor((d.espFreeHeap / d.espHeapSize) * 100);
	},
	get rssiPercent(): number {
		const rssi = this.data?.rssi ?? -100;
		return Math.min(Math.max(2 * (rssi + 100), 0), 100);
	},
	get wifiStrengthColor(): string {
		const p = this.rssiPercent;
		if (p >= 70) return 'success';
		if (p >= 40) return 'warning';
		return 'error';
	},
	async load(): Promise<void> {
		try {
			const data = await getStatus();
			state.value = { status: 'ready', data };
		} catch (err) {
			state.value = { status: 'error', error: (err as Error).message };
		}
	},
	connect() {
		if (!browser || disposer) return;
		disposer = connectStatusStream({
			onOpen: () => {
				markConnected();
			},
			onStatus: (raw) => {
				const s = raw as Partial<Status> & { isUpdating?: boolean };
				state.isUpdating = Boolean(s.isUpdating);
				markConnected();
				mergeStatus(s);
			},
			onDisconnect: () => {
				state.connected = false;
				markDisconnected();
			}
		});
	},
	disconnect() {
		disposer?.();
		disposer = null;
		state.connected = false;
	}
};
