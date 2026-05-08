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
│   ├── LanguageMenu.svelte / ThemeToggle.svelte / Toasts.svelte / Skeleton.svelte
│   └── FieldActionHarness.svelte ← test harness for the action snippet
├── util/
│   ├── format.ts         ← toUptimeString, hex colour helpers
│   ├── nostr.ts          ← isValidNpub / isValidHexPubKey / getPubKey (npub→hex)
│   ├── currency.ts       ← currency code → symbol map
│   └── version.ts        ← semver compare for VersionCheck
├── locales/              ← Paraglide message JSON (en is the source of truth)
└── features/             ← user-facing panels
    ├── clock/            ← ClockDisplay (the 7-panel preview); icons/
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
    │       ├── ScreenSpecificSettings.svelte ← screen-toggles + composes the two rotation lists below
    │       ├── ScreenRotationList.svelte     ← drag/drop screen reorder + per-screen enable
    │       ├── CurrencyRotationList.svelte   ← drag/drop currency reorder
    │       ├── DisplaySettings.svelte
    │       ├── DataSourceSettings.svelte
    │       ├── ExtraFeaturesSettings.svelte (DND, Bitaxe, mining-pool, Nostr zap notify)
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

- **Text overlay** — POST `/api/show/text?t=<text>`, char limit = `numScreens`.
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
  `/api/show/screen?s=<id>`.
- Per-currency jump (USD / EUR active here) — POST `/api/show/currency?c=USD`.
- Live 7-panel preview rendered by `ClockDisplay` from the SSE `data[]` array
    - glyph hints in `status`.
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
  `useBlkCountdown`, `useSatsSymbol`, `useMscwTime`, `suffixPrice`,
  `mowMode` (gated on `suffixPrice`), `suffixShareDot` (gated on
  `suffixPrice`), `verticalDesc`, `blockFeeDec`, `supplyPercent`. Then the
  draggable **Screens** list (per-screen enable + reorder) and, for
  appropriate data sources, the **Currencies** list with the
  `restartRequired` hint.
- **Display**, **Data source**, **Extra features** (DND time window, Bitaxe,
  mining-pool selection w/ test buttons, Nostr zap notify), **System**.

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

### Low-hanging

- **Toast on save failure shows raw HTTP status only** — `${res.status}: ${res.statusText}`
  isn't actionable. The firmware returns a JSON body with `{ error, field }`
  on validation failures; surface `field` so the user knows which field was
  rejected, and scroll the corresponding `Field` into view.
- **`patchSettings` is fire-and-forget on errors.** `client.ts` returns the
  raw `Response` so the store can't distinguish "device 4xx-rejected the
  body" from "network blip". Wrap responses in
  `{ ok, status, body }` and parse the body once.
- **No retry on `/events` timeout.** `sse.ts` reconnects on `error` (1 s)
  and `closing` (5 s) but doesn't back off. On a flaky AP this hammers the
  device with reconnects. Exponential backoff capped at, say, 30 s.
- **`statusStore.rssiPercent` clamps below 2 %.** The `Math.min(Math.max(2 *
(rssi + 100), 0), 100)` floor at 0 then clamps at 100; the `2 *` factor
  is a magic number — pull it into a named constant or move to a
  documented mapping (`-100 dBm → 0 %`, `-50 dBm → 100 %`).
- **Schema validation isn't called.** `parseSettings`/`parseStatus` exist
  but `client.ts` returns unvalidated JSON. Wire them into the cold-start
  path (the SSE hot path is fine to skip — frames are too frequent).
- **Lost-connection overlay is the only feedback during OTA.** While
  `/upload/firmware` runs, the device can't reply to anything else. The
  overlay says "Trying to reconnect..." which is misleading. Detect "OTA
  in progress" (we just kicked one off in `UploadForm`) and show
  "Updating firmware — device will restart shortly" instead.

### Medium

