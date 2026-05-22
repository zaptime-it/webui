import { test, expect } from '@playwright/test';

import { initMock, settingsJson, statusJson } from '../shared';
import { waitForStatusConnected } from '../wait-for-status-connected';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

test.beforeEach(initMock);

// Captured 2026-05-14 from btclock-b52800.local (REV_B_EPD_2_13, fw
// 4.0.0-rc.11) via tools/capture_fb.mjs — replays in the doc screenshot
// so FramebufferPreview shows the real BTC/USD ticker instead of empty
// gold-ringed panels.
const FB_FRAMES: { panelIndex: number; base64: string }[] = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'framebuffer-frames.json'), 'utf8')
);

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

	// Match the live REV_B device: bump gitRev to satisfy MIN_FIRMWARE
	// so SystemInfo's "firmware too old" banner stays hidden, and flip
	// hwRev to REV_B_EPD_2_13 so the dev-doc screenshot reflects the
	// hardware the WebUI is actually exercised against.
	settingsJson.hwRev = 'REV_B_EPD_2_13';
	settingsJson.gitRev = '4.0.0-rc.11';
	settingsJson.fsRev = '4.0.0-rc.11';
	settingsJson.gitTag = '4.0.0-rc.11';

	// Inject the captured framebuffer packets into the page so the
	// patched WebSocket below can replay them once the FramebufferPreview
	// component connects to `/api/preview/ws`.
	await page.addInitScript((frames) => {
		(window as unknown as { __FB_PREVIEW_FRAMES__: typeof frames }).__FB_PREVIEW_FRAMES__ =
			frames;
	}, FB_FRAMES);

	// `initMock` already installs a `window.WebSocket` patch that intercepts
	// `/api/preview/ws`; it picks up the `__FB_PREVIEW_FRAMES__` set above
	// and replays them, so no extra patching is needed here.

	await page.goto('/');
	await expect(page.getByRole('heading', { name: translations.control })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.status })).toBeVisible();
	await expect(page.getByRole('heading', { name: translations.settings })).toBeVisible();

	if (await page.locator('#nav-language-dropdown').isVisible()) {
		await expect(page.getByRole('link', { name: translations.language })).toBeVisible();
	}

	await waitForStatusConnected(page);

	// Wait for the panel rasters to land on the canvas. FramebufferPreview
	// applies frames inside an effect; without this wait the screenshot
	// races the first redraw and panels still look empty even though
	// the WS replay finished. We detect "frames painted" by sampling a
	// row across the panel band: an empty canvas is uniform PCB chrome
	// or uniform panel face, painted panels yield high luma variance.
	await page.waitForFunction(() => {
		const canvas = document.querySelector('.preview-canvas') as HTMLCanvasElement | null;
		if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
		const ctx = canvas.getContext('2d');
		if (!ctx) return false;
		const row = ctx.getImageData(0, Math.floor(canvas.height * 0.4), canvas.width, 1).data;
		let min = 255;
		let max = 0;
		for (let i = 0; i < row.length; i += 4) {
			const v = row[i];
			if (v < min) min = v;
			if (v > max) max = v;
		}
		return max - min > 120;
	});

	// Clip to the actual content height — the doc-screenshot viewport
	// is intentionally tall (so the sticky Save/Reset bar lands at its
	// natural form bottom instead of pinning mid-document), but that
	// leaves several hundred px of empty footer below the cards. Trim
	// it by clipping to the last painted row + a small margin.
	const viewport = page.viewportSize();
	const viewportWidth = viewport?.width ?? 1280;
	const contentHeight = await page.evaluate(() => {
		const root = document.querySelector('.grid.grid-cols-1');
		if (!root) return document.documentElement.scrollHeight;
		return Math.ceil(root.getBoundingClientRect().bottom + 24);
	});
	const screenshot = await page.screenshot({
		clip: { x: 0, y: 0, width: viewportWidth, height: contentHeight }
	});

	await sharp(screenshot)
		.toFormat('webp', {
			quality: 95,
			nearLossless: true
		})
		.toFile(
			`./doc/screenshot-${String(testInfo.project.use.colorScheme ?? 'light')
				.toLowerCase()
				.replace(/\s+/g, '_')}.webp`
		);
});
