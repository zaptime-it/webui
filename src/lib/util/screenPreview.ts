/**
 * Tiny preview-string builder for the screen-specific settings toggles.
 *
 * Toggling `useSatsSymbol`, `useBtcSymbol`, `mowMode`, `suffixPrice`, etc. only shows up
 * on the device after the next paint, so users can't tell what each
 * option will produce without saving + watching the clock. These helpers
 * return a representative string for a given price + flag combination so
 * the settings UI can render an inline preview next to each switch.
 *
 * The strings are *approximations* of the firmware's renderer — they are
 * deliberately conservative and focus on the single behavioural change
 * each toggle makes:
 *
 *   - useSatsSymbol      : prefix the actual sats glyph (font-substituted
 *                          'S' from the Satoshi Symbol webfont — see
 *                          src/app.css and the settings sats preview chip,
 *                          which both render the same way) vs no symbol
 *   - useBtcSymbol       : mutually exclusive with useSatsSymbol on-device;
 *                          preview prefixes U+20BF (BTC sign), monospace-styled
 *                          in the WebUI because Ubuntu lacks the glyph
 *   - suffixPrice        : "57,798" vs "57.7k"
 *   - mowMode            : how digits collapse as the price grows
 *   - decimalShareDot     : "57.7k" vs "57.7 k" — applies to any
 *                          decimal/suffix display, not only suffix mode
 */

const SAMPLE_PRICE = 57798; // mid-range USD/BTC, picked to exercise k-suffix.

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
		// `mowMode` keeps a single decimal place when the integer part is
		// still single-digit and trims it when it grows (>=10), so the
		// total visible character count never exceeds ~3 digits + suffix.
		// Without mowMode we always emit one decimal.
		const fixed =
			mowMode && scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '');
		return shareDot && fixed.includes('.') ? `${fixed}${tag}` : `${fixed}${tag}`;
	}
	return formatPlain(price);
};

export interface ScreenPreviewFlags {
	useSatsSymbol?: boolean;
	/** Mutually exclusive with `useSatsSymbol` on device + PATCH; preview prefers ₿ when both true. */
	useBtcSymbol?: boolean;
	suffixPrice?: boolean;
	mowMode?: boolean;
	decimalShareDot?: boolean;
}

/**
 * Glyph the firmware draws when `useSatsSymbol` is on. The Satoshi Symbol
 * webfont (src/app.css :@font-face 'Satoshi Symbol') remaps the ASCII
 * letter "S" to the sats sigil. The settings preview emits the same
 * string and lets its caller apply the
 * font so the inline preview matches what shows up on the device — the
 * Bitcoin "₿" we used to print here is a different glyph entirely.
 */
export const SATS_SYMBOL_GLYPH = 'S';

export type SatsMarkerPreviewStyle = 'none' | 'satoshi' | 'btc';

export interface SatsSymbolPreview {
	symbol: string;
	price: string;
	markerStyle: SatsMarkerPreviewStyle;
}

/** Inline chip for the sats / ₿ marker toggles — ₿ uses system monospace in CSS (Ubuntu lacks U+20BF). */
export const previewSatsSymbol = ({
	useSatsSymbol,
	useBtcSymbol
}: ScreenPreviewFlags): SatsSymbolPreview => {
	const price = formatPlain(SAMPLE_PRICE);
	if (useBtcSymbol) {
		return { symbol: '\u20BF', price, markerStyle: 'btc' };
	}
	if (useSatsSymbol) {
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
