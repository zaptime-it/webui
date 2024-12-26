import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'en';

register('en', () => import('../locales/en.json'));
register('nl', () => import('../locales/nl.json'));
register('es', () => import('../locales/es.json'));
register('de', () => import('../locales/de.json'));

const getInitialLocale = () => {
	if (!browser) return defaultLocale;

	// Check localStorage first
	const storedLocale = localStorage.getItem('locale');
	if (storedLocale) return storedLocale;

	// Get browser locale and normalize it
	const browserLocale = window.navigator.language;
	const normalizedLocale = browserLocale.split('-')[0].toLowerCase();

	// Check if we support this locale
	const supportedLocales = ['en', 'nl', 'es', 'de'];
	return supportedLocales.includes(normalizedLocale) ? normalizedLocale : defaultLocale;
};

init({
	fallbackLocale: defaultLocale,
	initialLocale: getInitialLocale()
});
