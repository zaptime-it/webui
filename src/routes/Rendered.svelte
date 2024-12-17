<script lang="ts">
	export let status = {};
	import RocketIcon from '../icons/RocketIcon.svelte';
	import PickaxeIcon from '../icons/PickaxeIcon.svelte';
	import ZapIcon from '../icons/ZapIcon.svelte';

	const isSplitText = (str: string) => {
		return str.includes('/');
	};

	export let className = 'btclock-wrapper';
	export let verticalDesc = false;
	// Define the currency symbols as constants
	const CURRENCY_USD = '$';
	const CURRENCY_EUR = '[';
	const CURRENCY_GBP = ']';
	const CURRENCY_JPY = '^';
	const CURRENCY_AUD = '_';
	//const CURRENCY_CHF = '_';
	const CURRENCY_CAD = '`';

	function getCurrencySymbol(input: string): string {
		// Split the string into an array of characters to process each one
		return input
			.split('')
			.map((char) => {
				switch (char) {
					case CURRENCY_EUR:
						return '€'; // Euro symbol
					case CURRENCY_GBP:
						return '£'; // Pound symbol
					case CURRENCY_JPY:
						return '¥'; // Yen symbol
					case CURRENCY_AUD:
					case CURRENCY_CAD:
					case CURRENCY_USD:
						return '$'; // Dollar symbol
					default:
						return char; // Return the original character if no match
				}
			})
			.join(''); // Join the array back into a string
	}
</script>

<div class={className} id={className}>
	<div class={'btclock' + (verticalDesc ? ' verticalDesc' : '')}>
		{#each status.data as char}
			{#if isSplitText(char)}
				<div class="splitText">
					<div class="textcontainer">
						{#if char.split('/').length}
							<span class="top-text">{char.split('/')[0]}</span>
							<span class="bottom-text">{char.split('/')[1]}</span>
						{/if}
					</div>
					<!-- {#each char.split('/') as part}
						<div class="flex-items">{part}</div>
					{/each} -->
				</div>
			{:else if char.startsWith('mdi')}
				<div class="digit icon">
					{#if char.endsWith('rocket')}
						<RocketIcon></RocketIcon>
					{/if}
					{#if char.endsWith('pickaxe')}
						<PickaxeIcon></PickaxeIcon>
					{/if}
					{#if char.endsWith('bolt')}
						<ZapIcon></ZapIcon>
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

<style>
	.icon {
		fill: currentColor;
	}
</style>
