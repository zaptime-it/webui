<script lang="ts">
	import { SettingsInput, SettingsSwitch } from '$lib/components';
	import { _ } from 'svelte-i18n';
	import { Row, Button } from '@sveltestrap/sveltestrap';
	import ToggleHeader from '../ToggleHeader.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import EyeIcon from 'svelte-bootstrap-icons/lib/Eye.svelte';
	import EyeSlashIcon from 'svelte-bootstrap-icons/lib/EyeSlash.svelte';
	import TimezoneSelector from './TimezoneSelector.svelte';

	export let settings;
	export let isOpen = false;

	let showPassword = false;
</script>

<Row>
	<ToggleHeader header={$_('section.settings.section.system')} bind:isOpen defaultOpen={false}>
		<TimezoneSelector
			value={$settings.tzString}
			onChange={(value) => ($settings.tzString = value)}
			size={$uiSettings.inputSize}
		/>

		{#if $settings.httpAuthEnabled}
			<SettingsInput
				id="httpAuthUser"
				label={$_('section.settings.httpAuthUser')}
				bind:value={$settings.httpAuthUser}
				required={true}
				size={$uiSettings.inputSize}
			/>
			<SettingsInput
				id="httpAuthPass"
				label={$_('section.settings.httpAuthPass')}
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
			label={$_('section.settings.hostnamePrefix')}
			bind:value={$settings.hostnamePrefix}
			required={true}
			size={$uiSettings.inputSize}
		/>

		<SettingsInput
			id="wpTimeout"
			label={$_('section.settings.wpTimeout')}
			bind:value={$settings.wpTimeout}
			type="number"
			min={1}
			step={1}
			required={true}
			suffix={$_('time.seconds')}
			size={$uiSettings.inputSize}
		/>

		<Row>
			<SettingsSwitch
				id="otaEnabled"
				bind:checked={$settings.otaEnabled}
				label="{$_('section.settings.otaUpdates')} ({$_('restartRequired')})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="mdnsEnabled"
				bind:checked={$settings.mdnsEnabled}
				label="{$_('section.settings.enableMdns')} ({$_('restartRequired')})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="httpAuthEnabled"
				bind:checked={$settings.httpAuthEnabled}
				label="{$_('section.settings.httpAuthEnabled')} ({$_('restartRequired')})"
				size={$uiSettings.inputSize}
			/>
			<SettingsSwitch
				id="enableDebugLog"
				bind:checked={$settings.enableDebugLog}
				label="{$_('section.settings.enableDebugLog')} ({$_('restartRequired')})"
				size={$uiSettings.inputSize}
			/>
		</Row>
	</ToggleHeader>
</Row>
