<script lang="ts">
	import { browser } from '$app/environment';
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

	// Dismissal is keyed on the (gitRev, fsRev) pair: a fresh build of either
	// component invalidates the dismissal, so a real divergence after an
	// intentional upgrade re-prompts the user. Stored in sessionStorage so
	// closing the tab also resets — we don't want a permanent "I don't care"
	// hiding a genuine compatibility issue weeks later.
	const dismissalKey = $derived(
		data?.gitRev && data?.fsRev ? `fwMismatchDismissed:${data.gitRev}:${data.fsRev}` : ''
	);
	let dismissed = $state(false);
	$effect(() => {
		if (!browser || !dismissalKey) {
			dismissed = false;
			return;
		}
		dismissed = sessionStorage.getItem(dismissalKey) === '1';
	});
	const dismiss = () => {
		if (!browser || !dismissalKey) return;
		sessionStorage.setItem(dismissalKey, '1');
		dismissed = true;
	};
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
	{#if mismatch && !dismissed}
		<div
			class="alert alert-warning text-sm flex items-start justify-between gap-2"
			data-testid="fw-mismatch-banner"
		>
			<span
				>⚠️ <strong>{m['warning']()}</strong>: {m[
					'section.control.fwCommitMismatch'
				]()}</span
			>
			<button
				type="button"
				class="btn btn-ghost btn-xs shrink-0"
				onclick={dismiss}
				data-testid="fw-mismatch-dismiss"
			>
				{m['button.dismiss']()}
			</button>
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
