import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	use: {
		baseURL: 'http://127.0.0.1:4173',
		locale: 'en-GB',
		timezoneId: 'Europe/Amsterdam'
	},
	webServer: {
		// Invoke Vite via node so the preview server starts without relying on `npm`/`yarn`
		// in PATH (Playwright's subprocess environment can omit them; see yarn test:integration).
		command:
			'node node_modules/vite/bin/vite.js build --config vite.config.test.ts && node node_modules/vite/bin/vite.js preview --config vite.config.test.ts --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI
	},
	reporter: process.env.CI ? 'github' : 'list',
	testDir: 'tests/playwright',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
