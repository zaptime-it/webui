<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Skeleton from '$lib/ui/Skeleton.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	const data = $derived(settingsStore.data);
	const mismatch = $derived(!!data?.gitRev && !!data?.fsRev && data.gitRev !== data.fsRev);
	const buildTimeStr = $derived.by(() => {
		const t = data?.lastBuildTime;
		if (!t) return '';
		const ms = typeof t === 'number' ? t * 1000 : Number(t) * 1000;
		return new Date(ms).toLocaleString();
	});
</script>

<section class="space-y-2">
	<h3 class="text-lg font-semibold">{m['section.control.systemInfo']()}</h3>
	<ul class="text-sm system_info space-y-1">
		{#if data?.gitTag}
			<li>{m['section.control.version']()}: {data.gitTag}</li>
		{/if}
		<li>
			{m['section.control.buildTime']()}:
			<Skeleton value={buildTimeStr} checkValue={data?.lastBuildTime} />
		</li>
		<li>IP: <Skeleton value={data?.ip ?? ''} /></li>
		<li>HW revision: <Skeleton value={data?.hwRev ?? ''} /></li>
		<li>{m['section.control.fwCommit']()}: <Skeleton value={data?.gitRev ?? ''} /></li>
		<li>WebUI commit: <Skeleton value={data?.fsRev ?? ''} /></li>
		<li>{m['section.control.hostname']()}: <Skeleton value={data?.hostname ?? ''} /></li>
	</ul>
	{#if mismatch}
		<div class="alert alert-warning text-sm">
			<span>⚠️ <strong>{m['warning']()}</strong>: {m['section.control.fwCommitMismatch']()}</span>
		</div>
	{/if}
</section>
