import { describe, test, expect } from 'vitest';
import { toUptimeString, chunkArray } from './format';

describe('toUptimeString', () => {
	test('formats zero uptime', () => {
		expect(toUptimeString(0)).toBe('0h 0m 0s');
	});

	test('formats sub-minute uptime', () => {
		expect(toUptimeString(42)).toBe('0h 0m 42s');
	});

	test('formats hours/minutes/seconds', () => {
		expect(toUptimeString(3723)).toBe('1h 2m 3s');
	});
});

describe('chunkArray', () => {
	test('returns an empty array when the input is empty', () => {
		expect(chunkArray([], 3)).toEqual([]);
	});

	test('splits evenly-sized groups', () => {
		expect(chunkArray([1, 2, 3, 4, 5, 6], 3)).toEqual([
			[1, 2, 3],
			[4, 5, 6]
		]);
	});

	test('keeps the trailing partial chunk intact', () => {
		// ScreenButtons on the desktop variant relies on 5-per-row grouping;
		// the 8-screen default firmware must therefore render as [5,3].
		expect(chunkArray([1, 2, 3, 4, 5, 6, 7, 8], 5)).toEqual([
			[1, 2, 3, 4, 5],
			[6, 7, 8]
		]);
	});

	test('handles chunk sizes larger than the input', () => {
		expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
	});
});
