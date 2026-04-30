<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { parseSettingsError } from '$lib/api/client';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { validateSettings, type FieldValidationError } from '$lib/util/validation';
	import ScreenSpecificSettings from './sections/ScreenSpecificSettings.svelte';
	import DisplaySettings from './sections/DisplaySettings.svelte';
	import DataSourceSettings from './sections/DataSourceSettings.svelte';
	import ExtraFeaturesSettings from './sections/ExtraFeaturesSettings.svelte';
	import SystemSettings from './sections/SystemSettings.svelte';

	// Map firmware top-level error scopes / pseudo-fields onto the
	// CollapseCard the user needs to expand to see the offending input.
	// Real key names (e.g. `fontName`, `timerSeconds`) live in section
	// content and resolve via the field's id, not via this map.
	const sectionForField: Record<
		string,
		'screen' | 'display' | 'dataSource' | 'extra' | 'system'
	> = {
		screens: 'screen',
		currency: 'screen',
		actCurrencies: 'screen',
		dnd: 'extra',
		bitaxe: 'extra',
		miningPool: 'extra',
		nostr: 'extra',
		fontName: 'display',
		invertedColor: 'display',
		flMaxBrightness: 'display',
		dataSource: 'dataSource',
		hostnamePrefix: 'system',
		mdnsEnabled: 'system',
		httpAuthUser: 'system',
		httpAuthPass: 'system',
		otaPass: 'system',
		otaEnabled: 'system'
	};

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
			// quota / disabled storage — non-fatal, just lose persistence
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

	const validationErrors = $derived(
		validateSettings(settingsStore.data, {
			invalidNostrPubkey: m['section.settings.invalidNostrPubkey']()
		})
	);

	const focusError = (err: FieldValidationError) => (e: MouseEvent) => {
		e.preventDefault();
		// Pop the section that owns the field open before scrolling — anchors
		// inside a closed CollapseCard scroll to the (now empty) collapsed
		// header, not the input.
		if (err.section in sectionsOpen) sectionsOpen[err.section as SectionKey] = true;
		queueMicrotask(() => {
			const el = document.getElementById(err.id);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			(el as HTMLInputElement).focus?.();
		});
	};

	// Ctrl+S / Cmd+S triggers a save when the form is dirty. The browser's
	// default for Cmd+S is "save page as…" — we always preventDefault while
	// the settings card is mounted so the browser dialog never pops up over
	// the dashboard, even on a clean form.
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
			if (res.ok) {
				toast.success(m['section.settings.settingsSaved']());
				return;
			}
			// Firmware shape: { error: "<field>:<reason>" } or "range:<field>".
			// Surface the field name + reason and pop open the section that
			// owns it, so the user lands on the offending input.
			const parsed = parseSettingsError(res.body?.error ?? res.text);
			if (parsed.field) {
				const section = sectionForField[parsed.field];
				if (section) sectionsOpen[section] = true;
				// Also try to scroll to the input if its id matches the field name.
				queueMicrotask(() => {
					const el = document.getElementById(parsed.field as string);
					if (el?.scrollIntoView)
						el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				});
				toast.error(`${parsed.field}: ${parsed.reason || res.statusText}`);
			} else {
				toast.error(parsed.reason || `${res.status}: ${res.statusText}`);
			}
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
			{#if validationErrors.length > 0}
				<div
					role="alert"
					class="alert alert-error alert-sm flex flex-col items-start gap-2"
					data-testid="validation-summary"
				>
					<strong>{m['section.settings.validationSummary']()}</strong>
					<ul class="list-disc pl-5 text-sm">
						{#each validationErrors as err (err.id)}
							<li>
								<a
									href="#{err.id}"
									class="link link-hover"
									onclick={focusError(err)}
									data-testid="validation-link-{err.id}"
								>
									{err.field}: {err.message}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if settingsStore.hasRemoteDrift}
				<div
					role="alert"
					class="alert alert-warning alert-sm flex flex-col items-start gap-2 sm:flex-row sm:items-center"
					data-testid="remote-drift-banner"
				>
					<span class="grow">{m['section.settings.remoteDriftWarning']()}</span>
					<div class="flex gap-2">
						<button
							type="button"
							class="btn btn-xs btn-primary"
							onclick={async () => {
								await settingsStore.load();
							}}
						>
							{m['button.reload']()}
						</button>
						<button
							type="button"
							class="btn btn-xs btn-ghost"
							onclick={() => settingsStore.dismissRemoteDrift()}
						>
							{m['button.dismiss']()}
						</button>
					</div>
				</div>
			{/if}
			<form onsubmit={handleSubmit} class="space-y-4">
				<ScreenSpecificSettings bind:isOpen={sectionsOpen.screen} />
				<DisplaySettings bind:isOpen={sectionsOpen.display} />
				<DataSourceSettings bind:isOpen={sectionsOpen.dataSource} />
				<ExtraFeaturesSettings bind:isOpen={sectionsOpen.extra} {miningPoolMap} />
				<SystemSettings bind:isOpen={sectionsOpen.system} />

				<div class="flex items-center gap-2 mt-4">
					<button
						type="submit"
						class="btn btn-sm btn-primary"
						disabled={!settingsStore.isDirty}
					>
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
