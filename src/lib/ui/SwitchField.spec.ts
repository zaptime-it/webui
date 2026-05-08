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

	test('disabled field carries disabled class and disabled input', () => {
		const host = mount({ id: 'foo', label: 'Foo', checked: false, disabled: true });
		expect(host.querySelector('label')!.classList.contains('disabled')).toBe(true);
		expect(host.querySelector('input')!.disabled).toBe(true);
	});

	test('hint renders and is referenced by aria-describedby', () => {
		const host = mount({
			id: 'mowMode',
			label: 'Mow Suffix Mode',
			checked: false,
			disabled: true,
			hint: 'Requires Suffix price'
		});
		const input = host.querySelector('input')!;
		const hint = host.querySelector('.switch-field__hint') as HTMLElement;
		expect(hint.id).toBe('mowMode-hint');
		expect(input.getAttribute('aria-describedby')).toBe('mowMode-hint');
	});

	test('disabled state exposes hint as title tooltip', () => {
		const host = mount({
			id: 'mowMode',
			label: 'Mow Suffix Mode',
			checked: false,
			disabled: true,
			hint: 'Requires Suffix price'
		});
		expect(host.querySelector('label')!.getAttribute('title')).toBe('Requires Suffix price');
	});
});
