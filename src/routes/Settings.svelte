<script lang="ts">
	import { isValidNostrRelay, getPubKey, isValidHexPubKey, isValidNpub } from '$lib';
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { uiSettings } from '$lib/uiSettings';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		Button,
		Card,
		CardBody,
		CardHeader,
		CardTitle,
		Col,
		Form,
		Row
	} from '@sveltestrap/sveltestrap';
	import EyeIcon from 'svelte-bootstrap-icons/lib/Eye.svelte';
	import EyeSlashIcon from 'svelte-bootstrap-icons/lib/EyeSlash.svelte';
	import { derived } from 'svelte/store';
	import { SettingsSwitch, SettingsInput, SettingsSelect, ToggleHeader } from '$lib/components';

	export let settings;

	const wifiTxPowerMap = new Map<string, number>([
		['Default', 80],
		['19.5dBm', 78], // 19.5dBm
		['19dBm', 76], // 19dBm
		['18.5dBm', 74], // 18.5dBm
		['17dBm', 68], // 17dBm
		['15dBm', 60], // 15dBm
		['13dBm', 52], // 13dBm
		['11dBm', 44], // 11dBm
		['8.5dBm', 34], // 8.5dBm
		['7dBm', 28], // 7dBm
		['5dBm', 20] // 5dBm
	]);

	const miningPoolMap = new Map<string, string>([
		['noderunners', 'Noderunners.network'],
		['braiins', 'Braiins Pool'],
		['ocean', 'ocean.xyz'],
		['satoshi_radio', 'Satoshi Radio pool'],
		['public_pool', 'public-pool.io'],
		['gobrrr_pool', 'Go Brrr pool']
	]);

	const getMiningPoolName = (name: string) => {
		if (miningPoolMap.has(name)) return miningPoolMap.get(name);

		return name;
	};

	const dispatch = createEventDispatcher();

	const handleReset = (e: Event) => {
		e.preventDefault();
		dispatch('formReset');
	};

	const getTzOffsetFromSystem = () => {
		const dt = new Date();
		let diffTZ = dt.getTimezoneOffset();
		$settings.tzOffset = diffTZ * -1;
	};

	const onSave = async (e: Event) => {
		e.preventDefault();

		// const form = e.target as HTMLFormElement;
		// const formData = new FormData(form);

		let formSettings = $settings;

		delete formSettings['gitRev'];
		delete formSettings['ip'];
		delete formSettings['lastBuildTime'];

		let headers = new Headers({
			'Content-Type': 'application/json'
		});

		//if ($settings.httpAuthEnabled) {
		//	headers.set('Authorization', 'Basic ' + btoa($settings.httpAuthUser + ":" + $settings.httpAuthPass));
		//}

		await fetch(`${PUBLIC_BASE_URL}/api/json/settings`, {
			method: 'PATCH',
			headers: headers,
			credentials: 'same-origin',
			body: JSON.stringify(formSettings)
		})
			.then((data) => {
				if (data.status == 200) {
					dispatch('showToast', {
						color: 'success',
						text: $_('section.settings.settingsSaved')
					});
				} else {
					dispatch('showToast', {
						color: 'danger',
						text: `${data.status}: ${data.statusText}`
					});
				}
			})
			.catch(() => {
				dispatch('showToast', {
					color: 'danger',
					text: $_('section.settings.errorSavingSettings')
				});
			});
	};

	let validNostrRelay = false;
	const testNostrRelay = async () => {
		validNostrRelay = await isValidNostrRelay($settings.nostrRelay);
	};

	let validBitaxe = false;
	const testBitaxe = async () => {
		try {
			const response = await fetch(`http://${$settings.bitaxeHostname}/api/system/info`);

			if (!response.ok) {
				dispatch('showToast', {
					color: 'danger',
					text: `Failed to connect to BitAxe HTTP error! status: ${response.status}`
				});
				validBitaxe = false;
				throw new Error();
			}

			const systemInfo = await response.json();
			dispatch('showToast', {
				color: 'success',
				text: `Connected to BitAxe ${systemInfo.ASICModel} (Board version ${systemInfo.boardVersion}) running firmware ${systemInfo.version}.\r\nCurrent hashrate ${Math.round(systemInfo.hashRate)} GH/s`
			});
			validBitaxe = true;
		} catch (error) {
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				dispatch('showToast', {
					color: 'danger',
					text: `Failed to connect to BitAxe, make sure you are connected to the same network.`
				});
			}
			console.error('Failed to fetch Bitaxe system info:', error);
			validBitaxe = false;
		}
	};

	const checkValidNostrPubkey = (key: string) => {
		if (isValidNpub($settings[key])) {
			dispatch('showToast', {
				color: 'info',
				text: $_('section.settings.convertingValidNpub')
			});
		}

		let ret = getPubKey($settings[key]);

		if (ret) $settings[key] = ret;
	};

	const onFlBrightnessChange = async () => {
		await fetch(`${PUBLIC_BASE_URL}/api/frontlight/brightness/${$settings.flMaxBrightness}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	};

	let showPassword = false;

	let textColor = '0';
	const colorStore = derived(settings, ($settings) => ({
		fgColor: $settings.fgColor,
		bgColor: $settings.bgColor
	}));

	// $: {
	// 	if ($colorStore) {
	// 		console.log('Settings model changed:', $colorStore);
	// 		if ($colorStore.fgColor < $colorStore.bgColor)
	// 			textColor = "0";
	// 		else
	// 			textColor = "1"; // 65535
	// 	}
	// }

	colorStore.subscribe(() => {
		if ($colorStore) {
			if ($colorStore.fgColor < $colorStore.bgColor) textColor = '0';
			else textColor = '1'; // 65535
		}
	});

	const setTextColor = () => {
		console.log(textColor);
		if (textColor == '1') {
			$settings.fgColor = 65535;
			$settings.bgColor = 0;
		} else {
			$settings.fgColor = 0;
			$settings.bgColor = 65535;
		}
	};

	const showAll = (show: boolean) => {
		screenSettingsIsOpen = show;
		displaysAndLedIsOpen = show;
		dataSourceIsOpen = show;
		extraFeaturesIsOpen = show;
		systemIsOpen = show;
	};

	export let xs = 12;
	export let sm = xs;
	export let md = sm;
	export let lg = md;
	export let xl = lg;
	export let xxl = xl;

	let screenSettingsIsOpen: boolean,
		displaysAndLedIsOpen: boolean,
		dataSourceIsOpen: boolean,
		extraFeaturesIsOpen: boolean,
		systemIsOpen: boolean;
</script>

<Col {xs} {sm} {md} {lg} {xl} {xxl} class="mb-4 mb-xl-0">
	<Card id="settings">
		<CardHeader>
			<div class="float-end">
				<small
					><button
						on:click={() => {
							showAll(true);
						}}
						type="button">{$_('section.settings.showAll')}</button
					>
					|
					<button
						type="button"
						on:click={() => {
							showAll(false);
						}}>{$_('section.settings.hideAll')}</button
					></small
				>
			</div>
			<CardTitle>{$_('section.settings.title', { default: 'Settings' })}</CardTitle>
		</CardHeader>

		<CardBody>
			<Form on:submit={onSave} class="clearfix">
				<Row>
					<ToggleHeader
						header={$_('section.settings.section.screenSettings')}
						defaultOpen={true}
						isOpen={screenSettingsIsOpen}
					>
						<Row>
							<SettingsSwitch
								id="stealFocus"
								bind:checked={$settings.stealFocus}
								label={$_('section.settings.StealFocusOnNewBlock')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>
							<SettingsSwitch
								id="mcapBigChar"
								bind:checked={$settings.mcapBigChar}
								label={$_('section.settings.useBigCharsMcap')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>
							<SettingsSwitch
								id="useBlkCountdown"
								bind:checked={$settings.useBlkCountdown}
								label={$_('section.settings.useBlkCountdown')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>
							<SettingsSwitch
								id="useSatsSymbol"
								bind:checked={$settings.useSatsSymbol}
								label={$_('section.settings.useSatsSymbol')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>
							<SettingsSwitch
								id="suffixPrice"
								bind:checked={$settings.suffixPrice}
								label={$_('section.settings.suffixPrice')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>
							<SettingsSwitch
								id="mowMode"
								bind:checked={$settings.mowMode}
								label={$_('section.settings.mowMode')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
								disabled={!$settings.suffixPrice}
							/>
							<SettingsSwitch
								id="suffixShareDot"
								bind:checked={$settings.suffixShareDot}
								label={$_('section.settings.suffixShareDot')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
								disabled={!$settings.suffixPrice}
							/>
							<SettingsSwitch
								id="verticalDesc"
								bind:checked={$settings.verticalDesc}
								label={$_('section.settings.verticalDesc')}
								size={$uiSettings.inputSize}
								col={{ md: '6', xl: '12', xxl: '6' }}
							/>

							{#if !$settings.actCurrencies}
								<SettingsSwitch
									id="fetchEurPrice"
									bind:checked={$settings.fetchEurPrice}
									label="{$_('section.settings.fetchEuroPrice')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
									col={{ md: '6', xl: '12', xxl: '6' }}
								/>
							{/if}
						</Row>
						<Row>
							<h5>{$_('section.settings.screens')}</h5>
							{#if $settings.screens}
								{#each $settings.screens as s}
									<SettingsSwitch
										id="screens_{s.id}"
										bind:checked={s.enabled}
										label={s.name}
										size={$uiSettings.inputSize}
										col={{ md: '6', xl: '12', xxl: '6' }}
									/>
								{/each}
							{/if}
						</Row>
						{#if $settings.actCurrencies && $settings.useNostr !== true}
							<Row>
								<h5>{$_('section.settings.currencies')}</h5>
								<small>{$_('restartRequired')}</small>
								{#if $settings.availableCurrencies}
									{#each $settings.availableCurrencies as c}
										<Col md="6" xl="12" xxl="6">
											<div class="form-check form-control-{$uiSettings.inputSize}">
												<input
													id="currency_{c}"
													bind:group={$settings.actCurrencies}
													value={c}
													type="checkbox"
													class="form-check-input"
													bsSize={$uiSettings.inputSize}
													label={c}
												/>
												<label class="form-check-label" for="currency_{c}">{c}</label>
											</div>
										</Col>
									{/each}
								{/if}
							</Row>
						{/if}
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader
						header={$_('section.settings.section.displaysAndLed')}
						isOpen={displaysAndLedIsOpen}
					>
						<SettingsSelect
							id="textColor"
							label={$_('section.settings.textColor')}
							bind:value={textColor}
							options={[
								[$_('colors.black') + ' on ' + $_('colors.white'), '0'],
								[$_('colors.white') + ' on ' + $_('colors.black'), '1']
							]}
							size={$uiSettings.inputSize}
							selectClass={$uiSettings.selectClass}
							onChange={setTextColor}
						/>

						<SettingsInput
							id="timePerScreen"
							label={$_('section.settings.timePerScreen')}
							bind:value={$settings.timePerScreen}
							type="number"
							min={1}
							step="1"
							required={true}
							suffix={$_('time.minutes')}
							size={$uiSettings.inputSize}
						/>

						<SettingsInput
							id="fullRefreshMin"
							label={$_('section.settings.fullRefreshEvery')}
							bind:value={$settings.fullRefreshMin}
							type="number"
							min={1}
							step="1"
							required={true}
							suffix={$_('time.minutes')}
							size={$uiSettings.inputSize}
						/>

						<SettingsInput
							id="minSecPriceUpd"
							label={$_('section.settings.timeBetweenPriceUpdates')}
							bind:value={$settings.minSecPriceUpd}
							type="number"
							min={1}
							step="1"
							suffix={$_('time.seconds')}
							helpText={$_('section.settings.shortAmountsWarning')}
							size={$uiSettings.inputSize}
						/>

						<SettingsInput
							id="ledBrightness"
							label={$_('section.settings.ledBrightness')}
							bind:value={$settings.ledBrightness}
							type="range"
							min={0}
							max={255}
							step={1}
							size={$uiSettings.inputSize}
						/>

						{#if $settings.hasFrontlight && !$settings.flDisable}
							<SettingsInput
								id="flMaxBrightness"
								label={$_('section.settings.flMaxBrightness')}
								bind:value={$settings.flMaxBrightness}
								type="range"
								min={0}
								max={4095}
								step={1}
								size={$uiSettings.inputSize}
								onChange={onFlBrightnessChange}
							/>

							<SettingsInput
								id="flEffectDelay"
								label={$_('section.settings.flEffectDelay')}
								bind:value={$settings.flEffectDelay}
								type="range"
								min={5}
								max={300}
								step={1}
								size={$uiSettings.inputSize}
							/>
						{/if}

						{#if !$settings.flDisable && $settings.hasLightLevel}
							<SettingsInput
								id="luxLightToggle"
								label={`${$_('section.settings.luxLightToggle')} (${$settings.luxLightToggle})`}
								bind:value={$settings.luxLightToggle}
								type="range"
								min={0}
								max={1000}
								step={1}
								helpText={$_('section.settings.luxLightToggleText')}
								size={$uiSettings.inputSize}
							/>
						{/if}

						<Row>
							<SettingsSwitch
								id="ledTestOnPower"
								bind:checked={$settings.ledTestOnPower}
								label={$_('section.settings.ledPowerOnTest')}
								size={$uiSettings.inputSize}
							/>

							<SettingsSwitch
								id="ledFlashOnUpd"
								bind:checked={$settings.ledFlashOnUpd}
								label={$_('section.settings.ledFlashOnBlock')}
								size={$uiSettings.inputSize}
							/>

							<SettingsSwitch
								id="disableLeds"
								bind:checked={$settings.disableLeds}
								label={$_('section.settings.disableLeds')}
								size={$uiSettings.inputSize}
							/>

							{#if $settings.hasFrontlight}
								<SettingsSwitch
									id="flDisable"
									bind:checked={$settings.flDisable}
									label={$_('section.settings.flDisable')}
									size={$uiSettings.inputSize}
								/>
							{/if}

							{#if $settings.hasFrontlight && !$settings.flDisable}
								<SettingsSwitch
									id="flAlwaysOn"
									bind:checked={$settings.flAlwaysOn}
									label={$_('section.settings.flAlwaysOn')}
									size={$uiSettings.inputSize}
								/>

								<SettingsSwitch
									id="flFlashOnUpd"
									bind:checked={$settings.flFlashOnUpd}
									label={$_('section.settings.flFlashOnUpd')}
									size={$uiSettings.inputSize}
								/>

								<SettingsSwitch
									id="flOffWhenDark"
									bind:checked={$settings.flOffWhenDark}
									label={$_('section.settings.flOffWhenDark')}
									size={$uiSettings.inputSize}
								/>
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader
						header={$_('section.settings.section.dataSource')}
						isOpen={dataSourceIsOpen}
					>
						<SettingsInput
							id="mempoolInstance"
							label={$_('section.settings.mempoolnstance')}
							bind:value={$settings.mempoolInstance}
							disabled={$settings.ownDataSource}
							required={true}
							helpText={$_('section.settings.mempoolInstanceHelpText')}
							size={$uiSettings.inputSize}
						/>

						<Row>
							<SettingsSwitch
								id="ownDataSource"
								bind:checked={$settings.ownDataSource}
								label="{$_('section.settings.ownDataSource')} ({$_('restartRequired')})"
								size={$uiSettings.inputSize}
							/>

							{#if $settings.nostrRelay}
								<SettingsSwitch
									id="useNostr"
									bind:checked={$settings.useNostr}
									label="{$_('section.settings.useNostr')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
								/>
							{/if}

							{#if 'stagingSource' in $settings}
								<SettingsSwitch
									id="stagingSource"
									bind:checked={$settings.stagingSource}
									label="{$_('section.settings.stagingSource')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
								/>
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader
						header={$_('section.settings.section.extraFeatures')}
						isOpen={extraFeaturesIsOpen}
					>
						{#if $settings.bitaxeEnabled}
							<SettingsInput
								id="bitaxeHostname"
								label={$_('section.settings.bitaxeHostname')}
								bind:value={$settings.bitaxeHostname}
								required={true}
								valid={validBitaxe}
								size={$uiSettings.inputSize}
							>
								<Button type="button" color="success" on:click={testBitaxe}
									>{$_('test', { default: 'Test' })}</Button
								>
							</SettingsInput>
						{/if}
						{#if $settings.miningPoolStats}
							<SettingsSelect
								id="miningPoolName"
								label={$_('section.settings.miningPoolName')}
								bind:value={$settings.miningPoolName}
								options={$settings.availablePools.map((pool) => [getMiningPoolName(pool), pool])}
								size={$uiSettings.inputSize}
								selectClass={$uiSettings.selectClass}
							/>
							<SettingsInput
								id="miningPoolUser"
								label={$_('section.settings.miningPoolUser')}
								bind:value={$settings.miningPoolUser}
								required={true}
								size={$uiSettings.inputSize}
							/>
						{/if}
						{#if 'nostrZapNotify' in $settings && $settings['nostrZapNotify']}
							<SettingsInput
								id="nostrZapPubkey"
								label={$_('section.settings.nostrZapPubkey')}
								bind:value={$settings.nostrZapPubkey}
								required={true}
								minlength="64"
								invalid={!isValidHexPubKey($settings.nostrZapPubkey)}
								helpText={!isValidHexPubKey($settings.nostrZapPubkey)
									? $_('section.settings.invalidNostrPubkey')
									: undefined}
								size={$uiSettings.inputSize}
								onChange={() => checkValidNostrPubkey('nostrZapPubkey')}
							/>
						{/if}
						{#if $settings.useNostr}
							<SettingsInput
								id="nostrPubKey"
								label={$_('section.settings.nostrPubKey')}
								bind:value={$settings.nostrPubKey}
								invalid={!isValidHexPubKey($settings.nostrPubKey)}
								helpText={!isValidHexPubKey($settings.nostrPubKey)
									? $_('section.settings.invalidNostrPubkey')
									: undefined}
								size={$uiSettings.inputSize}
								onChange={() => checkValidNostrPubkey('nostrPubKey')}
							/>
						{/if}
						{#if 'nostrZapNotify' in $settings || $settings.useNostr}
							<SettingsInput
								id="nostrRelay"
								label={$_('section.settings.nostrRelay')}
								bind:value={$settings.nostrRelay}
								required={true}
								valid={validNostrRelay}
								size={$uiSettings.inputSize}
							>
								<Button type="button" color="success" on:click={testNostrRelay}
									>{$_('test', { default: 'Test' })}</Button
								>
							</SettingsInput>
						{/if}
						<Row>
							{#if 'bitaxeEnabled' in $settings}
								<SettingsSwitch
									id="bitaxeEnabled"
									bind:checked={$settings.bitaxeEnabled}
									label="{$_('section.settings.bitaxeEnabled')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
								/>
							{/if}
							{#if 'miningPoolStats' in $settings}
								<SettingsSwitch
									id="miningPoolStats"
									bind:checked={$settings.miningPoolStats}
									label="{$_('section.settings.miningPoolStats')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
								/>
							{/if}
							{#if 'nostrZapNotify' in $settings}
								<SettingsSwitch
									id="nostrZapNotify"
									bind:checked={$settings.nostrZapNotify}
									label="{$_('section.settings.nostrZapNotify')} ({$_('restartRequired')})"
									size={$uiSettings.inputSize}
								/>
								<SettingsSwitch
									id="ledFlashOnZap"
									bind:checked={$settings.ledFlashOnZap}
									label={$_('section.settings.ledFlashOnZap')}
									size={$uiSettings.inputSize}
								/>
								{#if $settings.hasFrontlight && !$settings.flDisable}
									<SettingsSwitch
										id="flFlashOnZap"
										bind:checked={$settings.flFlashOnZap}
										label={$_('section.settings.flFlashOnZap')}
										size={$uiSettings.inputSize}
									/>
								{/if}
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader header={$_('section.settings.section.system')} isOpen={systemIsOpen}>
						<SettingsInput
							id="tzOffset"
							label={$_('section.settings.timezoneOffset')}
							bind:value={$settings.tzOffset}
							type="number"
							step="1"
							required={true}
							suffix={$_('time.minutes')}
							helpText={$_('section.settings.tzOffsetHelpText')}
							size={$uiSettings.inputSize}
						>
							<Button type="button" color="info" on:click={getTzOffsetFromSystem}
								>{$_('auto-detect')}</Button
							>
						</SettingsInput>

						{#if $settings.httpAuthEnabled}
							<SettingsInput
								id="httpAuthUser"
								label={$_('section.settings.httpAuthUser')}
								bind:value={$settings.httpAuthUser}
								required={true}
								size={$uiSettings.inputSize}
							/>
							<SettingsInput
								id="httpAuthPass"
								label={$_('section.settings.httpAuthPass')}
								bind:value={$settings.httpAuthPass}
								type={showPassword ? 'text' : 'password'}
								required={true}
								size={$uiSettings.inputSize}
							>
								<Button
									type="button"
									on:click={() => (showPassword = !showPassword)}
									color={showPassword ? 'success' : 'danger'}
								>
									{#if !showPassword}<EyeIcon />{:else}<EyeSlashIcon />{/if}
								</Button>
							</SettingsInput>
						{/if}

						<SettingsInput
							id="hostnamePrefix"
							label={$_('section.settings.hostnamePrefix')}
							bind:value={$settings.hostnamePrefix}
							required={true}
							minlength="1"
							size={$uiSettings.inputSize}
						/>

						<SettingsSelect
							id="wifiTxPower"
							label={$_('section.settings.wifiTxPower', { default: 'WiFi Tx Power' })}
							bind:value={$settings.txPower}
							options={Array.from(wifiTxPowerMap.entries())}
							size={$uiSettings.inputSize}
							selectClass={$uiSettings.selectClass}
							helpText={$_('section.settings.wifiTxPowerText')}
						/>

						<SettingsInput
							id="wpTimeout"
							label={$_('section.settings.wpTimeout')}
							bind:value={$settings.wpTimeout}
							type="number"
							min={1}
							step="1"
							required={true}
							suffix={$_('time.seconds')}
							size={$uiSettings.inputSize}
						/>

						<Row>
							<SettingsSwitch
								id="otaEnabled"
								bind:checked={$settings.otaEnabled}
								label="{$_('section.settings.otaUpdates')} ({$_('restartRequired')})"
								size={$uiSettings.inputSize}
							/>
							<SettingsSwitch
								id="mdnsEnabled"
								bind:checked={$settings.mdnsEnabled}
								label="{$_('section.settings.enableMdns')} ({$_('restartRequired')})"
								size={$uiSettings.inputSize}
							/>
							<SettingsSwitch
								id="httpAuthEnabled"
								bind:checked={$settings.httpAuthEnabled}
								label="{$_('section.settings.httpAuthEnabled')} ({$_('restartRequired')})"
								size={$uiSettings.inputSize}
							/>
						</Row>
					</ToggleHeader>
				</Row>

				<Row>
					<Col class="d-flex justify-content-end">
						<Button on:click={handleReset} color="secondary">{$_('button.reset')}</Button>
						<div class="mx-2"></div>
						<Button color="primary">{$_('button.save')}</Button>
					</Col>
				</Row>
			</Form>
		</CardBody>
	</Card>
</Col>
