/**
 * Typed wrappers for every BTClock HTTP endpoint. Replaces the scattered
 * `fetch(\`${PUBLIC_BASE_URL}/api/...\`)` calls from Control/Status/Settings/
 * FirmwareUpdater/DisplaySettings/ExtraFeaturesSettings.
 *
 * 3.4.0 API realignment:
 *  - State-changing endpoints moved from GET to POST; read-only ones stay GET.
 *  - Settings writes moved from POST /api/json/settings to PATCH /api/settings.
 *  - `lightsSet` moved from PATCH to POST (firmware only registers POST now).
 *  - Firmware no longer returns plaintext passwords; callers must filter
 *    unset/empty password fields out of the PATCH body (see patchSettings).
 */

import { PUBLIC_BASE_URL } from '$lib/config';
import { parseSettings, parseStatus } from '$lib/api/schemas';
import type { Settings } from '$lib/types/settings';
import type { LedStatus, Status } from '$lib/types/status';

const url = (path: string) => `${PUBLIC_BASE_URL}${path}`;

const asJson = async <T>(res: Response): Promise<T> => {
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return (await res.json()) as T;
};

/**
 * Result envelope for state-changing endpoints. The firmware returns a JSON
 * body of `{"error":"<key>:<reason>"}` on validation failures (see
 * `components/settings/settings_api.cpp` in the firmware repo). The envelope
 * exposes that body alongside `ok` and `status` so callers can branch on
 * "device 4xx-rejected the body" vs. "network blip" without re-parsing.
 *
 * `body` is the parsed JSON body when `Content-Type: application/json` is
 * present, otherwise null. `text` carries the raw body in either case (handy
 * for the firmware's pre-3.4.0 plain-text errors and for log messages).
 */
export interface ApiResult<T = unknown> {
	ok: boolean;
	status: number;
	statusText: string;
	body: T | null;
	text: string;
}

const envelope = async <T = unknown>(res: Response): Promise<ApiResult<T>> => {
	const text = await res.text();
	let body: T | null = null;
	const ctype = res.headers.get('content-type') ?? '';
	if (ctype.includes('application/json') && text.length > 0) {
		try {
			body = JSON.parse(text) as T;
		} catch {
			// Server claimed JSON but sent garbage — leave body null, keep text.
		}
	}
	return { ok: res.ok, status: res.status, statusText: res.statusText, body, text };
};

/**
 * Parse the firmware's `<field>:<reason>` error string into structured parts.
 * The firmware uses a couple of shapes:
 *   - `<key>:<reason>`         e.g. `"fontName:unknown"`, `"timerSeconds:bad_type"`
 *   - `range:<key>`            inverted form for numeric out-of-range
 *   - `<scope>:<reason>`       e.g. `"screens:dup_id"`, `"dnd:range"`, `"currency:not_string"`
 *   - bare token               e.g. `"json"`, `"not_object"`, `"bad body"` (no field context)
 * Returns null when no field can be inferred.
 */
export const parseSettingsError = (
	raw: string | undefined | null
): { field: string | null; reason: string; raw: string } => {
	const text = (raw ?? '').trim();
	if (!text) return { field: null, reason: '', raw: text };
	const idx = text.indexOf(':');
	if (idx === -1) return { field: null, reason: text, raw: text };
	const left = text.slice(0, idx);
	const right = text.slice(idx + 1);
	if (left === 'range') return { field: right, reason: 'range', raw: text };
	// Pseudo-fields ("dnd", "screens", "currency") still get returned as `field`
	// because callers want to highlight their section, not just toast.
	return { field: left, reason: right, raw: text };
};

const post = (path: string): Promise<Response> =>
	fetch(url(path), { method: 'POST', credentials: 'same-origin' });

const postEnv = async (path: string): Promise<ApiResult> => envelope(await post(path));

/* ----- settings ----- */

// Cold-start path runs Valibot validation: any future contract change that
// removes a required field (numScreens, timerSeconds, dataSource, screens,
// dnd) will fail here loudly rather than producing a half-rendered UI later.
// The SSE hot path deliberately skips this — frames arrive too frequently
// to make per-frame validation worth the cost.
export const getSettings = async (): Promise<Settings> => {
	const raw = await asJson<unknown>(
		await fetch(url('/api/settings'), { credentials: 'same-origin' })
	);
	return parseSettings(raw) as Settings;
};

