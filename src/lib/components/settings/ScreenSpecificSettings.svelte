<script lang="ts">
	import { SettingsSwitch } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row, Col } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { DataSourceType } from '$lib/types/dataSource';

	export let settings;
	export let isOpen = false;
</script>

<Row>
	<ToggleHeader
		header={$_('section.settings.section.screenSettings')}
		bind:isOpen
		defaultOpen={true}
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
		{#if $settings.actCurrencies && $settings.dataSource == DataSourceType.BTCLOCK_SOURCE}
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
