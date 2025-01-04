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
		timeBasedEnabled: true,
		startTime: '23:00',
		endTime: '7:00',
		active: true
	}
};

export const settingsJson = {
	numScreens: 7,
	timerSeconds: 1800,
	timerRunning: true,
	minSecPriceUpd: 30,
	fullRefreshMin: 60,
	wpTimeout: 600,
	tzOffset: 0,
	dataSource: 0,
	mempoolInstance: 'mempool.space',
	ledTestOnPower: true,
	ledFlashOnUpd: true,
	ledBrightness: 128,
	stealFocus: true,
	mcapBigChar: true,
	mdnsEnabled: true,
	otaEnabled: true,
	fetchEurPrice: false,
	hostnamePrefix: 'btclock',
	hostname: 'btclock-d60b14',
	ip: '192.168.20.231',
	txPower: 78,
	gitRev: '25d8b92bcbc8938417c140355ea3ba99ff9eb4b7',
	gitTag: '3.2.27',
	bitaxeEnabled: false,
	bitaxeHostname: 'bitaxe1',
	miningPoolStats: false,
	miningPoolName: 'ocean',
	miningPoolUser: '38Qkkei3SuF1Eo45BaYmRHUneRD54yyTFy',
	nostrZapNotify: true,
	hwRev: 'REV_A_EPD_2_13',
	fsRev: '64e518bf58f89749753167a8b6826e10bb6455c5',
	nostrZapPubkey: 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422',
	lastBuildTime: Math.round(new Date().getTime() / 1000),
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
			enabled: true
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
		}
	],
	actCurrencies: ['USD', 'EUR'],
	availableCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
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
	dnd: {
		enabled: false,
		timeBasedEnabled: true,
		startHour: 23,
		startMinute: 0,
		endHour: 7,
		endMinute: 0
	},
	availableFonts: ['antonio', 'oswald'],
	invertedColor: false,
	isLoaded: true,
	isFake: true
};

export const latestReleaseFake = {
	id: 782,
	tag_name: '3.2.24',
	target_commitish: '',
	name: '3.2.24',
	body: '',
	url: 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/782',
	html_url: 'https://git.btclock.dev/btclock/btclock_v3/releases/tag/3.2.24',
	tarball_url: 'https://git.btclock.dev/btclock/btclock_v3/archive/3.2.24.tar.gz',
	zipball_url: 'https://git.btclock.dev/btclock/btclock_v3/archive/3.2.24.zip',
	hide_archive_links: false,
	upload_url: 'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/782/assets',
	draft: false,
	prerelease: false,
	created_at: '2024-12-28T17:48:05Z',
	published_at: '2024-12-28T17:48:05Z',
	author: {},
	assets: [],
	archive_download_count: {
		zip: 0,
		tar_gz: 0
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
