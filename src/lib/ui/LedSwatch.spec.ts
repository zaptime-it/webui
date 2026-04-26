/**
 * LedSwatch replaces a `<input type="color" disabled>` for the live LED
 * indicators in Status.svelte. The native control let users open the OS
 * colour picker even though the input was disabled — a misleading
 * affordance for what is really a read-only status display. The swatch is
 * a plain styled div with role="img" and an accessible label, so it can't
 * be tabbed into and won't open any picker.
 */
import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import LedSwatch from './LedSwatch.svelte';

const mount = (props: { hex: string; label: string }) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	render(LedSwatch, { target: host, props });
	return host;
};

describe('LedSwatch', () => {
	test('renders a div, not an <input type=color>', () => {
		const host = mount({ hex: '#FF0000', label: 'LED 1' });
		expect(host.querySelector('input')).toBeNull();
		expect(host.querySelector('.led-swatch')).toBeTruthy();
	});

	test('exposes the colour to assistive tech via role=img + label', () => {
		const host = mount({ hex: '#00FF00', label: 'LED 3' });
		const swatch = host.querySelector('.led-swatch') as HTMLElement;
		expect(swatch.getAttribute('role')).toBe('img');
		expect(swatch.getAttribute('aria-label')).toBe('LED 3: #00FF00');
	});

	test('paints the swatch using inline background-color', () => {
		const host = mount({ hex: '#123456', label: 'LED 2' });
		const swatch = host.querySelector('.led-swatch') as HTMLElement;
		expect(swatch.style.backgroundColor).not.toBe('');
	});

	test('cannot be focused (no tabindex, not an interactive element)', () => {
		const host = mount({ hex: '#000', label: 'LED 0' });
		const swatch = host.querySelector('.led-swatch') as HTMLElement;
		expect(swatch.tabIndex).toBe(-1);
	});
});
