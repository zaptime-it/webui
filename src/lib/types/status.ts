export interface NostrRelayStatus {
	url: string;
	connected: boolean;
}

export interface ConnectionStatus {
	price: boolean;
	blocks: boolean;
	V2: boolean;
	// Firmware ≥ 4.0.0-rc.4 emits one entry per configured relay; pre-rc.4
	// builds emitted a single boolean. Feature-detect with `Array.isArray()`.
	nostr: boolean | NostrRelayStatus[];
}

export interface DndStatus {
	enabled: boolean;
	dndTimeEnabled: boolean;
	startTime: string;
	endTime: string;
	active: boolean;
}

export interface LedStatus {
	red: number;
	green: number;
	blue: number;
	hex: string;
}

export interface Status {
	currentScreen: number;
	numScreens: number;
	timerRunning: boolean;

	isOTAUpdating: boolean;
	isUpdating: boolean;
	isFake?: boolean;

	espUptime: number;
	espFreeHeap: number;
	espHeapSize: number;

	connectionStatus: ConnectionStatus;
	rssi: number;

	currency: string;
	data: string[];

	flStatus: number[];
	lightLevel: number;

	leds: LedStatus[];

	dnd: DndStatus;

	[key: string]: unknown;
}

export type StatusState =
	| { status: 'loading' }
	| { status: 'error'; error: string }
	| { status: 'ready'; data: Status };
