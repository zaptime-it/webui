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

	test('ScreenSpecificSettings exposes the Moscow Time toggle bound to useMscwTime', () => {
		// The toggle lets users switch the USD sats-per-currency screen between
		// the legacy "MSCW/TIME" label and the generic "SATS/USD" label that the
		// other currencies use. Asserting against the source keeps parity with
		// the other switches in this grid and avoids mounting the full settings
		// store just to check a single SwitchField.
		const src = read('ScreenSpecificSettings.svelte');
		expect(src).toContain('id="useMscwTime"');
		expect(src).toContain('bind:checked={data.useMscwTime}');
		expect(src).toContain("m['section.settings.useMscwTime']()");
	});

	test('ScreenSpecificSettings uses joined radio buttons for price marker + preview', () => {
		const src = read('ScreenSpecificSettings.svelte');
		expect(src).toContain('data-testid="price-marker-radiogroup"');
		expect(src).toContain('id="price-marker-radiogroup"');
		expect(src).toContain('join join-vertical');
		expect(src).toContain('sm:join-horizontal');
		expect(src).toContain('name="priceMarker"');
		expect(src).toContain('applyMarkerMode');
		expect(src).toContain('data-testid="sats-marker-preview"');
		expect(src).toContain('btc-marker');
		expect(src).toContain("m['section.settings.priceMarkerHeading']()");
		expect(src).toContain('btcMarkerSupported');
		expect(src).toContain('hasBtcSymbol');
		expect(src).toContain('disabled={!btcMarkerSupported}');
		expect(src).toContain("m['section.settings.priceMarkerFontHelp']()");
		expect(src).toContain('id="price-marker-help"');
	});

	test('ScreenSpecificSettings exposes the satsVariant picker, capability-gated', () => {
		// satsVariant is a v4-only firmware addition: a 16-way visual
		// picker rendering U+E000..U+E00F via the 'Satoshi Symbol Variants'
		// webfont. Capability-gated on `'satsVariant' in data` so older
		// firmware that doesn't emit the field skips the control. Source-
		// level assertion keeps this in line with the other switch tests
		// above and avoids mounting the full settings store.
		const src = read('ScreenSpecificSettings.svelte');
		expect(src).toContain("'satsVariant' in data");
		expect(src).toContain('data-testid="sats-variant-picker"');
		expect(src).toContain('name="satsVariant"');
		expect(src).toContain('data.satsVariant = i');
		expect(src).toContain('priceSymMode');
		expect(src).toContain("m['section.settings.satsVariant']()");
	});

	test('ScreenRotation + CurrencyRotation live in their own sibling sections', () => {
		// The screens-rotation and currencies-rotation lists used to be
		// children of ScreenSpecificSettings, which forced users to scroll
		// past two long drag-and-drop lists to reach the Save button. They
		// now live in their own CollapseCards so the user can collapse them
		// independently. The testids stay so layout + navigation assertions
		// can still locate them.
		const screenSpecific = read('ScreenSpecificSettings.svelte');
		expect(screenSpecific).not.toContain('ScreenRotationList');
		expect(screenSpecific).not.toContain('CurrencyRotationList');

		const rotation = read('ScreenRotationSection.svelte');
		expect(rotation).toContain('data-testid="screens-grid"');
		expect(rotation).toContain('ScreenRotationList');

		const currency = read('CurrencyRotationSection.svelte');
		expect(currency).toContain('data-testid="currencies-grid"');
		expect(currency).toContain('CurrencyRotationList');

		// Only the top switches grid still uses the responsive layout.
		const matches = screenSpecific.match(
			new RegExp(RESPONSIVE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
		);
		expect(matches?.length ?? 0).toBeGreaterThanOrEqual(1);
	});

	test('DisplaySettings switch grid uses the viewport breakpoints', () => {
		const src = read('DisplaySettings.svelte');
		expect(src).toContain(RESPONSIVE);
		expect(src).not.toContain('@md:grid-cols-2');
	});

	test('DisplaySettings exposes labelFitPct percent slider', () => {
		const src = read('DisplaySettings.svelte');
		expect(src).toContain("'labelFitPct' in data");
		expect(src).toContain('id="labelFitPct"');
		expect(src).toContain('bind:value={data.labelFitPct}');
		expect(src).toContain('valueSuffix="%"');
		expect(src).toContain("m['section.settings.labelFitPct']()");
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
