<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Skeleton from '$lib/ui/Skeleton.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { compareVersions, MIN_FIRMWARE } from '$lib/util/version';

	const data = $derived(settingsStore.data);
	const buildTimeStr = $derived.by(() => {
		const t = data?.lastBuildTime;
		if (!t) return '';
		const ms = typeof t === 'number' ? t * 1000 : Number(t) * 1000;
		return new Date(ms).toLocaleString();
	});

	// Compatibility check: this WebUI declares a minimum firmware version
	// in src/lib/manifest.json. The banner fires only when the running
	// firmware (gitRev — git describe of the firmware repo, optionally
	// with -N-gSHA / -dirty suffixes that compareVersions strips) is
	// strictly older than that minimum. Forward-compatible additions
	// (new firmware fields the WebUI ignores) don't trip the banner.
	// Empty gitRev means the firmware predates the gitRev field, which
	// is older than any released minimum — surface as incompatible.
	const incompatible = $derived.by(() => {
		if (!data) return false;
		const fw = data.gitRev?.trim() ?? '';
		if (!fw) return true;
		return compareVersions(fw, MIN_FIRMWARE) < 0;
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
		{#if data?.wifiMac}
			<dt>MAC</dt>
			<dd class="mono">{data.wifiMac}</dd>
		{/if}
		<dt>HW revision</dt>
		<dd><Skeleton value={data?.hwRev ?? ''} /></dd>
		<dt>{m['section.control.fwCommit']()}</dt>
		<dd class="mono"><Skeleton value={data?.gitRev ?? ''} /></dd>
		<dt>WebUI commit</dt>
		<dd class="mono"><Skeleton value={data?.fsRev ?? ''} /></dd>
		<dt>{m['section.control.hostname']()}</dt>
		<dd class="mono"><Skeleton value={data?.hostname ?? ''} /></dd>
	</dl>
	{#if incompatible}
		<div class="alert alert-warning text-sm" data-testid="fw-too-old-banner">
			<span
				>⚠️ <strong>{m['warning']()}</strong>: {m['section.control.fwTooOld']({
					min: MIN_FIRMWARE,
					current: data?.gitRev ?? '?'
				})}</span
			>
		</div>
	{/if}
</section>

<style>
	.system-info {
		display: grid;
		grid-template-columns: minmax(6.5rem, auto) 1fr;
		column-gap: 0.75rem;
		row-gap: 0.25rem;
		margin: 0;
	}
	.system-info dt {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--color-base-content) 60%, transparent);
		align-self: center;
	}
	.system-info dd {
		margin: 0;
		font-size: 0.875rem;
		word-break: break-all;
	}
	.system-info dd.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.8125rem;
	}
</style>
