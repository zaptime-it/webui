<script lang="ts">
	import Hourglass from 'lucide-svelte/icons/hourglass';
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { fetchLatestRelease } from '$lib/api/external';
	import { firmwareAutoUpdate } from '$lib/api/client';
	import { toast } from '$lib/stores/toast.svelte';
	import { compareVersions } from '$lib/util/version';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	let latestVersion = $state('');
	let releaseDate = $state('');
	let releaseUrl = $state('');
	let fetched = false;

	const currentTag = $derived(settings?.gitTag?.trim() ?? '');
	const hasCurrentTag = $derived(Boolean(currentTag));
	// If the device can't report its current version, we should still surface the
	// latest version and offer auto-update (treat it as "update available").
	const newer = $derived.by(() => {
		if (!latestVersion || latestVersion === 'error') return false;
		if (!hasCurrentTag) return true;
		return compareVersions(latestVersion, currentTag) === 1;
	});

	const autoUpdate = async (e: Event) => {
		e.preventDefault();
		try {
			const { ok, payload } = await firmwareAutoUpdate();
			if (ok) toast.info(payload.msg);
			else toast.error(payload.msg);
		} catch (err) {
			toast.error(String(err));
		}
	};

	// The firmware exposes its own release feed URL via /api/settings
	// (`gitReleaseUrl`), so v3 / v4 / forks all hit the right Forgejo or
	// GitHub endpoint without the WebUI hardcoding a repo. Wait for settings
	// to load before firing the request.
	$effect(() => {
		if (fetched) return;
		const url = settings?.gitReleaseUrl?.trim();
		if (!url) return;
		fetched = true;
		(async () => {
			try {
				const data = await fetchLatestRelease(url);
				latestVersion = data.tag_name;
				releaseDate = new Date(data.created_at).toLocaleString();
				releaseUrl = data.html_url;
			} catch (err) {
				console.error('Error fetching latest version:', err);
				latestVersion = 'error';
			}
		})();
	});
</script>

{#if latestVersion && latestVersion !== 'error'}
	<p class="text-sm">
		{m['section.firmwareUpdater.latestVersion']()}: {latestVersion} -
		{m['section.firmwareUpdater.releaseDate']()}: {releaseDate} -
		<a href={releaseUrl} target="_blank" rel="noreferrer" class="link link-primary">
			{m['section.firmwareUpdater.viewRelease']()}
		</a>
		<br />
		{#if newer}
			{#if !status?.isOTAUpdating}
				{m['section.firmwareUpdater.swUpdateAvailable']()} -
				<a href="/" onclick={autoUpdate} class="link link-primary">
					{m['section.firmwareUpdater.autoUpdate']()}
				</a>.
			{:else}
				<span class="inline-flex items-center gap-1">
					<Hourglass size="16" />
					{m['section.firmwareUpdater.autoUpdateInProgress']()}
				</span>
			{/if}
		{:else}
			{m['section.firmwareUpdater.swUpToDate']()}
		{/if}
	</p>
{:else if latestVersion === 'error'}
	<p class="text-sm">Error loading version, try again later.</p>
{:else}
	<p class="text-sm">Loading...</p>
{/if}
