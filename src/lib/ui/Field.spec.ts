/**
 * Regression: the Bitaxe and local-pool "Test" buttons used to sit on a second
 * row below their input. `Field` now accepts an `action` snippet so the button
 * can share the DaisyUI `.join` container and stay inline at every breakpoint.
 */
import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import FieldHarness from './FieldActionHarness.svelte';

describe('Field', () => {
	test('renders a plain input when no action snippet is provided', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		render(FieldHarness, { target: host, props: { withAction: false } });
		expect(host.querySelector('#demo')).toBeTruthy();
		expect(host.querySelector('.join')).toBeNull();
	});

	test('joins the input and the action snippet on a single row', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		render(FieldHarness, { target: host, props: { withAction: true } });

		const joinContainer = host.querySelector('.join');
		expect(joinContainer).toBeTruthy();

		const input = joinContainer!.querySelector('input#demo');
		const button = joinContainer!.querySelector('button');
		expect(input).toBeTruthy();
		expect(button).toBeTruthy();
		expect(button!.classList.contains('join-item')).toBe(true);
		expect(button!.textContent?.trim()).toBe('Test');
	});
});
