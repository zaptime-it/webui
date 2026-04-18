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
import type { Settings } from '$lib/types/settings';
import type { LedStatus, Status } from '$lib/types/status';

const url = (path: string) => `${PUBLIC_BASE_URL}${path}`;

const asJson = async <T>(res: Response): Promise<T> => {
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return (await res.json()) as T;
};

const post = (path: string): Promise<Response> =>
	fetch(url(path), { method: 'POST', credentials: 'same-origin' });

/* ----- settings ----- */

export const getSettings = async (): Promise<Settings> =>
	asJson<Settings>(await fetch(url('/api/settings'), { credentials: 'same-origin' }));

export const patchSettings = async (body: Partial<Settings>): Promise<Response> =>
	fetch(url('/api/settings'), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});

/* ----- status ----- */

export const getStatus = async (): Promise<Status> =>
	asJson<Status>(await fetch(url('/api/status'), { credentials: 'same-origin' }));

/* ----- show actions ----- */
// Firmware exposes path-template rewrites for these, but the query-parameter
// form is the "real" route. Use it directly so there is one URL shape, not
// two-with-a-server-side-rewrite.

export const showText = (text: string): Promise<Response> =>
	post(`/api/show/text?t=${encodeURIComponent(text)}`);

export const showScreen = (id: number): Promise<Response> => post(`/api/show/screen?s=${id}`);

export const showCurrency = (code: string): Promise<Response> =>
	post(`/api/show/currency?c=${encodeURIComponent(code)}`);

/* ----- LEDs ----- */

export const lightsSet = (leds: Pick<LedStatus, 'hex'>[]): Promise<Response> =>
	fetch(url('/api/lights/set'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(leds)
	});

export const lightsOff = (): Promise<Response> => post('/api/lights/off');

/* ----- frontlight ----- */

export const frontlightOn = (): Promise<Response> => post('/api/frontlight/on');
export const frontlightOff = (): Promise<Response> => post('/api/frontlight/off');
export const frontlightFlash = (): Promise<Response> => post('/api/frontlight/flash');
export const frontlightBrightness = (value: number): Promise<Response> =>
	post(`/api/frontlight/brightness?b=${value}`);

/* ----- system ----- */

export const restartClock = (): Promise<Response> => post('/api/restart');
export const forceFullRefresh = (): Promise<Response> => post('/api/full_refresh');

/* ----- timer + DnD ----- */

export const pauseTimer = (): Promise<Response> => post('/api/action/pause');
export const timerRestart = (): Promise<Response> => post('/api/action/timer_restart');
export const dndEnable = (): Promise<Response> => post('/api/dnd/enable');
export const dndDisable = (): Promise<Response> => post('/api/dnd/disable');

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
