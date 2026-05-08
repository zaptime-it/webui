/**
 * Valibot schemas for `/api/settings` and `/api/status` payloads — the
 * single source of truth for both runtime validation and the TypeScript
 * shape of the data. `Settings` and `Status` are inferred from these
 * schemas (see `$lib/types/settings`, `$lib/types/status`); adding a new
 * firmware field is one edit here, not two.
 *
 * The per-field schemas for keys covered by the firmware's `kFields`
 * table come from `$lib/types/settings.generated` (regenerated from
 * `components/settings/include/settings/schema.hpp` via
 * `pnpm generate:settings-meta`). Numeric fields carry their min/max
 * bounds, so a bug that pushes a value out of range fails the cold-start
 * parse instead of being silently accepted. Keys whose HTTP shape
 * diverges from NVS (`actCurrencies` is string[] over the wire; `dnd*`
 * is nested) are excluded from the generated record and re-declared
 * here. Read-only / write-only / computed fields not in kFields are
 * declared here too.
 *
 * `looseObject` keeps unknown keys passing through at runtime so the
 * firmware can grow the contract without breaking the UI.
 */

import * as v from 'valibot';
import { settingsFieldSchemas } from '$lib/types/settings.generated';

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

// Drop kField keys whose HTTP JSON shape differs from the flat NVS
// shape (`actCurrencies` ships as string[]; `dnd*` flatten into a
// nested `dnd` object). Also unwrap a few keys we need to re-declare:
//   - v4-only kFields (hideLeadZero/wifiRebootMin/bitaxePollSec/
//     poolWorker/poolPollSec) become `v.optional(...)` for v3 compat
//   - `miningPoolUser` is stripped from the GET response when the
//     active pool keeps a secret in the user slot (ViaBTC, Foundry);
//     in that case the device emits `miningPoolUserSet` instead.
const {
	actCurrencies: _act,
	dndEnabled: _dndEnabled,
	dndEndHour: _dndEndHour,
	dndEndMin: _dndEndMin,
	dndStartHour: _dndStartHour,
	dndStartMin: _dndStartMin,
	dndTimeEnabled: _dndTimeEnabled,
	hideLeadZero: hideLeadZeroSchema,
	wifiRebootMin: wifiRebootMinSchema,
	bitaxePollSec: bitaxePollSecSchema,
	poolWorker: poolWorkerSchema,
	poolPollSec: poolPollSecSchema,
	satsVariant: satsVariantSchema,
	digitFontPx: digitFontPxSchema,
	decimalShareDot: decimalShareDotSchema,
	miningPoolUser: miningPoolUserSchema,
	// Proxy fields landed after the initial v4 release — pre-proxy
	// builds (and v3) don't emit them. Make every kField optional and
	// re-declare below.
	proxyEnabled: proxyEnabledSchema,
	proxyType: proxyTypeSchema,
	proxyHost: proxyHostSchema,
	proxyPort: proxyPortSchema,
	proxyUser: proxyUserSchema,
	proxyPass: proxyPassSchema,
	proxyBypass: proxyBypassSchema,
	// nostrZapPubkeys ships as string[] over the wire (CSV in NVS) — same
	// pattern as actCurrencies. Drop the auto-generated kString schema and
	// re-declare as v.array(v.string()) below.
	nostrZapPubkeys: _nostrZapPubkeys,
	...kFieldsHttp
} = settingsFieldSchemas;
void _nostrZapPubkeys;
void _act;
void _dndEnabled;
void _dndEndHour;
void _dndEndMin;
void _dndStartHour;
void _dndStartMin;
void _dndTimeEnabled;

