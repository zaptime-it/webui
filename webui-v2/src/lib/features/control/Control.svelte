<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { restartClock, forceFullRefresh, showText } from '$lib/api/client';
	import LedColorPickers from './LedColorPickers.svelte';
	import FrontlightControls from './FrontlightControls.svelte';
	import SystemInfo from './SystemInfo.svelte';
	import FirmwareUpdater from '$lib/features/firmware/FirmwareUpdater.svelte';

	const data = $derived(settingsStore.data);

	let customText = $state('');

	const send = () => {
		if (!customText) return;
		showText(customText).catch(() => {});
	};

	const restart = () => {
		restartClock().catch(() => {});
	};

	const fullRefresh = () => {
		forceFullRefresh().catch(() => {});
	};
</script>

<div class="card bg-base-100 shadow @container" id="control-card">
	<div class="card-body space-y-4">
		<h2 class="card-title">{m['section.control.title']()}</h2>

		<div class="grid grid-cols-1 @sm:grid-cols-3 items-center gap-2">
			<label class="label @sm:col-span-1" for="customText">
				{m['section.control.text']()}
			</label>
			<input
				id="customText"
				type="text"
				class="input input-bordered input-sm w-full @sm:col-span-2"
				bind:value={customText}
				maxlength={data?.numScreens}
			/>
		</div>
		<div class="flex justify-end">
			<button type="button" class="btn btn-sm btn-primary" onclick={send}>
				{m['section.control.showText']()}
			</button>
		</div>

		<hr class="border-base-300" />

		{#if !data?.disableLeds}
			<LedColorPickers />
			<hr class="border-base-300" />
		{/if}

		{#if data?.hasFrontlight && !data?.flDisable}
			<FrontlightControls />
			<hr class="border-base-300" />
		{/if}

		<SystemInfo />

		<div class="flex justify-end gap-2">
			<button type="button" class="btn btn-sm btn-error" id="restartBtn" onclick={restart}>
				{m['button.restart']()}
			</button>
			<button
				type="button"
				class="btn btn-sm btn-warning"
				id="forceFullRefresh"
				onclick={fullRefresh}
			>
				{m['button.forceFullRefresh']()}
			</button>
		</div>

		{#if data?.otaEnabled}
			<hr class="border-base-300" />
			<h3 class="text-lg font-semibold">{m['section.control.firmwareUpdate']()}</h3>
			<FirmwareUpdater />
		{/if}
	</div>
</div>
