/**
 * Tiny preview-string builder for the screen-specific settings toggles.
 *
 * Toggling `useSatsSymbol`, `mowMode`, `suffixPrice`, etc. only shows up
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
 *                          src/app.css and ClockDisplay.svelte's STS cell,
 *                          which both render the same way) vs no symbol
 *   - suffixPrice        : "57,798" vs "57.7k"
 *   - mowMode            : how digits collapse as the price grows
 *   - suffixShareDot     : "57.7k" vs "57.7 k"
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
	suffixPrice?: boolean;
	mowMode?: boolean;
	suffixShareDot?: boolean;
}

/**
 * Glyph the firmware draws when `useSatsSymbol` is on. The Satoshi Symbol
 * webfont (src/app.css :@font-face 'Satoshi Symbol') remaps the ASCII
 * letter "S" to the sats sigil; ClockDisplay.svelte uses the exact same
 * trick (`<div class="digit sats">S</div>` for the STS cell). The
 * settings preview emits the same string and lets its caller apply the
 * font so the inline preview matches what shows up on the device — the
 * Bitcoin "₿" we used to print here is a different glyph entirely.
 */
export const SATS_SYMBOL_GLYPH = 'S';

export interface SatsSymbolPreview {
	symbol: string;
	price: string;
}

export const previewSatsSymbol = ({ useSatsSymbol }: ScreenPreviewFlags): SatsSymbolPreview => ({
	symbol: useSatsSymbol ? SATS_SYMBOL_GLYPH : '',
	price: formatPlain(SAMPLE_PRICE)
});

export const previewSuffixPrice = ({
	suffixPrice,
	mowMode = false,
	suffixShareDot = false
}: ScreenPreviewFlags): string => {
	if (!suffixPrice) return formatPlain(SAMPLE_PRICE);
	return formatSuffix(SAMPLE_PRICE, mowMode, suffixShareDot);
};
