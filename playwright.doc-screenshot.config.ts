import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build:test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173/',
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_BASE_URL: '' }
	},
	testDir: 'tests/doc-screenshots',
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	projects: [
		{
			name: 'doc-light',
			use: { ...devices['Desktop Chrome'], colorScheme: 'light' }
		},
		{
			name: 'doc-dark',
			use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }
		}
	]
});
