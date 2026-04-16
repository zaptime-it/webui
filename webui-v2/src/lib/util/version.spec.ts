import { describe, test, expect } from 'vitest';
import { compareVersions, getFirmwareBinaryName, getWebUiBinaryName } from './version';

describe('version utils', () => {
	test('compareVersions returns correct ordering', () => {
		expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
		expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
		expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
	});

	test('firmware/webui binary names are resolved per hw revision', () => {
		expect(getFirmwareBinaryName('REV_A_EPD_2_13')).toBe('lolin_s3_mini_213epd_firmware.bin');
		expect(getFirmwareBinaryName('REV_V8_EPD_2_13')).toBe('btclock_rev_v8_213epd_firmware.bin');
		expect(getWebUiBinaryName('REV_B_EPD_2_13')).toBe('littlefs_8MB.bin');
	});

	test('unknown hw revisions are reported gracefully', () => {
		expect(getFirmwareBinaryName('UNKNOWN')).toMatch(/Unsupported/);
		expect(getWebUiBinaryName('UNKNOWN')).toMatch(/Unsupported/);
	});
});
