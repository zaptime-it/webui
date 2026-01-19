<script lang="ts">
	import { SettingsInput, SettingsSwitch, SettingsSelect } from '$lib/components';
	import * as m from '$lib/paraglide/messages';
	import { Row, Button } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import EyeIcon from 'svelte-bootstrap-icons/lib/Eye.svelte';
	import EyeSlashIcon from 'svelte-bootstrap-icons/lib/EyeSlash.svelte';
	import TimezoneSelector from './TimezoneSelector.svelte';
	import type { PartialSettings } from '$lib/types/settings';

	interface Props {
		settings: PartialSettings;
		isOpen?: boolean;
	}

	let { settings, isOpen = $bindable(false) }: Props = $props();

	let showPassword = $state(false);

	const wifiTxPowerMap = new Map<string, number>([
		['Default', 80],
		['19.5dBm', 78], // 19.5dBm
		['19dBm', 76], // 19dBm
		['18.5dBm', 74], // 18.5dBm
		['17dBm', 68], // 17dBm
		['15dBm', 60], // 15dBm
		['13dBm', 52], // 13dBm
		['11dBm', 44], // 11dBm
		['8.5dBm', 34], // 8.5dBm
		['7dBm', 28], // 7dBm
		['5dBm', 20] // 5dBm
	]);
</script>

<Row>
	<ToggleHeader header={m['section.settings.section.system']()} bind:isOpen defaultOpen={false}>
		<TimezoneSelector
			value={$settings.tzString}
			onChange={(value) => ($settings.tzString = value)}
			size={$uiSettings.inputSize}
		/>

		{#if $settings.httpAuthEnabled}
			<SettingsInput
				id="httpAuthUser"
				label={m['section.settings.httpAuthUser']()}
				bind:value={$settings.httpAuthUser}
				required={true}
				size={$uiSettings.inputSize}
			/>
			<SettingsInput
				id="httpAuthPass"
				label={m['section.settings.httpAuthPass']()}
				bind:value={$settings.httpAuthPass}
				type={showPassword ? 'text' : 'password'}
				required={true}
				size={$uiSettings.inputSize}
			>
				<Button
					type="button"
					on:click={() => (showPassword = !showPassword)}
					color={showPassword ? 'success' : 'danger'}
				>
					{#if !showPassword}<EyeIcon />{:else}<EyeSlashIcon />{/if}
				</Button>
			</SettingsInput>
		{/if}

		<SettingsInput
			id="hostnamePrefix"
			label={m['section.settings.hostnamePrefix']()}
			bind:value={$settings.hostnamePrefix}
			required={true}
			size={$uiSettings.inputSize}
		/>

		<SettingsSelect
			id="wifiTxPower"
			label={m['section.settings.wifiTxPower']()}
			bind:value={$settings.wifiTxPower}
			options={Array.from(wifiTxPowerMap.entries())}
		/>

		<SettingsInput
			id="wpTimeout"
			label={m['section.settings.wpTimeout']()}
			bind:value={$settings.wpTimeout}
			type="number"
			min={1}
			step={1}
			required={true}
			suffix={m['time.seconds']()}
			size={$uiSettings.inputSize}
		/>

		<Row>
			<SettingsSwitch
				id="otaEnabled"
				bind:checked={$settings.otaEnabled}
				label="{m['section.settings.otaUpdates']()} ({m['restartRequired']()})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="mdnsEnabled"
				bind:checked={$settings.mdnsEnabled}
				label="{m['section.settings.enableMdns']()} ({m['restartRequired']()})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="httpAuthEnabled"
				bind:checked={$settings.httpAuthEnabled}
				label="{m['section.settings.httpAuthEnabled']()} ({m['restartRequired']()})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="inverseButtons"
				bind:checked={$settings.inverseButtons}
				label={m['section.settings.inverseButtons']()}
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="enableDebugLog"
				bind:checked={$settings.enableDebugLog}
				label="{m['section.settings.enableDebugLog']()} ({m['restartRequired']()})"
				size={$uiSettings.inputSize}
			/>
		</Row>
	</ToggleHeader>
</Row>
