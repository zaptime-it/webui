/**
 * Regression: the Bitaxe and local-pool "Test" buttons used to render on a
 * second row (inside a `flex justify-end` wrapper) below their input, which
 * looked broken at every viewport. Both buttons now share the same DaisyUI
 * `.join` container as their `<Field>` input so they sit inline.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ExtraFeaturesSettings.svelte'), 'utf8');

describe('ExtraFeaturesSettings test buttons', () => {
	test('Bitaxe hostname Test button is an inline Field action', () => {
		// The button must render from the Field's `action` snippet with the
		// join-item class so it lands in the same flex row as the input.
		expect(src).toMatch(/id="bitaxeHostname"[\s\S]*?\{#snippet action\(\)\}/);
		expect(src).toMatch(/data-testid="bitaxe-test-btn"[^>]*/);
		expect(src).toMatch(/class="join-item btn btn-sm btn-success"[\s\S]*?onclick=\{testBitaxe\}/);
	});

	test('Local pool host Test button is an inline Field action', () => {
		expect(src).toMatch(/id="localPoolHost"[\s\S]*?\{#snippet action\(\)\}/);
		expect(src).toMatch(/data-testid="localpool-test-btn"[^>]*/);
		expect(src).toMatch(
			/class="join-item btn btn-sm btn-success"[\s\S]*?onclick=\{testLocalPool\}/
		);
	});

	test('no leftover "flex justify-end" wrapper around the test buttons', () => {
		// The old layout placed the button in a separate trailing flex row.
		// If this wrapper reappears around a Test button, the regression is
		// back.
		const patterns = [
			/<div class="flex justify-end">\s*<button[^>]*onclick=\{testBitaxe\}/,
			/<div class="flex justify-end">\s*<button[^>]*onclick=\{testLocalPool\}/
		];
		for (const p of patterns) expect(src).not.toMatch(p);
	});

	test('pool-wide hashrate toggle only appears for pools that expose /api/v1/pool', () => {
		// The toggle is gated in the template by `supportsGlobalStats`, which
		// is a derived Set-membership check. The hardcoded list mirrors the
		// firmware's MiningPoolInterface::supportsGlobalStats() overrides;
		// adding a third pool requires updates on both sides.
		expect(src).toMatch(
			/poolsWithGlobalStats = new Set\(\['noderunners', 'satoshiradio'\]\)/
		);
		expect(src).toContain('const supportsGlobalStats = $derived(');
		// Toggle renders only inside the supportsGlobalStats guard.
		expect(src).toMatch(
			/\{#if supportsGlobalStats\}[\s\S]*?id="poolGlobalStats"[\s\S]*?bind:checked=\{data\.poolGlobalStats\}/
		);
	});

	test('username field is disabled + optional when global-hashrate mode is on', () => {
		// When the user opts into the pool-wide hashrate, the per-user field
		// is irrelevant. Disable it + drop the `required` attribute so the
		// form doesn't block submit, but keep it visible so toggling off
		// restores the stored value without re-entry.
		expect(src).toMatch(
			/id="miningPoolUser"[\s\S]*?required=\{!\(supportsGlobalStats && data\.poolGlobalStats\)\}[\s\S]*?disabled=\{supportsGlobalStats && data\.poolGlobalStats\}/
		);
	});

	test('handlers use describeError + FetchError so toasts are actionable', () => {
		// Regression: the old handlers read `(err as Error).message`, which
		// surfaced the browser's raw `TypeError: Failed to fetch` in the
		// toast. Both handlers now funnel their failures through a single
		// `describeError` helper that maps `FetchError.kind` to friendly
		// copy.
		expect(src).toContain('import { fetchBitaxeInfo, fetchLocalPoolInfo, FetchError }');
		expect(src).toMatch(/const describeError = \(err: unknown,/);
		expect(src).toMatch(/err instanceof FetchError[\s\S]*?err\.kind === 'timeout'/);
		expect(src).toMatch(/err instanceof FetchError[\s\S]*?err\.kind === 'unreachable'/);
		// Distinguish a reachable-but-CORS-blocked host (Bitaxe 401 without
		// Access-Control-Allow-Origin) from a truly unreachable one so the
		// user knows whether the hostname is valid.
		expect(src).toMatch(/err instanceof FetchError[\s\S]*?err\.kind === 'cors'/);
		expect(src).toMatch(/describeError\(err, \{ thing: 'Bitaxe' \}\)/);
		expect(src).toMatch(/describeError\(err, \{ thing: 'Local pool' \}\)/);

		// Guard against reintroducing the raw Error.message leak.
		expect(src).not.toMatch(/toast\.error\([^,]+,\s*\(err as Error\)\.message\)/);
	});
});
