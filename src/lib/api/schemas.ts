/**
 * Valibot schemas for `/api/settings` and `/api/status` payloads — the
 * single source of truth for both runtime validation and the TypeScript
 * shape of the data. `Settings` and `Status` are inferred from these
 * schemas (see `$lib/types/settings`, `$lib/types/status`); adding a new
 * firmware field is one edit here, not two.
 *
 * `looseObject` keeps unknown keys passing through at runtime so the
 * firmware can grow the contract without breaking the UI; only the
 * critical invariants are enforced.
 */

import * as v from 'valibot';

/* ---------- shared shapes ---------- */

export const dndSettingsSchema = v.object({
	enabled: v.boolean(),
	dndTimeEnabled: v.boolean(),
	startHour: v.number(),
	startMinute: v.number(),
	endHour: v.number(),
	endMinute: v.number()
});

export const screenSchema = v.object({
	id: v.number(),
	name: v.string(),
	enabled: v.boolean(),
	/**
	 * Zero-based position in the rotation sequence. The firmware emits
	 * this explicitly so the UI doesn't depend on JsonArray iteration
	 * order, and so a reorder PATCH has an unambiguous field to write
	 * back. Required on GET; required on PATCH only when reordering.
	 */
	order: v.number()
});

/* ---------- settings ---------- */

// `looseObject` so the firmware can add fields without breaking the UI.
// The declared shape doubles as the canonical TS type via `v.InferOutput`.
export const settingsSchema = v.looseObject({
	// Display
	numScreens: v.number(),
	invertedColor: v.boolean(),
	timerSeconds: v.number(),
	timerRunning: v.boolean(),
	fullRefreshMin: v.number(),
	fontName: v.string(),
	availableFonts: v.array(v.string()),
	stealFocus: v.boolean(),
	mcapBigChar: v.boolean(),
	useSatsSymbol: v.boolean(),
	useMscwTime: v.boolean(),
	useBlkCountdown: v.boolean(),
	suffixPrice: v.boolean(),
	mowMode: v.boolean(),
	verticalDesc: v.boolean(),
	blockFeeDec: v.boolean(),
	supplyPercent: v.boolean(),
	refrScrnChange: v.boolean(),
	inverseButtons: v.boolean(),
	suffixShareDot: v.boolean(),
	/**
	 * v4-only — drops the leading zero on single-digit hours (`07:00` →
	 * `7:00`). Optional because a v3 device never emits this key.
	 */
	hideLeadZero: v.optional(v.boolean()),

	// Data source
	minSecPriceUpd: v.number(),
	dataSource: v.number(),
	mempoolInstance: v.string(),
	mempoolSecure: v.boolean(),
	localPoolHost: v.string(),
	ceEndpoint: v.string(),
	ceDisableSSL: v.boolean(),

	// Nostr
	nostrPubKey: v.string(),
	nostrRelay: v.string(),
	nostrZapNotify: v.boolean(),
	nostrZapPubkey: v.string(),

	// LED
	disableLeds: v.boolean(),
	ledTestOnPower: v.boolean(),
	ledFlashOnUpd: v.boolean(),
	ledFlashOnZap: v.boolean(),
	ledBrightness: v.number(),
	blockFlashColor: v.number(),
	scrnRestoreZap: v.boolean(),

	// Frontlight
	hasFrontlight: v.boolean(),
	flDisable: v.boolean(),
	flMaxBrightness: v.number(),
	flAlwaysOn: v.boolean(),
	flEffectDelay: v.number(),
	flFlashOnUpd: v.boolean(),
	flFlashOnZap: v.boolean(),
	hasLightLevel: v.boolean(),
	luxLightToggle: v.number(),
	flOffWhenDark: v.boolean(),

	// Network
	wpTimeout: v.number(),
	tzString: v.string(),
	mdnsEnabled: v.boolean(),
	otaEnabled: v.boolean(),
	hostnamePrefix: v.string(),
	hostname: v.string(),
	ip: v.string(),
	txPower: v.number(),
	/**
	 * v4-only — soft-watchdog. If WiFi stays down for this many minutes
	 * the device reboots itself. 0 disables.
	 */
	wifiRebootMin: v.optional(v.number()),

	// HTTP auth. `httpAuthPass` is PATCH-only (form input buffer); the
	// device only reports whether one is stored via `httpAuthPassSet`.
	httpAuthEnabled: v.boolean(),
	httpAuthUser: v.string(),
	httpAuthPass: v.string(),
	httpAuthPassSet: v.boolean(),

	// ArduinoOTA. Same PATCH-only / *Set-flag pattern as HTTP auth above.
	otaPass: v.string(),
	otaPassSet: v.boolean(),

	// Bitaxe
	bitaxeEnabled: v.boolean(),
	bitaxeHostname: v.string(),
	/** v4-only — Bitaxe LAN poll cadence in seconds. Bounds: 5..300. */
	bitaxePollSec: v.optional(v.number()),

	// Mining pool
	miningPoolStats: v.boolean(),
	miningPoolName: v.string(),
	miningPoolUser: v.string(),
	/** v4-only — secondary identifier scoped under miningPoolUser. */
	poolWorker: v.optional(v.string()),
	poolGlobalStats: v.boolean(),
	availablePools: v.array(v.string()),
	poolLogosUrl: v.string(),
	/** v4-only — mining-pool HTTPS poll cadence in seconds. Bounds: 10..3600. */
	poolPollSec: v.optional(v.number()),

	// Currency
	actCurrencies: v.array(v.string()),
	availableCurrencies: v.array(v.string()),

	// Firmware / version info
	gitReleaseUrl: v.string(),
	hwRev: v.string(),
	fsRev: v.string(),
	gitRev: v.string(),
	gitTag: v.string(),
	lastBuildTime: v.union([v.number(), v.string()]),

	// Debug
	enableDebugLog: v.boolean(),

	screens: v.array(screenSchema),
	dnd: dndSettingsSchema,

	// Client-only derived field — `timerSeconds / 60`, managed in the UI.
	// Not produced by the device; declared optional so a fresh GET still
	// validates without it.
	timePerScreen: v.optional(v.number())
});

export const parseSettings = (raw: unknown) => v.parse(settingsSchema, raw);

/* ---------- status ---------- */

export const ledSchema = v.object({
	hex: v.string(),
	red: v.optional(v.number()),
	green: v.optional(v.number()),
	blue: v.optional(v.number())
});

export const connectionStatusSchema = v.object({
	price: v.boolean(),
	blocks: v.boolean(),
	V2: v.optional(v.boolean()),
	nostr: v.optional(v.boolean())
});

export const statusSchema = v.looseObject({
	data: v.array(v.string()),
	espFreeHeap: v.number(),
	espHeapSize: v.number(),
	leds: v.array(ledSchema),
	connectionStatus: connectionStatusSchema
});

export const parseStatus = (raw: unknown) => v.parse(statusSchema, raw);
