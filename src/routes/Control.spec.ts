import { describe, test, expect } from 'vitest';

describe('Control Component', () => {
	test('should be defined and importable', async () => {
		// Test that the component module can be imported and has the expected Svelte 5 structure
		// Full rendering tests are skipped due to @sveltestrap v7 using Svelte 5 runes
		// which aren't compatible with vitest's jsdom environment
		// Integration tests in Playwright provide full end-to-end testing
		const module = await import('./Control.svelte');
		expect(module.default).toBeDefined();
		expect(typeof module.default).toBe('function');
	});
});
