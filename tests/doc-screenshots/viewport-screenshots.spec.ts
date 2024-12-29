import { test, expect } from '@playwright/test';

import { initMock, settingsJson, statusJson } from '../shared';
import sharp from 'sharp';

test.beforeEach(initMock);

// Define the translations for the headings
const headings = {
	en: {
		control: 'Control',
		status: 'Status',
		settings: 'Settings',
		language: 'English'
	},
	de: {
		control: 'Steuerung',
		status: 'Status',
		settings: 'Einstellungen',
		language: 'Deutsch'
	},
	nl: {
		control: 'Besturing',
		status: 'Status',
		settings: 'Instellingen',
		language: 'Nederlands'
	},
	es: {
		control: 'Control',
		status: 'Estado',
		settings: 'Ajustes',
		language: 'Español'
	}
};

test('capture screenshots across devices', async ({ page }, testInfo) => {
	// Get the locale from the browser or default to 'en'
	const locale = testInfo.project.use?.locale?.split('-')[0].toLowerCase() || 'en';
	const translations = headings[locale] || headings.en;

	statusJson.isUpdating = true;
	// Set the color scheme
	if (testInfo.project.use?.colorScheme === 'dark') {
		settingsJson.invertedColor = true;
	} else {
		settingsJson.invertedColor = false;
	}

	await page.goto('/');
	await expect(page.getByRole('heading', { name: translations.control })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.status })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.settings })).toBeVisible();

	if (await page.locator('#nav-language-dropdown').isVisible()) {
		await expect(page.getByRole('link', { name: translations.language })).toBeVisible();
	}

	const screenshot = await page.screenshot({
		fullPage: true
	});

	await sharp(screenshot)
		.toFormat('webp', {
			quality: 95,
			nearLossless: true
		})
		.toFile(
			`./doc/screenshot-${test.info().project.use.colorScheme?.toLowerCase().replace(' ', '_')}.webp`
		);
});