export interface SettingsErrorBody {
	error?: string;
}

export const patchSettings = async (
	body: Partial<Settings>
): Promise<ApiResult<SettingsErrorBody>> =>
	envelope<SettingsErrorBody>(
		await fetch(url('/api/settings'), {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(body)
		})
	);

/* ----- status ----- */

export const getStatus = async (): Promise<Status> => {
	const raw = await asJson<unknown>(
		await fetch(url('/api/status'), { credentials: 'same-origin' })
	);
	return parseStatus(raw) as Status;
};

/* ----- show actions ----- */
// Firmware exposes path-template rewrites for these, but the query-parameter
// form is the "real" route. Use it directly so there is one URL shape, not
// two-with-a-server-side-rewrite.

export const showText = (text: string): Promise<ApiResult> =>
	postEnv(`/api/show/text?t=${encodeURIComponent(text)}`);

export const showScreen = (id: number): Promise<ApiResult> => postEnv(`/api/show/screen?s=${id}`);

export const showCurrency = (code: string): Promise<ApiResult> =>
	postEnv(`/api/show/currency?c=${encodeURIComponent(code)}`);

/* ----- LEDs ----- */

export const lightsSet = async (leds: Pick<LedStatus, 'hex'>[]): Promise<ApiResult> =>
	envelope(
		await fetch(url('/api/lights/set'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(leds)
		})
	);

export const lightsOff = (): Promise<ApiResult> => postEnv('/api/lights/off');

/* ----- frontlight ----- */

export const frontlightOn = (): Promise<ApiResult> => postEnv('/api/frontlight/on');
export const frontlightOff = (): Promise<ApiResult> => postEnv('/api/frontlight/off');
export const frontlightFlash = (): Promise<ApiResult> => postEnv('/api/frontlight/flash');
export const frontlightBrightness = (value: number): Promise<ApiResult> =>
	postEnv(`/api/frontlight/brightness?b=${value}`);

/* ----- system ----- */

export const restartClock = (): Promise<ApiResult> => postEnv('/api/restart');
export const forceFullRefresh = (): Promise<ApiResult> => postEnv('/api/full_refresh');

/* ----- timer + DnD ----- */

export const pauseTimer = (): Promise<ApiResult> => postEnv('/api/action/pause');
export const timerRestart = (): Promise<ApiResult> => postEnv('/api/action/timer_restart');
export const dndEnable = (): Promise<ApiResult> => postEnv('/api/dnd/enable');
export const dndDisable = (): Promise<ApiResult> => postEnv('/api/dnd/disable');

/* ----- firmware ----- */

export interface FirmwareAutoUpdateResponse {
	msg: string;
}

export const firmwareAutoUpdate = async (): Promise<{
	ok: boolean;
	payload: FirmwareAutoUpdateResponse;
}> => {
	const res = await post('/api/firmware/auto_update');
	const payload = (await res.json()) as FirmwareAutoUpdateResponse;
	return { ok: res.ok, payload };
};

export type UploadProgressHandler = (progress: number) => void;

const xhrUpload = (endpoint: string, file: File, onProgress?: UploadProgressHandler) =>
	new Promise<void>((resolve, reject) => {
		const form = new FormData();
		form.append('file', file);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', endpoint);
		xhr.upload.onprogress = (e: ProgressEvent) => {
			if (e.lengthComputable && onProgress) {
				onProgress(Math.round((e.loaded * 100) / e.total));
			}
		};
		xhr.onload = () => {
			if (xhr.status === 200 && xhr.responseText !== 'FAIL') resolve();
			else reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
		};
		xhr.onerror = () => reject(new Error('Upload network error'));
		xhr.send(form);
	});

export const uploadFirmware = (file: File, onProgress?: UploadProgressHandler) =>
	xhrUpload(url('/upload/firmware'), file, onProgress);

export const uploadWebUi = (file: File, onProgress?: UploadProgressHandler) =>
	xhrUpload(url('/upload/webui'), file, onProgress);

export const eventsUrl = (): string => url('/events');
