import { test, expect } from '@playwright/test';

import { initMock, settingsJson, statusJson } from '../shared';

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

	await page.goto('/');
	await expect(page.getByRole('heading', { name: translations.control })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.status })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.settings })).toBeVisible();

	if (await page.locator('#nav-language-dropdown').isVisible()) {
		await expect(page.getByRole('link', { name: translations.language })).toBeVisible();
	}

	const screenshot = await page.screenshot({
		path: `./test-results/screenshots/default-${test.info().project.name.toLowerCase().replace(' ', '_')}.png`
	});

	await testInfo.attach(`default`, {
		body: screenshot,
		contentType: 'image/png'
	});
});

test('capture screenshots across devices with bitaxe screens', async ({ page }, testInfo) => {
	const locale = testInfo.project.use?.locale?.split('-')[0].toLowerCase() || 'en';
	const translations = headings[locale] || headings.en;

	settingsJson.screens = [
		{
			id: 0,
			name: 'Block Height',
			enabled: true
		},
		{
			id: 3,
			name: 'Time',
			enabled: true
		},
		{
			id: 4,
			name: 'Halving countdown',
			enabled: true
		},
		{
			id: 6,
			name: 'Block Fee Rate',
			enabled: true
		},
		{
			id: 10,
			name: 'Sats per dollar',
			enabled: true
		},
		{
			id: 20,
			name: 'Ticker',
			enabled: true
		},
		{
			id: 30,
			name: 'Market Cap',
			enabled: true
		},
		{
			id: 80,
			name: 'BitAxe Hashrate',
			enabled: true
		},
		{
			id: 81,
			name: 'BitAxe Best Difficulty',
			enabled: true
		}
	];

	statusJson.data = ['mdi:bitaxe', '', 'mdi:pickaxe', '6', '3', '7', 'GH/S'];
	statusJson.rendered = ['mdi:bitaxe', '', 'mdi:pickaxe', '6', '3', '7', 'GH/S'];

	await page.goto('/');

	await expect(page.getByRole('heading', { name: translations.control })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.status })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.settings })).toBeVisible();

	if (await page.locator('#nav-language-dropdown').isVisible()) {
		await expect(page.getByRole('link', { name: translations.language })).toBeVisible();
	}

	await page.screenshot({
		path: `./test-results/screenshots/bitaxe-${test.info().project.name.toLowerCase().replace(' ', '_')}.png`
	});

	await testInfo.attach(`bitaxe`, {
		path: `./test-results/screenshots/bitaxe-${test.info().project.name.toLowerCase().replace(' ', '_')}.png`,
		contentType: 'image/png'
	});
});
