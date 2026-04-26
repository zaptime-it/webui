import { describe, test, expect } from 'vitest';
import { previewSatsSymbol, previewSuffixPrice } from './screenPreview';

describe('previewSatsSymbol', () => {
	test('without the symbol just emits the formatted price', () => {
		expect(previewSatsSymbol({ useSatsSymbol: false })).toMatch(/^\d/);
	});

	test('with the symbol prefixes the bitcoin glyph', () => {
		expect(previewSatsSymbol({ useSatsSymbol: true })).toMatch(/^₿/);
	});
});

describe('previewSuffixPrice', () => {
	test('without suffix mode emits the full digit string', () => {
		expect(previewSuffixPrice({ suffixPrice: false })).toMatch(/^\d{2,3},\d{3}$/);
	});

	test('with suffix mode collapses thousands to a k-suffix', () => {
		const out = previewSuffixPrice({ suffixPrice: true });
		expect(out).toMatch(/k$/);
		// Stays under five visible characters before the suffix.
		expect(out.length).toBeLessThanOrEqual(7);
	});

	test('mowMode trims the decimal once the integer part reaches double digits', () => {
		// SAMPLE_PRICE / 1k = 57.798. With mowMode the integer part is 57 (>=10),
		// so the .1 decimal is dropped. Without mowMode we keep one decimal.
		const withMow = previewSuffixPrice({ suffixPrice: true, mowMode: true });
		const noMow = previewSuffixPrice({ suffixPrice: true, mowMode: false });
		expect(withMow).not.toMatch(/\./);
		expect(noMow).toMatch(/\./);
	});
});
