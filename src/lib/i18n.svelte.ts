import { browser } from '$app/environment';
import {
	setLocale as paraglideSetLocale,
	getLocale as paraglideGetLocale,
	locales,
	isLocale
} from '$lib/paraglide/runtime';

export type SupportedLocale = 'en' | 'nl' | 'es' | 'de';
export const supportedLocales: readonly SupportedLocale[] = ['en', 'nl', 'es', 'de'];

export { locales };

/**
 * Reactive mirror of Paraglide's current locale. Paraglide's own `getLocale()`
 * is a plain function, so components that `$derived(getLocale())` would never
 * re-render on locale change. We drive this rune from `setLocale` below and
 * expose it through `currentLocale` so every `m.foo()` call sits downstream
 * of a reactive dependency.
 */
const localeState = $state<{ value: SupportedLocale }>({
	value: (paraglideGetLocale() as SupportedLocale) ?? 'en'
});

export const currentLocale = {
	get value(): SupportedLocale {
		return localeState.value;
	}
};

export const initLocale = () => {
	if (!browser) return;
	const stored = localStorage.getItem('locale');
	if (stored && isLocale(stored)) {
		paraglideSetLocale(stored as SupportedLocale, { reload: false });
		localeState.value = stored as SupportedLocale;
		return;
	}
	const fromBrowser = (window.navigator.language.split('-')[0] ?? '').toLowerCase();
	const locale = supportedLocales.includes(fromBrowser as SupportedLocale)
		? (fromBrowser as SupportedLocale)
		: 'en';
	paraglideSetLocale(locale, { reload: false });
	localeState.value = locale;
};

export const setLocale = (locale: SupportedLocale) => {
	paraglideSetLocale(locale, { reload: false });
	localeState.value = locale;
	if (browser) localStorage.setItem('locale', locale);
};

export const getLocale = (): SupportedLocale => localeState.value;

const flagMap: Record<string, string> = { en: '🇬🇧', nl: '🇳🇱', es: '🇪🇸', de: '🇩🇪' };
export const getFlagEmoji = (code: string): string =>
	flagMap[code.toLowerCase()] ?? flagMap.en ?? '';
