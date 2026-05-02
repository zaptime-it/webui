<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import ScreenRotationList from './ScreenRotationList.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);
</script>

<CollapseCard header={m['section.settings.screens']()} bind:isOpen>
	<div data-testid="screens-grid">
		<ScreenRotationList
			bind:screens={data.screens}
			activeCurrencyCount={data.actCurrencies?.length ?? 0}
		/>
	</div>
</CollapseCard>
