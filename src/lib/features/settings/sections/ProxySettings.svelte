<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import Field from '$lib/ui/Field.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);

	// proxyType integer enum mirrors btclock::proxy::Kind in the firmware
	// (proxy_config.hpp). Keep these in lockstep — the bounds check in the
	// settings schema is 0..4 and any drift here would silently submit
	// out-of-range values that the device rejects with `range:proxyType`.
	const PROXY_TYPE_NONE = 0;
	const PROXY_TYPE_HTTP = 1;
	const PROXY_TYPE_SOCKS4 = 2;
	const PROXY_TYPE_SOCKS4A = 3;
	const PROXY_TYPE_SOCKS5 = 4;

	const proxyTypeOptions: Array<[string, number]> = [
		[m['section.settings.proxyTypeHttp'](), PROXY_TYPE_HTTP],
		[m['section.settings.proxyTypeSocks4'](), PROXY_TYPE_SOCKS4],
		[m['section.settings.proxyTypeSocks4a'](), PROXY_TYPE_SOCKS4A],
		[m['section.settings.proxyTypeSocks5'](), PROXY_TYPE_SOCKS5]
	];

	let showPassword = $state(false);

	// Auth fields are meaningful for HTTP CONNECT and SOCKS5 only —
	// SOCKS4/4a have no auth frame in the protocol. Default to HTTP if
	// an older firmware emits proxyType=0 alongside proxyEnabled (it
	// won't, but the optional schema means undefined is reachable here).
	const proxyType = $derived(data.proxyType ?? PROXY_TYPE_HTTP);
	const supportsAuth = $derived(proxyType === PROXY_TYPE_HTTP || proxyType === PROXY_TYPE_SOCKS5);

	// Coerce the user/pass buffers to empty strings before stamping into
	// data — prevents a fresh GET that omitted the field from sending
	// `undefined` back through the PATCH path, which would parse as
	// "no change" rather than "clear".
	$effect(() => {
		if (data.proxyUser === undefined) data.proxyUser = '';
		if (data.proxyPass === undefined) data.proxyPass = '';
		if (data.proxyHost === undefined) data.proxyHost = '';
		if (data.proxyBypass === undefined) data.proxyBypass = '';
		if (data.proxyPort === undefined) data.proxyPort = 1080;
		if (data.proxyType === undefined) data.proxyType = PROXY_TYPE_NONE;
	});
</script>

<CollapseCard header={m['section.settings.section.proxy']()} bind:isOpen>
	<div class="space-y-2">
		<SwitchField
			id="proxyEnabled"
			bind:checked={data.proxyEnabled}
			label={m['section.settings.proxyEnabled']()}
		/>

		{#if data.proxyEnabled}
			<SelectField
				id="proxyType"
				label={m['section.settings.proxyType']()}
				bind:value={data.proxyType}
				options={proxyTypeOptions}
			/>

			<Field
				id="proxyHost"
				label={m['section.settings.proxyHost']()}
				bind:value={data.proxyHost}
				required
			/>

			<NumberField
				id="proxyPort"
				label={m['section.settings.proxyPort']()}
				bind:value={data.proxyPort}
				min={1}
				max={65535}
				step={1}
				required
			/>

			<Field
				id="proxyUser"
				label={m['section.settings.proxyUser']()}
				bind:value={data.proxyUser}
				disabled={!supportsAuth}
				helpText={supportsAuth ? undefined : m['section.settings.proxyAuthIgnoredHelp']()}
			/>

			<Field
				id="proxyPass"
				label={m['section.settings.proxyPass']()}
				bind:value={data.proxyPass}
				type={showPassword ? 'text' : 'password'}
				disabled={!supportsAuth}
				placeholder={data.proxyPassSet ? '••••••••' : ''}
				helpText={!supportsAuth
					? m['section.settings.proxyAuthIgnoredHelp']()
					: data.proxyPassSet
						? m['section.settings.passwordSetLeaveBlank']()
						: undefined}
			>
				{#snippet action()}
					<button
						type="button"
						class="join-item btn btn-sm {showPassword ? 'btn-success' : 'btn-error'}"
						onclick={() => (showPassword = !showPassword)}
						disabled={!supportsAuth}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}<EyeOff size="16" />{:else}<Eye size="16" />{/if}
					</button>
				{/snippet}
			</Field>

			<Field
				id="proxyBypass"
				label={m['section.settings.proxyBypass']()}
				bind:value={data.proxyBypass}
				helpText={m['section.settings.proxyBypassHelp']()}
			/>
		{/if}
	</div>
</CollapseCard>
