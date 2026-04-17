import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		// Force PUBLIC_BASE_URL to empty for the build so the bundle issues
		// same-origin requests (e.g. `/api/status`). The bundled value
		// otherwise is the developer's real device URL (`http://192.168.20.97`)
		// which the preview server cannot reach AND which would require CORS
		// headers on every Playwright mock.
		//
		// `--host 127.0.0.1` pins the preview server to IPv4 — without it
		// vite binds to IPv6 `localhost` only on dual-stack macOS and
		// `127.0.0.1:4173` ends up refused.
		command: 'npm run build:test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173/',
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_BASE_URL: '' }
	},
	testDir: 'tests/playwright',
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
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
