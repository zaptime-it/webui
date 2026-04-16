import { describe, test, expect } from 'vitest';
import { activeSection } from './activeSection.svelte';

describe('activeSection store', () => {
	test('starts on the Control section', () => {
		// Fresh import defaults matter: the mobile tab bar highlights this
		// value on first paint before the IntersectionObserver runs.
		expect(activeSection.id).toBe('control');
	});

	test('set() updates the reactive id', () => {
		activeSection.set('status');
		expect(activeSection.id).toBe('status');
		activeSection.set('settings');
		expect(activeSection.id).toBe('settings');
		activeSection.set('control');
		expect(activeSection.id).toBe('control');
	});
});
