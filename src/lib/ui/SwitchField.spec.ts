/**
 * Disabled SwitchField was visually indistinguishable from enabled state on
 * the dark theme, and gated fields (mowMode) didn't explain
 * why they were locked. These tests pin the rendered DOM contract: opacity
 * helper class on the disabled wrapper, optional hint text exposed via
 * aria-describedby, and tooltip via title attribute when disabled.
 */
import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import SwitchField from './SwitchField.svelte';

type SwitchFieldProps = {
	id: string;
	label: string;
	checked: boolean | undefined;
	disabled?: boolean;
	hint?: string;
};

const mount = (props: SwitchFieldProps) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	render(SwitchField, { target: host, props });
	return host;
};

describe('SwitchField', () => {
	test('enabled field has no disabled class and no hint by default', () => {
		const host = mount({ id: 'foo', label: 'Foo', checked: false });
		const label = host.querySelector('label')!;
		expect(label.classList.contains('disabled')).toBe(false);
		expect(host.querySelector('.switch-field__hint')).toBeNull();
		expect(host.querySelector('input')!.disabled).toBe(false);
	});

	test('disabled field carries the disabled class and disabled input', () => {
		const host = mount({ id: 'foo', label: 'Foo', checked: false, disabled: true });
		expect(host.querySelector('label')!.classList.contains('disabled')).toBe(true);
		expect(host.querySelector('input')!.disabled).toBe(true);
	});

	test('hint renders inline, gets a stable id, and is referenced via aria-describedby', () => {
		const host = mount({
			id: 'mowMode',
			label: 'Mow Suffix Mode',
			checked: false,
			disabled: true,
			hint: 'Requires Suffix price'
		});
		const input = host.querySelector('input')!;
		const hint = host.querySelector('.switch-field__hint') as HTMLElement;
		expect(hint).toBeTruthy();
		expect(hint.id).toBe('mowMode-hint');
		expect(hint.textContent).toBe('Requires Suffix price');
		expect(input.getAttribute('aria-describedby')).toBe('mowMode-hint');
	});

	test('disabled state surfaces hint as the title (tooltip) for hover users', () => {
		const host = mount({
			id: 'mowMode',
			label: 'Mow Suffix Mode',
			checked: false,
			disabled: true,
			hint: 'Requires Suffix price'
		});
		const label = host.querySelector('label')!;
		expect(label.getAttribute('title')).toBe('Requires Suffix price');
	});

	test('enabled field with a hint does NOT set the title (no tooltip when active)', () => {
		const host = mount({
			id: 'foo',
			label: 'Foo',
			checked: true,
			hint: 'Some explanation'
		});
		const label = host.querySelector('label')!;
		expect(label.getAttribute('title')).toBeNull();
		// Hint still renders inline as helper copy.
		expect(host.querySelector('.switch-field__hint')).toBeTruthy();
	});
});
