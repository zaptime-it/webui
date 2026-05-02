<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import CurrencyRotationList from './CurrencyRotationList.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);
</script>

{#if data.availableCurrencies}
	<CollapseCard header={m['section.settings.currencies']()} bind:isOpen>
		<div data-testid="currencies-grid">
			<small>{m['restartRequired']()}</small>
			<div class="mt-2">
				<CurrencyRotationList
					availableCurrencies={data.availableCurrencies}
					actCurrencies={data.actCurrencies}
					onChange={(next) => (data.actCurrencies = next)}
				/>
			</div>
		</div>
	</CollapseCard>
{/if}
