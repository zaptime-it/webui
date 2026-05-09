import { expect, test, type Page } from '@playwright/test';
import { initMock, settingsJson, statusJson } from '../shared';

test.beforeEach(initMock);

/** Wait until the client has hydrated AND the initial /api/settings fetch
 *  has completed so any form fields gated on `settingsStore.isReady` are
 *  mounted. Without this, interactions (clicks/fills) can hit the SSR
 *  HTML before Svelte has wired up event handlers and/or before the
 *  CollapseCards have content to show.
 *
 *  We avoid `waitForLoadState('networkidle')` here — Playwright mocks replace
 *  `/events` with a synthetic `EventSource`, but waiting on UI that proves
 *  settings + status are hydrated is more reliable than network heuristics.
 *  Wait for the first interactive widget
 *  rendered by SettingsPanel (the "Show all" collapse-controller) plus
 *  a screen button (rendered via Status → ScreenButtons, proving the
 *  `/api/settings` fetch has succeeded) instead. */
const waitForReady = async (page: Page) => {
	await expect(page.getByRole('button', { name: 'Show all' })).toBeVisible();
	// Block Height is always present in the mocked settings fixture.
	await expect(page.getByRole('button', { name: 'Block Height' })).toBeVisible();
	// The SettingsPanel renders its form (and therefore the Save button)
	// once `settingsStore.isReady === true`. A generous timeout here
	// because the reactive graph in SettingsPanel has sometimes been
	// observed to lag behind Status by ~1-2 seconds after the mocked
	// settings response resolves.
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({
		timeout: 15_000
	});
};

