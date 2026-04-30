import { defineConfig, devices } from '@playwright/test';
import { baseConfig } from './playwright.base';

export default defineConfig({
	...baseConfig,
	// `tests/shared.ts` mutates module-level `statusJson` / `settingsJson`; parallel
	// workers cause cross-test races and the Status overlay never clears reliably.
	workers: 1,
	fullyParallel: false,
	testDir: 'tests/screenshots',
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
