<script lang="ts">
	import { SettingsInput, SettingsSwitch, SettingsSelect } from '$lib/components';
	import * as m from '$lib/paraglide/messages';
	import { Row, Button, Col } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { isValidHexPubKey, getPubKey, isValidNpub } from '$lib';
	import { toastStore } from '$lib/stores/toast';
	import type { PartialSettings } from '$lib/types/settings';

	interface Props {
		settings: PartialSettings;
		isOpen?: boolean;
		miningPoolMap: Map<string, string>;
	}

	let { settings, isOpen = $bindable(false), miningPoolMap }: Props = $props();

	let validBitaxe = $state(false);
	let validLocalPool = $state(false);
	const testBitaxe = async () => {
		try {
			const response = await fetch(`http://${$settings.bitaxeHostname}/api/system/info`);

			if (!response.ok) {
				toastStore.show({
					color: 'danger',
					text: `Failed to connect to Bitaxe HTTP error! status: ${response.status}`
				});
				validBitaxe = false;
				throw new Error();
			}

			const systemInfo = await response.json();
			toastStore.show({
				color: 'success',
				text: `Connected to Bitaxe ${systemInfo.ASICModel} (Board version ${systemInfo.boardVersion}) running firmware ${systemInfo.version}.\r\nCurrent hashrate ${Math.round(systemInfo.hashRate)} GH/s`
			});
			validBitaxe = true;
		} catch (error) {
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				toastStore.show({
					color: 'danger',
					text: `Failed to connect to Bitaxe, make sure you are connected to the same network.`
				});
			}
			console.error('Failed to fetch Bitaxe system info:', error);
			validBitaxe = false;
		}
	};

	const checkValidNostrPubkey = (key: string) => {
		$settings[key] = $settings[key].trim();
		if (isValidNpub($settings[key])) {
			toastStore.show({
				color: 'info',
				text: m['section.settings.convertingValidNpub']()
			});
		}

		let ret = getPubKey($settings[key]);
		if (ret) $settings[key] = ret;
	};

	let poolOptions = $derived(
		($settings.availablePools || []).map((pool: string): [string, string] => [
			miningPoolMap.get(pool) || pool,
			pool
		])
	);

	const testLocalPool = async () => {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 1000);

			const response = await fetch(
				`http://${$settings.localPoolHost}/api/client/${$settings.miningPoolUser}`,
				{ signal: controller.signal }
			);
			clearTimeout(timeoutId);

			if (!response.ok) {
				toastStore.show({
					color: 'danger',
					text: `Failed to connect to local pool! status: ${response.status}`
				});
				validLocalPool = false;
				throw new Error();
			}

			const poolInfo = await response.json();
			toastStore.show({
				color: 'success',
				text: `Can connect to local public pool, ${poolInfo.workersCount} workers`
			});
			validLocalPool = true;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				toastStore.show({
					color: 'danger',
					text: `Connection to local pool timed out after 1 second`
				});
			} else {
				toastStore.show({
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
		header={m['section.settings.section.extraFeatures']()}
		bind:isOpen
		defaultOpen={false}
	>
		<!--- Time based do not disturb settings -->
		<SettingsSwitch
			id="timeBasedDnd"
			label={m['section.settings.timeBasedDnd']()}
			bind:checked={$settings.dnd.dndTimeEnabled}
			size={$uiSettings.inputSize}
		/>
		{#if $settings.dnd.dndTimeEnabled}
			<Row>
				<Col>
					<SettingsInput
						id="dndStartHour"
						type="number"
						min="0"
						max="23"
						label={m['section.settings.dndStartHour']()}
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
						label={m['section.settings.dndStartMinute']()}
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
						label={m['section.settings.dndEndHour']()}
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
						label={m['section.settings.dndEndMinute']()}
						bind:value={$settings.dnd.endMinute}
						size={$uiSettings.inputSize}
					/>
				</Col>
			</Row>
		{/if}

		<!-- Bitaxe Settings -->
		{#if 'bitaxeEnabled' in $settings}
			<Row class="mb-3">
				<Col>
					<h5>Bitaxe</h5>
					<SettingsSwitch
						id="bitaxeEnabled"
						bind:checked={$settings.bitaxeEnabled}
						label="{m['section.settings.bitaxeEnabled']()} ({m['restartRequired']()})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.bitaxeEnabled}
						<SettingsInput
							id="bitaxeHostname"
							label={m['section.settings.bitaxeHostname']()}
							bind:value={$settings.bitaxeHostname}
							required={true}
							valid={validBitaxe}
							size={$uiSettings.inputSize}
						>
							<Button type="button" color="success" onclick={testBitaxe}>Test</Button>
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
						label="{m['section.settings.miningPoolStats']()} ({m['restartRequired']()})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.miningPoolStats}
						<SettingsSelect
							id="miningPoolName"
							label={m['section.settings.miningPoolName']()}
							bind:value={$settings.miningPoolName}
							options={poolOptions}
							size={$uiSettings.inputSize}
							selectClass={$uiSettings.selectClass}
						/>
						{#if $settings.miningPoolName === 'local_public_pool'}
							<SettingsInput
								id="localPoolHost"
								label="Local Pool Endpoint"
								bind:value={$settings.localPoolHost}
								placeholder="umbrel.local:2019"
								required={true}
								valid={validLocalPool}
								size={$uiSettings.inputSize}
							>
								<Button type="button" color="success" onclick={testLocalPool}>Test</Button>
							</SettingsInput>
						{/if}
						<SettingsInput
							id="miningPoolUser"
							label={m['section.settings.miningPoolUser']()}
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
						label={m['section.settings.nostrRelay']()}
						bind:value={$settings.nostrRelay}
						required={true}
						size={$uiSettings.inputSize}
					/>
					<SettingsSwitch
						id="nostrZapNotify"
						bind:checked={$settings.nostrZapNotify}
						label="{m['section.settings.nostrZapNotify']()} ({m['restartRequired']()})"
						size={$uiSettings.inputSize}
						col={{ md: '12', xl: '12', xxl: '12' }}
					/>
					{#if $settings.nostrZapNotify}
						<Row>
							<SettingsSwitch
								id="ledFlashOnZap"
								bind:checked={$settings.ledFlashOnZap}
								label={m['section.settings.ledFlashOnZap']()}
								size={$uiSettings.inputSize}
							/>
							{#if $settings.hasFrontlight && !$settings.flDisable}
								<SettingsSwitch
									id="flFlashOnZap"
									bind:checked={$settings.flFlashOnZap}
									label={m['section.settings.flFlashOnZap']()}
									size={$uiSettings.inputSize}
								/>
							{/if}
						</Row>
						<Row>
							<SettingsSwitch
								id="screenRestoreZap"
								bind:checked={$settings.scrnRestoreZap}
								label={m['section.settings.screenRestoreZap']?.({
									setting: m['section.settings.timePerScreen']()
								}) ?? 'Restore previous screen state after zap'}
								size={$uiSettings.inputSize}
								col={{ md: '12', xl: '12', xxl: '12' }}
							/>
						</Row>
						<SettingsInput
							id="nostrZapPubkey"
							label={m['section.settings.nostrZapPubkey']()}
							bind:value={$settings.nostrZapPubkey}
							required={true}
							minlength="64"
							invalid={!isValidHexPubKey($settings.nostrZapPubkey)}
							helpText={!isValidHexPubKey($settings.nostrZapPubkey)
								? m['section.settings.invalidNostrPubkey']()
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
