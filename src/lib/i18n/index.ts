import { browser } from '$app/environment';
import {
	setLocale as paraglideSetLocale,
	getLocale as paraglideGetLocale,
	locales,
	isLocale
} from '$lib/paraglide/runtime';
import { writable, derived } from 'svelte/store';

export type SupportedLocale = 'en' | 'nl' | 'es' | 'de';
export const supportedLocales: readonly SupportedLocale[] = ['en', 'nl', 'es', 'de'];

// Create a writable store to track locale changes for reactivity
const localeStore = writable<SupportedLocale>('en');

// Export a derived store that stays in sync
export const currentLocale = derived(localeStore, ($locale) => $locale);

// Export locales list for the language switcher
export { locales };

export function initLocale() {
	if (!browser) return;

	const storedLocale = localStorage.getItem('locale');
	if (storedLocale && isLocale(storedLocale)) {
		paraglideSetLocale(storedLocale as SupportedLocale, { reload: false });
		localeStore.set(storedLocale as SupportedLocale);
		return;
	}

	const browserLocale = window.navigator.language.split('-')[0].toLowerCase();
	const locale = supportedLocales.includes(browserLocale as SupportedLocale)
		? (browserLocale as SupportedLocale)
		: 'en';
	paraglideSetLocale(locale, { reload: false });
	localeStore.set(locale);
}

export function setLocale(locale: SupportedLocale) {
	paraglideSetLocale(locale, { reload: false });
	localeStore.set(locale);
	if (browser) {
		localStorage.setItem('locale', locale);
	}
}

export function getLocale(): SupportedLocale {
	return paraglideGetLocale() as SupportedLocale;
}
