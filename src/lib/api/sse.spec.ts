import { describe, test, expect } from 'vitest';
import {
	computeBackoffMs,
	SSE_BACKOFF_INITIAL_MS,
	SSE_BACKOFF_MAX_MS,
	SSE_CLEAN_RECONNECT_MS
} from './sse';

describe('computeBackoffMs', () => {
	test('first error uses the initial delay', () => {
		expect(computeBackoffMs(0)).toBe(SSE_BACKOFF_INITIAL_MS);
	});

	test('doubles each attempt', () => {
		expect(computeBackoffMs(1)).toBe(SSE_BACKOFF_INITIAL_MS * 2);
		expect(computeBackoffMs(2)).toBe(SSE_BACKOFF_INITIAL_MS * 4);
		expect(computeBackoffMs(3)).toBe(SSE_BACKOFF_INITIAL_MS * 8);
	});

	test('caps at SSE_BACKOFF_MAX_MS', () => {
		expect(computeBackoffMs(10)).toBe(SSE_BACKOFF_MAX_MS);
		expect(computeBackoffMs(50)).toBe(SSE_BACKOFF_MAX_MS);
	});
});

describe('reconnect constants', () => {
	test('clean reconnect path stays fixed', () => {
		expect(SSE_CLEAN_RECONNECT_MS).toBe(5000);
	});

	test('max backoff is bounded', () => {
		expect(SSE_BACKOFF_MAX_MS).toBeLessThanOrEqual(60000);
	});
});
