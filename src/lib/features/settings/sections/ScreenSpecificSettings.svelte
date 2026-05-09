<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
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

	/** From GET `availableFonts[]` for the active `fontName` — updates as soon as the font picker changes (no save/refetch). */
	const btcMarkerSupported = $derived.by(() => {
		const fid = data.fontName;
		const hit = (data.availableFonts ?? []).find((f) => f.id === fid);
		return hit?.hasBtcSymbol ?? true;
	});

	type MarkerMode = 'none' | 'sats' | 'btc';

	const markerMode = $derived.by((): MarkerMode => {
		const m = data.priceSymMode ?? 0;
		if (m === 2) return btcMarkerSupported ? 'btc' : 'none';
		if (m === 1) return 'sats';
		return 'none';
	});

	const applyMarkerMode = (mode: MarkerMode) => {
		if (mode === 'none') data.priceSymMode = 0;
		else if (mode === 'sats') data.priceSymMode = 1;
		else data.priceSymMode = 2;
	};

	$effect(() => {
		if ((data.priceSymMode ?? 0) === 2 && !btcMarkerSupported) {
			data.priceSymMode = 0;
		}
	});

	const markerPreview = $derived(
		previewSatsSymbol({
			priceSymMode: data.priceSymMode
		})
	);
	const suffixPricePreview = $derived(
		previewSuffixPrice({
			suffixPrice: data?.suffixPrice,
			mowMode: data?.mowMode,
			decimalShareDot: data?.decimalShareDot
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
			id="decimalShareDot"
			bind:checked={data.decimalShareDot}
			label={m['section.settings.decimalShareDot']()}
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

	<div
		class="mt-3 space-y-2"
		id="price-marker-radiogroup"
		data-testid="price-marker-radiogroup"
		role="radiogroup"
		aria-labelledby="price-marker-heading"
		aria-describedby="price-marker-help"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
			<span id="price-marker-heading" class="text-sm font-medium text-base-content/90"
				>{m['section.settings.priceMarkerHeading']()}</span
			>
			<code
				class="text-xs shrink-0 self-start whitespace-nowrap rounded bg-base-200 px-1.5 py-0.5 text-base-content/70 sm:self-center"
				data-testid="sats-marker-preview"
				aria-hidden="true"
				>{#if markerPreview.markerStyle === 'btc'}<span class="btc-marker"
						>{markerPreview.symbol}</span
					>{:else if markerPreview.markerStyle === 'satoshi'}<span class="sats-glyph"
						>{markerPreview.symbol}</span
					>
				{/if}{markerPreview.price}</code
			>
		</div>
		<p id="price-marker-help" class="max-w-prose text-xs leading-snug text-base-content/65">
			{m['section.settings.priceMarkerFontHelp']()}
		</p>
		<div class="join join-vertical w-full sm:join-horizontal sm:max-w-2xl">
			<label
				class="marker-radio-label btn btn-sm join-item h-auto min-h-10 flex-1 gap-1.5 py-2 font-normal normal-case"
			>
				<input
					type="radio"
					name="priceMarker"
					class="sr-only"
					checked={markerMode === 'none'}
					onchange={() => applyMarkerMode('none')}
				/>
				{m['section.settings.priceMarkerNone']()}
			</label>
			<label
				class="marker-radio-label btn btn-sm join-item h-auto min-h-10 flex-1 gap-1.5 py-2 font-normal normal-case"
				title={m['section.settings.priceMarkerSatsAria']()}
			>
				<input
					type="radio"
					name="priceMarker"
					class="sr-only"
					checked={markerMode === 'sats'}
					onchange={() => applyMarkerMode('sats')}
				/>
				<span class="sats-glyph text-base leading-none" aria-hidden="true">S</span>
				<span class="sr-only">{m['section.settings.priceMarkerSatsAria']()}</span>
			</label>
			<label
				class="marker-radio-label btn btn-sm join-item h-auto min-h-10 flex-1 gap-1.5 py-2 font-normal normal-case"
				class:opacity-45={!btcMarkerSupported}
				class:cursor-not-allowed={!btcMarkerSupported}
				title={m['section.settings.priceMarkerBtcAria']()}
			>
				<input
					type="radio"
					name="priceMarker"
					class="sr-only"
					disabled={!btcMarkerSupported}
					checked={markerMode === 'btc'}
					onchange={() => applyMarkerMode('btc')}
				/>
				<span class="btc-marker text-base leading-none" aria-hidden="true">₿</span>
				<span class="sr-only">{m['section.settings.priceMarkerBtcAria']()}</span>
			</label>
		</div>
	</div>

	{#if 'satsVariant' in data && (data.priceSymMode ?? 0) === 1}
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
</CollapseCard>

<style>
	/* Same font remap the clock face uses for its STS cell — the Satoshi
	   Symbol woff2 substitutes the ASCII "S" with the sats sigil, so the
	   preview chip renders the exact glyph the firmware will draw. */
	.sats-glyph {
		font-family: 'Satoshi Symbol', sans-serif;
	}

	/* Ubuntu (WebUI body) has no U+20BF; stack falls back to OS monospace on each platform. */
	.btc-marker {
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
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

	/* DaisyUI join + label-wrapped radios: highlight the segment that matches NVS flags */
	.marker-radio-label:has(input:checked) {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		border-color: var(--color-primary);
	}
</style>
