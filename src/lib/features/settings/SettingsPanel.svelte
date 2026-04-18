<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import ScreenSpecificSettings from './sections/ScreenSpecificSettings.svelte';
	import DisplaySettings from './sections/DisplaySettings.svelte';
	import DataSourceSettings from './sections/DataSourceSettings.svelte';
	import ExtraFeaturesSettings from './sections/ExtraFeaturesSettings.svelte';
	import SystemSettings from './sections/SystemSettings.svelte';

	const miningPoolMap = new Map<string, string>([
		['noderunners', 'Noderunners.network'],
		['braiins', 'Braiins Pool'],
		['ocean', 'ocean.xyz'],
		['satoshi_radio', 'Satoshi Radio pool'],
		['public_pool', 'public-pool.io'],
		['gobrrr_pool', 'Go Brrr pool'],
		['ckpool', 'CKPool'],
		['eu_ckpool', 'EU CKPool'],
		['local_public_pool', 'Public Pool (local)']
	]);

	let screenOpen = $state(true);
	let displayOpen = $state(false);
	let dataSourceOpen = $state(false);
	let extraOpen = $state(false);
	let systemOpen = $state(false);

	const showAll = () => {
		screenOpen = displayOpen = dataSourceOpen = extraOpen = systemOpen = true;
	};
	const hideAll = () => {
		screenOpen = displayOpen = dataSourceOpen = extraOpen = systemOpen = false;
	};

	const handleReset = async (e: Event) => {
		e.preventDefault();
		await settingsStore.load();
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		const current = settingsStore.data;
		if (!current) return;
		const {
			gitRev: _gitRev,
			ip: _ip,
			lastBuildTime: _lbt,
			// Read-only flags sent by the device as the "password is stored" indicator.
			// Never PATCH them back — they are computed, not user-editable.
			httpAuthPassSet: _haps,
			otaPassSet: _ops,
			...rest
		} = current;
		void _gitRev;
		void _ip;
		void _lbt;
		void _haps;
		void _ops;

		// 3.4.0 password handling: the GET response carries *Set booleans,
		// not plaintext. Only patch httpAuthPass / otaPass if the user typed
		// a new value. Sending an empty string would clear whatever the
		// device currently has stored, which is almost never what anyone
		// submitting the full form actually wants.
		const patch: Partial<typeof rest> = { ...rest };
		if (!patch.httpAuthPass) delete patch.httpAuthPass;
		if (!patch.otaPass) delete patch.otaPass;

		try {
			const res = await settingsStore.save(patch);
			if (res.ok) toast.success(m['section.settings.settingsSaved']());
			else toast.error(`${res.status}: ${res.statusText}`);
		} catch {
			toast.error(m['section.settings.errorSavingSettings']());
		}
	};
</script>

<div class="card bg-base-100 shadow @container" id="settings-card">
	<div class="card-body space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title">{m['section.settings.title']()}</h2>
			<small class="space-x-1">
				<button type="button" id="showAllBtn" class="link link-primary" onclick={showAll}>
					{m['section.settings.showAll']()}
				</button>
				|
				<button type="button" id="hideAllBtn" class="link link-primary" onclick={hideAll}>
					{m['section.settings.hideAll']()}
				</button>
			</small>
		</div>

		{#if !settingsStore.isReady}
			<div class="flex items-center gap-2">
				<span class="loading loading-spinner" aria-hidden="true"></span>
				<strong role="status">Loading…</strong>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				<ScreenSpecificSettings bind:isOpen={screenOpen} />
				<DisplaySettings bind:isOpen={displayOpen} />
				<DataSourceSettings bind:isOpen={dataSourceOpen} />
				<ExtraFeaturesSettings bind:isOpen={extraOpen} {miningPoolMap} />
				<SystemSettings bind:isOpen={systemOpen} />

				<div class="flex gap-2 mt-4">
					<button type="submit" class="btn btn-sm btn-primary">
						{m['button.save']()}
					</button>
					<button type="button" class="btn btn-sm" onclick={handleReset}>
						{m['button.reset']()}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