export const settingsSchema = v.looseObject({
	...kFieldsHttp,

	// kField keys with a divergent HTTP shape:
	actCurrencies: v.array(v.string()),
	// nostrZapPubkeys ships as JSON array; CSV in NVS. Stored next to the
	// legacy kString `nostrZapPubkey` (still in kFieldsHttp) which the
	// firmware keeps populated as the array's first entry for back-compat
	// with stale clients. Multi-pubkey reception is plumbed through the
	// firmware listener via NIP-01's `#p` array filter. Optional so a
	// pre-multi firmware (or v3) without the plural key still parses;
	// the WebUI falls back to wrapping `nostrZapPubkey` into a 1-entry
	// list in that case.
	nostrZapPubkeys: v.optional(v.array(v.string())),

	// nostrRelays follows the same pattern as nostrZapPubkeys: JSON array
	// on the wire, CSV in NVS. The firmware keeps the legacy kString
	// `nostrRelay` (still in kFieldsHttp) populated as the array's first
	// entry for back-compat. Boot-only — a PATCH that changes the list
	// returns rebootRequired=true. Optional so a pre-rc.4 firmware (or v3)
	// without the plural key still parses; the WebUI falls back to wrapping
	// `nostrRelay` into a 1-entry list in that case.
	nostrRelays: v.optional(v.array(v.string())),

	// v4-only fields. Optional so v3 devices (which don't emit them) parse.
	hideLeadZero: v.optional(hideLeadZeroSchema),
	wifiRebootMin: v.optional(wifiRebootMinSchema),
	bitaxePollSec: v.optional(bitaxePollSecSchema),
	poolWorker: v.optional(poolWorkerSchema),
	poolPollSec: v.optional(poolPollSecSchema),
	// satsVariant landed in firmware after the initial v4 release —
	// pre-satsVariant builds (and v3) don't emit it.
	satsVariant: v.optional(satsVariantSchema),
	// digitFontPx is v4-only — older firmware doesn't emit it.
	digitFontPx: v.optional(digitFontPxSchema),
	// decimalShareDot replaced suffixShareDot in firmware; older builds
	// still emit suffixShareDot under the previous name.
	decimalShareDot: v.optional(decimalShareDotSchema),

	// Outbound proxy. v4-only and only present once the proxy_transport
	// component lands. Optional so pre-proxy v4 fixtures and v3 devices
	// parse cleanly. proxyPass is suppressed in GET (see proxyPassSet
	// below); the field is declared here for the PATCH shape.
	proxyEnabled: v.optional(proxyEnabledSchema),
	proxyType: v.optional(proxyTypeSchema),
	proxyHost: v.optional(proxyHostSchema),
	proxyPort: v.optional(proxyPortSchema),
	proxyUser: v.optional(proxyUserSchema),
	proxyPass: v.optional(proxyPassSchema),
	proxyBypass: v.optional(proxyBypassSchema),

	// miningPoolUser: the device strips this for pools whose user slot
	// holds a secret API key (ViaBTC, Foundry) and emits the companion
	// `miningPoolUserSet` boolean instead — same protocol as the auth
	// passwords. Both are therefore optional on GET.
	miningPoolUser: v.optional(miningPoolUserSchema),
	miningPoolUserSet: v.optional(v.boolean()),

	// Fields the firmware emits but doesn't store via kFields (read-only
	// metadata, runtime flags, write-only buffers, derived):
	numScreens: v.number(),
	timerSeconds: v.number(),
	timerRunning: v.boolean(),
	txPower: v.number(),
	availableFonts: v.array(v.string()),
	availablePools: v.array(v.string()),
	availableCurrencies: v.array(v.string()),
	hostname: v.string(),
	ip: v.string(),
	httpAuthPassSet: v.boolean(),
	otaPassSet: v.boolean(),
	// proxyPass is suppressed in GET (mirrors httpAuthPass / otaPass);
	// the device emits this companion boolean instead. Optional so v3
	// devices and pre-proxy v4 builds parse without it.
	proxyPassSet: v.optional(v.boolean()),
	hwRev: v.string(),
	fsRev: v.string(),
	// gitRev / gitTag / lastBuildTime are only emitted when populated:
	// dev builds without a tagged commit, with empty git rev, or with a
	// missing build-time stamp omit the relevant key entirely (no empty
	// string / zero placeholder).
	gitRev: v.optional(v.string()),
	gitTag: v.optional(v.string()),
	lastBuildTime: v.optional(v.union([v.number(), v.string()])),

	// lightLevel is only emitted on boards with an ambient light sensor
	// (`hasLightLevel === true`); Rev A and other sensor-less boards
	// omit it entirely.
	lightLevel: v.optional(v.number()),

	// Nested / structured shapes:
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

export const nostrRelayStatusSchema = v.object({
	url: v.string(),
	connected: v.boolean()
});

export const connectionStatusSchema = v.object({
	price: v.boolean(),
	blocks: v.boolean(),
	V2: v.optional(v.boolean()),
	// Firmware ≥ 4.0.0-rc.4 ships per-relay state as an array; pre-rc.4
	// builds emitted a single boolean. Accept either so a fleet mid-upgrade
	// keeps parsing.
	nostr: v.optional(v.union([v.boolean(), v.array(nostrRelayStatusSchema)]))
});

export const statusSchema = v.looseObject({
	data: v.array(v.string()),
	espFreeHeap: v.number(),
	espHeapSize: v.number(),
	leds: v.array(ledSchema),
	connectionStatus: connectionStatusSchema
});

export const parseStatus = (raw: unknown) => v.parse(statusSchema, raw);
