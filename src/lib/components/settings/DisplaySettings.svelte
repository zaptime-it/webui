<script lang="ts">
	import { SettingsInput, SettingsSwitch, SettingsSelect } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { PUBLIC_BASE_URL } from '$lib/config';

	export let settings;
	export let isOpen = false;

	const onFlBrightnessChange = async () => {
		await fetch(`${PUBLIC_BASE_URL}/api/frontlight/brightness/${$settings.flMaxBrightness}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	};

	const setTextColor = () => {
		$settings.invertedColor = !$settings.invertedColor;
		$settings.fgColor = $settings.invertedColor ? 65535 : 0;
		$settings.bgColor = $settings.invertedColor ? 0 : 65535;
	};

	const textColorOptions: [string, boolean][] = [
		[$_('colors.black') + ' on ' + $_('colors.white'), false],
		[$_('colors.white') + ' on ' + $_('colors.black'), true]
	];
</script>

<Row>
	<ToggleHeader
		header={$_('section.settings.section.displaysAndLed')}
		bind:isOpen
		defaultOpen={false}
	>
		<SettingsSelect
			id="textColor"
			label={$_('section.settings.textColor')}
			bind:value={$settings.invertedColor}
			options={textColorOptions}
			size={$uiSettings.inputSize}
			on:change={setTextColor}
		/>

		<SettingsInput
			id="timePerScreen"
			label={$_('section.settings.timePerScreen')}
			bind:value={$settings.timePerScreen}
			type="number"
			min={1}
			step={1}
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
			step={1}
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
			step={1}
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
				on:change={onFlBrightnessChange}
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
</Row>