test('index page has expected columns control, status, settings', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

/** Regression test: a partial settings fixture (missing e.g. `flMaxBrightness`,
 *  `nostrRelay`, `wpTimeout`, etc.) must not crash any SettingsPanel section
 *  with `https://svelte.dev/e/props_invalid_value`. Previously, the Field
 *  primitives used `$bindable(0)` / `$bindable('')` fallbacks which Svelte 5
 *  rejects when the parent binds an `undefined` value — surfacing only in the
 *  production build, not in dev. Guard that here by asserting:
 *    1. No `pageerror` fires during initial render + "Show all".
 *    2. All five settings section headings render (Screens, Currencies,
 *       Displays and LEDs, Data source, Extra features, System), which
 *       requires every Field/NumberField/SelectField/SwitchField to mount. */
test('settings panel renders with a partial settings fixture (no runtime binding errors)', async ({
	page
}) => {
	const runtimeErrors: string[] = [];
	page.on('pageerror', (err) => runtimeErrors.push(err.message));

	await page.goto('/');
	await waitForReady(page);
	await page.getByRole('button', { name: 'Show all' }).click();

	for (const section of [
		'Screen specific',
		'Displays and LEDs',
		'Data source',
		'Extra features',
		'System'
	]) {
		await expect(page.getByRole('button', { name: section, exact: true })).toBeVisible();
	}

	expect(
		runtimeErrors,
		`Unexpected runtime errors during SettingsPanel render:\n${runtimeErrors.join('\n')}`
	).toEqual([]);
});

/** Regression test: the timezone `<select>` used to hydrate from a runtime
 *  `fetch('/zones.json')` in `onMount`, which silently did nothing when the
 *  asset wasn't served (e.g. on the LittleFS deploy target) and left the
 *  dropdown empty. The list is now imported synchronously from
 *  `$lib/timezones.json` and baked into the JS bundle, so the `<select>` must
 *  always contain the full IANA list (>= 400 entries). */
test('timezone selector is populated with the full IANA list', async ({ page }) => {
	await page.goto('/');
	await waitForReady(page);
	await page.getByRole('button', { name: 'System', exact: true }).click();

	const tz = page.locator('#timezone');
	await expect(tz).toBeVisible();
	expect(await tz.locator('option').count()).toBeGreaterThanOrEqual(400);
	// Spot-check a handful of well-known zones must be present.
	for (const zone of ['Europe/Amsterdam', 'America/New_York', 'Asia/Tokyo', 'Pacific/Auckland']) {
		await expect(tz.locator(`option[value="${zone}"]`)).toHaveCount(1);
	}
});

test('index page has working language selector', async ({ page }) => {
	// v2 replaced the Bootstrap-style `#nav-language-dropdown` with a
	// state-driven `LanguageMenu` (`src/lib/ui/LanguageMenu.svelte`).
	// Trigger: a button with `aria-haspopup="listbox"`.
	// Options: buttons with `role="option"` inside a `role="listbox"`.
	//
	// Note that v2 renders each option via `Intl.DisplayNames` **in the
	// current locale**, so the initial option text is in English
	// ("Dutch", "Spanish"). After switching to Dutch the same option for
	// Spanish becomes "Spaans", hence the locale-specific names below.
	await page.goto('/');
	await waitForReady(page);

	const trigger = page.locator('[aria-haspopup="listbox"]');
	await expect(trigger).toBeVisible();

	await trigger.click();
	await expect(page.getByRole('listbox')).toBeVisible();
	await page.getByRole('option', { name: /Dutch/i }).click();
	await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible();

	await trigger.click();
	await expect(page.getByRole('listbox')).toBeVisible();
	// From a Dutch UI, "Spanish" is displayed as "Spaans".
	await page.getByRole('option', { name: /Spaans/i }).click();
	await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
});

test('api page auto-loads the OpenAPI docs', async ({ page }) => {
	await page.goto('/api');
	await expect(page.locator('#swagger-ui-container .information-container')).toBeVisible();
	await expect(page.getByText('BTClock API')).toBeVisible();
});

test('time values can not be zero or negative', async ({ page }) => {
	await page.goto('/');
	await waitForReady(page);
	// v2's SettingsPanel has a single "Show all" button that expands
	// every CollapseCard so the number fields below become interactive.
	await page.getByRole('button', { name: 'Show all' }).click();

	for (const field of ['#timePerScreen', '#fullRefreshMin', '#minSecPriceUpd']) {
		await expect(page.locator(field)).toBeVisible();
		for (const val of ['42', '210']) {
			await page.fill(field, val);
			const resultValue = await page.$eval(field, (input: HTMLInputElement) => input.value);
			expect(resultValue).toBe(val);
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			const validationMessage = await page.$eval(
				field,
				(input: HTMLInputElement) => input.validationMessage
			);
			expect(validationMessage).not.toContain('Value must be greater');
		}

		for (const val of ['-10', '0']) {
			await page.fill(field, val);
			const resultValue = await page.$eval(field, (input: HTMLInputElement) => input.value);
			expect(resultValue).toBe(val);
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			const validationMessage = await page.$eval(
				field,
				(input: HTMLInputElement) => input.validationMessage
			);
			expect(validationMessage).toContain('Value must be greater');
		}
	}
});

test('npub values will be converted to hex pubkeys', async ({ page }) => {
	await page.goto('/');
	await waitForReady(page);
	await page.getByRole('button', { name: 'Show all' }).click();

	// Default fixture seeds one demo chip. Remove it first so the npub
	// we're about to type doesn't get rejected as a duplicate (the demo
	// chip's hex matches the npub's decoded hex, that's the whole point
	// of testing npub→hex conversion against a known answer).
	const removeFirstChip = page.locator('#nostrZapPubkeys-0 button[aria-label="Remove pubkey"]');
	if (await removeFirstChip.isVisible()) {
		await removeFirstChip.click();
	}

	const input = page.locator('#nostrZapPubkeys-input');
	const addBtn = page.locator('[data-testid="nostrZapPubkeys-add"]');
	await expect(input).toBeVisible();

	const npub = 'npub1k5f85zx0xdskyayqpfpc0zq6n7vwqjuuxugkayk72fgynp34cs3qfcvqg2';
	const hex = 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422';

	await input.fill(npub);
	await addBtn.click();

	// Chip's full pubkey lives in the inner `<span title>` so the chip
	// can show a truncated form without losing the canonical value.
	const chipTitle = await page.locator('#nostrZapPubkeys-0 span').first().getAttribute('title');
	expect(chipTitle).toBe(hex);

	// Visible (truncated) chip text: first 8 chars + ellipsis + last 4.
	await expect(page.locator('#nostrZapPubkeys-0 span').first()).toContainText(
		`${hex.slice(0, 8)}…${hex.slice(-4)}`
	);
});

test('empty nostr relay list is rejected when zap notify is enabled', async ({ page }) => {
	await page.goto('/');
	await waitForReady(page);
	await page.getByRole('button', { name: 'Show all' }).click();

	// Default fixture seeds one chip in the canonical (Extra Features)
	// chip list. Remove it to drive the chip list empty, then assert the
	// form-level validation summary surfaces nostrRelays as required —
	// the chip list has no native `required` to lean on, so the Save
	// path's pre-flight catches the empty list instead.
	const removeBtn = page.locator('#nostrRelays-0 button[aria-label="Remove relay"]');
	await expect(removeBtn).toBeVisible();
	await removeBtn.click();

	await expect(page.getByTestId('validation-summary')).toBeVisible();
	await expect(page.getByTestId('validation-link-nostrRelays-input')).toContainText(
		'At least one Nostr relay is required'
	);
});

test('screens should be able to change', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Sats per Dollar' })).toBeVisible();
	// 3.4.0 moved from `GET /api/show/screen/{id}` path params to POST.
	// The current API sends the selected screen id in the JSON body.
	const responsePromise = page.waitForRequest(
		(req) => req.url().includes('/api/show/screen') && req.method() === 'POST'
	);

	await page.getByRole('button', { name: 'Sats per Dollar' }).click();
	const response = await responsePromise;
	expect(response.url()).toContain('api/show/screen');
	expect(response.postDataJSON()).toEqual({ s: 10 });
});

