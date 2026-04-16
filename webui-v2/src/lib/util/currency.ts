/**
 * The BTClock firmware renders currency symbols on its own font map. These
 * single-character codes arrive in `status.data[]` and need conversion when we
 * mirror the display in the browser.
 */

const CURRENCY_EUR = '[';
const CURRENCY_GBP = ']';
const CURRENCY_JPY = '^';
const CURRENCY_AUD = '_';
const CURRENCY_CAD = '`';
const CURRENCY_USD = '$';

export const getCurrencySymbol = (input: string): string =>
	input
		.split('')
		.map((char) => {
			switch (char) {
				case CURRENCY_EUR:
					return '€';
				case CURRENCY_GBP:
					return '£';
				case CURRENCY_JPY:
					return '¥';
				case CURRENCY_AUD:
				case CURRENCY_CAD:
				case CURRENCY_USD:
					return '$';
				default:
					return char;
			}
		})
		.join('');
