interface Page {
	route: (url: string, handler: (route: Route) => Promise<void>) => Promise<void>;
	addInitScript: (fn: () => void) => Promise<void>;
}

interface Route {
	fulfill: (response: {
		json?: typeof statusJson | typeof settingsJson | typeof latestReleaseFake;
		status?: number;
		headers?: Record<string, string>;
		body?: ReadableStream;
	}) => Promise<void>;
}

const MEMPOOL_TIP_HEIGHT = 'https://mempool.dbtc.link/api/blocks/tip/height';

/** Plain digits from mempool tip height → clock `data` row for Block Height screen */
export const fetchLatestBlockHeight = async (): Promise<string[]> => {
	try {
		const response = await fetch(MEMPOOL_TIP_HEIGHT);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const raw = (await response.text()).trim();
		if (!/^\d+$/.test(raw)) throw new Error('non-numeric height');
		return ['BLOCK/HEIGHT', ...raw.split('')];
	} catch (error) {
		console.warn('Failed to fetch tip height from mempool.dbtc.link, using zeros:', error);
		return ['BLOCK/HEIGHT', '0', '0', '0', '0', '0', '0'];
	}
};

export const fetchLatestRelease = async () => {
	try {
		const response = await fetch(
			'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/latest'
		);
		if (!response.ok) throw new Error('Failed to fetch latest release');
		const data = await response.json();
		settingsJson.gitTag = data.tag_name;
		return data;
	} catch (error) {
		console.warn('Failed to fetch latest release, using fallback:', error);
		settingsJson.gitTag = latestReleaseFake.tag_name;
		return latestReleaseFake;
	}
};

export const statusJson = {
	currentScreen: 20,
	numScreens: 7,
	timerRunning: true,
	isOTAUpdating: false,
	espUptime: 4479,
	espFreeHeap: 58508,
	espHeapSize: 342108,
	connectionStatus: {
		price: false,
		blocks: false,
		V2: true,
		// Firmware ≥ 4.0.0-rc.4 ships per-relay state as `[{url, connected}]`.
		// Pre-rc.4 emitted a single boolean — the WebUI feature-detects with
		// Array.isArray, so both shapes round-trip through the status pill.
		nostr: [{ url: 'wss://relay.primal.net', connected: true }]
	},
	rssi: -66,
	data: ['BLOCK/HEIGHT', '0', '0', '0', '0', '0', '0'],
	currency: 'USD',
	leds: [
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' }
	],
	isUpdating: true,
	// `false` so Status “Lost connection” overlay stays off when SSE is healthy (Playwright + screenshots)
	isFake: false,
	dnd: {
		enabled: true,
		dndTimeEnabled: true,
		startTime: '23:00',
		endTime: '7:00',
		active: true
	}
};

