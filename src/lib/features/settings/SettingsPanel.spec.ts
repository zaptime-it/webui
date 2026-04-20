import { render } from '@testing-library/svelte';
import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import SettingsPanel from './SettingsPanel.svelte';
import { setLocale as paraglideSetLocale } from '$lib/paraglide/runtime';

const here = dirname(fileURLToPath(import.meta.url));

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

	test('augments each screen with order:i before PATCHing', () => {
		// The firmware rejects a PATCH whose `screens` array mixes entries
		// with and without `order`. SettingsPanel.handleSubmit must stamp
		// every row with its current index so the save lands as a coherent
		// reorder. Asserting against source keeps this visible in review
		// without having to mock settingsStore.save.
		const src = readFileSync(join(here, 'SettingsPanel.svelte'), 'utf8');
		expect(src).toContain('patch.screens.map((s, i) => ({ ...s, order: i }))');
	});
});
