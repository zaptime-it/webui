/**
 * CurrencyRotationList owns a local reorderable view of all available
 * currencies with per-row toggles. It mirrors ScreenRotationList but with
 * one crucial difference: only the *enabled* subset is persisted back to
 * the store (via the onChange callback). Re-enabling a disabled currency
 * appends it at the end.
 *
 * Like the sibling spec files in this directory, the tests assert against
 * the component's source rather than mounting it — mounting would require
 * paraglide + a stubbed settings store just to verify a few layout and
 * behaviour invariants.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'CurrencyRotationList.svelte'), 'utf8');

describe('CurrencyRotationList', () => {
	test('commits only the enabled subset, in list order', () => {
		// The store contract is "actCurrencies = enabled currencies in
		// rotation order". Sending the full list (with disabled entries)
		// would flip disabled currencies back on after every save.
		expect(src).toContain('rows.filter((r) => r.enabled).map((r) => r.code)');
		expect(src).toContain('onChange(newActive)');
	});

	test('avoids the external→local→external rebuild loop', () => {
		// Writing actCurrencies from inside the component triggers a prop
		// change that would re-fire the rebuild $effect and clobber the
		// in-flight reorder. The lastSeen trackers let the effect skip the
		// rebuild when the incoming snapshot matches what we just wrote.
		expect(src).toContain('lastSeenAct');
		expect(src).toContain('lastSeenAvail');
		expect(src).toContain('lastSeenAct = newActive.join(');
	});

	test('wires svelte-dnd-action with consider + finalize', () => {
		expect(src).toContain('use:dndzone=');
		expect(src).toContain('onconsider={handleConsider}');
		expect(src).toContain('onfinalize={handleFinalize}');
	});

	test('renders up/down arrow buttons for non-DnD reordering', () => {
		expect(src).toContain("aria-label={m['button.moveUp']()}");
		expect(src).toContain("aria-label={m['button.moveDown']()}");
		expect(src).toContain('onclick={() => moveUp(idx)}');
		expect(src).toContain('onclick={() => moveDown(idx)}');
	});

	test('disables end-boundary arrow buttons', () => {
		expect(src).toContain('disabled={idx === 0}');
		expect(src).toContain('disabled={idx === rows.length - 1}');
	});

	test('dims rows for disabled currencies without hiding them', () => {
		// Disabled currencies stay visible in the list — they have to, that's
		// how users re-enable them. The dim just signals "not in rotation".
		expect(src).toContain('class:opacity-60={!r.enabled}');
	});

	test('initial row order puts actives first, inactives after', () => {
		// On first render the list shows enabled currencies in their stored
		// rotation order, followed by the remaining availableCurrencies in
		// canonical order — matching what `actCurrencies` itself already
		// implies about user intent.
		expect(src).toContain('...act.map(');
		expect(src).toContain('...avail.filter((c) => !actSet.has(c))');
	});

	test('marks the currencies list with a stable test id', () => {
		expect(src).toContain('data-testid="currencies-reorder-list"');
	});
});
