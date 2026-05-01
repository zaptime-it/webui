<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import ScreenRotationList from './ScreenRotationList.svelte';
	import CurrencyRotationList from './CurrencyRotationList.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { DataSourceType } from '$lib/types/settings';
	import { previewSatsSymbol, previewSuffixPrice } from '$lib/util/screenPreview';

	// 16 sats-symbol glyphs at U+E000..U+E00F of the SatoshiSymbol font.
	// Each variant index maps to the codepoint at the same offset; the
	// picker renders the actual glyph via the 'Satoshi Symbol Variants'
	// webfont so users pick visually instead of by number.
	const SATS_VARIANT_COUNT = 16;
	const satsVariantGlyphs: string[] = Array.from({ length: SATS_VARIANT_COUNT }, (_, i) =>
		String.fromCodePoint(0xe000 + i)
	);

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

	{#if 'satsVariant' in data && data.useSatsSymbol}
		<div class="mt-4" data-testid="sats-variant-picker">
			<h5 class="font-semibold mb-1">{m['section.settings.satsVariant']()}</h5>
			<small class="block mb-2 text-base-content/70"
				>{m['section.settings.satsVariantHelp']()}</small
			>
			<fieldset
				class="grid gap-1.5"
				style="grid-template-columns: repeat(8, minmax(0, 1fr));"
				aria-label={m['section.settings.satsVariant']()}
			>
				{#each satsVariantGlyphs as glyph, i (i)}
					<label
						class="sats-variant-card"
						class:selected={data.satsVariant === i}
						title={`${i}`}
					>
						<input
							type="radio"
							name="satsVariant"
							value={i}
							checked={data.satsVariant === i}
							onchange={() => (data.satsVariant = i)}
							class="sr-only"
						/>
						<span class="sats-variant-glyph" aria-hidden="true">{glyph}</span>
						<span class="sats-variant-index">{i}</span>
					</label>
				{/each}
			</fieldset>
		</div>
	{/if}

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

	.sats-variant-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.125rem;
		padding: 0.375rem 0.25rem;
		border: 1px solid var(--color-base-300);
		border-radius: 0.375rem;
		cursor: pointer;
		background-color: var(--color-base-200);
		transition: border-color 0.1s ease;
	}
	.sats-variant-card:hover {
		border-color: var(--color-primary);
	}
	.sats-variant-card.selected {
		border-color: var(--color-primary);
		background-color: var(--color-primary);
		color: var(--color-primary-content);
	}
	.sats-variant-glyph {
		font-family: 'Satoshi Symbol Variants', sans-serif;
		font-size: 1.5rem;
		line-height: 1;
	}
	.sats-variant-index {
		font-size: 0.625rem;
		opacity: 0.7;
		font-variant-numeric: tabular-nums;
	}
</style>
