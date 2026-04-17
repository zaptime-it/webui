/**
 * Regression: the screen-selector buttons used to live in a single `.join`
 * group with `flex-wrap`, which broke DaisyUI's rounded-corner styling on
 * wrapped rows. The component now chunks screens into fixed-width rows
 * (4 per row on mobile, 5 per row on desktop) and emits each row as its own
 * `.join` container.
 *
 * We lock this in with a pair of complementary checks:
 *   - a unit test on the underlying `chunkArray` helper that matches the
 *     desktop 5-per-row / mobile 4-per-row split for the 8-screen default
 *     firmware configuration;
 *   - a source assertion that ensures the template keeps emitting one
 *     `.join` container per chunk (not a single flex-wrap container).
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chunkArray } from '$lib/util/format';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ScreenButtons.svelte'), 'utf8');

describe('ScreenButtons chunking', () => {
	test('mobile chunks in groups of 4, desktop chunks in groups of 5', () => {
		const screens = Array.from({ length: 8 }, (_, i) => ({
			id: i,
			name: `S${i}`,
			enabled: true
		}));
		expect(chunkArray(screens, 4).map((c) => c.length)).toEqual([4, 4]);
		expect(chunkArray(screens, 5).map((c) => c.length)).toEqual([5, 3]);
	});

	test('template renders one .join row per chunk, not a single flex-wrap group', () => {
		expect(src).toContain('chunkArray(settings.screens, 4)');
		expect(src).toContain('chunkArray(settings.screens, 5)');
		// Each `{#each ...Chunks}` loop must wrap its buttons in a `.join`
		// sibling so the rounded-corner classes on the first/last join-item
		// stay inside their own row.
		const eachJoin = /\{#each\s+\w+Chunks[\s\S]*?<div class="join">/g;
		const matches = src.match(eachJoin);
		expect(matches?.length ?? 0).toBe(2);
		// And no lingering flex-wrap container around all buttons.
		expect(src).not.toMatch(/class="join flex-wrap"/);
	});

	test('every button is a DaisyUI join-item', () => {
		const buttons = src.match(/<button[\s\S]*?>/g) ?? [];
		const templateButtons = buttons.filter((b) => b.includes('onclick={pick'));
		expect(templateButtons.length).toBeGreaterThan(0);
		for (const b of templateButtons) expect(b).toContain('join-item');
	});
});
