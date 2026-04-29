<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import Field from '$lib/ui/Field.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { DataSourceType } from '$lib/types/settings';
	import {
		isValidHexPubKey,
		getPubKey,
		isValidNpub,
		isValidNostrRelayUrl,
		isValidNostrRelay
	} from '$lib/util/nostr';
	import { toast } from '$lib/stores/toast.svelte';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(false) }: Props = $props();

	const data = $derived(settingsStore.data!);

	const normalizeNostrKey = (key: 'nostrPubKey' | 'nostrZapPubkey') => {
		const raw = (data[key] as string).trim();
		data[key] = raw;
		if (isValidNpub(raw)) toast.info(m['section.settings.convertingValidNpub']());
		const pk = getPubKey(raw);
		if (pk) data[key] = pk;
	};

	const pubkeyInvalid = $derived(!isValidHexPubKey(data.nostrPubKey ?? ''));
	const relayInvalid = $derived(!isValidNostrRelayUrl(data.nostrRelay ?? ''));

	let validNostrRelay = $state(false);
	let testingNostrRelay = $state(false);

	const testNostrRelay = async () => {
		if (relayInvalid) {
			toast.error(m['section.settings.invalidNostrRelay']());
			return;
		}
		testingNostrRelay = true;
		try {
			const ok = await isValidNostrRelay(data.nostrRelay);
			if (ok) {
				toast.success('Connected to Nostr relay', data.nostrRelay);
				validNostrRelay = true;
			} else {
				validNostrRelay = false;
				toast.error('Could not connect to Nostr relay', data.nostrRelay);
			}
		} catch {
			validNostrRelay = false;
			toast.error('Could not connect to Nostr relay', data.nostrRelay);
		} finally {
			testingNostrRelay = false;
		}
	};
</script>

<CollapseCard header={m['section.settings.section.dataSource']()} bind:isOpen>
	<h5 class="font-semibold mb-2">Data Source</h5>
	<div class="grid grid-cols-1 xl:grid-cols-2 gap-2 mb-4">
		<label class="label cursor-pointer justify-start gap-2" for="btclock_source">
			<input
				type="radio"
				id="btclock_source"
				name="dataSource"
				class="radio radio-sm"
				bind:group={data.dataSource}
				value={DataSourceType.BTCLOCK_SOURCE}
			/>
			<span class="label-text">{m['section.settings.dataSource.btclock']()}</span>
		</label>
		<label class="label cursor-pointer justify-start gap-2" for="third_party_source">
			<input
				type="radio"
				id="third_party_source"
				name="dataSource"
				class="radio radio-sm"
				bind:group={data.dataSource}
				value={DataSourceType.THIRD_PARTY_SOURCE}
			/>
			<span class="label-text">{m['section.settings.dataSource.thirdParty']()}</span>
		</label>
		{#if data.nostrRelay}
			<label class="label cursor-pointer justify-start gap-2" for="nostr_source">
				<input
					type="radio"
					id="nostr_source"
					name="dataSource"
					class="radio radio-sm"
					bind:group={data.dataSource}
					value={DataSourceType.NOSTR_SOURCE}
				/>
				<span class="label-text">{m['section.settings.dataSource.nostr']()}</span>
			</label>
		{/if}
		<label class="label cursor-pointer justify-start gap-2" for="custom_source">
			<input
				type="radio"
				id="custom_source"
				name="dataSource"
				class="radio radio-sm"
				bind:group={data.dataSource}
				value={DataSourceType.CUSTOM_SOURCE}
			/>
			<span class="label-text">{m['section.settings.dataSource.custom']()}</span>
		</label>
	</div>

	<div class="space-y-2">
		{#if data.dataSource === DataSourceType.THIRD_PARTY_SOURCE}
			<Field
				id="mempoolInstance"
				label={m['section.settings.mempoolnstance']()}
				bind:value={data.mempoolInstance}
				required
			/>
			<label class="label cursor-pointer justify-end gap-2" for="mempoolSecure">
				<span class="label-text">HTTPS</span>
				<input
					id="mempoolSecure"
					type="checkbox"
					class="checkbox checkbox-sm"
					bind:checked={data.mempoolSecure}
				/>
			</label>
		{/if}

		{#if data.dataSource === DataSourceType.NOSTR_SOURCE}
			<Field
				id="nostrRelay"
				label={m['section.settings.nostrRelay']()}
				bind:value={data.nostrRelay}
				required
				invalid={relayInvalid}
				valid={validNostrRelay}
				helpText={relayInvalid ? m['section.settings.invalidNostrRelay']() : undefined}
			>
				{#snippet action()}
					<button
						type="button"
						class="join-item btn btn-sm btn-success"
						onclick={testNostrRelay}
						disabled={relayInvalid || testingNostrRelay}
						data-testid="nostrrelay-test-btn"
					>
						{testingNostrRelay ? '...' : 'Test'}
					</button>
				{/snippet}
			</Field>
			<Field
				id="nostrPubKey"
				label={m['section.settings.nostrPubKey']()}
				bind:value={data.nostrPubKey}
				required
				minlength={64}
				invalid={pubkeyInvalid}
				helpText={pubkeyInvalid ? m['section.settings.invalidNostrPubkey']() : undefined}
				onChange={() => normalizeNostrKey('nostrPubKey')}
			/>
		{/if}

		{#if data.dataSource === DataSourceType.CUSTOM_SOURCE}
			<Field
				id="ceEndpoint"
				label={m['section.settings.ceEndpoint']()}
				bind:value={data.ceEndpoint}
				required
			/>
			<SwitchField
				id="ceDisableSSL"
				bind:checked={data.ceDisableSSL}
				label={m['section.settings.ceDisableSSL']()}
			/>
		{/if}
	</div>
</CollapseCard>
