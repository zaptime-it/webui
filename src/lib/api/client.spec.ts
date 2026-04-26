import { describe, test, expect, beforeEach, afterAll, vi } from 'vitest';
import { parseSettingsError, patchSettings } from './client';

describe('parseSettingsError', () => {
	test('handles "<field>:<reason>"', () => {
		expect(parseSettingsError('fontName:unknown')).toEqual({
			field: 'fontName',
			reason: 'unknown',
			raw: 'fontName:unknown'
		});
	});

	test('handles inverted "range:<field>"', () => {
		expect(parseSettingsError('range:timerSeconds')).toEqual({
			field: 'timerSeconds',
			reason: 'range',
			raw: 'range:timerSeconds'
		});
	});

	test('handles bare top-level errors with no colon', () => {
		expect(parseSettingsError('json')).toEqual({ field: null, reason: 'json', raw: 'json' });
		expect(parseSettingsError('not_object')).toEqual({
			field: null,
			reason: 'not_object',
			raw: 'not_object'
		});
	});

	test('handles pseudo-fields like dnd / screens / currency', () => {
		expect(parseSettingsError('screens:dup_id').field).toBe('screens');
		expect(parseSettingsError('dnd:range').field).toBe('dnd');
		expect(parseSettingsError('currency:not_string').field).toBe('currency');
	});

	test('handles empty / null input', () => {
		expect(parseSettingsError('')).toEqual({ field: null, reason: '', raw: '' });
		expect(parseSettingsError(null)).toEqual({ field: null, reason: '', raw: '' });
		expect(parseSettingsError(undefined)).toEqual({ field: null, reason: '', raw: '' });
	});
});

describe('patchSettings response envelope', () => {
	const fetchMock = vi.fn();
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test('parses the firmware error JSON body', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response('{"error":"fontName:unknown"}', {
				status: 400,
				statusText: 'Bad Request',
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const res = await patchSettings({ fontName: 'unknown_font' } as never);
		expect(res.ok).toBe(false);
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: 'fontName:unknown' });
		expect(res.text).toBe('{"error":"fontName:unknown"}');
	});

	test('200 OK with empty body returns body=null but ok=true', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 200, statusText: 'OK' }));
		const res = await patchSettings({});
		expect(res.ok).toBe(true);
		expect(res.body).toBeNull();
		expect(res.text).toBe('');
	});

	test('non-JSON content-type leaves body null and preserves text', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response('plain text complaint', {
				status: 400,
				statusText: 'Bad Request',
				headers: { 'Content-Type': 'text/plain' }
			})
		);
		const res = await patchSettings({});
		expect(res.ok).toBe(false);
		expect(res.body).toBeNull();
		expect(res.text).toBe('plain text complaint');
	});
});
