import { expect, test, type Page } from '@playwright/test';
import { initMock, settingsJson } from '../shared';

test.beforeEach(initMock);

/** Serve `/api/settings` with the shared fixture plus `extra` merged in,
 *  overriding the route `initMock` installed. Later `page.route` handlers
 *  take precedence, so this shadows the fixture-only mock. */
const mockSettings = async (page: Page, extra: Record<string, unknown>, patches: string[] = []) => {
	await page.route('*/**/api/settings', async (route) => {
		if (route.request().method() === 'PATCH') {
			patches.push(route.request().postData() ?? '');
			await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' } });
			return;
		}
		await route.fulfill({ json: { ...settingsJson, ...extra } });
	});
};

/** Hydrated + settings fetched: the Save button only mounts once
 *  `settingsStore.isReady` (see btclock.spec.ts `waitForReady`). */
const waitForReady = async (page: Page) => {
	await expect(page.getByRole('button', { name: 'Show all' })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({
		timeout: 15_000
	});
};

const section = (page: Page) => page.getByText('Distributed display', { exact: true });

test.describe('Distributed display capability gate', () => {
	test('firmware without distMode: section hidden, form pristine, PATCH untouched', async ({
		page
	}) => {
		// The shared fixture predates the dist-display feature and carries
		// no dist* keys — exactly what a pre-feature device emits.
		const patches: string[] = [];
		await mockSettings(page, {}, patches);
		await page.goto('/');
		await waitForReady(page);
		await page.getByRole('button', { name: 'Show all' }).click();

		await expect(section(page)).toHaveCount(0);
		await expect(page.locator('#distMode')).toHaveCount(0);

		// Regression: the mode <select>'s bind:value used to seed distMode=0
		// into the store on mount, flipping isDirty before any user input.
		await expect(page.getByTestId('settings-dirty-badge')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();

		// Editing an unrelated field must not drag dist* keys into the PATCH.
		await page.locator('#hostnamePrefix').fill('gate-test');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect.poll(() => patches.length).toBe(1);
		const body = JSON.parse(patches[0]) as Record<string, unknown>;
		expect(Object.keys(body).filter((k) => k.startsWith('dist'))).toEqual([]);
	});

	test('firmware with distMode: section renders with the device values', async ({ page }) => {
		await mockSettings(page, {
			distMode: 1,
			distPeers: ['btclock-a:80:7', 'btclock-b'],
			distSelfIdx: 1,
			distScreens: 2147483647
		});
		await page.goto('/');
		await waitForReady(page);
		await page.getByRole('button', { name: 'Show all' }).click();

		await expect(section(page)).toBeVisible();
		await expect(page.getByTestId('settings-dirty-badge')).toHaveCount(0);
		await expect(page.locator('#distMode')).toHaveValue('1');
		// Master mode exposes the ordered peer list + self index.
		await expect(page.locator('#distPeers-0')).toContainText('btclock-a:80:7');
		await expect(page.locator('#distPeers-1')).toContainText('btclock-b');
		await expect(page.locator('#distSelfIdx')).toHaveValue('1');
	});

	test('firmware with distMode: slave mode hides the peer list', async ({ page }) => {
		await mockSettings(page, { distMode: 2, distPeers: [], distSelfIdx: 0 });
		await page.goto('/');
		await waitForReady(page);
		await page.getByRole('button', { name: 'Show all' }).click();

		await expect(section(page)).toBeVisible();
		await expect(page.locator('#distMode')).toHaveValue('2');
		await expect(page.getByTestId('distPeers')).toHaveCount(0);
		await expect(page.locator('#distSelfIdx')).toHaveCount(0);
	});
});
