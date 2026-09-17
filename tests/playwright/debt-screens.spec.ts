import { expect, test, type Page } from '@playwright/test';
import { initMock, settingsJson } from '../shared';

test.beforeEach(initMock);

/** Serve `/api/settings` from `json`, shadowing the fixture route that
 *  `initMock` installed (later `page.route` handlers win). PATCH bodies
 *  are collected into `patches`. */
const mockSettings = async (page: Page, json: Record<string, unknown>, patches: string[] = []) => {
	await page.route('*/**/api/settings', async (route) => {
		if (route.request().method() === 'PATCH') {
			patches.push(route.request().postData() ?? '');
			await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' } });
			return;
		}
		await route.fulfill({ json });
	});
};

/** Hydrated + settings fetched (see btclock.spec.ts `waitForReady`). */
const waitForReady = async (page: Page) => {
	await expect(page.getByRole('button', { name: 'Show all' })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({
		timeout: 15_000
	});
};

const save = (page: Page) => page.getByRole('button', { name: 'Save', exact: true });

/** The shared fixture carries the debt fields; strip them to model a
 *  device running firmware that predates the national-debt screens. */
const preDebtFirmware = (): Record<string, unknown> => {
	const {
		debtBigChar: _big,
		debtCurrency: _cur,
		...rest
	} = settingsJson as Record<string, unknown>;
	void _big;
	void _cur;
	return rest;
};

const DEBT_SCREENS = [
	{ id: 100, name: 'US Debt', kind: 'debt', enabled: false, order: 8 },
	{ id: 101, name: 'EU Debt', kind: 'debt', enabled: false, order: 9 }
];

test.describe('National-debt screens capability gate', () => {
	test('firmware without debt fields: parses, hides debt controls, PATCH untouched', async ({
		page
	}) => {
		const patches: string[] = [];
		await mockSettings(page, preDebtFirmware(), patches);
		await page.goto('/');
		await waitForReady(page);

		// Regression: debtBigChar / debtCurrency used to be required in the
		// Valibot settings schema, so a pre-feature device tripped the
		// schema-mismatch banner and the form never rendered.
		await expect(page.getByTestId('schema-mismatch-banner')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Block Height' })).toBeVisible();

		await page.getByRole('button', { name: 'Show all' }).click();
		await expect(page.locator('#debtBigChar')).toHaveCount(0);
		await expect(page.locator('#debtCurrency')).toHaveCount(0);
		await expect(page.locator('[data-screen-id="debt"]')).toHaveCount(0);
		await expect(page.getByTestId('settings-dirty-badge')).toHaveCount(0);

		await page.locator('#hostnamePrefix').fill('gate-test');
		await save(page).click();
		await expect.poll(() => patches.length).toBe(1);
		const body = JSON.parse(patches[0]) as Record<string, unknown>;
		expect(Object.keys(body).filter((k) => k.startsWith('debt'))).toEqual([]);
	});

	test('firmware with debt fields: controls render and the debt group gates the country list', async ({
		page
	}) => {
		const patches: string[] = [];
		await mockSettings(
			page,
			{ ...settingsJson, screens: [...settingsJson.screens, ...DEBT_SCREENS] },
			patches
		);
		await page.goto('/');
		await waitForReady(page);
		await page.getByRole('button', { name: 'Show all' }).click();

		await expect(page.getByTestId('settings-dirty-badge')).toHaveCount(0);
		await expect(page.locator('#debtBigChar')).toBeChecked();
		await expect(page.locator('#debtCurrency')).toHaveValue('0');

		// The two debt screens collapse into one "Debt" rotation row; the
		// per-country list only appears once that row is switched on.
		await expect(page.locator('[data-screen-id="debt"]')).toHaveCount(1);
		await expect(page.locator('[data-screen-id="100"]')).toHaveCount(0);
		await expect(page.getByTestId('debt-screen-list')).toHaveCount(0);

		await page.locator('#screens_debt').check();
		await expect(page.getByTestId('debt-screen-list')).toBeVisible();
		// Group on with no country selected is a validation error: Save stays
		// disabled until at least one debt screen is enabled.
		await expect(save(page)).toBeDisabled();
		await page.locator('#debt_screen_100').check();
		await expect(save(page)).toBeEnabled();

		await save(page).click();
		await expect.poll(() => patches.length).toBe(1);
		const body = JSON.parse(patches[0]) as {
			screens: Array<{ id: number; enabled: boolean; order: number }>;
		};
		const debt = body.screens.filter((s) => s.id >= 100);
		expect(debt.map((s) => [s.id, s.enabled])).toEqual([
			[100, true],
			[101, false]
		]);
		// Debt screens keep their contiguous slot at the end of the rotation.
		expect(debt.map((s) => s.order)).toEqual([
			body.screens.length - 2,
			body.screens.length - 1
		]);
	});
});
