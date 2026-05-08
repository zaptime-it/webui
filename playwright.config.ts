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
