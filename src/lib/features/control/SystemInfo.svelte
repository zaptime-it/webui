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
	<dl class="system-info">
		{#if data?.gitTag}
			<dt>{m['section.control.version']()}</dt>
			<dd>{data.gitTag}</dd>
		{/if}
		<dt>{m['section.control.buildTime']()}</dt>
		<dd><Skeleton value={buildTimeStr} checkValue={data?.lastBuildTime} /></dd>
		<dt>IP</dt>
		<dd class="mono"><Skeleton value={data?.ip ?? ''} /></dd>
		<dt>HW revision</dt>
		<dd><Skeleton value={data?.hwRev ?? ''} /></dd>
		<dt>{m['section.control.fwCommit']()}</dt>
		<dd class="mono"><Skeleton value={data?.gitRev ?? ''} /></dd>
		<dt>WebUI commit</dt>
		<dd class="mono"><Skeleton value={data?.fsRev ?? ''} /></dd>
		<dt>{m['section.control.hostname']()}</dt>
		<dd class="mono"><Skeleton value={data?.hostname ?? ''} /></dd>
	</dl>
	{#if mismatch}
		<div class="alert alert-warning text-sm">
			<span>⚠️ <strong>{m['warning']()}</strong>: {m['section.control.fwCommitMismatch']()}</span>
		</div>
	{/if}
</section>
