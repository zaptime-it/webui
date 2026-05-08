<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
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

	type SectionKey = 'screen' | 'display' | 'dataSource' | 'extra' | 'system';
	const SECTIONS_OPEN_KEY = 'settings.sectionsOpen';
	const sectionDefaults: Record<SectionKey, boolean> = {
		screen: true,
		display: false,
		dataSource: false,
		extra: false,
		system: false
	};

	const loadSectionsOpen = (): Record<SectionKey, boolean> => {
		if (!browser) return { ...sectionDefaults };
		try {
			const raw = localStorage.getItem(SECTIONS_OPEN_KEY);
			if (!raw) return { ...sectionDefaults };
			const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>;
			const merged = { ...sectionDefaults };
			for (const k of Object.keys(sectionDefaults) as SectionKey[]) {
				if (typeof parsed[k] === 'boolean') merged[k] = parsed[k] as boolean;
			}
			return merged;
		} catch {
			return { ...sectionDefaults };
		}
	};

	const sectionsOpen = $state(loadSectionsOpen());

	$effect(() => {
		if (!browser) return;
		try {
			localStorage.setItem(SECTIONS_OPEN_KEY, JSON.stringify(sectionsOpen));
		} catch {
			// non-fatal (quota/disabled storage): just lose persistence
		}
	});

	const showAll = () => {
		for (const k of Object.keys(sectionsOpen) as SectionKey[]) sectionsOpen[k] = true;
	};
	const hideAll = () => {
		for (const k of Object.keys(sectionsOpen) as SectionKey[]) sectionsOpen[k] = false;
	};

	const handleReset = async (e: Event) => {
		e.preventDefault();
		await settingsStore.load();
	};

	// Ctrl+S / Cmd+S saves while this panel is mounted and always suppresses
	// the browser "save page" dialog for this shortcut.
	const handleKeydown = (e: KeyboardEvent) => {
		const isSaveCombo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';
		if (!isSaveCombo) return;
		e.preventDefault();
		if (!settingsStore.isDirty) return;
		void handleSubmit(e);
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

		// Screen rotation order travels in the `order` field per entry.
		// Stamp the current array index so the firmware can treat the save
		// as a reorder PATCH (it requires the full set, every entry with
		// an `order`) rather than a visibility-only PATCH.
		if (patch.screens) {
			patch.screens = patch.screens.map((s, i) => ({ ...s, order: i }));
		}

		try {
			const res = await settingsStore.save(patch);
			if (res.ok) toast.success(m['section.settings.settingsSaved']());
			else toast.error(`${res.status}: ${res.statusText}`);
		} catch {
			toast.error(m['section.settings.errorSavingSettings']());
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="card bg-base-100 shadow @container" id="settings-card">
	<div class="card-body space-y-4">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<h2 class="card-title">
				{m['section.settings.title']()}
				{#if settingsStore.isDirty}
					<span
						class="badge badge-warning badge-sm ml-2 align-middle whitespace-nowrap"
						data-testid="settings-dirty-badge"
						role="status"
					>
						{m['section.settings.unsavedChanges']()}
					</span>
				{/if}
			</h2>
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
				<ScreenSpecificSettings bind:isOpen={sectionsOpen.screen} />
				<DisplaySettings bind:isOpen={sectionsOpen.display} />
				<DataSourceSettings bind:isOpen={sectionsOpen.dataSource} />
				<ExtraFeaturesSettings bind:isOpen={sectionsOpen.extra} {miningPoolMap} />
				<SystemSettings bind:isOpen={sectionsOpen.system} />

				<div class="flex items-center gap-2 mt-4">
					<button type="submit" class="btn btn-sm btn-primary" disabled={!settingsStore.isDirty}>
						{m['button.save']()}
					</button>
					<button
						type="button"
						class="btn btn-sm"
						onclick={handleReset}
						disabled={!settingsStore.isDirty}
					>
						{m['button.reset']()}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
