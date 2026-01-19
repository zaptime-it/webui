import { writable } from 'svelte/store';
import Control from './Control.svelte';
import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

describe('Control Component', () => {
	beforeEach(() => {
		paraglideSetLocale('en', { reload: false });
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
