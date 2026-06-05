/**
 * The previous fwCommitMismatch banner fired on every commit-level
 * difference between firmware and WebUI. Because the WebUI ships from
 * a separate repo, that meant the warning was almost always on,
 * training users to ignore it. This spec replaces those tests with
 * coverage of the new approach: the WebUI bakes a `MIN_FIRMWARE`
 * floor at build time (src/lib/manifest.json) and only flags
 * incompatibility when the device's reported `gitRev` is strictly
 * older than that floor — semver-aware, including prerelease ordering
 * (4.0.0-beta.13 > 4.0.0-beta.1, 4.0.0 > 4.0.0-rc, etc.).
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'SystemInfo.svelte'), 'utf8');

describe('SystemInfo: fw-too-old banner', () => {
	test('imports MIN_FIRMWARE from the version util (single source of truth)', () => {
		expect(src).toMatch(/import\s+\{[^}]*MIN_FIRMWARE[^}]*\}\s+from\s+'\$lib\/util\/version'/);
	});

	test('uses semver-aware compareVersions, not raw equality', () => {
		// Equality on strings would re-introduce the original bug where
		// a clean firmware build still tripped the banner because it
		// disagreed with the WebUI repo's HEAD SHA on a per-commit basis.
		expect(src).toMatch(/compareVersions\(/);
		expect(src).not.toMatch(/data\.gitRev\s*!==\s*data\.fsRev/);
	});

	test('banner gates on the new `incompatible` derived state', () => {
		expect(src).toMatch(/{#if incompatible}/);
	});

	test('banner copy is parameterised with min + current version', () => {
		// Without the params the user has no way to know what to update to.
		expect(src).toMatch(/section\.control\.fwTooOld/);
		expect(src).toMatch(/min:\s*ltrIsolate\(MIN_FIRMWARE\)/);
		expect(src).toMatch(/current:\s*ltrIsolate\(data\?\.gitRev/);
	});

	test('embedded LTR version/commit values are bidi-isolated for RTL locales', () => {
		// Interpolating a version number or commit SHA straight into the
		// translated (potentially Arabic) warning lets the bidi algorithm
		// reorder its digits/punctuation. Wrapping the value in U+2066…U+2069
		// (LRI…PDI) keeps it left-to-right inside the RTL sentence.
		expect(src).toContain('0x2066');
		expect(src).toContain('0x2069');
		expect(src).toMatch(/ltrIsolate\s*=/);
	});

	test('no sessionStorage / dismissal logic remains', () => {
		// The dismissal code was load-bearing only because the old
		// banner was firing constantly. With a meaningful condition we
		// don't need a "shut up" button — fix the firmware instead.
		expect(src).not.toContain('sessionStorage');
		expect(src).not.toContain('dismiss');
		expect(src).not.toContain('fwMismatchDismissed');
	});

	test('no SHA-equality "mismatch" derived state remains', () => {
		expect(src).not.toMatch(/const\s+mismatch\s*=/);
		expect(src).not.toMatch(/fwCommitMismatch/);
	});
});
