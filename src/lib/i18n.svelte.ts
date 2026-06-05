import { browser } from '$app/environment';
import {
	setLocale as paraglideSetLocale,
	getLocale as paraglideGetLocale,
	locales,
	isLocale
} from '$lib/paraglide/runtime';

export type SupportedLocale =
	| 'en'
	| 'nl'
	| 'es'
	| 'de'
	| 'fr'
	| 'ar'
	| 'pt'
	| 'ru'
	| 'zh'
	| 'ja'
	| 'it'
	| 'pl'
	| 'tr'
	| 'cs'
	| 'da';
export const supportedLocales: readonly SupportedLocale[] = [
	'en',
	'nl',
	'es',
	'de',
	'fr',
	'ar',
	'pt',
	'ru',
	'zh',
	'ja',
	'it',
	'pl',
	'tr',
	'cs',
	'da'
];

export { locales };

/** Locales written right-to-left. Drives the `dir` attribute on <html>. */
const rtlLocales: readonly SupportedLocale[] = ['ar'];
export const isRtl = (locale: string): boolean =>
	rtlLocales.includes(locale.toLowerCase() as SupportedLocale);

/**
 * Reflect the active locale onto the document root so the browser applies the
 * correct text direction (RTL for Arabic) and `lang` for a11y / hyphenation.
 * No-op on the server; the initial render uses the static `lang="en"` in
 * app.html and is corrected on hydration by `initLocale`.
 */
const applyDocumentLocale = (locale: SupportedLocale) => {
	if (!browser) return;
	document.documentElement.lang = locale;
	document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
};

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
		applyDocumentLocale(stored as SupportedLocale);
		return;
	}
	const fromBrowser = (window.navigator.language.split('-')[0] ?? '').toLowerCase();
	const locale = supportedLocales.includes(fromBrowser as SupportedLocale)
		? (fromBrowser as SupportedLocale)
		: 'en';
	paraglideSetLocale(locale, { reload: false });
	localeState.value = locale;
	applyDocumentLocale(locale);
};

export const setLocale = (locale: SupportedLocale) => {
	paraglideSetLocale(locale, { reload: false });
	localeState.value = locale;
	applyDocumentLocale(locale);
	if (browser) localStorage.setItem('locale', locale);
};

export const getLocale = (): SupportedLocale => localeState.value;

const flagMap: Record<string, string> = {
	en: '🇬🇧',
	nl: '🇳🇱',
	es: '🇪🇸',
	de: '🇩🇪',
	fr: '🇫🇷',
	ar: '🇸🇦',
	pt: '🇵🇹',
	ru: '🇷🇺',
	zh: '🇨🇳',
	ja: '🇯🇵',
	it: '🇮🇹',
	pl: '🇵🇱',
	tr: '🇹🇷',
	cs: '🇨🇿',
	da: '🇩🇰'
};
export const getFlagEmoji = (code: string): string =>
	flagMap[code.toLowerCase()] ?? flagMap.en ?? '';
