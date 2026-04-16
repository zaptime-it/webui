/**
 * Typed wrappers for every BTClock HTTP endpoint. Replaces the scattered
 * `fetch(\`${PUBLIC_BASE_URL}/api/...\`)` calls from Control/Status/Settings/
 * FirmwareUpdater/DisplaySettings/ExtraFeaturesSettings.
 */

import { PUBLIC_BASE_URL } from '$lib/config';
import type { Settings } from '$lib/types/settings';
import type { LedStatus, Status } from '$lib/types/status';

const url = (path: string) => `${PUBLIC_BASE_URL}${path}`;

const asJson = async <T>(res: Response): Promise<T> => {
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return (await res.json()) as T;
};

/* ----- settings ----- */

export const getSettings = async (): Promise<Settings> =>
	asJson<Settings>(await fetch(url('/api/settings'), { credentials: 'same-origin' }));

export const patchSettings = async (body: Partial<Settings>): Promise<Response> =>
	fetch(url('/api/json/settings'), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});

/* ----- status ----- */

export const getStatus = async (): Promise<Status> =>
	asJson<Status>(await fetch(url('/api/status'), { credentials: 'same-origin' }));

/* ----- show actions ----- */

export const showText = (text: string): Promise<Response> =>
	fetch(url(`/api/show/text/${encodeURIComponent(text)}`));

export const showScreen = (id: number): Promise<Response> => fetch(url(`/api/show/screen/${id}`));

export const showCurrency = (code: string): Promise<Response> =>
	fetch(url(`/api/show/currency/${encodeURIComponent(code)}`));

/* ----- LEDs ----- */

export const lightsSet = (leds: Pick<LedStatus, 'hex'>[]): Promise<Response> =>
	fetch(url('/api/lights/set'), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(leds)
	});

export const lightsOff = (): Promise<Response> => fetch(url('/api/lights/off'));

/* ----- frontlight ----- */

export const frontlightOn = (): Promise<Response> => fetch(url('/api/frontlight/on'));
export const frontlightOff = (): Promise<Response> => fetch(url('/api/frontlight/off'));
export const frontlightFlash = (): Promise<Response> => fetch(url('/api/frontlight/flash'));
export const frontlightBrightness = (value: number): Promise<Response> =>
	fetch(url(`/api/frontlight/brightness/${value}`));

/* ----- system ----- */

export const restartClock = (): Promise<Response> => fetch(url('/api/restart'));
export const forceFullRefresh = (): Promise<Response> => fetch(url('/api/full_refresh'));

/* ----- timer + DnD ----- */

export const pauseTimer = (): Promise<Response> => fetch(url('/api/action/pause'));
export const timerRestart = (): Promise<Response> => fetch(url('/api/action/timer_restart'));
export const dndEnable = (): Promise<Response> => fetch(url('/api/dnd/enable'));
export const dndDisable = (): Promise<Response> => fetch(url('/api/dnd/disable'));

/* ----- firmware ----- */

export interface FirmwareAutoUpdateResponse {
	msg: string;
}

export const firmwareAutoUpdate = async (): Promise<{
	ok: boolean;
	payload: FirmwareAutoUpdateResponse;
}> => {
	const res = await fetch(url('/api/firmware/auto_update'));
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
