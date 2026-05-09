import { describe, test, expect, beforeEach, afterAll, vi } from 'vitest';
import { getSettings, getStatus, parseSettingsError, patchSettings } from './client';

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
			useSatsSymbol: false,
			useBtcSymbol: false,
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
});
