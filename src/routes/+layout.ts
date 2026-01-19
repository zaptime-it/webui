import '$lib/style/app.scss';

import { browser } from '$app/environment';
import { initLocale } from '$lib/i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	if (browser) {
		initLocale();
	}
};

export const prerender = true;
export const ssr = false;
export const csr = true;
