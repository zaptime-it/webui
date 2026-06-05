import { describe, test, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import {
	dndDisable,
	dndEnable,
	eventsUrl,
	firmwareAutoUpdate,
	forceFullRefresh,
	frontlightBrightness,
	frontlightFlash,
	frontlightOff,
	frontlightOn,
	getSettings,
	getStatus,
	lightsOff,
	lightsSet,
	parseSettingsError,
	patchSettings,
	pauseTimer,
	previewWsUrl,
	restartClock,
	showCurrency,
	showScreen,
	showText,
	timerRestart,
	uploadFirmware,
	uploadWebUi
} from './client';
import { PUBLIC_BASE_URL } from '$lib/config';

// Mirror client.ts's internal `url()` helper. PUBLIC_BASE_URL is empty for
// production (device-served) builds but is set to a real device in local
// `.env` dev setups, so compose expected URLs instead of hardcoding a
// leading slash.
const apiUrl = (path: string) => `${PUBLIC_BASE_URL}${path}`;

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

describe('cold-start schema validation', () => {
	const fetchMock = vi.fn();
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	const validSettingsBody = () =>
		JSON.stringify({
			numScreens: 7,
			invertedColor: false,
			timerSeconds: 30,
			timerRunning: true,
			fullRefreshMin: 30,
			fontName: 'antonio',
			availableFonts: ['antonio'],
			stealFocus: false,
			mcapBigChar: false,
			priceSymMode: 0,
			useMscwTime: false,
			useBlkCountdown: false,
			suffixPrice: false,
			mowMode: false,
			verticalDesc: false,
			blockFeeDec: false,
			supplyPercent: false,
			refrScrnChange: false,
			inverseButtons: false,
			decimalShareDot: false,
			minSecPriceUpd: 30,
			dataSource: 0,
			mempoolInstance: 'mempool.space',
			mempoolSecure: true,
			localPoolHost: '',
			ceEndpoint: '',
			ceDisableSSL: false,
			nostrPubKey: '',
			nostrRelay: '',
			nostrRelays: [],
			nostrZapNotify: false,
			nostrZapPubkey: '',
			disableLeds: false,
			ledTestOnPower: true,
			ledFlashOnUpd: false,
			ledFlashOnZap: false,
			ledBrightness: 128,
			blockFlashColor: 0,
			scrnRestoreZap: false,
			hasFrontlight: false,
			flDisable: false,
			flMaxBrightness: 255,
			flAlwaysOn: false,
			flEffectDelay: 0,
			flFlashOnUpd: false,
			flFlashOnZap: false,
			hasLightLevel: false,
			luxLightToggle: 0,
			flOffOnDnd: true,
			flOffWhenDark: false,
			wpTimeout: 600,
			tzString: 'UTC0',
			mdnsEnabled: true,
			otaEnabled: false,
			hostnamePrefix: 'btclock',
			hostname: 'btclock',
			ip: '0.0.0.0',
			txPower: 80,
			httpAuthEnabled: false,
			httpAuthUser: '',
			httpAuthPass: '',
			httpAuthPassSet: false,
			otaPass: '',
			otaPassSet: false,
			bitaxeEnabled: false,
			bitaxeHostname: '',
			miningPoolStats: false,
			miningPoolName: '',
			miningPoolUser: '',
			poolGlobalStats: false,
			availablePools: [],
			poolLogosUrl: '',
			actCurrencies: ['USD'],
			availableCurrencies: ['USD'],
			gitReleaseUrl: '',
			hwRev: 'REV_B_EPAPER_S3',
			fsRev: '',
			gitRev: '',
			gitTag: '',
			lastBuildTime: 0,
			enableDebugLog: false,
			screens: [{ id: 0, name: 'Block Height', enabled: true, order: 0 }],
			dnd: {
				enabled: false,
				dndTimeEnabled: false,
				startHour: 0,
				startMinute: 0,
				endHour: 0,
				endMinute: 0
			}
		});

	const jsonResponse = (body: string, status = 200) =>
		new Response(body, { status, headers: { 'Content-Type': 'application/json' } });

	test('getSettings parses a valid payload and passes through unknown fields', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(
				JSON.stringify({
					...JSON.parse(validSettingsBody()),
					somethingTheFirmwareAddedLater: 42
				})
			)
		);
		const s = await getSettings();
		expect(s.numScreens).toBe(7);
		// looseObject should retain unknown forward-compat fields.
		expect((s as unknown as Record<string, unknown>).somethingTheFirmwareAddedLater).toBe(42);
	});

	test('getSettings throws on schema violations', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(JSON.stringify({ numScreens: 'seven', dataSource: 0 }))
		);
		await expect(getSettings()).rejects.toThrow();
	});

	test('getSettings rejects an out-of-range value on a bounded numeric field', async () => {
		// dataSource carries v.minValue(0)/v.maxValue(3) from the generated
		// field schema; 9 is outside the firmware enum and must fail the
		// cold-start parse rather than silently reaching the UI.
		fetchMock.mockResolvedValueOnce(
			jsonResponse(JSON.stringify({ ...JSON.parse(validSettingsBody()), dataSource: 9 }))
		);
		await expect(getSettings()).rejects.toThrow();
	});

	test('getStatus parses a valid status payload', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(
				JSON.stringify({
					data: ['1', '2'],
					espFreeHeap: 100,
					espHeapSize: 200,
					leds: [],
					connectionStatus: { price: true, blocks: true }
				})
			)
		);
		const s = await getStatus();
		expect(s.espFreeHeap).toBe(100);
	});

	test('getStatus throws on schema violations', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(JSON.stringify({ data: 'oops', leds: [] })));
		await expect(getStatus()).rejects.toThrow();
	});

	test('getSettings sends same-origin credentials to GET /api/settings', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(validSettingsBody()));
		await getSettings();
		expect(fetchMock).toHaveBeenLastCalledWith(
			apiUrl('/api/settings'),
			expect.objectContaining({ credentials: 'same-origin' })
		);
	});

	test('getStatus sends same-origin credentials to GET /api/status', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(
				JSON.stringify({
					data: ['1'],
					espFreeHeap: 1,
					espHeapSize: 2,
					leds: [],
					connectionStatus: { price: true, blocks: true }
				})
			)
		);
		await getStatus();
		expect(fetchMock).toHaveBeenLastCalledWith(
			apiUrl('/api/status'),
			expect.objectContaining({ credentials: 'same-origin' })
		);
	});
});

