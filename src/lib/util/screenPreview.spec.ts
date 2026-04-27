import { describe, test, expect } from 'vitest';
import { previewSatsSymbol, previewSuffixPrice, SATS_SYMBOL_GLYPH } from './screenPreview';

describe('previewSatsSymbol', () => {
	test('without the symbol the symbol slot is empty and price is plain digits', () => {
		const out = previewSatsSymbol({ useSatsSymbol: false });
		expect(out.symbol).toBe('');
		expect(out.price).toMatch(/^\d/);
	});

	test('with the symbol the slot is the Satoshi-font letter S, not the bitcoin glyph', () => {
		// Why "S": the Satoshi Symbol webfont (src/app.css) substitutes the
		// ASCII "S" with the sats sigil, the same trick ClockDisplay uses
		// for the STS cell. Returning "₿" would render the bitcoin symbol,
		// which is what the previous version did and what we're fixing.
		const out = previewSatsSymbol({ useSatsSymbol: true });
		expect(out.symbol).toBe(SATS_SYMBOL_GLYPH);
		expect(SATS_SYMBOL_GLYPH).toBe('S');
		expect(out.symbol).not.toBe('₿');
		expect(out.price).toMatch(/^\d/);
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
