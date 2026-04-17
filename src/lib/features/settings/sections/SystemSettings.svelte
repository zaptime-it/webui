<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Eye from 'lucide-svelte/icons/eye';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import Field from '$lib/ui/Field.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import TimezoneSelector from './TimezoneSelector.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);

	let showPassword = $state(false);

	const wifiTxPowerOptions: Array<[string, number]> = [
		['Default', 80],
		['19.5dBm', 78],
		['19dBm', 76],
		['18.5dBm', 74],
		['17dBm', 68],
		['15dBm', 60],
		['13dBm', 52],
		['11dBm', 44],
		['8.5dBm', 34],
		['7dBm', 28],
		['5dBm', 20]
	];
</script>

<CollapseCard header={m['section.settings.section.system']()} bind:isOpen>
	<div class="space-y-2">
		<TimezoneSelector value={data.tzString} onChange={(v) => (data.tzString = v)} />

		{#if data.httpAuthEnabled}
			<Field
				id="httpAuthUser"
				label={m['section.settings.httpAuthUser']()}
				bind:value={data.httpAuthUser}
				required
			/>
			<div>
				<Field
					id="httpAuthPass"
					label={m['section.settings.httpAuthPass']()}
					bind:value={data.httpAuthPass}
					type={showPassword ? 'text' : 'password'}
					required
				/>
				<div class="flex justify-end mt-1">
					<button
						type="button"
						class="btn btn-sm {showPassword ? 'btn-success' : 'btn-error'}"
						onclick={() => (showPassword = !showPassword)}
					>
						{#if showPassword}<EyeOff size="16" />{:else}<Eye size="16" />{/if}
					</button>
				</div>
			</div>
		{/if}

		<Field
			id="hostnamePrefix"
			label={m['section.settings.hostnamePrefix']()}
			bind:value={data.hostnamePrefix}
			required
		/>

		<SelectField
			id="wifiTxPower"
			label={m['section.settings.wifiTxPower']()}
			bind:value={data.txPower}
			options={wifiTxPowerOptions}
		/>

		<NumberField
			id="wpTimeout"
			label={m['section.settings.wpTimeout']()}
			bind:value={data.wpTimeout}
			min={1}
			step={1}
			required
			suffix={m['time.seconds']()}
		/>
	</div>

	<div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1">
		<SwitchField
			id="otaEnabled"
			bind:checked={data.otaEnabled}
			label="{m['section.settings.otaUpdates']()} ({m['restartRequired']()})"
		/>
		<SwitchField
			id="mdnsEnabled"
			bind:checked={data.mdnsEnabled}
			label="{m['section.settings.enableMdns']()} ({m['restartRequired']()})"
		/>
		<SwitchField
			id="httpAuthEnabled"
			bind:checked={data.httpAuthEnabled}
			label="{m['section.settings.httpAuthEnabled']()} ({m['restartRequired']()})"
		/>
		<SwitchField
			id="inverseButtons"
			bind:checked={data.inverseButtons}
			label={m['section.settings.inverseButtons']()}
		/>
		<SwitchField
			id="enableDebugLog"
			bind:checked={data.enableDebugLog}
			label="{m['section.settings.enableDebugLog']()} ({m['restartRequired']()})"
		/>
	</div>
</CollapseCard>
