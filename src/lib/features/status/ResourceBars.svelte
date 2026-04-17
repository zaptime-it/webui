<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { statusStore } from '$lib/stores/status.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		uptime?: string;
	}
	let { uptime = '' }: Props = $props();

	const status = $derived(statusStore.data);
	const settings = $derived(settingsStore.data);

	const memPct = $derived(statusStore.memoryFreePercent);
	const rssiPct = $derived(statusStore.rssiPercent);
	const rssiColor = $derived(statusStore.wifiStrengthColor);

	// `memPct` reports *free* memory, so lower values mean the device is
	// under pressure. Flip the color scale accordingly.
	const memColor = $derived(memPct >= 40 ? 'success' : memPct >= 15 ? 'warning' : 'error');

	const kib = (bytes: number) => Math.round(bytes / 1024);
</script>

<div class="space-y-3">
	<div class="space-y-1">
		<progress class="progress progress-{memColor} w-full" value={memPct} max="100"></progress>
		<div class="bar-row">
			<span class="bar-label">{m['section.status.memoryFree']()}</span>
			<span class="bar-value">
				{kib(status?.espFreeHeap ?? 0)} / {kib(status?.espHeapSize ?? 0)} KiB
			</span>
		</div>
	</div>

	<div class="space-y-1">
		<div class="tooltip w-full" data-tip={m['rssiBar.tooltip']()}>
			<progress id="rssiBar" class="progress progress-{rssiColor} w-full" value={rssiPct} max="100"
			></progress>
		</div>
		<div class="bar-row">
			<span class="bar-label">{m['section.status.wifiSignalStrength']()}</span>
			<span class="bar-value">{status?.rssi ?? 0} dBm</span>
		</div>
	</div>

	{#if settings?.hasLightLevel}
		<div class="bar-row">
			<span class="bar-label">{m['section.status.lightSensor']()}</span>
			<span class="bar-value">{Math.round(Number(status?.lightLevel ?? 0))} lux</span>
		</div>
	{/if}

	{#if uptime}
		<div class="bar-row">
			<span class="bar-label">{m['section.status.uptime']()}</span>
			<span class="bar-value">{uptime}</span>
		</div>
	{/if}
</div>
