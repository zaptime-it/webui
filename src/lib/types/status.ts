/**
 * Connection status for various data sources
 */
export interface ConnectionStatus {
	price: boolean;
	blocks: boolean;
	V2: boolean;
	nostr: boolean;
}

/**
 * Do Not Disturb status (runtime state)
 */
export interface DndStatus {
	enabled: boolean;
	dndTimeEnabled: boolean;
	startTime: string;
	endTime: string;
	active: boolean;
}

/**
 * LED color configuration
 */
export interface LedStatus {
	red: number;
	green: number;
	blue: number;
	hex: string;
}

/**
 * Main Status interface for the BTClock device runtime state
 */
export interface Status {
	// Screen state
	currentScreen: number;
	numScreens: number;
	timerRunning: boolean;

	// OTA update state
	isOTAUpdating: boolean;

	// ESP system info
	espUptime: number;
	espFreeHeap: number;
	espHeapSize: number;

	// Network
	connectionStatus: ConnectionStatus;
	rssi: number;

	// Display
	currency: string;
	data: string[];

	// Frontlight status
	flStatus: number[];
	lightLevel: number;

	// LED status
	leds: LedStatus[];

	// Do Not Disturb status
	dnd: DndStatus;

	// Allow additional properties with nested values
	[key: string]: unknown;
}

/**
 * Partial status for updates (all fields optional)
 */
export type PartialStatus = Partial<Status>;
