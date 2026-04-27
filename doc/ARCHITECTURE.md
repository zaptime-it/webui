# BTClock WebUI architecture

This file is the **WebUI-side** companion to the firmware repo's
[`docs/ARCHITECTURE.md`](https://git.btclock.dev/btclock/btclock_v4/src/branch/main/docs/ARCHITECTURE.md).
It describes how the SvelteKit code is laid out, how data flows
through it, and how it talks to the firmware. For the contributor
onboarding doc (conventions, common pitfalls, when-to-do-what) see
[`AGENTS.md`](../AGENTS.md).

The diagrams below are [Mermaid](https://mermaid.js.org/) — Forgejo,
GitHub, and most Markdown previewers render them inline. Plain text
fallback is intentional: read the labels.

---

## 1. Build pipeline

```mermaid
flowchart LR
	src[("src/<br/>SvelteKit + Svelte 5 + TS")] --> vite[/"vite build"/]
	vite --> dist[("dist/<br/>bundle.html + assets")]
	dist --> rewrap[/"closeBundle hook<br/>(vite.config.ts)"/]
	rewrap --> dist2[("dist/<br/>bundle.js + index.html")]
	dist2 --> gz[/"gzip_build.py<br/>(pnpm build:gz)"/]
	gz --> bgz[("build_gz/www/<br/>*.gz")]
	bgz --> lfs[("LittleFS image<br/>littlefs_*.bin")]
	lfs --> dev["BTClock device<br/>/lfs/www/"]
```

Key points:

- `bundleStrategy: 'single'` (svelte.config.js) is required — the
  firmware's `control_server.cpp` only serves a single `bundle.js`
  - `index.html` from `/lfs/www/`. Code-splitting per route does not
    work today; see [webui-4wa] notes in `routes/convert/lazy.spec.ts`.
- The post-build rewrap step removes SvelteKit's hydration markers
  and rewrites the script entrypoint to anchor on `.overlay`.
- Compression has to land at `build_gz/www/` (the `www/` segment
  matches `kWebRootBase = "/lfs/www"` in firmware).

---

## 2. Runtime data flow

```mermaid
flowchart TB
	subgraph Browser
		direction TB
		ui["UI components<br/>(features/*)"]
		stores["Rune stores<br/>settings.svelte.ts<br/>status.svelte.ts<br/>toast.svelte.ts"]
		client["api/client.ts<br/>(getSettings, patchSettings,<br/>show*, lights*, ...)"]
		sse["api/sse.ts<br/>EventSource + backoff"]
		schemas["api/schemas.ts<br/>Valibot parseSettings/parseStatus"]
	end
	subgraph Device
		direction TB
		fw["control_server.cpp"]
		nvs[("NVS<br/>settings namespace")]
		sseOut["sse_server.cpp"]
	end

	ui -->|"reads via $derived"| stores
	stores -->|"load() / save()"| client
	client -->|"GET /api/settings<br/>PATCH /api/settings<br/>POST /api/show/...<br/>POST /api/lights/...<br/>POST /api/restart<br/>etc."| fw
	client -.->|"validates cold-start payload"| schemas
	stores -->|"connect()"| sse
	sse -->|"GET /events"| sseOut
	sseOut -->|"event: status<br/>data: closing"| sse
	sse -->|"onStatus(json)"| stores
	fw <--> nvs
```

Rules of the road:

1. **All HTTP goes through `api/client.ts`.** Never `fetch(...)` from
   a component. The client centralises endpoint shapes, password
   redaction on PATCH, response envelope (`ApiResult`), and Valibot
   validation on cold-start GETs.
2. **SSE is the live path; `load()` is the cold-start path.** The
   status store does both: `load()` fetches a snapshot once,
   `connect()` opens `/events`. Never poll `/api/status`.
3. **Discriminated-union state** (`{ status: 'loading' | 'error' |
'ready', ... }`) keeps stores narrowing-friendly. Don't reintroduce
   nullable `data` + `isLoaded` flags.

---

## 3. Settings save lifecycle

```mermaid
sequenceDiagram
	autonumber
	participant U as User
	participant SP as SettingsPanel
	participant SS as settingsStore
	participant API as api/client.ts
	participant FW as Firmware
	U->>SP: Toggle SwitchField (or Cmd+S)
	SP->>SS: bind:checked → set('foo', true)
	SS-->>SP: dirtyKeys = {foo}, isDirty = true
	SP-->>U: badge "Unsaved changes"
	U->>SP: Click Save
	SP->>SP: handleSubmit strips computed fields,<br/>blanks empty passwords,<br/>stamps screens[].order = i
	SP->>SS: save(patch)
	SS->>API: patchSettings(patch)
	API->>FW: PATCH /api/settings
	alt 200 OK
		FW-->>API: 200 (or { rebootRequired: true })
		API-->>SS: { ok:true, body, ... }
		SS-->>SP: pristine = current, dirtyKeys = {}
		SP-->>U: toast.success
	else 400 Bad Request
		FW-->>API: 400 { error: "<field>:<reason>" }
		API-->>SS: { ok:false, body: { error }, ... }
		SS-->>SP: returns ApiResult; dirtyKeys unchanged
		SP->>SP: parseSettingsError → { field, reason }
		SP->>SP: pop owning section open<br/>scroll input into view
		SP-->>U: toast.error("field: reason")
	end
```

Drift-detection bonus path (see [webui-prk]): on `window.focus`,
`settingsStore.checkRemoteDrift()` re-fetches `/api/settings` and
diffs against the pristine baseline. Any field that differs _and_
the user hasn't locally edited counts as drift; the UI surfaces a
dismissible "settings changed on the device" banner.

---

## 4. Connection & OTA state machine

```mermaid
stateDiagram-v2
	[*] --> Disconnected
	Disconnected --> Connecting: statusStore.connect()
	Connecting --> Connected: SSE onOpen
	Connected --> Connected: status frame<br/>(merge into store,<br/>clear optimistic overlay)
	Connected --> Reconnecting: SSE error<br/>(exp backoff 1→30 s)
	Connected --> CleanReconnect: data: closing<br/>(flat 5 s)
	Reconnecting --> Connecting: timer fires
	CleanReconnect --> Connecting: timer fires
	Connected --> OtaInProgress: UploadForm.beginOtaUpload()
	OtaInProgress --> OtaInProgress: device unreachable<br/>(overlay reads "Updating firmware…")
	OtaInProgress --> Connected: SSE onOpen<br/>(post-OTA reconnect<br/>clears flag)
	OtaInProgress --> Connected: UploadForm.endOtaUpload()<br/>(upload failed)
```

The crucial invariant: the "lost connection" overlay reads
`statusStore.otaInProgress` _before_ falling back to the generic
"trying to reconnect" copy. Without that, every OTA upload looks
like a crash to the user.

---

## 5. Component / feature map

```mermaid
flowchart LR
	subgraph "src/lib/ui (generic primitives)"
		Field
		NumberField
		SelectField
		SwitchField
		ColorField
		RangeField
		CollapseCard
		Skeleton
		Toasts
		ThemeToggle
		LanguageMenu
		LedSwatch
	end

	subgraph "src/lib/features"
		direction TB
		clock["clock/<br/>ClockDisplay"]
		control["control/<br/>Control, LedColorPickers,<br/>FrontlightControls, SystemInfo"]
		statusF["status/<br/>Status, ScreenButtons,<br/>CurrencyButtons,<br/>ResourceBars,<br/>ConnectionStatus"]
		settings["settings/<br/>SettingsPanel +<br/>sections/*"]
		firmware["firmware/<br/>FirmwareUpdater,<br/>UploadForm,<br/>VersionCheck"]
		convert["convert/<br/>Converter,<br/>useExchangeRates"]
	end

	settings --> SwitchField
	settings --> NumberField
	settings --> SelectField
	settings --> Field
	settings --> CollapseCard
	control --> Field
	control --> SwitchField
	statusF --> LedSwatch
	statusF --> clock
	firmware --> Field
```

Generic primitives live in `src/lib/ui/` and have **no business
logic**. Feature folders compose them into self-contained panels.
A new piece of UI either fits into one of the existing feature
folders (preferred) or motivates a new one — never goes into `ui/`
unless it's a primitive.

---

## 6. Files worth knowing

| File                                             | Why it matters                                                  |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/lib/api/client.ts`                          | Single source of truth for endpoint shapes + ApiResult envelope |
| `src/lib/api/sse.ts`                             | EventSource lifecycle + exponential backoff                     |
| `src/lib/api/schemas.ts`                         | Valibot schemas; called on cold-start GETs only                 |
| `src/lib/stores/settings.svelte.ts`              | Per-field dirty diff, drift detection, save/load                |
| `src/lib/stores/status.svelte.ts`                | SSE connection lifecycle, optimistic overlay, OTA flag          |
| `src/lib/types/settings.generated.ts`            | Auto-generated firmware metadata (see scripts/)                 |
| `src/lib/util/validation.ts`                     | Form-level validation registry                                  |
| `src/lib/features/settings/SettingsPanel.svelte` | Save flow, error highlighting, Cmd+S, drift banner              |
| `src/lib/features/firmware/UploadForm.svelte`    | OTA upload + statusStore.beginOtaUpload                         |
| `static/swagger.yml` / `static/swagger.json`     | OpenAPI spec; YAML is the source                                |
| `scripts/generate-settings-meta.py`              | Codegen for `settings.generated.ts`                             |
| `gzip_build.py`                                  | Post-build LittleFS staging                                     |
