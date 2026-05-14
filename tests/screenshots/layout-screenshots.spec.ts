import { test, expect, type Page, type TestInfo } from '@playwright/test';

import { initMock } from '../shared';
import { waitForStatusConnected } from '../wait-for-status-connected';

test.beforeEach(initMock);

const projectSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '_');

/** Write PNG under test-results and attach for Playwright HTML report */
async function shot(testInfo: TestInfo, page: Page, baseName: string) {
	const slug = projectSlug(testInfo.project.name);
	const path = `./test-results/screenshots/${baseName}-${slug}.png`;
	const buf = await page.screenshot({ path, fullPage: true });
	await testInfo.attach(baseName, { body: buf, contentType: 'image/png' });
}

test.describe('layout screenshots (dashboard)', () => {
	test('light theme', async ({ page }, testInfo) => {
		await page.addInitScript(() => {
			localStorage.setItem('color-scheme', 'light');
		});

		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
		// Sub-md viewports render only the active section (Control by default);
		// the Status card is CSS-hidden so its heading never becomes visible.
		const viewport = page.viewportSize();
		if ((viewport?.width ?? 1280) >= 768) {
			await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
		}
		await waitForStatusConnected(page);
		await shot(testInfo, page, 'layout-dashboard-light');
	});

	test('dark theme', async ({ page }, testInfo) => {
		await page.addInitScript(() => {
			localStorage.setItem('color-scheme', 'dark');
		});

		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
		await expect(page.locator('html[data-theme="dark"]')).toHaveCount(1);
		await waitForStatusConnected(page);
		await shot(testInfo, page, 'layout-dashboard-dark');
	});
});
