/**
 * Settings types for the BTClock device.
 *
 * `Settings` is the full, validated shape returned by `GET /api/settings` and
 * sent back with `PATCH /api/settings`. `SettingsState` is the store-facing
 * discriminated union that replaces the old `PartialSettings` + `isLoaded` sentinel.
 *
 * 3.4.0 changes:
 *  - `customEndpoint` is retired; the firmware no longer reads or migrates it.
 *    Use `ceEndpoint` for both BTCLOCK and CUSTOM data-source modes.
 *  - `httpAuthPass` / `otaPass` are *never* returned by the device. GET responds
 *    with `httpAuthPassSet` / `otaPassSet` boolean flags instead so the UI can
 *    render a "password is set" indicator without leaking the plaintext. These
 *    keys are PATCH-only: only send them when the user actually entered a new
 *    value (see SettingsPanel.handleSubmit).
 */

export enum DataSourceType {
	BTCLOCK_SOURCE = 0,
	THIRD_PARTY_SOURCE = 1,
	NOSTR_SOURCE = 2,
	CUSTOM_SOURCE = 3
}

export interface Screen {
	id: number;
	name: string;
	enabled: boolean;
}

export interface DndSettings {
	enabled: boolean;
	dndTimeEnabled: boolean;
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
}

export interface Settings {
	// Display
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
	useMscwTime: boolean;
	useBlkCountdown: boolean;
	suffixPrice: boolean;
	mowMode: boolean;
	verticalDesc: boolean;
	blockFeeDec: boolean;
	supplyPercent: boolean;
	refrScrnChange: boolean;
	inverseButtons: boolean;
	suffixShareDot: boolean;

	// Data source
	minSecPriceUpd: number;
	dataSource: DataSourceType | number;
	mempoolInstance: string;
	mempoolSecure: boolean;
	localPoolHost: string;
	ceEndpoint: string;
	ceDisableSSL: boolean;

	// Nostr
	nostrPubKey: string;
	nostrRelay: string;
	nostrZapNotify: boolean;
	nostrZapPubkey: string;

	// LED
	disableLeds: boolean;
	ledTestOnPower: boolean;
	ledFlashOnUpd: boolean;
	ledFlashOnZap: boolean;
	ledBrightness: number;
	blockFlashColor: number;
	scrnRestoreZap: boolean;

	// Frontlight
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

	// Network
	wpTimeout: number;
	tzString: string;
	mdnsEnabled: boolean;
	otaEnabled: boolean;
	hostnamePrefix: string;
	hostname: string;
	ip: string;
	txPower: number;

	// HTTP auth. `httpAuthPass` is PATCH-only (form input buffer); the
	// device only reports whether one is stored via `httpAuthPassSet`.
	httpAuthEnabled: boolean;
	httpAuthUser: string;
	httpAuthPass: string;
	httpAuthPassSet: boolean;

	// ArduinoOTA. Same PATCH-only / *Set-flag pattern as the HTTP auth
	// password above. New in 3.4.0.
	otaPass: string;
	otaPassSet: boolean;

	// Bitaxe
	bitaxeEnabled: boolean;
	bitaxeHostname: string;

	// Mining pool
	miningPoolStats: boolean;
	miningPoolName: string;
	miningPoolUser: string;
	poolGlobalStats: boolean;
	availablePools: string[];
	poolLogosUrl: string;

	// Currency
	actCurrencies: string[];
	availableCurrencies: string[];

	// Firmware / version info
	gitReleaseUrl: string;
	hwRev: string;
	fsRev: string;
	gitRev: string;
	gitTag: string;
	lastBuildTime: number | string;

	// Debug
	enableDebugLog: boolean;

	screens: Screen[];
	dnd: DndSettings;

	// Client-only derived field — `timerSeconds / 60`, managed in the UI.
	timePerScreen?: number;

	[key: string]: unknown;
}

/**
 * Store-facing state for the loaded settings. Using a discriminated union
 * eliminates the `isLoaded` sentinel and gives TypeScript narrowing for free.
 */
export type SettingsState =
	| { status: 'loading' }
	| { status: 'error'; error: string }
	| { status: 'ready'; data: Settings };
