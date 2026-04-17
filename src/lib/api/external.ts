/**
 * Calls to endpoints outside the BTClock itself: Bitaxe miner HTTP API,
 * local mining pool, and the firmware release feed.
 *
 * These requests always go direct from the browser to the target host
 * (the BTClock firmware doesn't expose a proxy), so every helper has:
 *   - an explicit AbortController-based timeout so a dead host can't hang
 *     the UI forever;
 *   - a normalized `FetchError` wrapper so callers can distinguish between
 *     "host not reachable" (DNS / CORS / offline) and HTTP-level failures
 *     and show a helpful toast instead of the browser's bare
 *     `TypeError: Failed to fetch`.
 */

/**
 * Error categories surfaced by {@link fetchJson}.
 *
 * - `timeout` — AbortController fired before the server responded.
 * - `unreachable` — DNS lookup failed (ERR_NAME_NOT_RESOLVED) or no route
 *   to host (connection refused / ECONNREFUSED). Both the real fetch and a
 *   `no-cors` reachability probe to the same URL failed.
 * - `cors` — the host answered the network probe but the real CORS fetch
 *   was blocked (e.g. Bitaxe returns `401 Unauthorized` *without*
 *   `Access-Control-Allow-Origin`). Indicates the device is reachable but
 *   either requires auth or doesn't opt its response into CORS.
 * - `http` — the request completed and the server returned a non-2xx
 *   status code. `status` is populated.
 * - `unknown` — anything else (JSON parse error, etc).
 */
export type FetchErrorKind = 'timeout' | 'unreachable' | 'cors' | 'http' | 'unknown';

export class FetchError extends Error {
	kind: FetchErrorKind;
	status?: number;
	constructor(kind: FetchErrorKind, message: string, status?: number) {
		super(message);
		this.name = 'FetchError';
		this.kind = kind;
		this.status = status;
	}
}

const isAbortError = (err: unknown): boolean =>
	err instanceof DOMException ? err.name === 'AbortError' : (err as Error)?.name === 'AbortError';

/**
 * `TypeError: Failed to fetch` is Chrome's catch-all for *every* network
 * error: DNS lookup failure (ERR_NAME_NOT_RESOLVED), connection refused,
 * CORS preflight rejection, mixed content, offline, etc. JS cannot see
 * the underlying Chromium error code so we need an additional probe to
 * tell the cases apart — see {@link probeReachable}.
 */
const isNetworkError = (err: unknown): boolean =>
	err instanceof TypeError && /fetch/i.test(err.message);

/**
 * Probes whether `url` is reachable at the network level by issuing a
 * `mode: 'no-cors'` GET. In no-cors mode the browser does NOT enforce
 * `Access-Control-Allow-Origin`, so:
 *
 *   - If the server answers at all (even with 401 and no CORS headers),
 *     the promise resolves with an opaque response → `true`.
 *   - If DNS fails / the connection is refused / the socket times out,
 *     the promise still rejects with a `TypeError` → `false`.
 *
 * This lets us distinguish "Bitaxe blocked CORS" (reachable) from
 * "hostname does not resolve" (truly unreachable) without ever reading
 * the response body, which would be blocked anyway.
 */
const probeReachable = async (url: string, timeoutMs: number): Promise<boolean> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
		return true;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
};

const fetchJson = async <T>(url: string, timeoutMs: number, init: RequestInit = {}): Promise<T> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		if (!res.ok) {
			throw new FetchError('http', `HTTP ${res.status} ${res.statusText}`.trim(), res.status);
		}
		return (await res.json()) as T;
	} catch (err) {
		if (err instanceof FetchError) throw err;
		if (isAbortError(err)) {
			throw new FetchError('timeout', `Request timed out after ${timeoutMs} ms`);
		}
		if (isNetworkError(err)) {
			// Short probe: if the host is alive this comes back almost
			// instantly; we only wait long enough for DNS + TCP SYN.
			const probeBudget = Math.max(1000, Math.min(timeoutMs, 2500));
			const reachable = await probeReachable(url, probeBudget);
			if (reachable) {
				throw new FetchError(
					'cors',
					'Host is reachable but blocked the request (no CORS headers or authentication required). Check that the device is unlocked and that the WebUI origin is allowed.'
				);
			}
			throw new FetchError(
				'unreachable',
				'Could not reach host. The hostname/IP does not resolve or the device is offline.'
			);
		}
		throw new FetchError('unknown', (err as Error)?.message ?? 'Unknown error');
	} finally {
		clearTimeout(timer);
	}
};

export interface BitaxeSystemInfo {
	ASICModel: string;
	boardVersion: string;
	version: string;
	hashRate: number;
}

export const fetchBitaxeInfo = async (
	hostname: string,
	timeoutMs = 5000
): Promise<BitaxeSystemInfo> => {
	const host = hostname.trim();
	if (!host) throw new FetchError('unreachable', 'Bitaxe hostname is empty');
	return fetchJson<BitaxeSystemInfo>(`http://${host}/api/system/info`, timeoutMs);
};

export interface LocalPoolInfo {
	workersCount: number;
	[key: string]: unknown;
}

export const fetchLocalPoolInfo = async (
	host: string,
	user: string,
	timeoutMs = 3000
): Promise<LocalPoolInfo> => {
	const h = host.trim();
	const u = user.trim();
	if (!h) throw new FetchError('unreachable', 'Local pool host is empty');
	if (!u) throw new FetchError('unreachable', 'Mining pool user is empty');
	return fetchJson<LocalPoolInfo>(`http://${h}/api/client/${encodeURIComponent(u)}`, timeoutMs);
};

export interface LatestReleaseInfo {
	tag_name: string;
	created_at: string;
	html_url: string;
}

export const fetchLatestRelease = async (timeoutMs = 5000): Promise<LatestReleaseInfo> =>
	fetchJson<LatestReleaseInfo>(
		'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/latest',
		timeoutMs
	);
