import type { PlaywrightTestConfig } from '@playwright/test';

export const baseURL = 'http://127.0.0.1:4173';

export const baseConfig = {
	webServer: {
		command: 'npm run build:test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		url: `${baseURL}/`,
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_BASE_URL: '' }
	},
	use: { baseURL }
} satisfies Pick<PlaywrightTestConfig, 'webServer' | 'use'>;
