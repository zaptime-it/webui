/**
 * Regression: the settings card dropped to two columns on mobile because the
 * switch grids were driven by container queries (`@md:grid-cols-2`) that
 * matched too early in some nested layouts.
 *
 * The grids are now driven by viewport breakpoints instead, mirroring the
 * Bootstrap `col={{ md: 6, xl: 12, xxl: 6 }}` layout from the previous WebUI:
 *   - below md  (viewport < 768px): 1 column
 *   - md..<lg   (768-1023px stacked): 2 columns
 *   - lg..<2xl  (3-col layout, narrow settings card): 1 column
 *   - >=2xl     (3-col layout, wide settings card): 2 columns
 *
 * We lock this in by asserting against the component's source: a pure
 * DOM assertion would need a fully populated `Settings` store, which is
 * overkill for what is effectively a layout contract.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, name), 'utf8');

const RESPONSIVE = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2';

describe('settings grids stay viewport-responsive', () => {
	test('ScreenSpecificSettings switches grid uses the viewport breakpoints', () => {
		const src = read('ScreenSpecificSettings.svelte');
		expect(src).toContain('data-testid="screen-switches-grid"');
		expect(src).toContain(RESPONSIVE);
		expect(src).not.toContain('@md:grid-cols-2');
	});

	test('ScreenSpecificSettings screens + currencies grids are viewport-responsive', () => {
		const src = read('ScreenSpecificSettings.svelte');
		expect(src).toContain('data-testid="screens-grid"');
		expect(src).toContain('data-testid="currencies-grid"');
		// Both additional grids share the same responsive class string.
		const matches = src.match(new RegExp(RESPONSIVE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
		expect(matches?.length ?? 0).toBeGreaterThanOrEqual(3);
	});

	test('DisplaySettings switch grid uses the viewport breakpoints', () => {
		const src = read('DisplaySettings.svelte');
		expect(src).toContain(RESPONSIVE);
		expect(src).not.toContain('@md:grid-cols-2');
	});

	test('SystemSettings switch grid uses the viewport breakpoints', () => {
		const src = read('SystemSettings.svelte');
		expect(src).toContain(RESPONSIVE);
		expect(src).not.toContain('@md:grid-cols-2');
	});

	test('ExtraFeaturesSettings zap-options grid uses the viewport breakpoints', () => {
		const src = read('ExtraFeaturesSettings.svelte');
		expect(src).toContain(RESPONSIVE);
	});
});
