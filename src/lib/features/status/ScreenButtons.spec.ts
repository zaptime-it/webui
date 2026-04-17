/**
 * The screen-selector buttons used to be pre-chunked into fixed-width rows
 * (4 per row on mobile, 5 per row on desktop) wrapped in DaisyUI `.join`
 * groups. That was a workaround for DaisyUI's rounded corners misbehaving
 * on wrapped `.join` containers, but the fixed chunking meant the row could
 * overflow the Status column when the dashboard grid got narrower — so the
 * last screen name would get cut off.
 *
 * The component now emits a single `flex flex-wrap` container with plain
 * outlined buttons (no `.join` grouping), so the buttons reflow to fit the
 * column width automatically regardless of screen count or breakpoint.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ScreenButtons.svelte'), 'utf8');

describe('ScreenButtons layout', () => {
	test('template uses a single flex-wrap container', () => {
		expect(src).toMatch(/flex\s+flex-wrap[^"]*"[^>]*data-testid="screen-buttons"/);
	});

	test('template no longer pre-chunks screens into fixed-width rows', () => {
		expect(src).not.toContain('chunkArray');
		expect(src).not.toMatch(/class="join"/);
		expect(src).not.toMatch(/join-item/);
	});

	test('buttons are rendered from a single loop over settings.screens', () => {
		const eachLoops = src.match(/\{#each\s+settings\.screens/g) ?? [];
		expect(eachLoops.length).toBe(1);
	});
});
