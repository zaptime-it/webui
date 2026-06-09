import { defineConfig, devices } from '@playwright/test';
import { baseConfig } from './playwright.base';

export default defineConfig({
	...baseConfig,
	testDir: 'tests/playwright',
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: /mobile-navbar\.spec\.ts/
		},
		{
			// Same desktop specs as chromium, run under Firefox. The
			// mobile-navbar specs stay chromium-only: they rely on the
			// Pixel 7 device profile's `isMobile`/touch emulation, which
			// Playwright does not support under Firefox.
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			testIgnore: /mobile-navbar\.spec\.ts/
		},
		{
			// Dedicated mobile viewport project so the mobile-navbar
			// regression specs don't need to call `page.setViewportSize` in
			// every test. Anything that only needs desktop can tag itself
			// with `test.skip(({ browserName }) => ..., ...)`.
			name: 'mobile',
			use: { ...devices['Pixel 7'] },
			testMatch: /mobile-navbar\.spec\.ts/
		}
	]
});
