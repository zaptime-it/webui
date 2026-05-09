import { describe, test, expect } from 'vitest';
import { previewSatsSymbol, previewSuffixPrice, SATS_SYMBOL_GLYPH } from './screenPreview';

describe('previewSatsSymbol', () => {
	test('priceSymMode 0 omits symbol', () => {
		const out = previewSatsSymbol({ priceSymMode: 0 });
		expect(out.symbol).toBe('');
		expect(out.markerStyle).toBe('none');
	});

	test('priceSymMode 1 uses Satoshi glyph stand-in', () => {
		const out = previewSatsSymbol({ priceSymMode: 1 });
		expect(out.symbol).toBe(SATS_SYMBOL_GLYPH);
		expect(out.markerStyle).toBe('satoshi');
	});

	test('priceSymMode 2 shows U+20BF with btc marker style', () => {
		const out = previewSatsSymbol({ priceSymMode: 2 });
		expect(out.symbol).toBe('\u20BF');
		expect(out.markerStyle).toBe('btc');
	});

	test('unknown positive modes fall through like off', () => {
		const out = previewSatsSymbol({ priceSymMode: 99 });
		expect(out.markerStyle).toBe('none');
	});
});

describe('previewSuffixPrice', () => {
	test('plain formatting when suffixPrice false', () => {
		expect(previewSuffixPrice({ suffixPrice: false })).toMatch(/57,?798/);
	});
});
