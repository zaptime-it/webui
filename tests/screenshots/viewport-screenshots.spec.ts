import { test, expect } from '@playwright/test';

import { initMock, settingsJson } from '../shared';

test.beforeEach(initMock);

test('capture screenshots across devices', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

	await page.screenshot({
		path: `./test-results/screenshots/default-${test.info().project.name}.png`,
		fullPage: true
	});
});

test('capture screenshots across devices with bitaxe screens', async ({ page }) => {
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

	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

	await page.screenshot({
		path: `./test-results/screenshots/bitaxe-${test.info().project.name}.png`,
		fullPage: true
	});
});