export const settingsJson = {
	actCurrencies: ['USD', 'EUR'],
	availableCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
	availableFonts: [
		{ id: 'antonio', hasBtcSymbol: false },
		{ id: 'oswald', hasBtcSymbol: true }
	],
	availablePools: [
		'ocean',
		'noderunners',
		'satoshi_radio',
		'braiins',
		'public_pool',
		'blitzpool',
		'ckpool',
		'eu_ckpool'
	],
	bitaxeEnabled: false,
	bitaxeHostname: 'bitaxe1',
	blockFeeDec: true,
	blockFlashColor: 14697216,
	ceEndpoint: 'ws-staging.btclock.dev',
	ceDisableSSL: false,
	dataSource: 0,
	dnd: {
		enabled: false,
		dndTimeEnabled: true,
		startHour: 23,
		startMinute: 0,
		endHour: 7,
		endMinute: 0
	},
	disableLeds: false,
	enableDebugLog: false,
	fetchEurPrice: false,
	fontName: 'antonio',
	fsRev: 'd1b61eb00aa3dfbb4acf2b84f1d64b06f2d04733',
	fullRefreshMin: 60,
	gitRev: 'd1b61eb00aa3dfbb4acf2b84f1d64b06f2d04733',
	gitTag: '3.3.14',
	hostname: 'btclock-d60b14',
	hostnamePrefix: 'btclock',
	hwRev: 'REV_A_EPD_2_13',
	invertedColor: false,
	ip: '192.168.20.231',
	isFake: false,
	isLoaded: true,
	lastBuildTime: Math.round(new Date().getTime() / 1000),
	ledBrightness: 128,
	ledFlashOnUpd: true,
	ledTestOnPower: true,
	mcapBigChar: true,
	mdnsEnabled: true,
	mempoolInstance: 'mempool.space',
	minSecPriceUpd: 30,
	miningPoolName: 'ocean',
	miningPoolStats: false,
	miningPoolUser: '38Qkkei3SuF1Eo45BaYmRHUneRD54yyTFy',
	mowMode: false,
	nostrZapNotify: true,
	// Firmware emits both keys: nostrZapPubkeys is the canonical array
	// (CSV in NVS, array on the wire); nostrZapPubkey is the legacy
	// echo of the array's first entry for back-compat with stale
	// clients. Mirror that here.
	nostrZapPubkey: 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422',
	nostrZapPubkeys: ['b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422'],
	numScreens: 7,
	otaEnabled: true,
	proxyEnabled: false,
	proxyType: 0,
	proxyHost: '',
	proxyPort: 1080,
	proxyUser: '',
	proxyPass: '',
	proxyPassSet: false,
	proxyBypass: '*.local,192.168.*,10.*,127.0.0.1',
	refrScrnChange: false,
	screens: [
		{
			id: 0,
			name: 'Block Height',
			enabled: true,
			order: 0
		},
		{
			id: 3,
			name: 'Time',
			enabled: false,
			order: 1
		},
		{
			id: 4,
			name: 'Halving countdown',
			enabled: false,
			order: 2
		},
		{
			id: 6,
			name: 'Block Fee Rate',
			enabled: false,
			order: 3
		},
		{
			id: 10,
			name: 'Sats per dollar',
			enabled: false,
			order: 4
		},
		{
			id: 20,
			name: 'Ticker',
			enabled: true,
			order: 5
		},
		{
			id: 30,
			name: 'Market Cap',
			enabled: false,
			order: 6
		},
		{
			id: 40,
			name: 'Bitcoin Supply',
			enabled: false,
			order: 7
		}
	],
	stealFocus: true,
	suffixPrice: false,
	decimalShareDot: false,
	supplyPercent: false,
	timerRunning: true,
	timerSeconds: 1800,
	tzOffset: 0,
	txPower: 78,
	tzString: 'Europe/Amsterdam',
	verticalDesc: true,
	wpTimeout: 600,
	// Below: fields the strict schema added after this fixture was first
	// authored. Real devices always emit these; the fixture would loop
	// on "Loading…" without them.
	priceSymMode: 0,
	useMscwTime: false,
	useBlkCountdown: false,
	inverseButtons: false,
	mempoolSecure: true,
	localPoolHost: '',
	nostrPubKey: '',
	// Firmware emits both keys: nostrRelays is the canonical array (CSV in
	// NVS, array on the wire); nostrRelay is the legacy echo of the array's
	// first entry for back-compat with stale clients. Mirror that here.
	nostrRelay: 'wss://relay.primal.net',
	nostrRelays: ['wss://relay.primal.net'],
	ledFlashOnZap: false,
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
	httpAuthEnabled: false,
	httpAuthUser: '',
	httpAuthPass: '',
	httpAuthPassSet: false,
	otaPass: '',
	otaPassSet: false,
	poolGlobalStats: false,
	poolLogosUrl: 'https://git.btclock.dev/btclock/mining-pool-logos/raw/branch/main',
	gitReleaseUrl: 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v4/releases/latest'
};

export const latestReleaseFake = {
	id: 1084,
	tag_name: '3.3.15',
	target_commitish: '',
	name: '3.3.15',
	body: '',
	url: 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/1084',
	html_url: 'https://git.btclock.dev/btclock/btclock_v3/releases/tag/3.3.15',
	tarball_url: 'https://git.btclock.dev/btclock/btclock_v3/archive/3.3.15.tar.gz',
	zipball_url: 'https://git.btclock.dev/btclock/btclock_v3/archive/3.3.15.zip',
	hide_archive_links: false,
	upload_url: 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/1084/assets',
	draft: false,
	prerelease: false,
	created_at: '2025-12-16T09:25:54Z',
	published_at: '2025-12-16T09:25:54Z',
	author: {
		id: 1,
		login: 'djuri',
		login_name: '',
		source_id: 0,
		full_name: 'Djuri',
		email: 'djuri@noreply.btclock',
		avatar_url: 'https://git.btclock.dev/avatars/e089d9b13c4b92904619c2637c97565a',
		html_url: 'https://git.btclock.dev/djuri',
		language: '',
		is_admin: false,
		last_login: '0001-01-01T00:00:00Z',
		created: '2024-11-25T20:34:51Z',
		restricted: false,
		active: false,
		prohibit_login: false,
		location: '',
		pronouns: '',
		website: '',
		description: '',
		visibility: 'private',
		followers_count: 0,
		following_count: 0,
		starred_repos_count: 0,
		username: 'djuri'
	},
	assets: [],
	archive_download_count: {
		zip: 2,
		tar_gz: 1
	}
};

