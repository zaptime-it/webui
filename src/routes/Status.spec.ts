import { writable } from 'svelte/store';
import Status from './Status.svelte';
import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

describe('Status Component', () => {
	beforeEach(() => {
		paraglideSetLocale('en', { reload: false });
	});

	test('should render the component', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(Status, {
			target: host,
			props: { status: writable([]), settings: writable([]) }
		});
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Status');
	});
});
