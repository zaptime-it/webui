<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { statusStore } from '$lib/stores/status.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	const status = $derived(statusStore.data);
	const settings = $derived(settingsStore.data);

	const memPct = $derived(statusStore.memoryFreePercent);
	const rssiPct = $derived(statusStore.rssiPercent);
	const rssiColor = $derived(statusStore.wifiStrengthColor);

	const kib = (bytes: number) => Math.round(bytes / 1024);
</script>

<div class="space-y-1">
	<progress class="progress progress-info w-full" value={memPct} max="100"></progress>
	<div class="flex justify-between text-sm">
		<div>{m['section.status.memoryFree']()}</div>
		<div>
			{kib(status?.espFreeHeap ?? 0)} / {kib(status?.espHeapSize ?? 0)} KiB
		</div>
	</div>
</div>

{#if settings?.hasLightLevel}
	<div class="text-sm mt-2">
		{m['section.status.lightSensor']()}: {Math.round(Number(status?.lightLevel ?? 0))} lux
	</div>
{/if}

<div class="mt-2">
	<div class="tooltip w-full" data-tip={m['rssiBar.tooltip']()}>
		<progress id="rssiBar" class="progress progress-{rssiColor} w-full" value={rssiPct} max="100"
		></progress>
	</div>
	<div class="flex justify-between text-sm">
		<div>{m['section.status.wifiSignalStrength']()}</div>
		<div>{status?.rssi ?? 0} dBm</div>
	</div>
</div>
