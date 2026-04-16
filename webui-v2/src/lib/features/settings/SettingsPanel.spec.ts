import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import SettingsPanel from './SettingsPanel.svelte';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

describe('SettingsPanel', () => {
	beforeEach(() => {
		paraglideSetLocale('en', { reload: false });
	});

	test('renders the settings panel heading', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = render(SettingsPanel, { target: host });
		expect(instance).toBeTruthy();
		expect(host.innerHTML).toContain('Settings');
	});
});
