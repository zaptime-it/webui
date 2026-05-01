<script lang="ts">
	import type { Status } from '$lib/types/status';
	import { getCurrencySymbol } from '$lib/util/currency';
	import Rocket from './icons/Rocket.svelte';
	import Pickaxe from './icons/Pickaxe.svelte';
	import Zap from './icons/Zap.svelte';

	interface Props {
		status?: Partial<Status>;
		className?: string;
		verticalDesc?: boolean;
		/**
		 * Index 0..15 into the SatoshiSymbol font's PUA glyphs at
		 * U+E000..U+E00F. When undefined, fall back to the ASCII 'S'
		 * remap shipped in `Satoshi_Symbol.woff2` — same glyph older
		 * firmware and the WebUI's slim webfont have always drawn.
		 */
		satsVariant?: number;
	}

	let {
		status = {},
		className = 'btclock-wrapper',
		verticalDesc = false,
		satsVariant
	}: Props = $props();

	const isSplitText = (s: string) => s.includes('/');

	const data = $derived(status.data ?? []);

	// Render the variant glyph from the 'Satoshi Symbol Variants' font
	// (U+E000..U+E00F) when the device picked one; otherwise keep the
	// legacy ASCII 'S' remap so this component still works without the
	// pref (and on firmware that doesn't expose it).
	const satsGlyph = $derived(
		typeof satsVariant === 'number' && satsVariant >= 0 && satsVariant <= 15
			? String.fromCodePoint(0xe000 + satsVariant)
			: 'S'
	);
	const satsVariantActive = $derived(
		typeof satsVariant === 'number' && satsVariant >= 0 && satsVariant <= 15
	);
</script>

