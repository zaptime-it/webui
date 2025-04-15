<script lang="ts">
	import { SettingsSwitch } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row, Col } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { DataSourceType } from '$lib/types/dataSource';
	import { onMount } from 'svelte';
	import MultiSelect from 'svelte-multiselect';
	export let settings;
	export let isOpen = false;

	let availableCurrencies: string[] = [];
	let prevLnbitsEnabled: boolean;

	function updateCurrencies(enabled: boolean) {
		if (enabled) {
			fetch(`https://${$settings.lnbitsInstance}/api/v1/currencies`)
				.then((res) => res.json())
				.then((data) => {
					availableCurrencies = data;
				});
		} else {
			// Remove any currencies from actCurrencies that aren't in availableCurrencies
			$settings.actCurrencies = $settings.actCurrencies.filter((curr: string) =>
				$settings.availableCurrencies.includes(curr)
			);
			availableCurrencies = $settings.availableCurrencies;
		}
	}

	let activeCurrencies: { label: string; value: string }[] = [];

	onMount(() => {
		prevLnbitsEnabled = $settings.lnbitsEnabled;
		updateCurrencies($settings.lnbitsEnabled);
	});

	$: {
		if (prevLnbitsEnabled !== $settings.lnbitsEnabled) {
			prevLnbitsEnabled = $settings.lnbitsEnabled;
			updateCurrencies($settings.lnbitsEnabled);
		}
		if (!activeCurrencies.length) {
			activeCurrencies = $settings.actCurrencies;
		} else {
			$settings.actCurrencies = activeCurrencies;
		}
	}
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
				<Col>
					<MultiSelect
						options={availableCurrencies}
						bind:value={activeCurrencies}
						placeholder={$_('section.settings.currencies')}
						--sms-options-bg="var(--bs-body-bg, #212529)"
					/>
				</Col>
			</Row>
		{/if}
	</ToggleHeader>
</Row>
