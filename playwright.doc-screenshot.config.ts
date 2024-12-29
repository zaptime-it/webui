import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		locale: 'en-GB',
		timezoneId: 'Europe/Amsterdam'
	},
	webServer: {
		command: 'yarn build && yarn preview',
		port: 4173
	},
	testDir: './tests/doc-screenshots',
	outputDir: './test-results/screenshots',
	projects: [
		{
			name: 'Light Mode',
			use: {
				viewport: { width: 1440, height: 900 },
				colorScheme: 'light'
			}
		},
		{
			name: 'Dark Mode',
			use: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }
		}
	]
});