export const initMock = async ({ page }: { page: Page }) => {
	// Update status with latest block height
	statusJson.data = await fetchLatestBlockHeight();
	const latestRelease = await fetchLatestRelease();

	// Chromium + Playwright’s fulfilled `text/event-stream` body does not reliably
	// drive `EventSource` (open / custom `status` events). The real firmware sends
	// `event: status` frames; we fake that behaviour so `statusStore.connected` flips
	// on and the Status “Lost connection” overlay stays off in screenshots / tests.
	await page.addInitScript(() => {
		const Native = window.EventSource;
		function PatchedEventSource(
			url: string | URL,
			eventSourceInitDict?: EventSourceInit
		): EventSource {
			const href = typeof url === 'string' ? url : url.href;
			let pathname: string;
			try {
				pathname = new URL(href, window.location.origin).pathname;
			} catch {
				return new Native(url, eventSourceInitDict);
			}
			if (!pathname.endsWith('/events')) {
				return new Native(url, eventSourceInitDict);
			}

			// `new EventTarget()` keeps native dispatch/addEventListener (no “Illegal invocation”
			// from `Object.create(EventTarget.prototype)` + prototype.bind hacks).
			type FakeEs = EventTarget & {
				url: string;
				readyState: number;
				withCredentials: boolean;
				onopen: ((this: EventSource, ev: Event) => void) | null;
				onmessage: ((this: EventSource, ev: MessageEvent) => void) | null;
				onerror: ((this: EventSource, ev: Event) => void) | null;
				close: () => void;
				CONNECTING: number;
				OPEN: number;
				CLOSED: number;
			};
			const relay = new EventTarget() as unknown as FakeEs;
			relay.url = href;
			relay.readyState = 0;
			relay.withCredentials = eventSourceInitDict?.withCredentials ?? false;
			relay.onopen = null;
			relay.onmessage = null;
			relay.onerror = null;
			relay.CONNECTING = 0;
			relay.OPEN = 1;
			relay.CLOSED = 2;
			relay.close = () => {
				relay.readyState = 2;
			};

			queueMicrotask(() => {
				relay.readyState = 1;
				const openEv = new Event('open');
				relay.dispatchEvent(openEv);
				if (typeof relay.onopen === 'function')
					relay.onopen.call(relay as EventSource, openEv);
				const statusEv = new MessageEvent('status', {
					data: JSON.stringify({ isUpdating: true, isFake: false })
				});
				relay.dispatchEvent(statusEv);
			});

			return relay as unknown as EventSource;
		}
		PatchedEventSource.CONNECTING = 0;
		PatchedEventSource.OPEN = 1;
		PatchedEventSource.CLOSED = 2;
		window.EventSource = PatchedEventSource as unknown as typeof EventSource;
	});

	await page.route('*/**/api/status', async (route) => {
		await route.fulfill({ json: statusJson });
	});

	// POST /api/show/screen now carries `{ s: <id> }` in JSON body.
	await page.route('*/**/api/show/screen', async (route) => {
		const screen = (route.request().postDataJSON() as { s?: number } | null)?.s;
		if (screen === 10) {
			statusJson.currentScreen = 1;
			statusJson.data = ['MSCW/TIME', ' ', ' ', '2', '6', '4', '4'];
			await route.fulfill({ json: statusJson });
			return;
		}
		if (screen === 20) {
			statusJson.currentScreen = 2;
			statusJson.data = ['BTC/USD', '$', '3', '7', '8', '2', '4'];
			await route.fulfill({ json: statusJson });
			return;
		}
		if (screen === 4) {
			statusJson.currentScreen = 4;
			statusJson.data = [
				'BIT/COIN',
				'HALV/ING',
				'0/YRS',
				'149/DAYS',
				'8/HRS',
				'30/MINS',
				'TO/GO'
			];
			await route.fulfill({ json: statusJson });
			return;
		}
		await route.fulfill({ status: 400, json: { error: 'unexpected screen' } });
	});

	// /api/settings handles both GET (full settings) and the 3.4.0 PATCH (settings update).
	// Route matching in Playwright is method-agnostic, so a single handler is enough —
	// return the stub settings for GET and a 200 for PATCH.
	await page.route('*/**/api/settings', async (route) => {
		if (route.request().method() === 'PATCH') {
			await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' } });
			return;
		}
		await route.fulfill({ json: settingsJson });
	});

	await page.route('**/api/v1/repos/btclock/btclock_v3/releases/latest', async (route) => {
		await route.fulfill({ json: latestRelease });
	});
};
