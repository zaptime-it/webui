/**
 * Shared Playwright config — `testDir` + `projects` are the only knobs
 * that vary across `playwright.config.ts`, `playwright.screenshot.config.ts`,
 * and `playwright.doc-screenshot.config.ts`. Everything else (web server
 * command, base URL, IPv4 pin, empty PUBLIC_BASE_URL) is identical.
 *
 * Notes:
 *  - Force PUBLIC_BASE_URL='' so the bundle issues same-origin requests
 *    (e.g. `/api/status`). Otherwise the dev's real device URL leaks
 *    in and the preview server can't reach it without CORS shims.
 *  - `--host 127.0.0.1` pins the preview to IPv4 — without it vite
 *    binds to IPv6 `localhost` only on dual-stack macOS and the test
 *    harness ends up with ECONNREFUSED on 127.0.0.1:4173.
 */
import type { PlaywrightTestConfig } from '@playwright/test';

export const baseURL = 'http://127.0.0.1:4173';

export const baseConfig = {
	webServer: {
		// `pnpm exec vite preview` (not `pnpm run preview -- …`): pnpm forwards
		// the `--` separator literally, which vite preview chokes on, so call
		// the binary directly and pass the flags straight through.
		command:
			'pnpm run build:test && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
		url: `${baseURL}/`,
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_BASE_URL: '' }
	},
	use: { baseURL }
} satisfies Pick<PlaywrightTestConfig, 'webServer' | 'use'>;
