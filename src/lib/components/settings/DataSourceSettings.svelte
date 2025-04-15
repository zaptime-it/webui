<script lang="ts">
	import { SettingsInput, SettingsSwitch } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row, Col, FormGroup, Input, InputGroupText } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { isValidHexPubKey, getPubKey, isValidNpub } from '$lib';
	import { createEventDispatcher } from 'svelte';
	import { DataSourceType } from '$lib/types/dataSource';

	const dispatch = createEventDispatcher();
	export let settings;
	export let isOpen = false;

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
</script>

<Row>
	<ToggleHeader header={$_('section.settings.section.dataSource')} bind:isOpen defaultOpen={false}>
		<Row>
			<Col>
				<h5>Data Source</h5>
				<FormGroup>
					<Row>
						<Col xs="12" xl="6" class="mb-2">
							<Input
								type="radio"
								id="btclock_source"
								name="dataSource"
								bind:group={$settings.dataSource}
								value={DataSourceType.BTCLOCK_SOURCE}
								label={$_('section.settings.dataSource.btclock')}
							/>
						</Col>
						<Col xs="12" xl="6" class="mb-2">
							<Input
								type="radio"
								id="third_party_source"
								name="dataSource"
								bind:group={$settings.dataSource}
								value={DataSourceType.THIRD_PARTY_SOURCE}
								label={$_('section.settings.dataSource.thirdParty')}
							/>
						</Col>
						{#if $settings.nostrRelay}
							<Col xs="12" xl="6" class="mb-2">
								<Input
									type="radio"
									id="nostr_source"
									name="dataSource"
									bind:group={$settings.dataSource}
									value={DataSourceType.NOSTR_SOURCE}
									label={$_('section.settings.dataSource.nostr')}
								/>
							</Col>
						{/if}
						<Col xs="12" xl="6" class="mb-2">
							<Input
								type="radio"
								id="custom_source"
								name="dataSource"
								bind:group={$settings.dataSource}
								value={DataSourceType.CUSTOM_SOURCE}
								label={$_('section.settings.dataSource.custom')}
							/>
						</Col>
					</Row>
				</FormGroup>
			</Col>
		</Row>

		{#if $settings.dataSource === DataSourceType.THIRD_PARTY_SOURCE}
			<SettingsInput
				id="mempoolInstance"
				label={$_('section.settings.mempoolnstance')}
				bind:value={$settings.mempoolInstance}
				required={true}
				size={$uiSettings.inputSize}
			>
				<InputGroupText>
					<Input
						type="checkbox"
						bind:checked={$settings.mempoolSecure}
						bsSize={$uiSettings.inputSize}
					/>
					HTTPS
				</InputGroupText>
			</SettingsInput>
		{/if}

		{#if $settings.dataSource === DataSourceType.NOSTR_SOURCE}
			<SettingsInput
				id="nostrRelay"
				label={$_('section.settings.nostrRelay')}
				bind:value={$settings.nostrRelay}
				required={true}
				size={$uiSettings.inputSize}
			/>
			<SettingsInput
				id="nostrPubKey"
				label={$_('section.settings.nostrPubKey')}
				bind:value={$settings.nostrPubKey}
				required={true}
				minlength="64"
				invalid={!isValidHexPubKey($settings.nostrPubKey)}
				helpText={!isValidHexPubKey($settings.nostrPubKey)
					? $_('section.settings.invalidNostrPubkey')
					: undefined}
				size={$uiSettings.inputSize}
				onChange={() => checkValidNostrPubkey('nostrPubKey')}
				onInput={() => checkValidNostrPubkey('nostrPubKey')}
			/>
		{/if}

		{#if $settings.dataSource === DataSourceType.CUSTOM_SOURCE}
			<SettingsInput
				id="ceEndpoint"
				label={$_('section.settings.ceEndpoint')}
				bind:value={$settings.ceEndpoint}
				required={true}
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="ceDisableSSL"
				bind:checked={$settings.ceDisableSSL}
				label={$_('section.settings.ceDisableSSL')}
				size={$uiSettings.inputSize}
			/>
		{/if}
		<Row>
			<SettingsSwitch
				id="lnbitsEnabled"
				bind:checked={$settings.lnbitsEnabled}
				label="{$_('section.settings.lnbitsEnabled')} ({$_('restartRequired')})"
				size={$uiSettings.inputSize}
			/>
		</Row>
		{#if $settings.lnbitsEnabled}
			<SettingsInput
				id="lnbitsInstance"
				label={$_('section.settings.lnbitsInstance')}
				bind:value={$settings.lnbitsInstance}
				required={true}
				size={$uiSettings.inputSize}
			>
				<InputGroupText>
					<Input
						type="checkbox"
						bind:checked={$settings.lnbitsHttps}
						bsSize={$uiSettings.inputSize}
					/>
					HTTPS
				</InputGroupText>
			</SettingsInput>
		{/if}
	</ToggleHeader>
</Row>
