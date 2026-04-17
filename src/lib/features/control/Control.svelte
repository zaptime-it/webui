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

		<section class="control-row" data-accent="primary">
			<div class="space-y-2">
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
			</div>
		</section>

		{#if !data?.disableLeds}
			<section class="control-row" data-accent="secondary">
				<LedColorPickers />
			</section>
		{/if}

		{#if data?.hasFrontlight && !data?.flDisable}
			<section class="control-row" data-accent="warning">
				<FrontlightControls />
			</section>
		{/if}

		<section class="control-row" data-accent="info">
			<div class="space-y-3">
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
			</div>
		</section>

		{#if data?.otaEnabled}
			<section class="control-row" data-accent="accent">
				<div class="space-y-3">
					<h3 class="text-lg font-semibold">{m['section.control.firmwareUpdate']()}</h3>
					<FirmwareUpdater />
				</div>
			</section>
		{/if}
	</div>
</div>
