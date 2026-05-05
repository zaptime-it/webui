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
		expect(src).toContain('act.map((c) => ({ id: c, code: c, enabled: true }))');
		expect(src).toContain('avail.filter((c) => !actSet.has(c))');
	});

	test('marks the currencies list with a stable test id', () => {
		expect(src).toContain('data-testid="currencies-reorder-list"');
	});

	test('switches to large-list mode above the threshold', () => {
		// Above LARGE_LIST_THRESHOLD the inactive set is too long to keep as
		// checkbox rows — the component hides inactives from the sortable
		// list and surfaces them through a typeahead instead.
		expect(src).toContain('LARGE_LIST_THRESHOLD = 10');
		expect(src).toContain('availableCurrencies.length > LARGE_LIST_THRESHOLD');
		// computeRows takes a `large` flag; in large mode it returns only
		// actives so inactive rows never render in the dnd list.
		expect(src).toContain('if (large) return actives');
	});

	test('large-mode rows expose a remove (x) button with stable test id', () => {
		// In large mode the toggle checkbox is gone — removal is the only
		// way to take a currency out of the active list. Re-adding happens
		// through the typeahead.
		expect(src).toContain('data-testid="currency-remove-');
		expect(src).toContain('removeAt(idx)');
	});

	test('large-mode renders an add-currency typeahead with suggestions', () => {
		// The add control is a search input + dropdown of inactive available
		// currencies. The dropdown should clamp suggestions to a small slice
		// so an unfiltered 150-entry list never overflows the card.
		expect(src).toContain('data-testid="currency-add-input"');
		expect(src).toContain('data-testid="currency-add-typeahead"');
		expect(src).toContain('MAX_SUGGESTIONS = 8');
		expect(src).toContain('.slice(0, MAX_SUGGESTIONS)');
		// Inactive set is derived from rows + availableCurrencies, not from
		// the original `actCurrencies` prop — that way an in-flight add or
		// remove updates the suggestions immediately.
		expect(src).toContain('availableCurrencies.filter((c) => !actSet.has(c))');
	});

	test('typeahead supports keyboard navigation and Enter-to-add', () => {
		// Arrow keys move the highlight; Enter commits the highlighted
		// suggestion. Without this, the typeahead is mouse-only.
		expect(src).toContain("e.key === 'ArrowDown'");
		expect(src).toContain("e.key === 'ArrowUp'");
		expect(src).toContain("e.key === 'Enter'");
		expect(src).toContain("e.key === 'Escape'");
	});

	test('add prevents duplicates and only accepts known codes', () => {
		// Defensive guards: typing an unknown code (or one already active)
		// should be a no-op so the device never receives a phantom currency.
		expect(src).toContain('if (!availableCurrencies.includes(code)) return');
		expect(src).toContain('if (rows.some((r) => r.code === code && r.enabled)) return');
	});
});
