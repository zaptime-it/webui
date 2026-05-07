<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import RangeField from '$lib/ui/RangeField.svelte';
	import ColorField from '$lib/ui/ColorField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { frontlightBrightness } from '$lib/api/client';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);

	const textColorOptions: [string, number][] = $derived([
		[`${m['colors.black']()} on ${m['colors.white']()}`, 0],
		[`${m['colors.white']()} on ${m['colors.black']()}`, 1]
	]);

	const fontOptions: [string, string][] = $derived(
		(data.availableFonts ?? []).map((font) => [
			((m as unknown as Record<string, (() => string) | undefined>)[`fonts.${font}`]?.() ??
				font.charAt(0).toUpperCase() + font.slice(1)) as string,
			font
		])
	);

	const onFlChange = () => {
		frontlightBrightness(data.flMaxBrightness).catch(() => {});
	};

	const onInvertedChange = () => {
		// value bound as number via select, coerce back to boolean
		// (0/1 -> false/true)
		data.invertedColor = Boolean(Number(data.invertedColor));
	};

	// `data.timerSeconds` is the canonical local cache (mirroring NVS),
	// `data.timePerScreen` is the WebUI-only display unit. When the user
	// edits the minutes input we mirror back to seconds so the dirty-
	// tracking and post-PATCH pristine snapshot stay self-consistent.
	// The conversion is derived from the just-edited `timePerScreen`
	// value — no hardcoded fallback. Both the firmware GET response and
	// `deriveTimePerScreen` in the store also derive from `timerSeconds`
	// (seconds is the single source of truth).
	const onTimePerScreenChange = () => {
		if (data.timePerScreen !== undefined) {
			data.timerSeconds = data.timePerScreen * 60;
		}
	};
</script>

<CollapseCard header={m['section.settings.section.displaysAndLed']()} bind:isOpen>
	<div class="space-y-2">
		<SelectField
			id="textColor"
			label={m['section.settings.textColor']()}
			bind:value={
				() => (data.invertedColor ? 1 : 0), (v) => (data.invertedColor = Boolean(Number(v)))
			}
			options={textColorOptions}
			onChange={onInvertedChange}
		/>

		<SelectField
			id="fontName"
			label={m['section.settings.fontName']()}
			bind:value={data.fontName}
			options={fontOptions}
		/>

		{#if 'digitFontPx' in data}
			<RangeField
				id="digitFontPx"
				label={m['section.settings.digitFontPx']()}
				bind:value={data.digitFontPx}
				min={80}
				max={220}
				step={2}
				helpText={m['section.settings.digitFontPxHelp']()}
			/>
		{/if}

		<NumberField
			id="timePerScreen"
			label={m['section.settings.timePerScreen']()}
			bind:value={data.timePerScreen}
			min={1}
			step={1}
			required
			suffix={m['time.minutes']()}
			onChange={onTimePerScreenChange}
		/>

		<NumberField
			id="fullRefreshMin"
			label={m['section.settings.fullRefreshEvery']()}
			bind:value={data.fullRefreshMin}
			min={1}
			step={1}
			required
			suffix={m['time.minutes']()}
		/>

		<NumberField
			id="minSecPriceUpd"
			label={m['section.settings.timeBetweenPriceUpdates']()}
			bind:value={data.minSecPriceUpd}
			min={1}
			step={1}
			suffix={m['time.seconds']()}
			helpText={m['section.settings.shortAmountsWarning']()}
		/>

		<RangeField
			id="ledBrightness"
			label={m['section.settings.ledBrightness']()}
			bind:value={data.ledBrightness}
			min={0}
			max={255}
		/>

		<ColorField
			id="blockFlashColor"
			label={m['section.settings.blockFlashColor']()}
			bind:value={data.blockFlashColor}
		/>

		{#if data.hasFrontlight && !data.flDisable}
			<RangeField
				id="flMaxBrightness"
				label={m['section.settings.flMaxBrightness']()}
				bind:value={data.flMaxBrightness}
				min={0}
				max={4095}
				onChange={onFlChange}
			/>

			<RangeField
				id="flEffectDelay"
				label={m['section.settings.flEffectDelay']()}
				bind:value={data.flEffectDelay}
				min={5}
				max={300}
			/>
		{/if}

		{#if !data.flDisable && data.hasLightLevel}
			<RangeField
				id="luxLightToggle"
				label={`${m['section.settings.luxLightToggle']()} (${data.luxLightToggle})`}
				bind:value={data.luxLightToggle}
				min={0}
				max={1000}
				helpText={m['section.settings.luxLightToggleText']()}
			/>
		{/if}
	</div>

	<div
		class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1"
	>
		<SwitchField
			id="ledTestOnPower"
			bind:checked={data.ledTestOnPower}
			label={m['section.settings.ledPowerOnTest']()}
		/>
		<SwitchField
			id="ledFlashOnUpd"
			bind:checked={data.ledFlashOnUpd}
			label={m['section.settings.ledFlashOnBlock']()}
		/>
		<SwitchField
			id="disableLeds"
			bind:checked={data.disableLeds}
			label={m['section.settings.disableLeds']()}
		/>
		<SwitchField
			id="refrScrnChange"
			bind:checked={data.refrScrnChange}
			label={m['section.settings.refrScrnChange']()}
		/>
		{#if data.hasFrontlight}
			<SwitchField
				id="flDisable"
				bind:checked={data.flDisable}
				label={m['section.settings.flDisable']()}
			/>
		{/if}
		{#if data.hasFrontlight && !data.flDisable}
			<SwitchField
				id="flAlwaysOn"
				bind:checked={data.flAlwaysOn}
				label={m['section.settings.flAlwaysOn']()}
			/>
			<SwitchField
				id="flFlashOnUpd"
				bind:checked={data.flFlashOnUpd}
				label={m['section.settings.flFlashOnUpd']()}
			/>
			{#if data.hasLightLevel}
				<SwitchField
					id="flOffWhenDark"
					bind:checked={data.flOffWhenDark}
					label={m['section.settings.flOffWhenDark']()}
				/>
			{/if}
		{/if}
	</div>
</CollapseCard>