/**
 * Endpoint contract tests — pin every state-changing wrapper to the exact
 * method / path / JSON-body shape the firmware's `control_server.cpp`
 * handlers expect (and that `static/openapi.yml` documents). A wrong key
 * (`{screen}` instead of `{s}`) or a GET-where-POST-is-required is the kind
 * of silent breakage that only surfaces as a no-op button on the device, so
 * lock the wire format here.
 *
 * Firmware success path for these is `SendEmptyOk` → 200 with an empty body
 * and no JSON content-type, which is what the default mock returns.
 */
describe('endpoint contracts', () => {
	const fetchMock = vi.fn();
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
		// Mirror the firmware's SendEmptyOk: 200, empty body, no JSON type.
		fetchMock.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	const lastCall = (): { url: string; init: RequestInit } => {
		const call = fetchMock.mock.calls.at(-1);
		return { url: call?.[0] as string, init: (call?.[1] ?? {}) as RequestInit };
	};

	test('showScreen → POST /api/show/screen with { s }', async () => {
		await showScreen(10);
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl('/api/show/screen'));
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('same-origin');
		expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
		expect(JSON.parse(init.body as string)).toEqual({ s: 10 });
	});

	test('showText → POST /api/show/text with { t }', async () => {
		await showText('HELLO');
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl('/api/show/text'));
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ t: 'HELLO' });
	});

	test('showCurrency → POST /api/show/currency with { c }', async () => {
		await showCurrency('USD');
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl('/api/show/currency'));
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ c: 'USD' });
	});

	test('frontlightBrightness → POST /api/frontlight/brightness with { b }', async () => {
		await frontlightBrightness(2048);
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl('/api/frontlight/brightness'));
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ b: 2048 });
	});

	test('lightsSet → POST /api/lights/set with the raw LED array as body', async () => {
		await lightsSet([{ hex: '#FFCC00' }, { hex: '#000000' }]);
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl('/api/lights/set'));
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('same-origin');
		expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
		expect(JSON.parse(init.body as string)).toEqual([{ hex: '#FFCC00' }, { hex: '#000000' }]);
	});

	// Body-less POSTs go through the `post` helper, which deliberately omits
	// the Content-Type header (and body) when no payload is given. The
	// firmware reads nothing off these, so sending an empty JSON object would
	// be misleading.
	test.each([
		['lightsOff', lightsOff, '/api/lights/off'],
		['frontlightOn', frontlightOn, '/api/frontlight/on'],
		['frontlightOff', frontlightOff, '/api/frontlight/off'],
		['frontlightFlash', frontlightFlash, '/api/frontlight/flash'],
		['restartClock', restartClock, '/api/restart'],
		['forceFullRefresh', forceFullRefresh, '/api/full_refresh'],
		['pauseTimer', pauseTimer, '/api/action/pause'],
		['timerRestart', timerRestart, '/api/action/timer_restart'],
		['dndEnable', dndEnable, '/api/dnd/enable'],
		['dndDisable', dndDisable, '/api/dnd/disable']
	] as const)('%s → POST %s with no body or Content-Type', async (_name, fn, path) => {
		await fn();
		const { url, init } = lastCall();
		expect(url).toBe(apiUrl(path));
		expect(init.method).toBe('POST');
		expect(init.credentials).toBe('same-origin');
		expect(init.headers).toBeUndefined();
		expect(init.body).toBeUndefined();
	});
});

