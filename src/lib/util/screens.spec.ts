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
	test('trusts an explicit kind', () => {
		expect(isDebtScreen(screen(100, 'US Debt', true, 'debt'))).toBe(true);
		expect(isDebtScreen(screen(100, 'US Debt', true, 'regular'))).toBe(false);
	});

	test('falls back to the catalogue id range + " Debt" suffix when kind is absent', () => {
		expect(isDebtScreen(screen(100, 'US Debt', false))).toBe(true);
		expect(isDebtScreen(screen(99, 'US Debt', false))).toBe(false);
		expect(isDebtScreen(screen(100, 'Ticker', false))).toBe(false);
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