<div class={className} id={className}>
	<div class={'btclock' + (verticalDesc ? ' verticalDesc' : '')}>
		{#each data as char, i (i)}
			{#if isSplitText(char)}
				<div class="splitText">
					<div class="textcontainer">
						<span class="top-text">{char.split('/')[0]}</span>
						<span class="bottom-text">{char.split('/')[1]}</span>
					</div>
				</div>
			{:else if char.startsWith('mdi')}
				<div class={'digit icon' + (char.endsWith('bitaxe') ? ' icon-img' : '')}>
					{#if char.endsWith('rocket')}
						<Rocket />
					{:else if char.endsWith('pickaxe')}
						<Pickaxe />
					{:else if char.endsWith('bolt')}
						<Zap />
					{:else if char.endsWith('bitaxe')}
						<img src="/bitaxe.webp" class="bitaxelogo" alt="Bitaxe logo" />
					{:else if char.endsWith('miningpool')}
						<span class="pool-logo">Mining Pool Logo</span>
					{/if}
				</div>
			{:else if char === 'STS'}
				<div class="digit sats" class:sats-variant={satsVariantActive}>{satsGlyph}</div>
			{:else if char.length >= 3}
				<div class="mediumText">{char}</div>
			{:else if char.length === 0 || char === ' '}
				<div class="digit">&nbsp;&nbsp;</div>
			{:else}
				<div class="digit">{getCurrencySymbol(char)}</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* Scope a container so the clock's digit sizing tracks the Status
	   column width rather than the full viewport — otherwise the digits
	   keep their viewport-based size and the last cell gets clipped when
	   the column is narrower than `7 * (12vw + 12vh)`. */
	.btclock-wrapper {
		container-type: inline-size;
	}

	.btclock-wrapper :global(.btclock) {
		background: #000;
		display: flex;
		/* `cqi` = 1% of the container's inline size, so font-size now scales
		   with the Status column instead of the viewport. */
		font-size: clamp(1rem, 10cqi, 2.5rem);
		font-family: 'Antonio', sans-serif;
		font-weight: 400;
		padding: 8px;
		gap: 6px;
		/* Defensive: never overflow the card even on very narrow columns. */
		overflow: hidden;
	}

	.btclock-wrapper :global(.btclock .digit),
	.btclock-wrapper :global(.btclock .splitText),
	.btclock-wrapper :global(.btclock .mediumText) {
		border: 2px solid gold;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 6px 4px 10px;
		/* Share the available row width evenly and let each cell shrink
		   below its intrinsic content width so nothing overflows. */
		flex: 1 1 0;
		min-width: 0;
		aspect-ratio: 1 / 1.5;
	}

	.btclock-wrapper :global(.btclock .digit hr),
	.btclock-wrapper :global(.btclock .splitText hr),
	.btclock-wrapper :global(.btclock .mediumText hr) {
		width: 75%;
		border: 0;
		border-top: 2px solid #fff;
		margin: 0;
		padding: 0;
		opacity: 1;
	}

	/* The shared `.digit` rule uses asymmetric vertical padding
	   (top:6 / bottom:10) so that ASCII digits — whose cap-height glyph
	   sits high in the em-box, with descender room below — visually
	   centre in the cell. The SatoshiSymbol glyphs fill their em-box
	   symmetrically, so that asymmetric padding pushes them up.
	   Symmetric padding (same total vertical, so cell sizing is
	   unchanged) restores the centre. line-height:1 strips the font's
	   intrinsic leading so the cell hugs the actual glyph box. */
	.btclock-wrapper :global(.btclock .digit.sats) {
		font-family: 'Satoshi Symbol', sans-serif;
		line-height: 1;
		padding: 8px 4px;
	}

	/* The PUA glyphs at U+E000..U+E00F fill their em-box, while Antonio's
	   ASCII digits only fill the cap-height (~0.72em). At font-size 1em
	   the variant glyph would tower over the digits beside it, so scale
	   down to match the digit's visual height. */
	.btclock-wrapper :global(.btclock .digit.sats.sats-variant) {
		font-family: 'Satoshi Symbol Variants', sans-serif;
		font-size: 0.72em;
	}

	.btclock-wrapper :global(.btclock .mediumText) {
		font-size: calc(1.25vw + 1.25vh);
	}

	.btclock-wrapper :global(.btclock .splitText) {
		flex-direction: column;
		align-items: center;
		justify-content: space-around;
		padding: 5px;
		font-size: calc(0.3vw + 1vh);
	}

	.btclock-wrapper :global(.btclock.verticalDesc > .splitText:first-child .textcontainer) {
		transform: rotate(-90deg);
	}

	.btclock-wrapper :global(.btclock .splitText .textcontainer :first-child::after) {
		display: block;
		content: '';
		margin-top: 0px;
		border-bottom: 2px solid;
	}

	.btclock-wrapper :global(.btclock .splitText .top-text),
	.btclock-wrapper :global(.btclock .splitText .bottom-text) {
		margin: 0;
		line-height: 1;
	}

	.btclock-wrapper :global(.btclock .splitText .top-text) {
		margin-bottom: -45px;
	}

	.btclock-wrapper :global(.btclock .splitText .bottom-text) {
		margin-top: -45px;
	}

	.btclock-wrapper :global(.btclock .digit.icon svg) {
		width: 100%;
		fill: currentColor;
	}

	.btclock-wrapper :global(.btclock .digit.icon.icon-img) {
		aspect-ratio: 1;
		width: calc(100 / 7);
	}

	.btclock-wrapper :global(.btclock .digit.icon.icon-img img) {
		max-width: 95%;
	}

	.btclock-wrapper :global(.bitaxelogo) {
		transform: rotate(-90deg);
	}

	.btclock-wrapper :global(.pool-logo) {
		font-size: 0.75rem;
	}

	@media (max-width: 576px) {
		.btclock-wrapper :global(.btclock .digit),
		.btclock-wrapper :global(.btclock .splitText),
		.btclock-wrapper :global(.btclock .mediumText) {
			padding: 4px 3px 8px;
		}
		.btclock-wrapper :global(.btclock .splitText .top-text) {
			margin-bottom: -10px;
		}
		.btclock-wrapper :global(.btclock .splitText .bottom-text) {
			margin-top: -10px;
		}
	}

	/* Theme variants. The `darkMode` / `lightMode` class is toggled by
	   the parent panel (Status) on the wrapper containing the clock. */
	:global(.darkMode .btclock > div) {
		background: #000;
		color: #fff;
		border-color: #fff;
	}

	:global(.lightMode .btclock > div) {
		background: #fff;
		color: #000;
	}

	:global(.lightMode .btclock .splitText hr) {
		border-top: 2px solid #000;
	}

	:global(.lightMode .bitaxelogo) {
		filter: brightness(0) saturate(100%);
	}
</style>
