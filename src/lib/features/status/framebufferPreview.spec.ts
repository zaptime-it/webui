import { describe, expect, test } from 'vitest';
import { framebufferBitToLuma } from './framebufferPreview';

describe('framebufferBitToLuma', () => {
	test('keeps panel bit mapping in normal mode', () => {
		expect(framebufferBitToLuma(1, false)).toBe(255);
		expect(framebufferBitToLuma(0, false)).toBe(16);
	});

	test('flips panel bit mapping in inverted mode', () => {
		expect(framebufferBitToLuma(1, true)).toBe(16);
		expect(framebufferBitToLuma(0, true)).toBe(255);
	});
});
