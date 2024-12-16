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
		FormText,
		Input,
		InputGroup,
		InputGroupText,
		Label,
		Tooltip,
		Row
	} from '@sveltestrap/sveltestrap';

	import EyeIcon from 'svelte-bootstrap-icons/lib/Eye.svelte';
	import EyeSlashIcon from 'svelte-bootstrap-icons/lib/EyeSlash.svelte';

	import { derived } from 'svelte/store';
	import ToggleHeader from '../components/ToggleHeader.svelte';

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

	const checkValidNostrPubkey = (key) => {
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
							<Col md="6" xl="12" xxl="6">
								<Input
									id="stealFocus"
									bind:checked={$settings.stealFocus}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.StealFocusOnNewBlock')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="mcapBigChar"
									bind:checked={$settings.mcapBigChar}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.useBigCharsMcap')}
								/>
							</Col>

							<Col md="6" xl="12" xxl="6">
								<Input
									id="useBlkCountdown"
									bind:checked={$settings.useBlkCountdown}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.useBlkCountdown')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="useSatsSymbol"
									bind:checked={$settings.useSatsSymbol}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.useSatsSymbol')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="suffixPrice"
									bind:checked={$settings.suffixPrice}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.suffixPrice')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									disabled={!$settings.suffixPrice}
									id="mowMode"
									bind:checked={$settings.mowMode}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.mowMode')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									disabled={!$settings.suffixPrice}
									id="suffixShareDot"
									bind:checked={$settings.suffixShareDot}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.suffixShareDot')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="verticalDesc"
									bind:checked={$settings.verticalDesc}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.verticalDesc')}
								/>
							</Col>

							{#if !$settings.actCurrencies}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="fetchEurPrice"
										bind:checked={$settings.fetchEurPrice}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label="{$_('section.settings.fetchEuroPrice')} ({$_('restartRequired')})"
									/>
								</Col>
							{/if}
						</Row>
						<Row>
							<h5>{$_('section.settings.screens')}</h5>
							{#if $settings.screens}
								{#each $settings.screens as s}
									<Col md="6" xl="12" xxl="6">
										<Input
											id="screens_{s.id}"
											bind:checked={s.enabled}
											type="switch"
											bsSize={$uiSettings.inputSize}
											label={s.name}
										/>
									</Col>
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
						<Row>
							<Label md={6} for="textColor" size={$uiSettings.inputSize}
								>{$_('section.settings.textColor', { default: 'Text color' })}</Label
							>
							<Col md="6">
								<Input
									type="select"
									bind:value={textColor}
									name="select"
									id="textColor"
									on:change={setTextColor}
									bsSize={$uiSettings.inputSize}
									class={$uiSettings.selectClass}
								>
									<option value="0">{$_('colors.black')} on {$_('colors.white')}</option>
									<option value="1">{$_('colors.white')} on {$_('colors.black')}</option>
								</Input>
							</Col>
						</Row>

						<Row>
							<Label md={6} for="timePerScreen" size={$uiSettings.inputSize}
								>{$_('section.settings.timePerScreen')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="number"
										id="timePerScreen"
										min={1}
										step="1"
										required
										bind:value={$settings.timePerScreen}
									/>
									<InputGroupText>{$_('time.minutes')}</InputGroupText>
								</InputGroup>
							</Col>
						</Row>
						<Row>
							<Label md={6} for="fullRefreshMin" size={$uiSettings.inputSize}
								>{$_('section.settings.fullRefreshEvery')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="number"
										id="fullRefreshMin"
										min={1}
										step="1"
										required
										bind:value={$settings.fullRefreshMin}
									/>
									<InputGroupText>{$_('time.minutes')}</InputGroupText>
								</InputGroup>
							</Col>
						</Row>
						<Row>
							<Label md={6} for="minSecPriceUpd" size={$uiSettings.inputSize}
								>{$_('section.settings.timeBetweenPriceUpdates')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="number"
										id="minSecPriceUpd"
										min={1}
										step="1"
										bind:value={$settings.minSecPriceUpd}
									/>
									<InputGroupText>{$_('time.seconds')}</InputGroupText>
								</InputGroup>
								<FormText>{$_('section.settings.shortAmountsWarning')}</FormText>
							</Col>
						</Row>
						<Row>
							<Label md={6} for="ledBrightness" size={$uiSettings.inputSize}
								>{$_('section.settings.ledBrightness')}</Label
							>
							<Col md="6">
								<Input
									type="range"
									name="ledBrightness"
									id="ledBrightness"
									bind:value={$settings.ledBrightness}
									min={0}
									max={255}
									step={1}
								/>
							</Col>
						</Row>
						{#if $settings.hasFrontlight && !$settings.flDisable}
							<Row>
								<Label md={6} for="flMaxBrightness" size={$uiSettings.inputSize}
									>{$_('section.settings.flMaxBrightness')}</Label
								>
								<Col md="6">
									<Input
										type="range"
										name="flMaxBrightness"
										id="flMaxBrightness"
										bind:value={$settings.flMaxBrightness}
										on:change={onFlBrightnessChange}
										min={0}
										max={4095}
										step={1}
									/>
								</Col>
							</Row>
							<Row>
								<Label md={6} for="flEffectDelay" size={$uiSettings.inputSize}
									>{$_('section.settings.flEffectDelay')}</Label
								>
								<Col md="6">
									<Input
										type="range"
										name="flEffectDelay"
										id="flEffectDelay"
										bind:value={$settings.flEffectDelay}
										min={5}
										max={300}
										step={1}
									/>
								</Col>
							</Row>
						{/if}
						{#if !$settings.flDisable && $settings.hasLightLevel}
							<Row>
								<Label md={6} for="luxLightToggle" size={$uiSettings.inputSize}
									>{$_('section.settings.luxLightToggle')} ({$settings.luxLightToggle})</Label
								>
								<Col md="6">
									<Input
										type="range"
										name="luxLightToggle"
										id="luxLightToggle"
										bind:value={$settings.luxLightToggle}
										min={0}
										max={1000}
										step={1}
									/>
									<FormText>{$_('section.settings.luxLightToggleText')}</FormText>
								</Col>
							</Row>
						{/if}
						<Row>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="ledTestOnPower"
									bind:checked={$settings.ledTestOnPower}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.ledPowerOnTest')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="ledFlashOnUpd"
									bind:checked={$settings.ledFlashOnUpd}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.ledFlashOnBlock')}
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="disableLeds"
									bind:checked={$settings.disableLeds}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label={$_('section.settings.disableLeds')}
								/>
							</Col>
							{#if $settings.hasFrontlight}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="flDisable"
										bind:checked={$settings.flDisable}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label={$_('section.settings.flDisable')}
									/>
								</Col>
							{/if}
							{#if $settings.hasFrontlight && !$settings.flDisable}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="flAlwaysOn"
										bind:checked={$settings.flAlwaysOn}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label={$_('section.settings.flAlwaysOn')}
									/>
								</Col>
								<Col md="6" xl="12" xxl="6">
									<Input
										id="flFlashOnUpd"
										bind:checked={$settings.flFlashOnUpd}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label={$_('section.settings.flFlashOnUpd')}
									/>
								</Col>
								<Col md="6" xl="12" xxl="6">
									<Input
										id="flOffWhenDark"
										bind:checked={$settings.flOffWhenDark}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label={$_('section.settings.flOffWhenDark')}
									/>
								</Col>
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader
						header={$_('section.settings.section.dataSource')}
						isOpen={dataSourceIsOpen}
					>
						<Row>
							<Label md={6} for="mempoolInstance" size="sm"
								>{$_('section.settings.mempoolnstance')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="text"
										bind:value={$settings.mempoolInstance}
										name="mempoolInstance"
										id="mempoolInstance"
										disabled={$settings.ownDataSource}
										bsSize="sm"
										required
									></Input>
									<InputGroupText>
										<Input
											addon
											type="checkbox"
											bind:checked={$settings.mempoolSecure}
											disabled={$settings.ownDataSource}
											bsSize={$uiSettings.inputSize}
										/>
										HTTPS
									</InputGroupText>
								</InputGroup>
								<FormText>{$_('section.settings.mempoolInstanceHelpText')}</FormText>
							</Col>
						</Row>
						<Row>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="ownDataSource"
									bind:checked={$settings.ownDataSource}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label="{$_('section.settings.ownDataSource')} ({$_('restartRequired')})"
								/>
							</Col>
							{#if $settings.nostrRelay}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="useNostr"
										bind:checked={$settings.useNostr}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label="{$_('section.settings.useNostr')} ({$_('restartRequired')})"
									></Input>
									<Tooltip target="useNostr" placement="left">
										{$_('section.settings.useNostrTooltip')}
									</Tooltip>
								</Col>
							{/if}
							{#if 'stagingSource' in $settings}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="stagingSource"
										bind:checked={$settings.stagingSource}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label="{$_('section.settings.stagingSource')} ({$_('restartRequired')})"
									/>
								</Col>
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader
						header={$_('section.settings.section.extraFeatures')}
						isOpen={extraFeaturesIsOpen}
					>
						{#if $settings.bitaxeEnabled}
							<Row>
								<Label md={6} for="bitaxeHostname" size={$uiSettings.inputSize}
									>{$_('section.settings.bitaxeHostname')}</Label
								>
								<Col md="6">
									<InputGroup size={$uiSettings.inputSize}>
										<Input
											type="text"
											bind:value={$settings.bitaxeHostname}
											name="bitaxeHostname"
											valid={validBitaxe}
											id="bitaxeHostname"
											required
										></Input>
										<Button type="button" color="success" on:click={testBitaxe}
											>{$_('test', { default: 'Test' })}</Button
										>
									</InputGroup>
								</Col>
							</Row>
						{/if}
						{#if $settings.miningPoolStatsEnabled}
							<Row>
								<Label md={6} for="miningPoolName" size={$uiSettings.inputSize}
									>{$_('section.settings.miningPoolName')}</Label
								>
								<Col md="6">
									<Input
										type="text"
										bind:value={$settings.miningPoolName}
										name="miningPoolName"
										id="miningPoolName"
										bsSize={$uiSettings.inputSize}
										required
										minlength="64"
									></Input>
								</Col>
							</Row>
							<Row>
								<Label md={6} for="miningPoolUser" size={$uiSettings.inputSize}
									>{$_('section.settings.miningPoolUser')}</Label
								>
								<Col md="6">
									<Input
										type="text"
										bind:value={$settings.miningPoolUser}
										name="miningPoolUser"
										id="miningPoolUser"
										bsSize={$uiSettings.inputSize}
										required
										minlength="64"
									></Input>
								</Col>
							</Row>
						{/if}
						{#if 'nostrZapNotify' in $settings && $settings['nostrZapNotify']}
							<Row>
								<Label md={6} for="nostrZapPubkey" size={$uiSettings.inputSize}
									>{$_('section.settings.nostrZapPubkey')}</Label
								>
								<Col md="6">
									<Input
										type="text"
										bind:value={$settings.nostrZapPubkey}
										name="nostrZapPubkey"
										id="nostrZapPubkey"
										on:change={() => checkValidNostrPubkey('nostrZapPubkey')}
										invalid={!isValidHexPubKey($settings.nostrZapPubkey)}
										bsSize={$uiSettings.inputSize}
										required
										minlength="64"
									></Input>
									{#if !isValidHexPubKey($settings.nostrZapPubkey)}
										<FormText>{$_('section.settings.invalidNostrPubkey')}</FormText>
									{/if}
								</Col>
							</Row>
						{/if}
						{#if $settings.useNostr}
							<Row>
								<Label md={6} for="nostrPubKey" size={$uiSettings.inputSize}
									>{$_('section.settings.nostrPubKey')}</Label
								>
								<Col md="6">
									<Input
										type="text"
										bind:value={$settings.nostrPubKey}
										name="nostrPubKey"
										id="nostrPubKey"
										on:change={() => checkValidNostrPubkey('nostrPubKey')}
										invalid={!isValidHexPubKey($settings.nostrPubKey)}
										bsSize={$uiSettings.inputSize}
									></Input>
									{#if !isValidHexPubKey($settings.nostrPubKey)}
										<FormText>{$_('section.settings.invalidNostrPubkey')}</FormText>
									{/if}
								</Col>
							</Row>
						{/if}
						{#if 'nostrZapNotify' in $settings || $settings.useNostr}
							<Row>
								<Label md={6} for="nostrRelay" size={$uiSettings.inputSize}
									>{$_('section.settings.nostrRelay')}</Label
								>
								<Col md="6">
									<InputGroup size={$uiSettings.inputSize}>
										<Input
											type="text"
											bind:value={$settings.nostrRelay}
											name="nostrRelay"
											id="nostrRelay"
											valid={validNostrRelay}
											bsSize={$uiSettings.inputSize}
											required
										></Input>
										<Button type="button" color="success" on:click={testNostrRelay}
											>{$_('test', { default: 'Test' })}</Button
										>
									</InputGroup>
								</Col>
							</Row>
						{/if}
						<Row>
							{#if 'bitaxeEnabled' in $settings}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="bitaxeEnabled"
										bind:checked={$settings.bitaxeEnabled}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label="{$_('section.settings.bitaxeEnabled')} ({$_('restartRequired')})"
									/>
								</Col>
							{/if}
							{#if 'nostrZapNotify' in $settings}
								<Col md="6" xl="12" xxl="6">
									<Input
										id="nostrZapNotify"
										bind:checked={$settings.nostrZapNotify}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label="{$_('section.settings.nostrZapNotify')} ({$_('restartRequired')})"
									/>
								</Col>
								<Col md="6" xl="12" xxl="6">
									<Input
										id="ledFlashOnZap"
										bind:checked={$settings.ledFlashOnZap}
										type="switch"
										bsSize={$uiSettings.inputSize}
										label={$_('section.settings.ledFlashOnZap')}
									/>
								</Col>
								{#if $settings.hasFrontlight && !$settings.flDisable}
									<Col md="6" xl="12" xxl="6">
										<Input
											id="flFlashOnZap"
											bind:checked={$settings.flFlashOnZap}
											type="switch"
											bsSize={$uiSettings.inputSize}
											label={$_('section.settings.flFlashOnZap')}
										/>
									</Col>
								{/if}
							{/if}
						</Row>
					</ToggleHeader>
				</Row><Row>
					<ToggleHeader header={$_('section.settings.section.system')} isOpen={systemIsOpen}>
						<Row>
							<Label md={6} for="tzOffset" size={$uiSettings.inputSize}
								>{$_('section.settings.timezoneOffset')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="number"
										step="1"
										name="tzOffset"
										id="tzOffset"
										required
										bind:value={$settings.tzOffset}
									/>
									<InputGroupText>{$_('time.minutes')}</InputGroupText>
									<Button type="button" color="info" on:click={getTzOffsetFromSystem}
										>{$_('auto-detect')}</Button
									>
								</InputGroup>
								<FormText>{$_('section.settings.tzOffsetHelpText')}</FormText>
							</Col>
						</Row>
						{#if $settings.httpAuthEnabled}
							<Row>
								<Label md={6} for="httpAuthUser" size="sm"
									>{$_('section.settings.httpAuthUser')}</Label
								>
								<Col md="6">
									<Input
										type="text"
										bind:value={$settings.httpAuthUser}
										name="httpAuthUser"
										id="httpAuthUser"
										bsSize="sm"
										required
									></Input>
								</Col>
							</Row>
							<Row>
								<Label md={6} for="httpAuthPass" size="sm"
									>{$_('section.settings.httpAuthPass')}</Label
								>
								<Col md="6">
									<InputGroup size={$uiSettings.inputSize}>
										<Input
											type={showPassword ? 'text' : 'password'}
											bind:value={$settings.httpAuthPass}
											name="httpAuthPass"
											id="httpAuthPass"
											bsSize="sm"
											required
										></Input>
										<Button
											type="button"
											on:click={() => (showPassword = !showPassword)}
											color={showPassword ? 'success' : 'danger'}
											>{#if !showPassword}<EyeIcon></EyeIcon>{:else}<EyeSlashIcon
												></EyeSlashIcon>{/if}</Button
										>
									</InputGroup>
									<FormText>{$_('section.settings.httpAuthText')}</FormText>
								</Col>
							</Row>
						{/if}
						<Row>
							<Label md={6} for="hostnamePrefix" size={$uiSettings.inputSize}
								>{$_('section.settings.hostnamePrefix')}</Label
							>
							<Col md="6">
								<Input
									type="text"
									bind:value={$settings.hostnamePrefix}
									name="hostnamePrefix"
									id="hostnamePrefix"
									bsSize={$uiSettings.inputSize}
									required
									minlength="1"
								></Input>
							</Col>
						</Row>
						<Row>
							<Label md={6} for="wifiTxPower" size={$uiSettings.inputSize}
								>{$_('section.settings.wifiTxPower', { default: 'WiFi Tx Power' })}</Label
							>
							<Col md="6">
								<Input
									type="select"
									bind:value={$settings.txPower}
									name="select"
									id="wifiTxPower"
									bsSize={$uiSettings.inputSize}
									class={$uiSettings.selectClass}
								>
									{#each wifiTxPowerMap as [key, value]}
										<option {value}>{key}</option>
									{/each}
								</Input>
								<FormText>{$_('section.settings.wifiTxPowerText')}</FormText>
							</Col>
						</Row>
						<Row>
							<Label md={6} for="wpTimeout" size={$uiSettings.inputSize}
								>{$_('section.settings.wpTimeout')}</Label
							>
							<Col md="6">
								<InputGroup size={$uiSettings.inputSize}>
									<Input
										type="number"
										id="wpTimeout"
										min={1}
										step="1"
										bind:value={$settings.wpTimeout}
										required
									/>
									<InputGroupText>{$_('time.seconds')}</InputGroupText>
								</InputGroup>
							</Col>
						</Row>
						<Row>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="otaEnabled"
									bind:checked={$settings.otaEnabled}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label="{$_('section.settings.otaUpdates')} ({$_('restartRequired')})"
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="mdnsEnabled"
									bind:checked={$settings.mdnsEnabled}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label="{$_('section.settings.enableMdns')} ({$_('restartRequired')})"
								/>
							</Col>
							<Col md="6" xl="12" xxl="6">
								<Input
									id="httpAuthEnabled"
									bind:checked={$settings.httpAuthEnabled}
									type="switch"
									bsSize={$uiSettings.inputSize}
									label="{$_('section.settings.httpAuthEnabled')} ({$_('restartRequired')})"
								/>
							</Col>
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
