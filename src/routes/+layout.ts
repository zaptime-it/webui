import '$lib/style/app.scss';

import { browser } from '$app/environment';
import '$lib/i18n'; // Import to initialize. Important :)
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	if (browser) {
		if (localStorage.getItem('locale')) {
			locale.set(localStorage.getItem('locale'));
		} else {
			// Normalize the browser locale
			const browserLocale = window.navigator.language.split('-')[0].toLowerCase();
			const supportedLocales = ['en', 'nl', 'es', 'de'];
			locale.set(supportedLocales.includes(browserLocale) ? browserLocale : 'en');
		}
	}
	await waitLocale();
};

export const prerender = true;
export const ssr = false;
export const csr = true;
