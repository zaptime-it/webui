import type { Screen } from '$lib/types/settings';

/**
 * A national-debt screen: one catalogue entry per country/region. The
 * firmware tags those rows with `kind: "debt"` on GET /api/settings (see
 * static/openapi.yml, Screen.kind); base screens omit the key. Trust the
 * tag rather than sniffing the id range or the `<region> Debt` name.
 */
export const isDebtScreen = (screen: Screen): boolean => screen.kind === 'debt';

/**
 * Screens to offer as quick-jump buttons. Every regular screen stays
 * (jumping to one that's out of rotation is the point of the buttons),
 * but the debt catalogue can run to dozens of countries, so only the
 * debt screens the user actually enabled get a button.
 */
export const quickJumpScreens = (screens: readonly Screen[]): Screen[] =>
	screens.filter((screen) => !isDebtScreen(screen) || screen.enabled);
