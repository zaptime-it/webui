/**
 * End-to-end regression tests for the mobile navbar.
 *
 * These cover three bugs that surfaced during the v2 rewrite and that we
 * previously only had static (grep-the-source) coverage for:
 *
 *   1. LanguageMenu + ThemeToggle should live *inside* the hamburger drawer
 *      on mobile, not pinned to the top navbar.
 *   2. The Control / Status / Settings tabs must follow the section that is
 *      actually in the viewport. Previously a tapped tab stayed highlighted
 *      because of DaisyUI's `:hover` colour boost (sticky hover on touch)
 *      *and* because the active-tab logic was DOM-based instead of driven
 *      by the `activeSection` store.
 *   3. The hamburger drawer was rendered outside the sticky element, so
 *      opening it after scrolling past the top left the drawer off-screen.
 *
 * This file runs only under the `mobile` Playwright project (see
 * `playwright.config.ts`), which uses the Pixel 7 viewport.
 */
import { expect, test } from '@playwright/test';
import { initMock } from '../shared';

test.beforeEach(initMock);

test('LanguageMenu and ThemeToggle are hidden in the top navbar on mobile', async ({ page }) => {
	await page.goto('/');

	// The desktop-only wrapper around LanguageMenu + ThemeToggle lives in
	// `.navbar-end .hidden.md\:flex`. On a mobile viewport those elements
	// must not be visible.
	const desktopControls = page
		.locator('.navbar-end')
		.locator('div.hidden.md\\:flex:has([aria-haspopup="listbox"])');
	await expect(desktopControls).toBeHidden();

	// The hamburger is visible.
	await expect(page.getByTestId('mobile-nav-toggle')).toBeVisible();
	// The drawer is NOT visible until the hamburger is clicked.
	await expect(page.getByTestId('mobile-drawer')).toHaveCount(0);
});

test('hamburger drawer hosts LanguageMenu and ThemeToggle', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('mobile-nav-toggle').click();

	const drawer = page.getByTestId('mobile-drawer');
	await expect(drawer).toBeVisible();

	// The language dropdown trigger (`aria-haspopup="listbox"`) must be a
	// descendant of the drawer on mobile.
	await expect(drawer.locator('[aria-haspopup="listbox"]')).toBeVisible();
	// The ThemeToggle renders a button — verify at least one button other
	// than the nav links is present.
	await expect(drawer.locator('button')).toHaveCount(
		// 1 language trigger + 1 theme toggle = 2 buttons minimum.
		await drawer.locator('button').count()
	);
	const buttonCount = await drawer.locator('button').count();
	expect(buttonCount).toBeGreaterThanOrEqual(2);
});

test('hamburger drawer is still visible after scrolling past the top', async ({ page }) => {
	await page.goto('/');
	// Wait for content to render so the document has a scrollable height
	// (mobile viewports without content would refuse to scroll).
	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	// Scroll deep into the page so the `#status` / `#settings` sections
	// are in view. Before the sticky-wrapper fix the drawer was a
	// *sibling* of the navbar in normal flow; once the user scrolled past
	// the top the drawer was rendered entirely above the viewport.
	await page
		.locator('#settings')
		.scrollIntoViewIfNeeded()
		.catch(() => {});
	await page.waitForFunction(() => window.scrollY > 50, undefined, { timeout: 5000 });

	await page.getByTestId('mobile-nav-toggle').click();

	const drawer = page.getByTestId('mobile-drawer');
	await expect(drawer).toBeVisible();

	// Both the navbar AND the drawer must be pinned to the very top of the
	// viewport (y ≈ 0 for the navbar, drawer rendered immediately below).
	const navbarBox = await page.locator('.navbar').boundingBox();
	const drawerBox = await drawer.boundingBox();
	expect(navbarBox, 'navbar should be rendered').not.toBeNull();
	expect(drawerBox, 'drawer should be rendered').not.toBeNull();
	// Navbar sits at the top; drawer sits immediately below it.
	expect(navbarBox!.y).toBeLessThanOrEqual(1);
	expect(drawerBox!.y).toBeLessThan(navbarBox!.y + navbarBox!.height + 4);
	// And the drawer is inside the viewport (y positive, top of drawer
	// still visible).
	const viewport = page.viewportSize();
	expect(drawerBox!.y).toBeLessThan(viewport!.height);
});

test('section tabs follow the scrolled-into-view section', async ({ page }) => {
	await page.goto('/');

	// Smooth scrolling + IntersectionObserver timing means we have to give
	// the observer a beat to settle between tap / scroll and the assert.
	const control = page.getByTestId('section-tabs').locator('a[href="#control"]');
	const status = page.getByTestId('section-tabs').locator('a[href="#status"]');
	const settings = page.getByTestId('section-tabs').locator('a[href="#settings"]');

	// Initial state: "control" is the default selection.
	await expect(control).toHaveAttribute('aria-current', 'true');
	await expect(status).not.toHaveAttribute('aria-current', 'true');
	await expect(settings).not.toHaveAttribute('aria-current', 'true');

	// Tap "Status" → the URL hash moves to #status, which also scrolls the
	// section into view. The observer then marks status as current.
	await status.click();
	// Wait for the scroll/observer cycle to complete.
	await expect(status).toHaveAttribute('aria-current', 'true', { timeout: 4000 });
	// Critically: the previously tapped "Control" tab must *lose* its
	// active state. Sticky `:hover` used to keep it highlighted.
	await expect(control).not.toHaveAttribute('aria-current', 'true');

	// Now scroll manually to the very bottom of the document so only the
	// settings section is in the observer's rootMargin zone. The tab
	// bar must re-sync without any further clicks.
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(settings).toHaveAttribute('aria-current', 'true', { timeout: 4000 });
	await expect(status).not.toHaveAttribute('aria-current', 'true');
	await expect(control).not.toHaveAttribute('aria-current', 'true');
});

test('section tab row fits on a single line (Settings does not wrap)', async ({ page }) => {
	await page.goto('/');
	const tabs = page.getByTestId('section-tabs');
	await expect(tabs).toBeVisible();

	// All three tab anchors should share the same vertical baseline — if
	// "Settings" wraps to a new row its `y` coordinate will differ by
	// more than a few pixels from the first tab's `y`.
	const controlBox = await tabs.locator('a[href="#control"]').boundingBox();
	const statusBox = await tabs.locator('a[href="#status"]').boundingBox();
	const settingsBox = await tabs.locator('a[href="#settings"]').boundingBox();
	expect(controlBox && statusBox && settingsBox).toBeTruthy();
	expect(Math.abs(statusBox!.y - controlBox!.y)).toBeLessThan(2);
	expect(Math.abs(settingsBox!.y - controlBox!.y)).toBeLessThan(2);
});

test('tapping a tab releases focus so :hover does not linger', async ({ page }) => {
	// Verifies the `(e.currentTarget as HTMLElement).blur()` in
	// `pickSection`: after tapping, the tapped tab must not remain the
	// focused element, otherwise focus styling keeps it looking active.
	await page.goto('/');
	const status = page.getByTestId('section-tabs').locator('a[href="#status"]');
	await status.click();

	const isFocused = await status.evaluate((el) => document.activeElement === el);
	expect(isFocused).toBe(false);
});
