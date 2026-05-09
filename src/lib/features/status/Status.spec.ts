import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import Status from './Status.svelte';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

describe('Status', () => {
	beforeEach(() => {
		paraglideSetLocale('en', { reload: false });
	});

	test('renders status card with framebuffer preview', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(Status, { target: host });
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Status');
	});
});
