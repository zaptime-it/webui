/**
 * ScreenRotationList is the per-row drag/arrow/toggle widget that replaces
 * the old flat SwitchField grid for screens. The tests here are source-level
 * contracts — we assert against the component's .svelte text rather than
 * mounting it, matching the pattern used by the other spec files in this
 * directory. Mounting would require the paraglide runtime plus a stubbed
 * settings store, which is overkill to verify a handful of layout and
 * behaviour invariants.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ScreenRotationList.svelte'), 'utf8');

describe('ScreenRotationList', () => {
	test('binds the screens array so parent state reflects reorders', () => {
		// The `bind:screens` two-way pattern is load-bearing: the DnD
		// handlers mutate this array in place, and SettingsPanel.handleSubmit
		// reads the post-drag order back out of the settings store. A one-way
		// `screens` prop would silently drop every reorder.
		expect(src).toContain('let { screens = $bindable()');
	});

	test('wires svelte-dnd-action via use:dndzone with consider + finalize', () => {
		// svelte-dnd-action needs both onconsider (mid-drag preview) and
		// onfinalize (drop committed). Dropping onfinalize would leave the
		// list in a placeholder state after a drop; dropping onconsider
		// would prevent the visual reorder preview.
		expect(src).toContain('use:dndzone=');
		expect(src).toContain('onconsider={handleConsider}');
		expect(src).toContain('onfinalize={handleFinalize}');
	});

	test('renders up/down arrow buttons for non-DnD reordering', () => {
		// Touch DnD is fraught on mobile (list-scroll fights drag), and
		// keyboard/screen-reader users can't drag at all. The arrow
		// buttons are the accessible fallback and must stay.
		expect(src).toContain("aria-label={m['button.moveUp']()}");
		expect(src).toContain("aria-label={m['button.moveDown']()}");
		expect(src).toContain('onclick={() => moveUp(idx)}');
		expect(src).toContain('onclick={() => moveDown(idx)}');
	});

	test('disables end-boundary arrow buttons', () => {
		// Moving up from index 0 or down from the last index is a no-op.
		// The button handlers guard this, but the buttons also visually
		// disable so the affordance matches reality.
		expect(src).toContain('disabled={idx === 0}');
		expect(src).toContain('disabled={idx === screens.length - 1}');
	});

	test('keeps the currency-specific screen IDs in sync with firmware', () => {
		// These IDs come from src/lib/system/shared.hpp (SCREEN_SATS_PER_CURRENCY
		// = 10, SCREEN_BTC_TICKER = 20, SCREEN_MARKET_CAP = 30). The badge
		// that annotates these rows (`× N currencies`) is only correct for
		// exactly this set. If any firmware screen ID changes, update both.
		expect(src).toContain('new Set([10, 20, 30])');
	});

	test('shows the × N currencies badge only when >1 currency is active', () => {
		// With a single active currency the expansion collapses to a single
		// rotation tick, so the `× 1 per currency` badge would be noise.
		expect(src).toContain('activeCurrencyCount > 1');
		expect(src).toContain("m['section.settings.perCurrency']()");
	});

	test('dims rows for disabled screens without hiding them', () => {
		// Disabled screens stay in the list (and stay reorderable) because
		// re-enabling them later should restore their chosen position —
		// hiding disabled rows would force the user to rediscover where
		// they put the screen.
		expect(src).toContain('class:opacity-60={!s.enabled}');
	});

	test('marks the screens list with a stable test id', () => {
		expect(src).toContain('data-testid="screens-reorder-list"');
	});
});
