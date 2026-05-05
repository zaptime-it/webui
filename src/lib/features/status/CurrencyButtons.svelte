<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { DataSourceType } from '$lib/types/settings';
	import { showCurrency } from '$lib/api/client';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	const show = $derived.by(() => {
		if (!settings?.actCurrencies?.length) return false;
		const ds = settings.dataSource;
		return (
			ds === DataSourceType.BTCLOCK_SOURCE ||
			ds === DataSourceType.CUSTOM_SOURCE ||
			ds === DataSourceType.THIRD_PARTY_SOURCE ||
			ds === DataSourceType.NOSTR_SOURCE
		);
	});

	const pick = (code: string) => () => {
		showCurrency(code).catch(() => {});
	};
</script>

{#if show && settings?.actCurrencies}
	<div class="mt-2 flex flex-wrap justify-center gap-1">
		{#each settings.actCurrencies as c (c)}
			<button
				type="button"
				class="btn btn-xs sm:btn-sm btn-outline btn-success"
				class:btn-active={status?.currency === c}
				onclick={pick(c)}
			>
				{c}
			</button>
		{/each}
	</div>
{/if}
