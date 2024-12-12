import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	use: {
		locale: 'en-GB',
		timezoneId: 'Europe/Amsterdam'
	},
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	reporter: process.env.CI ? 'github' : 'list',
	testDir: 'tests/playwright',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
