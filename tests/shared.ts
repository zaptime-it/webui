export const statusJson = {
	currentScreen: 0,
	numScreens: 7,
	timerRunning: true,
	espUptime: 4479,
	espFreeHeap: 58508,
	espHeapSize: 342108,
	connectionStatus: { price: true, blocks: true },
	rssi: -66,
	data: ['BLOCK/HEIGHT', '8', '1', '8', '0', '2', '6'],
	rendered: ['BLOCK/HEIGHT', '8', '1', '8', '0', '2', '6'],
	leds: [
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' },
		{ red: 0, green: 0, blue: 0, hex: '#000000' }
	]
};

export const settingsJson = {
	numScreens: 7,
	fgColor: 415029,
	bgColor: 0,
	timerSeconds: 1800,
	timerRunning: true,
	minSecPriceUpd: 30,
	fullRefreshMin: 60,
	wpTimeout: 600,
	tzOffset: 0,
	useBitcoinNode: false,
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
	gitTag: '3.1.9',
	bitaxeEnabled: false,
	bitaxeHostname: 'bitaxe1',
	miningPoolStatsEnabled: true,
	miningPoolName: 'ocean',
	miningPoolUser: '38Qkkei3SuF1Eo45BaYmRHUneRD54yyTFy',
	nostrZapNotify: true,
	hwRev: 'REV_A_EPD_2_13',
	fsRev: '4c5d9616212b27e3f05c35370f0befcf2c5a04b2',
	nostrZapPubkey: 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422',
	lastBuildTime: '1700666677',
	screens: [
		{
			id: 0,
			name: 'Block Height',
			enabled: true
		},
		{
			id: 3,
			name: 'Time',
			enabled: true
		},
		{
			id: 4,
			name: 'Halving countdown',
			enabled: true
		},
		{
			id: 6,
			name: 'Block Fee Rate',
			enabled: true
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
			enabled: true
		}
	],
	actCurrencies: ['USD', 'EUR'],
	availableCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']
};

export const initMock = async ({ page }) => {
	await page.route('*/**/api/status', async (route) => {
		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/1', async (route) => {
		//if (route.request().url().includes('*/**/api/show/screen/1')) {
		statusJson.currentScreen = 1;
		statusJson.data = ['MSCW/TIME', ' ', ' ', '2', '6', '4', '4'];
		statusJson.rendered = statusJson.data;
		//}

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/2', async (route) => {
		statusJson.currentScreen = 2;
		statusJson.data = ['BTC/USD', '$', '3', '7', '8', '2', '4'];
		statusJson.rendered = statusJson.data;

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/show/screen/4', async (route) => {
		statusJson.currentScreen = 4;
		statusJson.data = ['BIT/COIN', 'HALV/ING', '0/YRS', '149/DAYS', '8/HRS', '30/MINS', 'TO/GO'];
		statusJson.rendered = statusJson.data;

		await route.fulfill({ json: statusJson });
	});

	await page.route('*/**/api/settings', async (route) => {
		await route.fulfill({ json: settingsJson });
	});

	await page.route('**/events', (route) => {
		const newStatus = statusJson;
		newStatus.data = ['BLOCK/HEIGHT', '8', '0', '0', '8', '1', '5'];

		// Respond with a custom SSE message
		route.fulfill({
			status: 200,
			contentType: 'text/event-stream',
			json: `${JSON.stringify(newStatus)}\n\n`
		});
	});
};
