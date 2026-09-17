<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import DistPeerList from './DistPeerList.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);

	// 0 = off, 1 = master, 2 = slave — matches the firmware's distMode enum.
	const modeOptions: Array<[string, number]> = [
		[m['section.settings.distModeOff'](), 0],
		[m['section.settings.distModeMaster'](), 1],
		[m['section.settings.distModeSlave'](), 2]
	];

	const peers = $derived(data.distPeers ?? []);
	const isMaster = $derived(data.distMode === 1);

	// Capability gate: firmware without the distributed-display feature
	// (anything before the dist-display branch landed) never emits
	// `distMode`. Rendering the section anyway would let the <select>
	// `bind:value` seed `distMode = 0` into the store on mount, which
	// flips `isDirty` (badge + beforeunload prompt) before the user
	// touched anything and leaks `distMode` into every PATCH. Same idiom
	// as the `hideLeadZero` / `wifiRebootMin` gates.
	const supported = $derived('distMode' in data);
</script>

{#if supported}
	<CollapseCard header={m['section.settings.section.distributed']()} bind:isOpen>
		<div class="space-y-2">
			<SelectField
				id="distMode"
				label="{m['section.settings.distMode']()} ({m['restartRequired']()})"
				bind:value={data.distMode}
				options={modeOptions}
				helpText={m['section.settings.distModeHelp']()}
			/>

			{#if isMaster}
				<DistPeerList
					idPrefix="distPeers"
					label="{m['section.settings.distPeers']()} ({m['restartRequired']()})"
					{peers}
					onChange={(next) => (data.distPeers = next)}
				/>

				<NumberField
					id="distSelfIdx"
					label="{m['section.settings.distSelfIdx']()} ({m['restartRequired']()})"
					bind:value={data.distSelfIdx}
					min={0}
					max={Math.max(0, peers.length - 1)}
					step={1}
					helpText={m['section.settings.distSelfIdxHelp']()}
				/>
			{/if}

			{#if data.distMode === 2}
				<p class="text-sm opacity-70">{m['section.settings.distSlaveHelp']()}</p>
			{/if}
		</div>
	</CollapseCard>
{/if}
