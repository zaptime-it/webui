<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { DataSourceType } from '$lib/types/settings';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);
</script>

<p class="text-sm">
	{#if settings && (settings.dataSource === DataSourceType.NOSTR_SOURCE || settings.nostrZapNotify)}
		{m['section.status.nostrConnection']()}:
		<span>{status?.connectionStatus?.nostr ? '✅' : '❌'}</span>
	{/if}
	{#if settings && settings.dataSource !== DataSourceType.NOSTR_SOURCE}
		{#if settings.dataSource === DataSourceType.THIRD_PARTY_SOURCE}
			{m['section.status.wsPriceConnection']()}:
			<span>{status?.connectionStatus?.price ? '✅' : '❌'}</span>
			—
			{m['section.status.wsMempoolConnection']({ instance: settings.mempoolInstance })}:
			<span>{status?.connectionStatus?.blocks ? '✅' : '❌'}</span><br />
		{:else}
			{m['section.status.wsDataConnection']()}:
			<span>{status?.connectionStatus?.V2 ? '✅' : '❌'}</span>
		{/if}
	{/if}
	{#if settings?.fetchEurPrice}
		<small class="block">{m['section.status.fetchEuroNote']()}</small>
	{/if}
</p>