describe('firmwareAutoUpdate', () => {
	const fetchMock = vi.fn();
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test('POSTs to /api/firmware/auto_update and returns the parsed message', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response('{"msg":"Firmware update triggered"}', {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const res = await firmwareAutoUpdate();
		expect(fetchMock).toHaveBeenCalledWith(
			apiUrl('/api/firmware/auto_update'),
			expect.objectContaining({ method: 'POST' })
		);
		expect(res.ok).toBe(true);
		expect(res.payload).toEqual({ msg: 'Firmware update triggered' });
	});

	test('503 already-in-progress → ok:false but the JSON body still parses', async () => {
		// The firmware returns a JSON body on 503 too, so res.json() succeeds.
		fetchMock.mockResolvedValueOnce(
			new Response('{"msg":"Update already in progress"}', {
				status: 503,
				statusText: 'Service Unavailable',
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const res = await firmwareAutoUpdate();
		expect(res.ok).toBe(false);
		expect(res.payload.msg).toBe('Update already in progress');
	});
});

describe('URL helpers', () => {
	test('eventsUrl points at the /events stream', () => {
		expect(eventsUrl()).toBe(apiUrl('/events'));
	});

	test('previewWsUrl resolves to a ws(s):// URL ending in /api/preview/ws', () => {
		// Scheme comes from an http(s) PUBLIC_BASE_URL, or from
		// window.location when the base is empty — either way it must be a
		// WebSocket URL, never http(s).
		const u = previewWsUrl();
		expect(/^wss?:\/\//.test(u)).toBe(true);
		expect(u.endsWith('/api/preview/ws')).toBe(true);
	});
});

// The absolute-base-URL branches of previewWsUrl can only be exercised by
// changing PUBLIC_BASE_URL, which is read at import time — so re-import the
// module with a mocked $lib/config in an isolated registry.
describe('previewWsUrl scheme conversion (absolute PUBLIC_BASE_URL)', () => {
	afterEach(() => {
		vi.resetModules();
		vi.doUnmock('$lib/config');
	});

	test('https base → wss', async () => {
		vi.resetModules();
		vi.doMock('$lib/config', () => ({ PUBLIC_BASE_URL: 'https://dev.box' }));
		const { previewWsUrl: pw } = await import('./client');
		expect(pw()).toBe('wss://dev.box/api/preview/ws');
	});

	test('http base → ws', async () => {
		vi.resetModules();
		vi.doMock('$lib/config', () => ({ PUBLIC_BASE_URL: 'http://dev.box' }));
		const { previewWsUrl: pw } = await import('./client');
		expect(pw()).toBe('ws://dev.box/api/preview/ws');
	});
});

/**
 * uploadFirmware / uploadWebUi stream the raw file body via XMLHttpRequest so
 * the caller can render an upload progress bar (fetch has no upload-progress
 * event). The body is sent as a raw octet-stream — NOT multipart/form-data —
 * because the firmware's /upload handlers write the request body straight to
 * flash without parsing a multipart envelope. A fake XHR captures the request
 * shape and lets us drive the load / error / progress callbacks.
 */
describe('xhrUpload (uploadFirmware / uploadWebUi)', () => {
	class FakeUpload {
		onprogress: ((e: ProgressEvent) => void) | null = null;
	}
	class FakeXHR {
		static instances: FakeXHR[] = [];
		method = '';
		url = '';
		sent: unknown = null;
		status = 0;
		responseText = '';
		headers: Record<string, string> = {};
		upload = new FakeUpload();
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		open(method: string, url: string) {
			this.method = method;
			this.url = url;
		}
		setRequestHeader(name: string, value: string) {
			this.headers[name] = value;
		}
		send(body: unknown) {
			this.sent = body;
			FakeXHR.instances.push(this);
		}
	}
	const OriginalXHR = globalThis.XMLHttpRequest;

	beforeEach(() => {
		FakeXHR.instances = [];
		(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
	});

	afterEach(() => {
		(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = OriginalXHR;
	});

	test('POSTs the raw file as an octet-stream to /upload/firmware and resolves on 200', async () => {
		const file = new File(['fw'], 'firmware.bin');
		const p = uploadFirmware(file);
		const xhr = FakeXHR.instances[0]!;
		expect(xhr.method).toBe('POST');
		expect(xhr.url).toBe(apiUrl('/upload/firmware'));
		// Raw file body — NOT a multipart FormData envelope, which the
		// firmware's raw-streaming /upload handler cannot parse.
		expect(xhr.sent).toBe(file);
		expect(xhr.sent).not.toBeInstanceOf(FormData);
		expect(xhr.headers['Content-Type']).toBe('application/octet-stream');
		xhr.status = 200;
		xhr.responseText = 'OK';
		xhr.onload!();
		await expect(p).resolves.toBeUndefined();
	});

	test('uploadWebUi targets /upload/webui with the raw file body', async () => {
		const file = new File(['ui'], 'webui.bin');
		const p = uploadWebUi(file);
		const xhr = FakeXHR.instances[0]!;
		expect(xhr.url).toBe(apiUrl('/upload/webui'));
		expect(xhr.sent).toBe(file);
		expect(xhr.headers['Content-Type']).toBe('application/octet-stream');
		xhr.status = 200;
		xhr.responseText = '';
		xhr.onload!();
		await expect(p).resolves.toBeUndefined();
	});

	test('rejects when the firmware answers 200 but body is "FAIL"', async () => {
		const p = uploadFirmware(new File(['fw'], 'firmware.bin'));
		const xhr = FakeXHR.instances[0]!;
		xhr.status = 200;
		xhr.responseText = 'FAIL';
		xhr.onload!();
		await expect(p).rejects.toThrow(/Upload failed/);
	});

	test('rejects on a non-200 status', async () => {
		const p = uploadFirmware(new File(['fw'], 'firmware.bin'));
		const xhr = FakeXHR.instances[0]!;
		xhr.status = 500;
		xhr.responseText = 'boom';
		xhr.onload!();
		await expect(p).rejects.toThrow(/Upload failed: 500/);
	});

	test('rejects on a network error', async () => {
		const p = uploadFirmware(new File(['fw'], 'firmware.bin'));
		FakeXHR.instances[0]!.onerror!();
		await expect(p).rejects.toThrow(/network error/);
	});

	test('reports upload progress as a 0-100 percentage', async () => {
		const seen: number[] = [];
		const p = uploadFirmware(new File(['fw'], 'firmware.bin'), (pct) => seen.push(pct));
		const xhr = FakeXHR.instances[0]!;
		xhr.upload.onprogress!({ lengthComputable: true, loaded: 25, total: 100 } as ProgressEvent);
		xhr.upload.onprogress!({ lengthComputable: true, loaded: 90, total: 100 } as ProgressEvent);
		expect(seen).toEqual([25, 90]);
		xhr.status = 200;
		xhr.responseText = 'OK';
		xhr.onload!();
		await expect(p).resolves.toBeUndefined();
	});
});
