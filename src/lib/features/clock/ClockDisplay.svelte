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
	}

	let { status = {}, className = 'btclock-wrapper', verticalDesc = false }: Props = $props();

	const isSplitText = (s: string) => s.includes('/');

	const data = $derived(status.data ?? []);
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
				<div class="digit sats">S</div>
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
