import { writable } from 'svelte/store';
import Settings from './Settings.svelte';
import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import { addMessages, init, locale } from 'svelte-i18n';

import '$lib/i18n/index.ts';
import en from '$lib/locales/en.json';
addMessages('en', en);

describe('Settings Component', () => {
	beforeEach(() => {
		init({
			fallbackLocale: 'en',
			initialLocale: 'en'
		});
		locale.set('en');
	});

	test('should render the component', () => {
		locale.set('en');

		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(Settings, {
			target: host,
			props: { settings: writable([]) }
		});
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Settings');
	});
});
