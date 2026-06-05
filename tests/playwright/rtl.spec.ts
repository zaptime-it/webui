import { expect, test, type Page } from '@playwright/test';
import { initMock } from '../shared';

test.beforeEach(initMock);

/** Persist a locale before the app boots so `initLocale` picks it up on the
 *  very first hydration (it reads `localStorage.locale`, see i18n.svelte.ts). */
const bootWithLocale = (page: Page, locale: string) =>
	page.addInitScript((l) => localStorage.setItem('locale', l), locale);

const htmlDir = (page: Page) => page.evaluate(() => document.documentElement.dir);
const htmlLang = (page: Page) => page.evaluate(() => document.documentElement.lang);

test.describe('RTL (Arabic) layout', () => {
	test('flips the document to RTL and sets lang=ar', async ({ page }) => {
		await bootWithLocale(page, 'ar');
		await page.goto('/');
		await expect.poll(() => htmlDir(page), { timeout: 15_000 }).toBe('rtl');
		expect(await htmlLang(page)).toBe('ar');
	});

	test('brand wordmark stays LTR so the ₿ is not reordered to the end', async ({ page }) => {
		await bootWithLocale(page, 'ar');
		await page.goto('/');
		const brand = page.locator('.navbar-brand');
		await expect(brand).toBeVisible();
		// The fix: the wordmark is explicitly LTR-isolated. Without dir="ltr"
		// the bidi algorithm renders "₿TClock" as "TClock₿" under RTL.
		await expect(brand).toHaveAttribute('dir', 'ltr');
		await expect(brand).toHaveText('₿TClock');
	});

	test('control-row accent bar flips to the inline-start (right) edge', async ({ page }) => {
		await bootWithLocale(page, 'ar');
		await page.goto('/');
		await expect.poll(() => htmlDir(page), { timeout: 15_000 }).toBe('rtl');
		// `.control-row` uses `border-inline-start`, which resolves to the
		// right edge under RTL. A physical `border-left` would (wrongly) stay
		// on the left, so assert the computed border lives on the right only.
		const border = await page
			.locator('.control-row')
			.first()
			.evaluate((el) => {
				const cs = getComputedStyle(el);
				return { left: cs.borderLeftWidth, right: cs.borderRightWidth };
			});
		expect(parseFloat(border.right)).toBeGreaterThan(0);
		expect(parseFloat(border.left)).toBe(0);
	});

	test('technical identifiers (IP/MAC/hostname) render left-to-right', async ({ page }) => {
		await bootWithLocale(page, 'ar');
		await page.goto('/');
		await expect.poll(() => htmlDir(page), { timeout: 15_000 }).toBe('rtl');
		const direction = await page
			.locator('.system-info dd.mono')
			.first()
			.evaluate((el) => getComputedStyle(el).direction);
		expect(direction).toBe('ltr');
	});

	test('LTR locales keep the document left-to-right', async ({ page }) => {
		await bootWithLocale(page, 'en');
		await page.goto('/');
		await expect.poll(() => htmlDir(page), { timeout: 15_000 }).toBe('ltr');
		expect(await htmlLang(page)).toBe('en');
	});
});
