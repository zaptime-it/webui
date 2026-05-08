/**
 * Rune-based status store. Owns the SSE connection lifecycle and exposes
 * derived fields (free-memory percent, wifi bar colour) so the UI doesn't
 * reimplement them in each component.
 */

import { browser } from '$app/environment';
import { getStatus } from '$lib/api/client';
import { connectStatusStream } from '$lib/api/sse';
import type { Status, StatusState } from '$lib/types/status';

const RSSI_FLOOR_DBM = -100;
const RSSI_CEILING_DBM = -50;
const rssiToPercent = (rssi: number): number => {
	const span = RSSI_CEILING_DBM - RSSI_FLOOR_DBM;
	const pct = ((rssi - RSSI_FLOOR_DBM) / span) * 100;
	return Math.min(Math.max(pct, 0), 100);
};

type OptimisticOverrides = {
	timerRunning?: boolean;
	dndActive?: boolean;
	dndEnabled?: boolean;
};

const state = $state<{
	value: StatusState;
	isUpdating: boolean;
	connected: boolean;
	optimistic: OptimisticOverrides;
}>({
	value: { status: 'loading' },
	isUpdating: false,
	connected: false,
	optimistic: {}
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
	state.optimistic = {};
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
	get timerRunning(): boolean | undefined {
		return state.optimistic.timerRunning ?? this.data?.timerRunning;
	},
	get dndActive(): boolean | undefined {
		return state.optimistic.dndActive ?? this.data?.dnd?.active;
	},
	get dndEnabled(): boolean | undefined {
		return state.optimistic.dndEnabled ?? this.data?.dnd?.enabled;
	},
	applyOptimistic(patch: OptimisticOverrides): void {
		state.optimistic = { ...state.optimistic, ...patch };
	},
	clearOptimistic(): void {
		state.optimistic = {};
	},
	get memoryFreePercent(): number {
		const d = this.data;
		if (!d || !d.espHeapSize) return 0;
		return Math.floor((d.espFreeHeap / d.espHeapSize) * 100);
	},
	get rssiPercent(): number {
		return rssiToPercent(this.data?.rssi ?? RSSI_FLOOR_DBM);
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
