import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	reporter: 'html',
	use: {
		locale: 'en-GB',
		timezoneId: 'Europe/Amsterdam'
	},
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: './tests/screenshots',
	outputDir: './test-results/screenshots',
	projects: [
		{
			name: 'MacBook Air 13 inch',
			use: {
				viewport: { width: 1440, height: 900 }
			}
		},
		{
			name: 'iPhone 14 Pro',
			use: { ...devices['iPhone 14 Pro'] }
		},
		{
			name: 'iPhone 15 Pro Landscape',
			use: { ...devices['iPhone 15 Pro Landscape'] }
		},
		{
			name: 'MacBook Pro 14 inch',
			use: {
				viewport: { width: 1512, height: 982 }
			}
		},
		{
			name: 'MacBook Pro 14 inch',
			use: {
				viewport: { width: 1512, height: 982 }
			}
		},
		{
			name: 'MacBook Pro 14 inch Firefox HiDPI',
			use: { ...devices['Desktop Firefox HiDPI'], viewport: { width: 1512, height: 982 } }
		},
		{
			name: 'MacBook Pro 14 inch Safari',
			use: { ...devices['Desktop Safari'], viewport: { width: 1512, height: 982 } }
		}
	]
});
