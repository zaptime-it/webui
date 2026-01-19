<script lang="ts">
	import { SettingsSwitch } from '$lib/components';
	import * as m from '$lib/paraglide/messages';
	import { Row, Col } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { DataSourceType } from '$lib/types/dataSource';

	export let settings;
	export let isOpen = false;
</script>

<Row>
	<ToggleHeader
		header={m['section.settings.section.screenSettings']()}
		bind:isOpen
		defaultOpen={true}
	>
		<Row>
			<SettingsSwitch
				id="stealFocus"
				bind:checked={$settings.stealFocus}
				label={m['section.settings.StealFocusOnNewBlock']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
			<SettingsSwitch
				id="mcapBigChar"
				bind:checked={$settings.mcapBigChar}
				label={m['section.settings.useBigCharsMcap']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
			<SettingsSwitch
				id="useBlkCountdown"
				bind:checked={$settings.useBlkCountdown}
				label={m['section.settings.useBlkCountdown']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
			<SettingsSwitch
				id="useSatsSymbol"
				bind:checked={$settings.useSatsSymbol}
				label={m['section.settings.useSatsSymbol']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
			<SettingsSwitch
				id="suffixPrice"
				bind:checked={$settings.suffixPrice}
				label={m['section.settings.suffixPrice']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
			<SettingsSwitch
				id="mowMode"
				bind:checked={$settings.mowMode}
				label={m['section.settings.mowMode']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
				disabled={!$settings.suffixPrice}
			/>
			<SettingsSwitch
				id="suffixShareDot"
				bind:checked={$settings.suffixShareDot}
				label={m['section.settings.suffixShareDot']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
				disabled={!$settings.suffixPrice}
			/>
			<SettingsSwitch
				id="verticalDesc"
				bind:checked={$settings.verticalDesc}
				label={m['section.settings.verticalDesc']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>

			{#if !$settings.actCurrencies}
				<SettingsSwitch
					id="fetchEurPrice"
					bind:checked={$settings.fetchEurPrice}
					label="{m['section.settings.fetchEuroPrice']()} ({m['restartRequired']()})"
					size={$uiSettings.inputSize}
					col={{ md: '6', xl: '12', xxl: '6' }}
				/>
			{/if}

			<SettingsSwitch
				id="blockFeeDec"
				bind:checked={$settings.blockFeeDec}
				label={m['section.settings.blockFeeDec']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>

			<SettingsSwitch
				id="supplyPercent"
				bind:checked={$settings.supplyPercent}
				label={m['section.settings.supplyPercent']()}
				size={$uiSettings.inputSize}
				col={{ md: '6', xl: '12', xxl: '6' }}
			/>
		</Row>
		<Row>
			<h5>{m['section.settings.screens']()}</h5>
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
		{#if $settings.actCurrencies && ($settings.dataSource == DataSourceType.BTCLOCK_SOURCE || $settings.dataSource == DataSourceType.CUSTOM_SOURCE || $settings.dataSource == DataSourceType.THIRD_PARTY_SOURCE)}
			<Row>
				<h5>{m['section.settings.currencies']()}</h5>
				<small>{m['restartRequired']()}</small>
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
								/>
								<label class="form-check-label" for="currency_{c}">{c}</label>
							</div>
						</Col>
					{/each}
				{/if}
			</Row>
		{/if}
	</ToggleHeader>
</Row>
