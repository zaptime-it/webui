/**
 * Regression tests for the Bitaxe / local-pool / release-feed fetch helpers.
 *
 * Earlier the helpers were bare `fetch(url)` calls with no timeout (or a
 * cruel 1s one for the local pool) and the caller had to `.message` on the
 * resulting `TypeError: Failed to fetch`, which produced a useless
 * "Failed to fetch" toast for the user.
 *
 * These tests lock in:
 *   1. Timeouts: a host that never responds aborts within the configured
 *      window and surfaces a `FetchError` with `kind: 'timeout'`.
 *   2. Network failures are triaged via a `no-cors` probe:
 *        - probe resolves (opaque) → `kind: 'cors'` ("reachable but
 *          blocked the request", e.g. Bitaxe 401 without CORS headers).
 *        - probe rejects → `kind: 'unreachable'` (DNS failure, offline).
 *   3. HTTP errors: a non-2xx response is surfaced as `kind: 'http'` with
 *      the status code preserved for callers.
 *   4. Empty-input guards: empty hostnames / users are caught before
 *      issuing a request so we don't send `http:///api/...`.
 *   5. Successful responses return the decoded JSON unchanged.
 *   6. The encoded URL for the local pool preserves arbitrary usernames
 *      (e.g. a bitcoin address with `+` / `.` / `:` characters).
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { FetchError, fetchBitaxeInfo, fetchLocalPoolInfo, fetchLatestRelease } from './external';

type FetchMock = ReturnType<typeof vi.fn>;
const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, init: Partial<{ status: number; statusText: string }> = {}) =>
	({
		ok: (init.status ?? 200) < 400,
		status: init.status ?? 200,
		statusText: init.statusText ?? 'OK',
		json: async () => body
	}) as unknown as Response;

const expectFetchError = (err: unknown, kind: FetchError['kind']) => {
	expect(err).toBeInstanceOf(FetchError);
	expect((err as FetchError).kind).toBe(kind);
};

describe('FetchError + fetchBitaxeInfo', () => {
	let fetchMock: FetchMock;
	beforeEach(() => {
		fetchMock = vi.fn();
		(globalThis as unknown as { fetch: FetchMock }).fetch = fetchMock;
	});
	afterEach(() => {
		(globalThis as unknown as { fetch: typeof originalFetch }).fetch = originalFetch;
		vi.useRealTimers();
	});

	test('resolves to system info on success', async () => {
		const info = {
			ASICModel: 'BM1368',
			boardVersion: '401',
			version: '1.0.0',
			hashRate: 420.6
		};
		fetchMock.mockResolvedValueOnce(jsonResponse(info));
		const res = await fetchBitaxeInfo('bitaxe.local');
		expect(res).toEqual(info);
		expect(fetchMock).toHaveBeenCalledWith(
			'http://bitaxe.local/api/system/info',
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
	});

	test('network failure + no-cors probe fails → kind: unreachable', async () => {
		// Real cors fetch fails (DNS / offline). The probe also fails →
		// the caller should see the "unreachable" diagnosis.
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		try {
			await fetchBitaxeInfo('bitaxe-doesnotexist');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'unreachable');
			expect((err as FetchError).message).toMatch(/does not resolve|offline/i);
		}
		// Second call must be the no-cors probe to the same URL.
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1]?.[0]).toBe('http://bitaxe-doesnotexist/api/system/info');
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ mode: 'no-cors' });
	});

	test('network failure + no-cors probe succeeds → kind: cors (Bitaxe 401/no CORS)', async () => {
		// Real cors fetch fails because the device answered with 401 but
		// no `Access-Control-Allow-Origin`. A no-cors probe returns an
		// opaque response, so we know the host is reachable.
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce({ type: 'opaque', ok: false, status: 0 } as unknown as Response);
		try {
			await fetchBitaxeInfo('192.168.21.118');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'cors');
			expect((err as FetchError).message).toMatch(/reachable but blocked/i);
		}
	});

	test('surfaces HTTP failures with the status code preserved', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 503, statusText: 'oops' }));
		try {
			await fetchBitaxeInfo('bitaxe.local');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'http');
			expect((err as FetchError).status).toBe(503);
			expect((err as FetchError).message).toContain('503');
		}
	});

	test('rejects an empty hostname before issuing a request', async () => {
		try {
			await fetchBitaxeInfo('   ');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'unreachable');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('times out when the socket never responds', async () => {
		vi.useFakeTimers();
		fetchMock.mockImplementationOnce(
			(_url: string, init: RequestInit) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () => {
						const e = new DOMException('aborted', 'AbortError');
						reject(e);
					});
				})
		);
		// Subscribe BEFORE advancing timers so the rejection is always
		// observed (otherwise vitest flags it as an unhandled rejection).
		const pending = fetchBitaxeInfo('slow.local', 50);
		const assertion = expect(pending).rejects.toMatchObject({
			name: 'FetchError',
			kind: 'timeout'
		});
		await vi.advanceTimersByTimeAsync(60);
		await assertion;
	});
});

describe('fetchLocalPoolInfo', () => {
	let fetchMock: FetchMock;
	beforeEach(() => {
		fetchMock = vi.fn();
		(globalThis as unknown as { fetch: FetchMock }).fetch = fetchMock;
	});
	afterEach(() => {
		(globalThis as unknown as { fetch: typeof originalFetch }).fetch = originalFetch;
	});

	test('encodes the user path segment so addresses with + and . survive', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ workersCount: 3 }));
		await fetchLocalPoolInfo('umbrel.local:2019', 'bc1p+miner.worker1');
		expect(fetchMock).toHaveBeenCalledWith(
			'http://umbrel.local:2019/api/client/bc1p%2Bminer.worker1',
			expect.anything()
		);
	});

	test('returns worker info on success', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ workersCount: 7, extras: 'ignored' }));
		const info = await fetchLocalPoolInfo('umbrel.local:2019', 'alice');
		expect(info.workersCount).toBe(7);
	});

	test('empty host or user fails fast with an unreachable FetchError', async () => {
		await expect(fetchLocalPoolInfo('', 'alice')).rejects.toMatchObject({ kind: 'unreachable' });
		await expect(fetchLocalPoolInfo('host', '')).rejects.toMatchObject({ kind: 'unreachable' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('translates network failure into unreachable, not a bare TypeError', async () => {
		// Both the real fetch and the no-cors reachability probe fail.
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		try {
			await fetchLocalPoolInfo('nope.local', 'alice');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'unreachable');
		}
	});

	test('reachable host that blocks CORS → kind: cors', async () => {
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce({ type: 'opaque', ok: false, status: 0 } as unknown as Response);
		try {
			await fetchLocalPoolInfo('public-pool.local:2019', 'alice');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'cors');
		}
	});
});

describe('fetchLatestRelease', () => {
	let fetchMock: FetchMock;
	beforeEach(() => {
		fetchMock = vi.fn();
		(globalThis as unknown as { fetch: FetchMock }).fetch = fetchMock;
	});
	afterEach(() => {
		(globalThis as unknown as { fetch: typeof originalFetch }).fetch = originalFetch;
	});

	test('hits the URL passed in (sourced from /api/settings.gitReleaseUrl)', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ tag_name: 'v4.0.0', created_at: '2026-03-29', html_url: 'x' })
		);
		const url = 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v4/releases/latest';
		const r = await fetchLatestRelease(url);
		expect(r.tag_name).toBe('v4.0.0');
		expect(fetchMock).toHaveBeenCalledWith(url, expect.anything());
	});

	test('rejects an empty URL without hitting the network', async () => {
		try {
			await fetchLatestRelease('   ');
			throw new Error('should have thrown');
		} catch (err) {
			expectFetchError(err, 'unreachable');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
