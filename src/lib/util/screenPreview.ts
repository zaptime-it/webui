/**
 * Tiny preview-string builder for the screen-specific settings toggles.
 *
 * Changing `priceSymMode`, `mowMode`, `suffixPrice`, etc. only shows up on the
 * device after the next paint, so users can't tell what each option will produce
 * without saving + watching the clock. These helpers return representative
 * strings for a given price + flag combination so the settings UI can render an
 * inline preview next to each switch.
 *
 * Behavioural mapping (approximates firmware):
 *   - priceSymMode 0    : no prefix glyph before the sample price
 *   - priceSymMode 1    : Satoshi Symbol webfont remaps ASCII "S" (same as device)
 *   - priceSymMode 2    : U+20BF — monospace-styled in the WebUI where the glyph is missing
 *   - suffixPrice       : "57,798" vs "57.7k"
 *   - mowMode           : how digits collapse as the price grows
 *   - decimalShareDot   : "57.7k" vs "57.7 k"
 */

const SAMPLE_PRICE = 57798; // mid-range USD/BTC

const formatPlain = (price: number): string => price.toLocaleString('en-US');

const SUFFIX_TIERS: Array<[number, string]> = [
	[1_000_000_000, 'B'],
	[1_000_000, 'M'],
	[1_000, 'k']
];

const formatSuffix = (price: number, mowMode: boolean, shareDot: boolean): string => {
	for (const [scale, tag] of SUFFIX_TIERS) {
		if (price < scale) continue;
		const scaled = price / scale;
		const fixed =
			mowMode && scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '');
		return shareDot && fixed.includes('.') ? `${fixed}${tag}` : `${fixed}${tag}`;
	}
	return formatPlain(price);
};

export interface ScreenPreviewFlags {
	/** 0 none, 1 sats glyph (Satoshi Symbol font), 2 ₿ — NVS `priceSymMode`. */
	priceSymMode?: number;
	suffixPrice?: boolean;
	mowMode?: boolean;
	decimalShareDot?: boolean;
}

export const SATS_SYMBOL_GLYPH = 'S';

export type SatsMarkerPreviewStyle = 'none' | 'satoshi' | 'btc';

export interface SatsSymbolPreview {
	symbol: string;
	price: string;
	markerStyle: SatsMarkerPreviewStyle;
}

/** Inline chip for the price-marker radios — ₿ uses system monospace in CSS (Ubuntu lacks U+20BF). */
export const previewSatsSymbol = ({
	priceSymMode: rawMode = 0
}: Pick<ScreenPreviewFlags, 'priceSymMode'>): SatsSymbolPreview => {
	const price = formatPlain(SAMPLE_PRICE);
	let m = typeof rawMode === 'number' && Number.isFinite(rawMode) ? Math.trunc(rawMode) : 0;
	if (m < 0 || m > 2) m = 0;
	if (m === 2) {
		return { symbol: '\u20BF', price, markerStyle: 'btc' };
	}
	if (m === 1) {
		return { symbol: SATS_SYMBOL_GLYPH, price, markerStyle: 'satoshi' };
	}
	return { symbol: '', price, markerStyle: 'none' };
};

export const previewSuffixPrice = ({
	suffixPrice,
	mowMode = false,
	decimalShareDot = false
}: ScreenPreviewFlags): string => {
	if (!suffixPrice) return formatPlain(SAMPLE_PRICE);
	return formatSuffix(SAMPLE_PRICE, mowMode, decimalShareDot);
};
