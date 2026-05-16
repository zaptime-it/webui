<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
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

	// 3.4.0: GET /api/settings no longer returns httpAuthPass / otaPass.
	// The form input is a PATCH-only buffer; empty means "don't change".
	// `*Set` booleans from the device tell us whether one is currently stored
	// so the UI can show "password is set" / "no password set".
	let showHttpAuthPassword = $state(false);
	let showOtaPassword = $state(false);

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
			<Field
				id="httpAuthPass"
				label={m['section.settings.httpAuthPass']()}
				bind:value={data.httpAuthPass}
				type={showHttpAuthPassword ? 'text' : 'password'}
				placeholder={data.httpAuthPassSet ? '••••••••' : ''}
				required={!data.httpAuthPassSet}
				helpText={data.httpAuthPassSet
					? m['section.settings.passwordSetLeaveBlank']()
					: undefined}
			>
				{#snippet action()}
					<button
						type="button"
						class="join-item btn btn-sm {showHttpAuthPassword
							? 'btn-success'
							: 'btn-error'}"
						onclick={() => (showHttpAuthPassword = !showHttpAuthPassword)}
						aria-label={showHttpAuthPassword ? 'Hide password' : 'Show password'}
					>
						{#if showHttpAuthPassword}<EyeOff size="16" />{:else}<Eye size="16" />{/if}
					</button>
				{/snippet}
			</Field>
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
		{#if 'wifiRebootMin' in data}
			<NumberField
				id="wifiRebootMin"
				label={m['section.settings.wifiRebootMin']()}
				bind:value={data.wifiRebootMin}
				min={0}
				max={120}
				step={1}
				suffix={m['time.minutes']()}
			/>
		{/if}
	</div>

	<div
		class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1"
	>
		<SwitchField
			id="otaEnabled"
			bind:checked={data.otaEnabled}
			label="{m['section.settings.otaUpdates']()} ({m['restartRequired']()})"
		/>
		{#if data.otaEnabled}
			<div class="md:col-span-2 lg:col-span-1 2xl:col-span-2">
				<Field
					id="otaPass"
					label={m['section.settings.otaPass']()}
					bind:value={data.otaPass}
					type={showOtaPassword ? 'text' : 'password'}
					placeholder={data.otaPassSet ? '••••••••' : ''}
					helpText={data.otaPassSet
						? m['section.settings.passwordSetLeaveBlank']()
						: m['section.settings.otaPassHelp']()}
				>
					{#snippet action()}
						<button
							type="button"
							class="join-item btn btn-sm {showOtaPassword
								? 'btn-success'
								: 'btn-error'}"
							onclick={() => (showOtaPassword = !showOtaPassword)}
							aria-label={showOtaPassword ? 'Hide password' : 'Show password'}
						>
							{#if showOtaPassword}<EyeOff size="16" />{:else}<Eye size="16" />{/if}
						</button>
					{/snippet}
				</Field>
			</div>
		{/if}
		<SwitchField
			id="mdnsEnabled"
			bind:checked={data.mdnsEnabled}
			label={m['section.settings.enableMdns']()}
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
