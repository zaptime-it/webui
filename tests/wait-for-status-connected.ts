import { expect, type Page } from '@playwright/test';

/** Wait until SSE has opened so the Status “Lost connection” overlay is gone (see `Status.svelte`). */
export async function waitForStatusConnected(page: Page) {
	await expect(page.locator('.connection-lost-overlay')).toHaveCount(0, { timeout: 20_000 });
}
