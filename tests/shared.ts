interface Page {
	route: (url: string, handler: (route: Route) => Promise<void>) => Promise<void>;
}

interface Route {
	fulfill: (response: {
		json?: typeof statusJson | typeof settingsJson | typeof latestReleaseFake;
		status?: number;
		headers?: Record<string, string>;
		body?: ReadableStream;
	}) => Promise<void>;
}

export const fetchLatestBlockHeight = async () => {
	const response = await fetch('https://ws.btclock.dev/api/lastblock');
	const blockHeight = await response.text();
	return ['BLOCK/HEIGHT', ...blockHeight.trim().split('')];
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
		nostr: true
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
	isFake: true,
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
	availableFonts: ['antonio', 'oswald'],
	availablePools: [
		'ocean',
		'noderunners',
		'satoshi_radio',
		'braiins',
		'public_pool',
		'gobrrr_pool',
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
	isFake: true,
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
	nostrZapPubkey: 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422',
	numScreens: 7,
	otaEnabled: true,
	refrScrnChange: false,
	screens: [
		{
			id: 0,
			name: 'Block Height',
			enabled: true
		},
		{
			id: 3,
			name: 'Time',
			enabled: false
		},
		{
			id: 4,
			name: 'Halving countdown',
			enabled: false
		},
		{
			id: 6,
			name: 'Block Fee Rate',
			enabled: false
		},
		{
			id: 10,
			name: 'Sats per dollar',
			enabled: false
		},
		{
			id: 20,
			name: 'Ticker',
			enabled: true
		},
		{
			id: 30,
			name: 'Market Cap',
			enabled: false
		},
		{
			id: 40,
			name: 'Bitcoin Supply',
			enabled: false
		}
	],
	stealFocus: true,
	suffixPrice: false,
	suffixShareDot: false,
	supplyPercent: false,
	timerRunning: true,
	timerSeconds: 1800,
	tzOffset: 0,
	txPower: 78,
	tzString: 'Europe/Amsterdam',
	verticalDesc: true,
	wpTimeout: 600
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

	await page.route('*/**/api/status', async (route) => {
		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/10', async (route) => {
		//if (route.request().url().includes('*/**/api/show/screen/1')) {
		statusJson.currentScreen = 1;
		statusJson.data = ['MSCW/TIME', ' ', ' ', '2', '6', '4', '4'];

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/20', async (route) => {
		statusJson.currentScreen = 2;
		statusJson.data = ['BTC/USD', '$', '3', '7', '8', '2', '4'];

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/4', async (route) => {
		statusJson.currentScreen = 4;
		statusJson.data = ['BIT/COIN', 'HALV/ING', '0/YRS', '149/DAYS', '8/HRS', '30/MINS', 'TO/GO'];

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/settings', async (route) => {
		await route.fulfill({ json: settingsJson });
	});

	await page.route('*/**/api/json/settings', async (route) => {
		await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' } });
	});

	await page.route('**/events', async (route) => {
		const newStatus = statusJson;
		newStatus.data = ['BLOCK/HEIGHT', '8', '0', '0', '8', '1', '5'];
		newStatus.isUpdating = true;

		// Format the SSE message correctly
		const sseMessage = `data: ${JSON.stringify(newStatus)}\n\n`;

		// Create a readable stream for SSE
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(sseMessage));
				// Keep the connection open
				// controller.close(); // Don't close if you want to send more events
			}
		});

		await route.fulfill({
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			},
			body: stream
		});
	});

	await page.route('**/api/v1/repos/btclock/btclock_v3/releases/latest', async (route) => {
		await route.fulfill({ json: latestRelease });
	});
};
