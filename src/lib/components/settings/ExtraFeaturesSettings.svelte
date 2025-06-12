<script lang="ts">
	import { SettingsInput, SettingsSwitch, SettingsSelect } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row, Button, Col } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { isValidHexPubKey, getPubKey, isValidNpub } from '$lib';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let settings;
	export let isOpen = false;
	export let miningPoolMap: Map<string, string>;

	let validBitaxe = false;
	let validLocalPool = false;
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
		$settings[key] = $settings[key].trim();
		if (isValidNpub($settings[key])) {
			dispatch('showToast', {
				color: 'info',
				text: $_('section.settings.convertingValidNpub')
			});
		}

		let ret = getPubKey($settings[key]);
		if (ret) $settings[key] = ret;
	};

	$: poolOptions = ($settings.availablePools || []).map((pool: string): [string, string] => [
		miningPoolMap.get(pool) || pool,
		pool
	]);

	const testLocalPool = async () => {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 1000);

			const response = await fetch(
				`http://${$settings.localPoolEndpoint}/api/client/${$settings.miningPoolUser}`,
				{ signal: controller.signal }
			);
			clearTimeout(timeoutId);

			if (!response.ok) {
				dispatch('showToast', {
					color: 'danger',
					text: `Failed to connect to local pool! status: ${response.status}`
				});
				validLocalPool = false;
				throw new Error();
			}

			const poolInfo = await response.json();
			dispatch('showToast', {
				color: 'success',
				text: `Can connect to local public pool, ${poolInfo.workersCount} workers`
			});
			validLocalPool = true;
		} catch (error) {
			if (error.name === 'AbortError') {
				dispatch('showToast', {
					color: 'danger',
					text: `Connection to local pool timed out after 1 second`
				});
			} else {
				dispatch('showToast', {
					color: 'danger',
					text: `Failed to connect to local pool, check the endpoint and make sure you are connected to the same network.`
				});
			}
			console.error('Failed to fetch local pool info:', error);
			validLocalPool = false;
		}
	};
</script>

<Row>
	<ToggleHeader
		header={$_('section.settings.section.extraFeatures')}
		bind:isOpen
		defaultOpen={false}
	>
		<!--- Time based do not disturb settings -->
		<SettingsSwitch
			id="timeBasedDnd"
			label={$_('section.settings.timeBasedDnd')}
			bind:checked={$settings.dnd.timeBasedEnabled}
			size={$uiSettings.inputSize}
		/>
		{#if $settings.dnd.timeBasedEnabled}
			<Row>
				<Col>
					<SettingsInput
						id="dndStartHour"
						type="number"
						min="0"
						max="23"
						label={$_('section.settings.dndStartHour')}
						bind:value={$settings.dnd.startHour}
						size={$uiSettings.inputSize}
					/>
				</Col>
				<Col>
					<SettingsInput
						id="dndStartMinute"
						type="number"
						min="0"
						max="59"
						label={$_('section.settings.dndStartMinute')}
						bind:value={$settings.dnd.startMinute}
						size={$uiSettings.inputSize}
					/>
				</Col>
			</Row>
			<Row>
				<Col>
					<SettingsInput
						id="dndEndHour"
						type="number"
						min="0"
						max="23"
						label={$_('section.settings.dndEndHour')}
						bind:value={$settings.dnd.endHour}
						size={$uiSettings.inputSize}
					/>
				</Col>
				<Col>
					<SettingsInput
						id="dndEndMinute"
						type="number"
						min="0"
						max="59"
						label={$_('section.settings.dndEndMinute')}
						bind:value={$settings.dnd.endMinute}
						size={$uiSettings.inputSize}
					/>
				</Col>
			</Row>
		{/if}

		<!-- BitAxe Settings -->
		{#if 'bitaxeEnabled' in $settings}
			<Row class="mb-3">
				<Col>
					<h5>BitAxe</h5>
					<SettingsSwitch
						id="bitaxeEnabled"
						bind:checked={$settings.bitaxeEnabled}
						label="{$_('section.settings.bitaxeEnabled')} ({$_('restartRequired')})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.bitaxeEnabled}
						<SettingsInput
							id="bitaxeHostname"
							label={$_('section.settings.bitaxeHostname')}
							bind:value={$settings.bitaxeHostname}
							required={true}
							valid={validBitaxe}
							size={$uiSettings.inputSize}
						>
							<Button type="button" color="success" on:click={testBitaxe}>
								{$_('test', { default: 'Test' })}
							</Button>
						</SettingsInput>
					{/if}
				</Col>
			</Row>
		{/if}

		<!-- Mining Pool Settings -->
		{#if 'miningPoolStats' in $settings}
			<Row class="mb-3">
				<Col>
					<h5>Mining Pool stats</h5>
					<SettingsSwitch
						id="miningPoolStats"
						bind:checked={$settings.miningPoolStats}
						label="{$_('section.settings.miningPoolStats')} ({$_('restartRequired')})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.miningPoolStats}
						<SettingsSelect
							id="miningPoolName"
							label={$_('section.settings.miningPoolName')}
							bind:value={$settings.miningPoolName}
							options={poolOptions}
							size={$uiSettings.inputSize}
							selectClass={$uiSettings.selectClass}
						/>
						{#if $settings.miningPoolName === 'local_public_pool'}
							<SettingsInput
								id="localPoolEndpoint"
								label={$_('section.settings.localPoolEndpoint', { default: 'Local Pool Endpoint' })}
								bind:value={$settings.localPoolEndpoint}
								placeholder="umbrel.local:2019"
								required={true}
								valid={validLocalPool}
								size={$uiSettings.inputSize}
							>
								<Button type="button" color="success" on:click={testLocalPool}>
									{$_('test', { default: 'Test' })}
								</Button>
							</SettingsInput>
						{/if}
						<SettingsInput
							id="miningPoolUser"
							label={$_('section.settings.miningPoolUser')}
							bind:value={$settings.miningPoolUser}
							required={true}
							size={$uiSettings.inputSize}
						/>
					{/if}
				</Col>
			</Row>
		{/if}

		<!-- Nostr Settings -->
		{#if 'nostrZapNotify' in $settings}
			<Row class="mb-3">
				<Col>
					<h5>Nostr</h5>
					<SettingsInput
						id="nostrRelay"
						label={$_('section.settings.nostrRelay')}
						bind:value={$settings.nostrRelay}
						required={true}
						size={$uiSettings.inputSize}
					/>
					<SettingsSwitch
						id="nostrZapNotify"
						bind:checked={$settings.nostrZapNotify}
						label="{$_('section.settings.nostrZapNotify')} ({$_('restartRequired')})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.nostrZapNotify}
						<Row>
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
						</Row>
						<Row>
							<SettingsSwitch
								id="screenRestoreZap"
								bind:checked={$settings.scrnRestoreZap}
								label={$_('section.settings.screenRestoreZap', {
									default: 'Restore previous screen state after zap (Uses {setting} setting)',
									values: {
										setting: $_('section.settings.timePerScreen')
									}
								})}
								size={$uiSettings.inputSize}
								col={{ md: '12', xl: '12', xxl: '12' }}
							/>
						</Row>
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
							onInput={() => checkValidNostrPubkey('nostrZapPubkey')}
						/>
					{/if}
				</Col>
			</Row>
		{/if}
	</ToggleHeader>
</Row>