- **Settings dirty diff is JSON-stringify based.** Cheap on a ~100-field
  object today, but if `availableFonts` or `availableCurrencies` start
  growing this becomes a hotspot. Switch to a per-field diff that tracks
  `dirtyKeys: Set<keyof Settings>`; that also unlocks per-field warnings
  ("this field requires restart").
- **No optimistic UI for control actions.** Clicking "Pause" calls
  `/api/action/pause` then waits for the next SSE frame to flip the
  button. If WiFi is slow the button feels broken. Optimistically flip
  `status.timerRunning` and reconcile on the next frame; if the API call
  fails, snap back and toast.
- **Form save replaces the whole baseline on success.** If two browsers
  edit different sections and one saves, the other clobbers — there's
  no version field. The firmware is single-user in practice; not urgent
  but worth a `bd` issue to track.
- **No keyboard shortcut to save.** `Ctrl/Cmd+S` should submit the dirty
  form. Tiny QoL win; `data-testid` already makes it test-able.
- **Tabs vs. cards.** Three side-by-side cards are great on desktop but
  the mobile layout stacks them vertically in a single long page. A
  bottom-tabbed layout would cut scroll on phones.
- **Dark mode contrast on disabled switches.** DaisyUI's default disabled
  state is barely visible on the dark theme; bump opacity or use a
  custom `disabled:opacity-60` rule.
- **`SwitchField` gating is implicit.** "Mow Suffix Mode" and "Suffix
  share dot" both `disabled={!data.suffixPrice}`, but the disabled state
  doesn't explain _why_. Add a tooltip or helper text.

### Larger / requires alignment

- **Form-level validation summary.** Today each `Field` shows its own
  invalid state (e.g. `nostrZapPubkey`). For a long form, an
  inline summary at the top of `SettingsPanel` listing every invalid
  field with anchor links would help users find errors after a save
  attempt.
- **Reduce bundle size by lazy-loading the Convert page.** It pulls
  `useExchangeRates` + currency map + extra fonts; on a fresh load over
  the AP the user usually wants the dashboard, not the converter.
  SvelteKit's route splits help but verify with `vite build --report`.
- **Replace `colour input[type=color]`** for the LED indicators with a
  proper read-only swatch component. The native control still lets users
  click and open the OS colour picker even though we set `disabled`.
- **Live preview of screen settings.** Toggling `useSatsSymbol` doesn't
  show a preview until the device repaints. A small canvas-based
  preview (or just a representative emoji string) inside the switch row
  would tighten the feedback loop.
- **WebUI/firmware version mismatch warning is binary.** The yellow
  warning fires whenever the commits differ — even by one tiny WebUI
  patch. Compare _semver_ (the firmware tag) instead of the commit, or
  at least let users dismiss the warning per-session.
- **API typings drift from firmware.** `Settings` is hand-maintained.
  Generating it from the firmware's `kFields` table (or vice versa)
  would close a real gap — today an agent adding a field has to remember
  to update both.

---

## 8. Useful pointers

- Endpoint shapes: [src/lib/api/client.ts](src/lib/api/client.ts) is the
  single source of truth. If a curl recipe doesn't match what the UI does,
  the UI is right.
- Endpoint reference: [static/openapi.yml](static/openapi.yml).
- Firmware-side handler registration:
  [../components/webserver/control_server.cpp](../components/webserver/control_server.cpp).
- Field schema (firmware): [../components/settings/include/settings/schema.hpp](../components/settings/include/settings/schema.hpp).
- Mock fixtures for tests: [src/mocks/](src/mocks/).
- Locales: [src/lib/locales/](src/lib/locales/) — `en.json` is the source;
  others may lag behind.
- Reference screenshots: [doc/screenshot-light.webp](doc/screenshot-light.webp),
  [doc/screenshot-dark.webp](doc/screenshot-dark.webp). Regenerate with
  `pnpm doc:update-screenshots`.
