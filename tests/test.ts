import { expect, test } from '@playwright/test';

const statusJson = {
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

const settingsJson = {
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
	nostrZapNotify: true,
	hwRev: 'REV_A_EPD_2_13',
	fsRev: '4c5d9616212b27e3f05c35370f0befcf2c5a04b2',
	nostrZapPubkey: 'b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422',
	lastBuildTime: '1700666677',
	screens: [
		{ id: 0, name: 'Block Height', enabled: true },
		{ id: 1, name: 'Sats per dollar', enabled: true },
		{ id: 2, name: 'Ticker', enabled: true },
		{ id: 3, name: 'Time', enabled: true },
		{ id: 4, name: 'Halving countdown', enabled: true },
		{ id: 5, name: 'Market Cap', enabled: true }
	]
};

test.beforeEach(async ({ page }) => {
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
});

test('index page has expected columns control, status, settings', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Control' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('index page has working language selector', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('//*[@id="nav-language-dropdown"]/a')).toBeVisible();
	page.locator('//*[@id="nav-language-dropdown"]/a').click();
	//*[@id="nav-language-dropdown"]/ul/li[1]/button
	await expect(page.locator('//*[@id="nav-language-dropdown"]/ul/li[1]/button')).toBeVisible();
	page.locator('//*[@id="nav-language-dropdown"]/ul/li[2]/button').click();
	await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible();
	page.locator('//*[@id="nav-language-dropdown"]/a').click();
	page.locator('//*[@id="nav-language-dropdown"]/ul/li[3]/button').click();
	await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
});

test('api page has expected load button', async ({ page }) => {
	await page.goto('/api');
	await expect(page.getByRole('button', { name: 'Load' })).toBeVisible();
});

test('timezone can be negative, zero and positive', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Show all' }).click();

	const tzOffsetField = 'input#tzOffset';

	for (const val of ['-10', '0', '42']) {
		await page.fill(tzOffsetField, val);
		const resultValue = await page.$eval(tzOffsetField, (input: HTMLInputElement) => input.value);
		expect(resultValue).toBe(val);
		await page.getByRole('button', { name: 'Save' }).click();
	}
});

test('time values can not be zero or negative', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Show all' }).click();

	for (const field of ['#timePerScreen', '#fullRefreshMin', '#minSecPriceUpd']) {
		for (const val of ['42', '210']) {
			await page.fill(field, val);
			const resultValue = await page.$eval(field, (input: HTMLInputElement) => input.value);
			expect(resultValue).toBe(val);
			await page.getByRole('button', { name: 'Save' }).click();
			const validationMessage = await page.$eval(
				field,
				(input: HTMLInputElement) => input.validationMessage
			);
			expect(validationMessage).not.toContain('Value must be greater');
		}

		for (const val of ['-10', '0']) {
			await page.fill(field, val);
			const resultValue = await page.$eval(field, (input: HTMLInputElement) => input.value);
			expect(resultValue).toBe(val);
			await page.getByRole('button', { name: 'Save' }).click();
			const validationMessage = await page.$eval(
				field,
				(input: HTMLInputElement) => input.validationMessage
			);
			expect(validationMessage).toContain('Value must be greater');
		}
	}
});

test('info message when fetch eur price is enabled', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Show all' }).click();

	const inputField = 'input#fetchEurPrice';
	const switchElement = await page.locator(inputField);

	expect(switchElement).toBeTruthy();
	const isSwitchEnabled = await switchElement.isChecked();
	expect(isSwitchEnabled).toBe(false);

	await expect(page.getByText('the WS Price connection will show')).toBeHidden();

	await switchElement.click();
	const isSwitchNowEnabled = await switchElement.isChecked();
	expect(isSwitchNowEnabled).toBe(true);

	await expect(page.getByText('the WS Price connection will show')).toBeVisible();
});

test('npub values will be converted to hex pubkeys', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Show all' }).click();

	for (const field of ['#nostrZapPubkey']) {
		for (const val of ['npub1k5f85zx0xdskyayqpfpc0zq6n7vwqjuuxugkayk72fgynp34cs3qfcvqg2']) {
			await page.fill(field, val);

			await page.getByLabel('Nostr Relay').click();
			const resultValue = await page.$eval(field, (input: HTMLInputElement) => input.value);

			expect(resultValue).toBe('b5127a08cf33616274800a4387881a9f98e04b9c37116e92de5250498635c422');
		}
	}
});

test('empty nostr relay field is not accepted', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Show all' }).click();

	const nostrRelayField = page.getByLabel('Nostr Relay');

	nostrRelayField.fill('');

	await page.getByRole('button', { name: 'Save' }).click();
	const validationMessage = await nostrRelayField.evaluate((el) => el.validationMessage);

	expect(validationMessage).toContain('Please fill out this field');
});

test('screens should be able to change', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Sats per Dollar' })).toBeVisible();
	const responsePromise = page.waitForRequest('*/**/api/show/screen/*');

	await page.getByRole('button', { name: 'Sats per Dollar' }).click();
	const response = await responsePromise;
	expect(response.url()).toContain('api/show/screen/1');
});

test('parse all types of EPD content correctly', async ({ page }) => {
	statusJson.data[2] = '123';

	await page.route('**/events', (route) => {
		const newStatus = statusJson;
		newStatus.data = ['BLOCK/HEIGHT', '8', '123', '0', '8', '1', '5'];

		// Respond with a custom SSE message
		route.fulfill({
			status: 200,
			contentType: 'text/event-stream',
			json: `${JSON.stringify(newStatus)}\n\n`
		});
	});

	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await page.waitForSelector('#timerStatusText:has-text("running")');
	await page.waitForSelector('#btclock-wrapper > div > div:nth-child(1)');

	expect(statusJson.data[0]).toContain('/');
	await expect(page.locator('#btclock-wrapper > div > div:nth-child(1)')).toBeTruthy();
	await expect(page.locator('#btclock-wrapper > div > div:nth-child(1)')).toHaveClass('splitText');
	expect(statusJson.data[1]).toHaveLength(1);
	await expect(page.locator('#btclock-wrapper > div > div:nth-child(2)')).toHaveClass('digit');
	expect(statusJson.data[2]).toHaveLength(3);
	await expect(page.locator('#btclock-wrapper > div > div:nth-child(3)')).toHaveClass('mediumText');
});

test('should work with more than 7 screens', async ({ page }) => {
	statusJson.data[2] = '1';
	statusJson.numScreens = 9;
	settingsJson.numScreens = 9;
	statusJson.data.splice(1, 0, ' ', ' ');

	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
	await page.waitForSelector('#timerStatusText:has-text("running")');
	await expect(page.locator('#btclock-wrapper > div > div:nth-child(9)')).toBeTruthy();

	await expect(page.locator('#customText')).toHaveAttribute(
		'maxlength',
		statusJson.numScreens.toString()
	);
});