test('parse all types of EPD content correctly', async ({ page }) => {
	statusJson.data[2] = '123';

	await page.route('**/events', (route) => {
		const newStatus = statusJson;
		newStatus.data = ['BLOCK/HEIGHT', '8', '123', '0', '8', '1', '5'];

		route.fulfill({
			status: 200,
			contentType: 'text/event-stream',
			json: `${JSON.stringify(newStatus)}\n\n`
		});
	});

	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await page.waitForSelector('#timerStatusText:has-text("running")');
	await page.waitForSelector('.btclock-wrapper > div > div:nth-child(1)');

	expect(statusJson.data[0]).toContain('/');
	await expect(page.locator('.btclock-wrapper > div > div:nth-child(1)')).toBeTruthy();
	await expect(page.locator('.btclock-wrapper > div > div:nth-child(1)')).toHaveClass(
		/splitText/
	);
	expect(statusJson.data[1]).toHaveLength(1);
	await expect(page.locator('.btclock-wrapper > div > div:nth-child(2)')).toHaveClass(/digit/);
	expect(statusJson.data[2]).toHaveLength(3);
	await expect(page.locator('.btclock-wrapper > div > div:nth-child(3)')).toHaveClass(
		/mediumText/
	);
});

test('should work with more than 7 screens', async ({ page }) => {
	statusJson.data[2] = '1';
	statusJson.numScreens = 9;
	settingsJson.numScreens = 9;
	statusJson.data.splice(1, 0, ' ', ' ');

	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await page.waitForSelector('#timerStatusText:has-text("running")');
	await expect(page.locator('.btclock-wrapper > div > div:nth-child(9)')).toBeTruthy();

	await expect(page.locator('#customText')).toHaveAttribute(
		'maxlength',
		statusJson.numScreens.toString()
	);
});
