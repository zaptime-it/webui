import { writable } from 'svelte/store';
import Control from './Control.svelte';
import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import { addMessages, init, locale } from 'svelte-i18n';

import '$lib/i18n/index.ts';
import en from '$lib/locales/en.json';
addMessages('en', en);

describe('Control Component', () => {
	beforeEach(() => {
		init({
			fallbackLocale: 'en',
			initialLocale: 'en'
		});
		locale.set('en');
	});

	test('should render the component', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(Control, {
			target: host,
			props: { status: writable([]), settings: writable([]) }
		});
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Control');
	});
});
