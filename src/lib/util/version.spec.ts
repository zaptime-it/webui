import { describe, test, expect } from 'vitest';
import { compareVersions, getFirmwareBinaryName, getWebUiBinaryName } from './version';

describe('compareVersions: core semver', () => {
	test('compares MAJOR.MINOR.PATCH numerically', () => {
		expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
		expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
		expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
	});

	test('zero-pads missing components', () => {
		expect(compareVersions('4', '4.0.0')).toBe(0);
		expect(compareVersions('4.1', '4.0.99')).toBeGreaterThan(0);
	});

	test('treats empty version2 as equal (legacy "no info" sentinel)', () => {
		expect(compareVersions('1.2.3', '')).toBe(0);
	});
});

describe('compareVersions: prerelease semver §11 ordering', () => {
	test('prerelease has lower precedence than the same core release', () => {
		expect(compareVersions('4.0.0-beta.13', '4.0.0')).toBeLessThan(0);
		expect(compareVersions('4.0.0', '4.0.0-beta.13')).toBeGreaterThan(0);
	});

	test('numeric prerelease parts compare numerically (not lexically)', () => {
		// The user's specific ask: "4.0.0-beta.13 is newer than 4.0.0-beta.1".
		expect(compareVersions('4.0.0-beta.13', '4.0.0-beta.1')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-beta.1', '4.0.0-beta.13')).toBeLessThan(0);
		expect(compareVersions('4.0.0-beta.2', '4.0.0-beta.10')).toBeLessThan(0);
	});

	test('prerelease ordering survives a higher patch on the right', () => {
		// "4.0.0-beta.13 is older than 4.0.1".
		expect(compareVersions('4.0.0-beta.13', '4.0.1')).toBeLessThan(0);
		expect(compareVersions('4.0.1', '4.0.0-beta.13')).toBeGreaterThan(0);
	});

	test('non-numeric < numeric? per spec it is the opposite', () => {
		// Numeric identifiers always have lower precedence than non-numeric.
		expect(compareVersions('1.0.0-1', '1.0.0-alpha')).toBeLessThan(0);
		expect(compareVersions('1.0.0-alpha', '1.0.0-1')).toBeGreaterThan(0);
	});

	test('alphabetic prerelease ordering (alpha < beta < rc)', () => {
		expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
		expect(compareVersions('1.0.0-beta', '1.0.0-rc')).toBeLessThan(0);
		expect(compareVersions('1.0.0-rc', '1.0.0')).toBeLessThan(0);
	});

	test('longer prerelease wins when all leading parts match', () => {
		expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBeLessThan(0);
		expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha')).toBeGreaterThan(0);
	});

	test('build metadata (everything after `+`) is ignored', () => {
		expect(compareVersions('1.0.0+abc', '1.0.0+def')).toBe(0);
		expect(compareVersions('1.0.0-beta.1+abc', '1.0.0-beta.1+def')).toBe(0);
	});
});

describe('compareVersions: git describe dev-suffix tolerance', () => {
	test('strips trailing -dirty', () => {
		expect(compareVersions('4.0.0-beta.13-dirty', '4.0.0-beta.13')).toBe(0);
	});

	test('strips git-describe -<N>-g<sha> ahead-of-tag suffix', () => {
		expect(compareVersions('4.0.0-beta.13-5-gabc1234', '4.0.0-beta.13')).toBe(0);
		expect(compareVersions('4.0.0-beta.13-5-gabc1234-dirty', '4.0.0-beta.13')).toBe(0);
	});

	test('does not strip legitimate prerelease numbers that look similar', () => {
		// "4.0.0-beta.13" must not be mistaken for a "-N-g<sha>" pattern.
		expect(compareVersions('4.0.0-beta.13', '4.0.0-beta.12')).toBeGreaterThan(0);
	});
});

describe('getFirmwareBinaryName / getWebUiBinaryName', () => {
	test('firmware/webui binary names are resolved per hw revision', () => {
		expect(getFirmwareBinaryName('REV_A_EPD_2_13')).toBe('btclock_rev_a_ota.bin');
		expect(getFirmwareBinaryName('REV_A_EPD_2_9')).toBe('btclock_rev_a_29_ota.bin');
		expect(getFirmwareBinaryName('REV_B_EPD_2_13')).toBe('btclock_rev_b_ota.bin');
		expect(getFirmwareBinaryName('REV_V8_EPD_2_13')).toBe('btclock_v8_ota.bin');
		expect(getWebUiBinaryName('REV_A_EPD_2_13')).toBe('storage_4mb.bin');
		expect(getWebUiBinaryName('REV_B_EPD_2_13')).toBe('storage_8mb.bin');
		expect(getWebUiBinaryName('REV_V8_EPD_2_13')).toBe('storage_16mb.bin');
	});

	test('unknown hw revisions are reported gracefully', () => {
		expect(getFirmwareBinaryName('UNKNOWN')).toMatch(/Unsupported/);
		expect(getWebUiBinaryName('UNKNOWN')).toMatch(/Unsupported/);
	});
});
