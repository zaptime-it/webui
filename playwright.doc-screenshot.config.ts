import { defineConfig, devices } from '@playwright/test';
import { baseConfig } from './playwright.base';

// Taller-than-default viewport so the page fits in one window without
// scrolling. `position: sticky` on Settings' Save/Reset bar otherwise
// pins it to the *viewport* bottom mid-document during full-page
// captures — the natural bottom of the form is what we want in the
// docs screenshot.
const docViewport = { width: 1280, height: 1500 };

export default defineConfig({
	...baseConfig,
	testDir: 'tests/doc-screenshots',
	projects: [
		{
			name: 'doc-light',
			use: { ...devices['Desktop Chrome'], viewport: docViewport, colorScheme: 'light' }
		},
		{
			name: 'doc-dark',
			use: { ...devices['Desktop Chrome'], viewport: docViewport, colorScheme: 'dark' }
		}
	]
});
