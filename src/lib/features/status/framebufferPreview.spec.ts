import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { framebufferBitToLuma } from './framebufferPreview';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'FramebufferPreview.svelte'), 'utf8');

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

describe('FramebufferPreview component', () => {
	test('falls back to status text before binary preview frames arrive', () => {
		expect(src).toContain("import { statusStore } from '$lib/stores/status.svelte'");
		expect(src).toContain('const statusPanelTexts = $derived(statusStore.data?.data ?? [])');
		expect(src).toContain('drawStatusFallback(');
		expect(src).toContain("statusPanelTexts[i] ?? ''");
	});

	test('reconnects when preview websocket acks but sends no binary frame', () => {
		expect(src).toContain('armFrameWatchdog(ws)');
		expect(src).toContain('binaryFrameSeen = true');
		expect(src).toContain('clearFrameWatchdogTimer()');
	});
});
