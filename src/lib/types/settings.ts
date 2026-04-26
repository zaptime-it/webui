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
	/**
	 * Zero-based position in the rotation sequence. The firmware emits this
	 * explicitly so the UI doesn't depend on JsonArray iteration order, and
	 * so a reorder PATCH has an unambiguous field to write back. Required
	 * on GET; required on PATCH only when reordering — the SettingsPanel
	 * submit handler augments each entry with its current index.
	 */
	order: number;
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
	/**
	 * v4-only — drops the leading zero on single-digit hours
	 * (`07:00` → `7:00`). The clock screen reads this on every render and
	 * the on_settings_patched hook calls MarkDirty, so a PATCH repaints
	 * the next frame without a reboot. Optional because a v3 device
	 * never emits this key — `'hideLeadZero' in data` gates the UI.
	 */
	hideLeadZero?: boolean;

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
	/**
	 * v4-only — soft-watchdog. If WiFi stays down for this many minutes
	 * the device reboots itself. Default 10 minutes (matches the legacy
	 * Arduino main.cpp checkWiFiConnection cadence). 0 disables.
	 */
	wifiRebootMin?: number;

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
	/**
	 * v4-only — Bitaxe LAN poll cadence in seconds. BitaxeSource::Run()
	 * re-reads NVS every tick, so PATCHes land on the next poll without
	 * a reboot. Bounds: 5..300 (matches firmware FieldSpec). Optional
	 * for v3 compatibility.
	 */
	bitaxePollSec?: number;

	// Mining pool
	miningPoolStats: boolean;
	miningPoolName: string;
	miningPoolUser: string;
	/**
	 * v4-only — secondary identifier scoped under miningPoolUser. Foundry:
	 * subaccount path segment; Braiins/CKPool: worker name. Optional.
	 */
	poolWorker?: string;
	poolGlobalStats: boolean;
	availablePools: string[];
	poolLogosUrl: string;
	/**
	 * v4-only — mining-pool HTTPS poll cadence in seconds. Runtime-editable
	 * per PoolDataSource::poll_interval_ms(). Bounds: 10..3600.
	 */
	poolPollSec?: number;

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
