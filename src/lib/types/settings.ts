import type { DataSourceType } from './dataSource';

/**
 * Represents a screen configuration
 */
export interface Screen {
	id: number;
	name: string;
	enabled: boolean;
}

/**
 * Do Not Disturb settings
 */
export interface DndSettings {
	enabled: boolean;
	timeBasedEnabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
}

/**
 * Main Settings interface for the BTClock device
 */
export interface Settings {
	// Display settings
	numScreens: number;
	invertedColor: boolean;
	timerSeconds: number;
	timerRunning: boolean;
	fullRefreshMin: number;
	fontName: string;
	availableFonts: string[];
	stealFocus: boolean;
	mcapBigChar: boolean;
	useSatsSymbol: boolean;
	useBlkCountdown: boolean;
	suffixPrice: boolean;
	mowMode: boolean;
	verticalDesc: boolean;
	blockFeeDec: boolean;
	supplyPercent: boolean;
	refrScrnChange: boolean;
	inverseButtons: boolean;
	suffixShareDot: boolean;

	// Data source settings
	minSecPriceUpd: number;
	dataSource: DataSourceType | number;
	mempoolInstance: string;
	mempoolSecure: boolean;
	localPoolEndpoint: string;
	customEndpoint: string;
	customEndpointDisableSSL: boolean;
	ceEndpoint: string;
	ceDisableSSL: boolean;

	// Nostr settings
	nostrPubKey: string;
	nostrRelay: string;
	nostrZapNotify: boolean;
	nostrZapPubkey: string;

	// LED settings
	disableLeds: boolean;
	ledTestOnPower: boolean;
	ledFlashOnUpd: boolean;
	ledFlashOnZap: boolean;
	ledBrightness: number;
	blockFlashColor: number;
	scrnRestoreZap: boolean;

	// Frontlight settings
	hasFrontlight: boolean;
	flDisable: boolean;
	flMaxBrightness: number;
	flAlwaysOn: boolean;
	flEffectDelay: number;
	flFlashOnUpd: boolean;
	flFlashOnZap: boolean;
	hasLightLevel: boolean;
	luxLightToggle: number;
	flOffWhenDark: boolean;

	// Network settings
	wpTimeout: number;
	tzString: string;
	mdnsEnabled: boolean;
	otaEnabled: boolean;
	hostnamePrefix: string;
	hostname: string;
	ip: string;
	txPower: number;

	// HTTP Auth settings
	httpAuthEnabled: boolean;
	httpAuthUser: string;
	httpAuthPass: string;

	// BitAxe settings
	bitaxeEnabled: boolean;
	bitaxeHostname: string;

	// Mining pool settings
	miningPoolStats: boolean;
	miningPoolName: string;
	miningPoolUser: string;
	availablePools: string[];
	poolLogosUrl: string;

	// Currency settings
	actCurrencies: string[];
	availableCurrencies: string[];

	// Firmware/Version info
	gitReleaseUrl: string;
	hwRev: string;
	fsRev: string;
	gitRev: string;
	gitTag: string;
	lastBuildTime: string;

	// Debug settings
	enableDebugLog: boolean;

	// Screen configurations
	screens: Screen[];

	// Do Not Disturb settings
	dnd: DndSettings;

	// Allow additional properties with nested values
	[key: string]: unknown;
}

/**
 * Partial settings for updates (all fields optional)
 */
export type PartialSettings = Partial<Settings>;
