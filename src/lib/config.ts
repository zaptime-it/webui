import * as publicEnv from '$env/static/public';

/**
 * Base URL for the BTClock HTTP API. When empty (default for production
 * builds served by the device itself), all `$lib/api` helpers make
 * same-origin requests. During local development set `PUBLIC_BASE_URL`
 * in `.env` to point at a real BTClock (e.g. `http://192.168.20.97`).
 */
export const PUBLIC_BASE_URL: string = Object.hasOwn(publicEnv, 'PUBLIC_BASE_URL')
	? ((publicEnv as Record<string, string>).PUBLIC_BASE_URL ?? '')
	: '';
