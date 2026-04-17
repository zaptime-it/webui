export interface ConnectionStatus {
	price: boolean;
	blocks: boolean;
	V2: boolean;
	nostr: boolean;
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
