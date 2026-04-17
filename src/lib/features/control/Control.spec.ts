import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import Control from './Control.svelte';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

describe('Control', () => {
	beforeEach(() => {
		paraglideSetLocale('en', { reload: false });
	});

	test('renders the control panel heading', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(Control, { target: host });
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Control');
	});
});
