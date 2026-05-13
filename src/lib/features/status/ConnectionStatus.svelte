<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { DataSourceType } from '$lib/types/settings';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	// Strip the wss:// scheme so the pill stays compact; the full URL goes
	// in the title for hover. Falls back to the raw URL if `new URL()`
	// rejects the input (shouldn't happen — the firmware validates on the
	// PATCH path — but a relay reply we can't parse shouldn't crash the bar).
	const shortRelayLabel = (url: string): string => {
		try {
			return new URL(url).host;
		} catch {
			return url;
		}
	};
</script>

{#snippet pill(label: string, connected: boolean | undefined, tooltip?: string)}
	<span
		class="conn-pill"
		class:conn-pill--ok={!!connected}
		class:conn-pill--bad={!connected}
		title={tooltip ?? (connected ? 'connected' : 'disconnected')}
	>
		<span class="conn-dot" aria-hidden="true"></span>
		<span>{label}</span>
	</span>
{/snippet}

<div class="flex flex-wrap items-center gap-2 text-sm">
	{#if settings && (settings.dataSource === DataSourceType.NOSTR_SOURCE || settings.nostrZapNotify)}
		{@const nostrConn = status?.connectionStatus?.nostr}
		{#if Array.isArray(nostrConn)}
			{#each nostrConn as relay (relay.url)}
				{@render pill(
					shortRelayLabel(relay.url),
					relay.connected,
					`${relay.url} — ${relay.connected ? 'connected' : 'disconnected'}`
				)}
			{/each}
		{:else}
			{@render pill(m['section.status.nostrConnection'](), nostrConn)}
		{/if}
	{/if}

	{#if settings && settings.dataSource !== DataSourceType.NOSTR_SOURCE}
		{#if settings.dataSource === DataSourceType.THIRD_PARTY_SOURCE}
			{@render pill(m['section.status.wsPriceConnection'](), status?.connectionStatus?.price)}
			{@render pill(
				m['section.status.wsMempoolConnection']({ instance: settings.mempoolInstance }),
				status?.connectionStatus?.blocks
			)}
		{:else}
			{@render pill(m['section.status.wsDataConnection'](), status?.connectionStatus?.V2)}
		{/if}
	{/if}

	{#if settings?.nwcEnabled}
		{@render pill(m['section.status.nwcConnection'](), status?.connectionStatus?.nwc)}
	{/if}
</div>

{#if settings?.fetchEurPrice}
	<small class="block text-base-content/70">{m['section.status.fetchEuroNote']()}</small>
{/if}

<style>
	.conn-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.15rem 0.6rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.25;
		white-space: nowrap;
	}
	.conn-pill--ok {
		background: color-mix(in oklab, var(--color-success) 12%, transparent);
		color: color-mix(in oklab, var(--color-success) 70%, var(--color-base-content));
		border-color: color-mix(in oklab, var(--color-success) 35%, transparent);
	}
	.conn-pill--bad {
		background: color-mix(in oklab, var(--color-error) 12%, transparent);
		color: color-mix(in oklab, var(--color-error) 75%, var(--color-base-content));
		border-color: color-mix(in oklab, var(--color-error) 35%, transparent);
	}
	.conn-dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: currentColor;
		box-shadow: 0 0 0 0 currentColor;
	}
	.conn-pill--ok .conn-dot {
		animation: conn-pulse 2s ease-in-out infinite;
	}
	@keyframes conn-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in oklab, currentColor 40%, transparent);
		}
		50% {
			box-shadow: 0 0 0 4px color-mix(in oklab, currentColor 0%, transparent);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.conn-pill--ok .conn-dot {
			animation: none;
		}
	}
</style>
