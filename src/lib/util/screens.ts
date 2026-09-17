import type { Screen } from '$lib/types/settings';

/** First firmware screen id reserved for the national-debt catalogue. */
export const DEBT_SCREEN_ID_START = 100;

/**
 * A national-debt screen: one catalogue entry per country/region. Firmware
 * that emits `kind: 'debt'` is authoritative; older debt-capable builds
 * only send the id + name, so fall back to the catalogue id range plus the
 * firmware's `<region> Debt` naming.
 */
export const isDebtScreen = (screen: Screen): boolean => {
	if (screen.kind === 'debt') return true;
	return (
		screen.kind === undefined &&
		screen.id >= DEBT_SCREEN_ID_START &&
		screen.name.endsWith(' Debt')
	);
};

/**
 * Screens to offer as quick-jump buttons. Every regular screen stays
 * (jumping to one that's out of rotation is the point of the buttons),
 * but the debt catalogue can run to dozens of countries, so only the
 * debt screens the user actually enabled get a button.
 */
export const quickJumpScreens = (screens: readonly Screen[]): Screen[] =>
	screens.filter((screen) => !isDebtScreen(screen) || screen.enabled);
