import { defineConfig, devices } from '@playwright/test';
import { baseConfig } from './playwright.base';

export default defineConfig({
	...baseConfig,
	testDir: 'tests/doc-screenshots',
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
