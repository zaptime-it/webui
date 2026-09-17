import { describe, expect, test } from 'vitest';
import { isDebtScreen, quickJumpScreens } from './screens';

const screen = (id: number, name: string, enabled: boolean, kind?: string) => ({
	id,
	name,
	enabled,
	order: id,
	...(kind === undefined ? {} : { kind })
});

describe('isDebtScreen', () => {
	test('is driven by the firmware kind tag alone', () => {
		expect(isDebtScreen(screen(100, 'US Debt', true, 'debt'))).toBe(true);
		expect(isDebtScreen(screen(100, 'US Debt', true, 'regular'))).toBe(false);
		// No id-range / name sniffing: an untagged row is a base screen even
		// if it happens to sit in the catalogue id range with a Debt name.
		expect(isDebtScreen(screen(100, 'US Debt', false))).toBe(false);
		expect(isDebtScreen(screen(0, 'Block Height', true))).toBe(false);
	});
});

describe('quickJumpScreens', () => {
	test('keeps every regular screen, enabled or not, and only enabled debt screens', () => {
		const screens = [
			screen(0, 'Block Height', true),
			screen(10, 'Sats per dollar', false),
			screen(100, 'US Debt', true, 'debt'),
			screen(101, 'EU Debt', false, 'debt')
		];
		expect(quickJumpScreens(screens).map((s) => s.id)).toEqual([0, 10, 100]);
	});
});
