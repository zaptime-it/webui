# BTClock WebUI

[![Latest release](https://git.btclock.dev/btclock/webui/badges/release.svg)](https://git.btclock.dev/btclock/webui/releases/latest)
[![BTClock CI](https://git.btclock.dev/btclock/webui/badges/workflows/build.yaml/badge.svg)](https://git.btclock.dev/btclock/webui/actions?workflow=build.yaml&actor=0&status=0)

The web user-interface for the BTClock.

![Screenshot](doc/screenshot-light.webp)
![Screenshot Dark](doc/screenshot-dark.webp)

## Getting started

This project is managed with [pnpm](https://pnpm.io). Install it with
`corepack enable pnpm` or `npm i -g pnpm` if you don't have it yet.

```bash
pnpm install           # applies the SvelteKit filename-shortening patch via pnpm patchedDependencies
pnpm dev               # start the dev server (http://localhost:5173)
```

Set `PUBLIC_BASE_URL` in `.env` to the address of a real BTClock (e.g.
`http://btclock-d60b14.local`) so the dev server talks to it. When unset
it falls back to an empty string — i.e. same-origin requests — which is
also what a build the firmware serves from LittleFS wants, so leave it
empty at build time.

## Production build

```bash
pnpm build             # produces dist/ with prerendered index.html + hashed JS/CSS
python3 gzip_build.py  # gzips everything under dist/ into build_gz/
mklittlefs -c build_gz -s 409600 output/littlefs.bin
```

The firmware serves files literally out of `/lfs/www/` (see
`control_server.cpp`), so the build keeps that directory minimal: only
`/` is prerendered, and a tiny post-build step in `vite.config.ts`
deletes adapter-static's `bundle.html` SPA fallback (the firmware
doesn't route unknown paths to it). `/api` and `/convert` opt out of
prerendering and are reached only via SvelteKit client routing. The
filename-shortening patch in `patches/` keeps asset names within
LittleFS's filename limit.

## Tests

```bash
pnpm test:unit              # vitest unit + component tests
pnpm test:integration       # playwright end-to-end suite (chromium + mobile)
pnpm test:screenshots       # device/locale screenshot suite
pnpm doc:update-screenshots
```

## Languages

The WebUI ships **15 translations**. Message catalogs live in
`src/lib/locales/<code>.json` and are compiled by Paraglide. The language
picker lists them sorted alphabetically by their localized name; Arabic is
rendered right-to-left (`<html dir="rtl">`), with technical identifiers
(IP/MAC/hostname, version and commit) kept left-to-right.

🇬🇧 English (`en`) · 🇳🇱 Nederlands (`nl`) · 🇩🇪 Deutsch (`de`) ·
🇪🇸 Español (`es`) · 🇫🇷 Français (`fr`) · 🇮🇹 Italiano (`it`) ·
🇵🇹 Português (`pt`) · 🇵🇱 Polski (`pl`) · 🇨🇿 Čeština (`cs`) ·
🇩🇰 Dansk (`da`) · 🇹🇷 Türkçe (`tr`) · 🇷🇺 Русский (`ru`) ·
🇸🇦 العربية (`ar`) · 🇨🇳 中文 (`zh`) · 🇯🇵 日本語 (`ja`)

To add a locale: copy `src/lib/locales/en.json` and translate the values,
add the tag to `project.inlang/settings.json`, and register the locale +
flag in `src/lib/i18n.svelte.ts`.

## Key architectural choices

- **Feature-based folders** — UI is organised under
  `src/lib/features/{control,status,firmware,settings,convert}` with
  colocated sub-components and spec tests. Generic primitives live in
  `src/lib/ui/`, data access in `src/lib/api/`, and global state in
  `src/lib/stores/` as Svelte 5 runes.
- **Discriminated-union state** — `SettingsState` and `StatusState`
  encode `loading | error | ready`, so every consumer handles each phase
  explicitly instead of falling through nullable props.
- **Valibot schemas** — Runtime validation for every inbound API payload
  lives in `src/lib/api/schemas.ts`, protecting the UI from firmware drift.
- **Paraglide JS v2** — Message catalogs in `src/lib/locales/` are
  compiled per-locale and tree-shaken by the Paraglide Vite plugin. See
  [Languages](#languages) for the 15 shipped locales.
- **Static output only** — `@sveltejs/adapter-static` with SSR disabled;
  the WebUI is always mounted on-device by the firmware.
- **Minimal font footprint** — only the `latin-400` woff2 file for
  Ubuntu (plus compact sats-symbol subsets) is shipped, keeping `build_gz/` well below the
  ~420 KB LittleFS partition.
