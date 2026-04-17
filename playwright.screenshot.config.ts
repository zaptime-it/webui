import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// `tests/shared.ts` mutates module-level `statusJson` / `settingsJson`; parallel
	// workers cause cross-test races and the Status overlay never clears reliably.
	workers: 1,
	fullyParallel: false,
	webServer: {
		// Match playwright.config.ts: IPv4 bind + empty base URL so mocks hit same-origin `/api/*`.
		command: 'npm run build:test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173/',
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_BASE_URL: '' }
	},
	testDir: 'tests/screenshots',
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	projects: [
		{
			name: 'chromium-desktop',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'chromium-mobile',
			// Chromium emulation (not WebKit) so `pnpm exec playwright install chromium` suffices in CI
			use: { ...devices['Pixel 7'] }
		}
	]
});
