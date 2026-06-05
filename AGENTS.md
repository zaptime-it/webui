# BTClock WebUI — agent guide

Onboarding doc for AI agents working on `data/`. The README is for
humans setting up the toolchain; this file is what an agent should read
to understand **what's already built**, **how the pieces fit together**,
and **where to make changes safely**.

For the WebUI-side architecture diagrams (build pipeline, runtime
data flow, settings save lifecycle, connection/OTA state machine),
see [`doc/ARCHITECTURE.md`](doc/ARCHITECTURE.md) — pairs with this
file. For the firmware-side picture (what the device exposes, what
each endpoint touches), see
[`docs/ARCHITECTURE.md`](https://git.btclock.dev/btclock/btclock_v4/src/branch/main/docs/ARCHITECTURE.md)
in the firmware repo. For the field schema reference (every settings
key + bounds + boot-only flag), see
[`docs/SETTINGS.md`](https://git.btclock.dev/btclock/btclock_v4/src/branch/main/docs/SETTINGS.md).
The relative `../docs/` paths only resolve when the WebUI is checked out
as `data/` inside the firmware tree; the absolute links work everywhere.

---

## 1. Stack at a glance

| Layer              | Choice                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Framework          | SvelteKit + `@sveltejs/adapter-static` (SSR off)                                             |
| Components         | Svelte **5** with runes (`$state`, `$derived`, `$bindable`)                                  |
| Styles             | Tailwind v4 (`@tailwindcss/vite`) + DaisyUI v5                                               |
| i18n               | Paraglide JS v2 — message catalogs in `src/lib/locales/{en,de,es,nl}.json`                   |
| Runtime validation | Valibot — `src/lib/api/schemas.ts`                                                           |
| Drag/drop          | `svelte-dnd-action` — used in `ScreenRotationList`, `CurrencyRotationList`                   |
| Tests              | Vitest (`*.spec.ts` colocated) + Playwright (`tests/`)                                       |
| Build output       | `dist/` → `pnpm build:gz` (wraps `python3 gzip_build.py`) → `build_gz/www/` → LittleFS image |

The build serves from `/lfs/www/` on the device — `gzip_build.py` writes
under `build_gz/www/` because the firmware's `kWebRootBase = "/lfs/www"`
(see `components/webserver/control_server.cpp`). The firmware does no
rewriting: a `GET /` resolves to `index.html`, every other path is a
literal `fopen(/lfs/www/<path>[.gz])`, and missing files 404. The
post-build step in `vite.config.ts` only deletes adapter-static's unused
`bundle.html` SPA fallback so it doesn't get gzipped onto the partition.
`/api` and `/convert` set `prerender = false` and are reached only via
SvelteKit client routing.

---

## 2. Feature folders & what's there today

```
src/lib/
├── api/                  ← typed HTTP wrappers + SSE + Valibot schemas
│   ├── client.ts         ← getSettings/patchSettings, getStatus, show*, lights*, frontlight*, restart, OTA upload
│   ├── external.ts       ← Bitaxe + local-pool reachability tests (CORS-aware)
│   ├── schemas.ts        ← v.parseSettings / v.parseStatus
│   └── sse.ts            ← /events EventSource w/ auto-reconnect
├── stores/               ← Svelte 5 rune stores (singletons)
│   ├── settings.svelte.ts ← state: loading|error|ready, isDirty, load/save/update
│   ├── status.svelte.ts   ← SSE-driven; isFake on disconnect; rssiPercent/wifiStrengthColor derived
│   ├── activeSection.svelte.ts ← which page section is open
│   ├── theme.svelte.ts    ← light / dark
│   ├── toast.svelte.ts    ← global toast queue (success / error / info)
│   └── viewport.svelte.ts ← container-query helpers
├── types/
│   ├── settings.ts       ← Settings, Screen, DndSettings, DataSourceType enum, SettingsState
│   └── status.ts         ← Status, LedStatus, StatusState
├── ui/                   ← generic primitives (no business logic)
│   ├── Field.svelte / NumberField / SelectField / SwitchField / RangeField / ColorField
│   ├── CollapseCard.svelte
│   ├── LedSwatch.svelte     ← read-only LED colour swatch (replaces the old disabled input[type=color])
│   ├── LanguageMenu.svelte / ThemeToggle.svelte / Toasts.svelte / Skeleton.svelte
│   └── FieldActionHarness.svelte ← test harness for the action snippet
├── util/
│   ├── format.ts         ← toUptimeString, hex colour helpers
│   ├── nostr.ts          ← isValidNpub / isValidHexPubKey / getPubKey (npub→hex)
│   ├── currency.ts       ← currency code → symbol map
│   └── version.ts        ← semver compare for VersionCheck
├── locales/              ← Paraglide message JSON (en is the source of truth)
└── features/             ← user-facing panels
    ├── control/          ← Control card (text input, LEDs, frontlight, system, OTA)
    │   ├── Control.svelte
    │   ├── LedColorPickers.svelte
    │   ├── FrontlightControls.svelte
    │   └── SystemInfo.svelte
    ├── status/           ← Status card (right of preview), screen + currency picker
    │   ├── Status.svelte
    │   ├── ScreenButtons.svelte / CurrencyButtons.svelte
    │   ├── ResourceBars.svelte / ConnectionStatus.svelte
    ├── settings/
    │   ├── SettingsPanel.svelte  ← form root; show/hide all + dirty badge
    │   └── sections/
    │       ├── ScreenSpecificSettings.svelte ← screen-toggles + composes the rotation sections below
    │       ├── ScreenRotationSection.svelte   ← collapse wrapper around the screen list
    │       ├── ScreenRotationList.svelte      ← drag/drop screen reorder + per-screen enable
    │       ├── CurrencyRotationSection.svelte ← collapse wrapper around the currency list
    │       ├── CurrencyRotationList.svelte    ← drag/drop currency reorder
    │       ├── DisplaySettings.svelte
    │       ├── DataSourceSettings.svelte
    │       ├── ExtraFeaturesSettings.svelte (DND, Bitaxe, mining-pool, Nostr zap notify, NWC)
    │       ├── NostrRelayList.svelte          ← add/remove Nostr relay chips (used by ExtraFeatures)
    │       ├── ProxySettings.svelte           ← own collapse section: outbound SOCKS/HTTP proxy
    │       ├── SystemSettings.svelte
    │       └── TimezoneSelector.svelte
    ├── firmware/         ← FirmwareUpdater + UploadForm + VersionCheck
    └── convert/          ← /convert page: BTC↔fiat with live rates
```

---

## 3. Features visible on the home page (screenshot reference)

The current main page lays out three cards horizontally (control / status /
settings) with the Convert + API pages routed under `/convert` and `/api`.

### Control card (left)

- **Text overlay** — POST `/api/show/text` with JSON body `{"t":"<text>"}` (legacy `?t=` fallback still accepted), char limit = `numScreens`.
- **LEDs** — colour pickers per panel + "keep same colour" toggle, Set / Off
  via POST `/api/lights/set` and `/api/lights/off`. Hidden when
  `settings.disableLeds`.
- **Frontlight** — Turn off / Turn on / Flash. Only rendered when
  `settings.hasFrontlight && !settings.flDisable` (Rev B today; Rev A and V8
  are hidden by capability).
- **System info** — build time, IP, HW revision, firmware commit, WebUI commit,
  hostname. Populated from the same `/api/settings` payload.
- **Restart / Force full refresh** — POST `/api/restart`, `/api/full_refresh`.
- **Firmware update** — gated on `settings.otaEnabled`. `VersionCheck` fetches
  the latest release tag from the Forgejo Releases API and compares with the
  device's `gitRev`; `UploadForm` streams the binary via XHR with progress.

### Status card (centre)

- Quick screen jump (Block Height, Time, Halving, Block Fee Rate, Sats per
  dollar, Ticker, Market Cap, Bitcoin Supply, Mining Pool Hashrate) — POST
  `/api/show/screen` with JSON body `{"s":<id>}`.
- Per-currency jump (USD / EUR active here) — POST `/api/show/currency` with
  JSON body `{"c":"USD"}`.
- Live 7-panel framebuffer preview rendered by `FramebufferPreview` from
  `/api/preview/ws`.
- Screen cycle pause/resume — POST `/api/action/pause` / `/api/action/timer_restart`.
- Do Not Disturb — POST `/api/dnd/enable` / `/api/dnd/disable`. Schedule
  shown when `dnd.dndTimeEnabled` is set.
- Live LED indicators (read-only colour swatches) — colours come from the SSE
  `leds[]` field.
- Resource bars — `espFreeHeap / espHeapSize`, `rssi`, optional light sensor
  (`lux`), uptime (`espUptime`).
- Data-source connection pill — green when `connectionStatus.price` and
  `.blocks` are both true; the pill is also responsive to `isFake` set by
  the SSE store on disconnect.

### Settings card (right)

- Collapsible sections with global Show all / Hide all and a "Unsaved
  changes" badge driven by `settingsStore.isDirty`.
- **Screen specific** — switches for `stealFocus`, `mcapBigChar`,
  `useBlkCountdown`, `priceSymMode`, `useMscwTime`, `suffixPrice`,
  `mowMode` (gated on `suffixPrice`, with a hint when disabled),
  `decimalShareDot`, `verticalDesc`, `blockFeeDec`, `supplyPercent`. Then the
  draggable **Screens** list (per-screen enable + reorder) and, for
  appropriate data sources, the **Currencies** list with the
  `restartRequired` hint.
- **Display**, **Data source**, **Extra features** (DND time window, Bitaxe,
  mining-pool selection w/ test buttons, Nostr zap notify + relay list,
  Nostr Wallet Connect), **Proxy** (outbound SOCKS/HTTP), **System**.

The "Mow Suffix Mode" copy in the screenshot is intentional — `mowMode` is
the price-suffix style that "mows down" digits as the price grows; verified
in `en.json`.

---

## 4. Architecture rules — what to keep doing

These are the conventions that have already shaped the codebase. New work
should follow them; corrections from a reviewer will likely point here.

1. **Feature folders, not type folders.** Group by `features/<area>/`,
   keep specs colocated. Generic primitives go to `ui/`, never to a
   feature folder.

2. **Discriminated-union state.** `SettingsState` and `StatusState` are
   `{ status: 'loading' } | { status: 'error', error } | { status: 'ready', data }`.
   Don't reintroduce nullable `data` + `isLoaded` flags — TypeScript
   already narrows for you.

3. **Single API client.** All endpoint calls go through
   `src/lib/api/client.ts`. Don't `fetch(\`${PUBLIC_BASE_URL}/api/...\`)`in components. The 3.4.0 firmware moved several endpoints from GET → POST
and from`POST /api/json/settings`→`PATCH /api/settings`; the client
   captures every quirk in one place.

4. **Don't PATCH back computed fields.** `httpAuthPassSet`, `otaPassSet`,
   `gitRev`, `ip`, `lastBuildTime` are device-emitted only. Sending them
   back is at best ignored and at worst clears the password. See the
   destructure in `SettingsPanel.handleSubmit`.

5. **Empty password = leave alone.** When patching settings, drop
   `httpAuthPass` / `otaPass` if the user typed nothing. The firmware
   does not echo plaintext back; an empty PATCH would clear it.

6. **Screens save with `order`.** The submit handler stamps
   `screens.map((s, i) => ({ ...s, order: i }))` before PATCH. The
   firmware treats this as a reorder and requires the full set.

7. **i18n via Paraglide messages.** No raw strings in components — add a
   key under `src/lib/locales/en.json` and reference it as
   `m['section.foo.bar']()`. `pnpm paraglide:compile` regenerates
   `src/lib/paraglide/`.

8. **Valibot at the boundary.** Anything coming off the wire goes through
   `parseSettings` / `parseStatus`. Use `v.looseObject` so the firmware
   can grow fields without breaking the UI.

9. **Capability-gate hardware controls.** `settings.hasFrontlight`,
   `settings.disableLeds`, `data.bitaxeEnabled`, `data.miningPoolStats`,
   `data.nostrZapNotify` decide whether a section is rendered. Never
   render Bitaxe or pool fields based on a hard-coded board guess.

10. **Restart-required is explicit.** Append `({m['restartRequired']()})`
    to the label of any field whose change won't land without a reboot
    (matches the firmware's `boot_only` flag in `settings::schema::kFields`).

11. **SSE is the live path; load() is the cold-start path.** The status
    store does both: `load()` fetches a snapshot once, `connect()` opens
    `/events`. Never poll `/api/status`.

12. **Disconnect is rendered, not toasted.** `statusStore.connected ===
false` (or `data.isFake === true`) draws the "Lost connection"
    overlay over the clock preview. Don't fire toasts on every drop.

13. **Test specs live next to components.** `Foo.svelte` →
    `Foo.spec.ts`. Keep Vitest unit tests for logic, Playwright suites
    for end-to-end flows, screenshot suites for visual regression
    (`playwright.screenshot.config.ts`).

14. **Mocks under `src/mocks/$app/`** for SvelteKit modules so unit
    tests don't need a full Kit runtime.

---

## 5. Wire-up: how a settings change reaches the device

```
User toggles SwitchField
  → bind:checked mutates settingsStore.data via the rune store's set/update
  → settingsStore.isDirty flips true → "Unsaved changes" badge appears
  → user clicks Save
  → SettingsPanel.handleSubmit strips computed fields, blanks empty passwords,
    stamps `order` on screens
  → settingsStore.save(patch) → patchSettings(body) → PATCH /api/settings
  → res.ok ? toast.success + pristine = current : toast.error
```

Status flow:

```
on mount → statusStore.load() (snapshot) + statusStore.connect() (SSE)
  → /events streams `status` JSON every push
  → mergeStatus() shallow-merges into existing data; clears stale isFake
  → derived stores (memoryFreePercent, rssiPercent, wifiStrengthColor)
    update automatically; UI re-renders
```

---

## 6. When you add a new firmware setting

1. Confirm the firmware schema entry in
   `components/settings/include/settings/schema.hpp` (kFields array) and
   whether it's `boot_only`.
2. Extend `Settings` in `data/src/lib/types/settings.ts` (alphabetically
   inside its section).
3. Add a `SwitchField` / `NumberField` / `SelectField` to the relevant
   `sections/*.svelte` — capability-gate (`'foo' in data`) for fields
   the firmware only emits on some boards.
4. Add the label to `locales/en.json` (and the others) and reference it
   via `m[...]()`.
5. Add a Vitest spec covering the bind + the dirty flag.
6. Don't forget `restartRequired` in the label if `boot_only`.
7. If the field is a password, mirror the `httpAuthPass`/`otaPass`
   pattern: device emits `<name>Set`, UI strips on PATCH unless the
   user typed something new.

---

## 7. Improvement ideas

Constructive suggestions, ordered by yield-vs-effort. None are blocking;
file a `bd` issue before starting one of the bigger items.

> **Already shipped — don't re-propose these.** The original list called
> for: surfacing the firmware's `field:reason` on save failure (now
> `parseSettingsError` + scroll-into-view), a parsed `ApiResult` envelope
> instead of a raw `Response`, exponential SSE reconnect backoff capped at
> 30 s (`sse.ts`), named RSSI mapping constants (`RSSI_FLOOR_DBM` /
> `RSSI_CEILING_DBM`), cold-start Valibot validation in
> `getSettings`/`getStatus`, an OTA-aware "Updating firmware…" overlay
> (`statusStore.otaInProgress`), optimistic pause/DND toggles
> (`applyOptimistic`), `Ctrl/Cmd+S` save, a mobile tab/stacked layout, the
> form-level validation summary, generated field schemas
> (`settings.generated.ts` from the firmware `kFields` table), the read-only
> `LedSwatch`, lazy-loaded `/convert`, and a semver-based firmware-mismatch
> banner (`util/version.ts`). All are done — verify in code before assuming
> any are still open.

### Still open

- **Settings dirty diff is JSON-stringify based.** Cheap on a ~100-field
  object today, but if `availableFonts` / `availableCurrencies` grow this
  becomes a hotspot. A per-field `dirtyKeys: Set<keyof Settings>` would also
  unlock per-field "requires restart" warnings.
- **Form save replaces the whole baseline on success.** If two browsers
  edit different sections and one saves, the other clobbers — there's no
  version field. The firmware is single-user in practice; not urgent, but
  worth a `bd` issue to track.
- **Disabled-switch affordance is uneven.** `mowMode` now shows a hint when
  gated off, but other capability-gated controls still grey out without
  saying why, and DaisyUI's disabled state is faint on the dark theme. Add
  hints + a consistent `disabled:` opacity bump.
- **Live preview of screen settings.** Toggling `priceSymMode` only updates
  once the device repaints into the `/api/preview/ws` framebuffer. A local
  canvas / representative preview inside the switch row would tighten the
  loop for fields the firmware doesn't echo immediately.
- **Finish firmware-typings generation.** `settings.generated.ts` covers the
  `kFields` schema, but `Settings` / `Status` still hand-maintain the
  read-only, computed, and divergent-shape fields in `schemas.ts`.
  Generating (or cross-checking) those against the firmware would close the
  last drift gap.

---

## 8. Useful pointers

- Endpoint shapes: [src/lib/api/client.ts](src/lib/api/client.ts) is the
  single source of truth. If a curl recipe doesn't match what the UI does,
  the UI is right.
- Endpoint reference: [static/openapi.yml](static/openapi.yml).
- Firmware-side handler registration:
  [../components/webserver/control_server.cpp](../components/webserver/control_server.cpp).
- Field schema (firmware): [../components/settings/include/settings/schema.hpp](../components/settings/include/settings/schema.hpp).
- Generated field schemas (WebUI): [src/lib/types/settings.generated.ts](src/lib/types/settings.generated.ts)
  — Valibot per-field schemas + bounds derived from the firmware `schema.hpp`
  above. Regenerate with `pnpm generate:settings-meta`; `pnpm check:settings-meta`
  guards against drift.
- Mock fixtures for tests: [src/mocks/](src/mocks/).
- Locales: [src/lib/locales/](src/lib/locales/) — `en.json` is the source;
  others may lag behind.
- Reference screenshots: [doc/screenshot-light.webp](doc/screenshot-light.webp),
  [doc/screenshot-dark.webp](doc/screenshot-dark.webp). Regenerate with
  `pnpm doc:update-screenshots`.
