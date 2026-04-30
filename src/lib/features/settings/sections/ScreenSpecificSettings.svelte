<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import ScreenRotationList from './ScreenRotationList.svelte';
	import CurrencyRotationList from './CurrencyRotationList.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { DataSourceType } from '$lib/types/settings';
	import { previewSatsSymbol, previewSuffixPrice } from '$lib/util/screenPreview';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(true) }: Props = $props();

	const data = $derived(settingsStore.data!);

	const showCurrencies = $derived(
		data?.actCurrencies &&
			(data.dataSource === DataSourceType.BTCLOCK_SOURCE ||
				data.dataSource === DataSourceType.CUSTOM_SOURCE ||
				data.dataSource === DataSourceType.THIRD_PARTY_SOURCE)
	);

	const satsSymbolPreview = $derived(previewSatsSymbol({ useSatsSymbol: data?.useSatsSymbol }));
	const suffixPricePreview = $derived(
		previewSuffixPrice({
			suffixPrice: data?.suffixPrice,
			mowMode: data?.mowMode,
			suffixShareDot: data?.suffixShareDot
		})
	);
</script>

<CollapseCard header={m['section.settings.section.screenSettings']()} bind:isOpen>
	<div
		class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1"
		data-testid="screen-switches-grid"
	>
		<SwitchField
			id="stealFocus"
			bind:checked={data.stealFocus}
			label={m['section.settings.StealFocusOnNewBlock']()}
		/>
		<SwitchField
			id="mcapBigChar"
			bind:checked={data.mcapBigChar}
			label={m['section.settings.useBigCharsMcap']()}
		/>
		<SwitchField
			id="useBlkCountdown"
			bind:checked={data.useBlkCountdown}
			label={m['section.settings.useBlkCountdown']()}
		/>
		<div class="flex items-center justify-between gap-2">
			<SwitchField
				id="useSatsSymbol"
				bind:checked={data.useSatsSymbol}
				label={m['section.settings.useSatsSymbol']()}
			/>
			<code
				class="text-xs px-1.5 py-0.5 rounded bg-base-200 text-base-content/70 whitespace-nowrap"
				data-testid="useSatsSymbol-preview"
				aria-hidden="true"
				>{#if satsSymbolPreview.symbol}<span class="sats-glyph"
						>{satsSymbolPreview.symbol}</span
					>
				{/if}{satsSymbolPreview.price}</code
			>
		</div>
		<SwitchField
			id="useMscwTime"
			bind:checked={data.useMscwTime}
			label={m['section.settings.useMscwTime']()}
		/>
		{#if 'hideLeadZero' in data}
			<SwitchField
				id="hideLeadZero"
				bind:checked={data.hideLeadZero}
				label={m['section.settings.hideLeadZero']()}
			/>
		{/if}
		<div class="flex items-center justify-between gap-2">
			<SwitchField
				id="suffixPrice"
				bind:checked={data.suffixPrice}
				label={m['section.settings.suffixPrice']()}
			/>
			<code
				class="text-xs px-1.5 py-0.5 rounded bg-base-200 text-base-content/70 whitespace-nowrap"
				data-testid="suffixPrice-preview"
				aria-hidden="true">{suffixPricePreview}</code
			>
		</div>
		<SwitchField
			id="mowMode"
			bind:checked={data.mowMode}
			label={m['section.settings.mowMode']()}
			disabled={!data.suffixPrice}
			hint={!data.suffixPrice ? m['section.settings.requiresSuffixPrice']() : undefined}
		/>
		<SwitchField
			id="suffixShareDot"
			bind:checked={data.suffixShareDot}
			label={m['section.settings.suffixShareDot']()}
			disabled={!data.suffixPrice}
			hint={!data.suffixPrice ? m['section.settings.requiresSuffixPrice']() : undefined}
		/>
		<SwitchField
			id="verticalDesc"
			bind:checked={data.verticalDesc}
			label={m['section.settings.verticalDesc']()}
		/>
		<SwitchField
			id="blockFeeDec"
			bind:checked={data.blockFeeDec}
			label={m['section.settings.blockFeeDec']()}
		/>
		<SwitchField
			id="supplyPercent"
			bind:checked={data.supplyPercent}
			label={m['section.settings.supplyPercent']()}
		/>
	</div>

	<div class="mt-4" data-testid="screens-grid">
		<h5 class="font-semibold mb-2">{m['section.settings.screens']()}</h5>
		<ScreenRotationList
			bind:screens={data.screens}
			activeCurrencyCount={data.actCurrencies?.length ?? 0}
		/>
	</div>

	{#if showCurrencies && data.availableCurrencies}
		<div class="mt-4" data-testid="currencies-grid">
			<h5 class="font-semibold">{m['section.settings.currencies']()}</h5>
			<small>{m['restartRequired']()}</small>
			<div class="mt-2">
				<CurrencyRotationList
					availableCurrencies={data.availableCurrencies}
					actCurrencies={data.actCurrencies}
					onChange={(next) => (data.actCurrencies = next)}
				/>
			</div>
		</div>
	{/if}
</CollapseCard>

<style>
	/* Same font remap the clock face uses for its STS cell — the Satoshi
	   Symbol woff2 substitutes the ASCII "S" with the sats sigil, so the
	   preview chip renders the exact glyph the firmware will draw. */
	.sats-glyph {
		font-family: 'Satoshi Symbol', sans-serif;
	}
</style>
