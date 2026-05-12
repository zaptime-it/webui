<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import Field from '$lib/ui/Field.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { isValidHexPubKey, getPubKey, isValidNpub } from '$lib/util/nostr';
	import { fetchBitaxeInfo, fetchLocalPoolInfo, FetchError } from '$lib/api/external';
	import { toast } from '$lib/stores/toast.svelte';
	import { DataSourceType } from '$lib/types/settings';
	import NostrRelayList from './NostrRelayList.svelte';

	const describeError = (err: unknown, opts: { thing: string }): [string, string] => {
		if (err instanceof FetchError) {
			if (err.kind === 'timeout') return [`${opts.thing} timed out`, err.message];
			if (err.kind === 'unreachable')
				return [`Could not reach ${opts.thing.toLowerCase()}`, err.message];
			if (err.kind === 'cors')
				return [`${opts.thing} reachable but blocked the request`, err.message];
			if (err.kind === 'http') return [`${opts.thing} returned an error`, err.message];
		}
		return [`${opts.thing} failed`, (err as Error)?.message ?? 'Unknown error'];
	};

	interface Props {
		isOpen?: boolean;
		miningPoolMap: Map<string, string>;
	}
	let { isOpen = $bindable(false), miningPoolMap }: Props = $props();

	const data = $derived(settingsStore.data!);

	let validBitaxe = $state(false);
	let validLocalPool = $state(false);

	// Source of truth for the relay chip list. Falls back to wrapping the
	// legacy singular `nostrRelay` for installs where the firmware hasn't
	// emitted the plural slot yet (pre-rc.4, v3). The PATCH always sends
	// the plural; the firmware bridges back-compat.
	const relays = $derived.by((): string[] => {
		if (Array.isArray(data.nostrRelays)) return data.nostrRelays;
		return data.nostrRelay ? [data.nostrRelay] : [];
	});

	const setRelays = (next: string[]) => {
		data.nostrRelays = next;
		// Echo the array's first entry into the legacy singular slot so any
		// code path that still reads `nostrRelay` (and the device-side bridge)
		// stays order-coherent. The firmware's PATCH bridge prefers the
		// plural; this keeps the GET-shape mirror in sync client-side.
		data.nostrRelay = next[0] ?? '';
	};

	// Normalise a free-form pubkey input — accepts hex or npub, returns
	// the canonical 64-char lowercase hex on success, null on failure.
	// Toasts the npub→hex conversion so the user sees the same feedback
	// the singular nostrPubKey field gives in DataSourceSettings.
	const normalizePubkeyInput = (raw: string): string | null => {
		const trimmed = raw.trim();
		if (!trimmed) return null;
		if (isValidNpub(trimmed)) toast.info(m['section.settings.convertingValidNpub']());
		return getPubKey(trimmed);
	};

	// Cap matches the firmware's kMaxZapPubkeys (settings/nostr_config.hpp).
	// REQ filter size is bounded by this cap on the wire.
	const MAX_ZAP_PUBKEYS = 8;

	// Source of truth for the chip list. Falls back to wrapping the legacy
	// singular `nostrZapPubkey` for installs where the firmware hasn't
	// emitted the plural slot yet (pre-multi firmware, v3). The PATCH
	// always sends the plural.
	const zapPubkeys = $derived.by((): string[] => {
		if (Array.isArray(data.nostrZapPubkeys)) return data.nostrZapPubkeys;
		return data.nostrZapPubkey ? [data.nostrZapPubkey] : [];
	});

	let zapInput = $state('');
	let zapInputError = $state<string | null>(null);

	const setZapPubkeys = (next: string[]) => {
		data.nostrZapPubkeys = next;
		// Keep the legacy singular synced to the array's first entry —
		// the device-side bridge is order-coherent (plural wins on PATCH)
		// but echoing it client-side avoids confusing diff displays in
		// any code path that still reads `nostrZapPubkey`.
		data.nostrZapPubkey = next[0] ?? '';
	};

	const addZapPubkey = () => {
		zapInputError = null;
		if (zapPubkeys.length >= MAX_ZAP_PUBKEYS) {
			zapInputError = m['section.settings.nostrZapPubkeysFull']();
			return;
		}
		const pk = normalizePubkeyInput(zapInput);
		if (!pk) {
			zapInputError = m['section.settings.invalidNostrPubkey']();
			return;
		}
		if (zapPubkeys.includes(pk)) {
			zapInputError = m['section.settings.nostrZapPubkeysDuplicate']();
			return;
		}
		setZapPubkeys([...zapPubkeys, pk]);
		zapInput = '';
	};

	const removeZapPubkey = (idx: number) => {
		setZapPubkeys(zapPubkeys.filter((_, i) => i !== idx));
	};

	const handleZapInputKeydown = (e: KeyboardEvent) => {
		// Enter or comma commits the entry. Pasting a comma-separated
		// list is handled below in the input event.
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addZapPubkey();
		}
	};

	// NWC pairing URI is PATCH-only — same shape as httpAuthPass: the
	// firmware never emits the plaintext on GET, only `nwcUriSet` (bool)
	// and optional `nwcUriMasked` (string). Bind `data.nwcUri` directly;
	// SettingsPanel.handleSubmit drops the field when empty (mirrors the
	// httpAuthPass / otaPass / proxyPass handling on the same path).
	// Clear button writes '' explicitly so the firmware wipes the stored
	// URI and the NwcConfig parser fails-soft on next boot.
	const nwcUriSet = $derived(data.nwcUriSet === true);
	const nwcUriMasked = $derived(data.nwcUriMasked ?? '');
	const clearNwcUri = () => {
		data.nwcUri = '';
		data.nwcEnabled = false;
	};

	const testBitaxe = async () => {
		try {
			const info = await fetchBitaxeInfo(data.bitaxeHostname);
			toast.success(
				`Connected to Bitaxe ${info.ASICModel}`,
				`Board ${info.boardVersion}, firmware ${info.version}, ${Math.round(info.hashRate)} GH/s`
			);
			validBitaxe = true;
		} catch (err) {
			validBitaxe = false;
			const [title, message] = describeError(err, { thing: 'Bitaxe' });
			toast.error(title, message);
		}
	};

	const testLocalPool = async () => {
		try {
			const info = await fetchLocalPoolInfo(data.localPoolHost, data.miningPoolUser ?? '');
			toast.success(`Connected to local pool`, `${info.workersCount} workers`);
			validLocalPool = true;
		} catch (err) {
			validLocalPool = false;
			const [title, message] = describeError(err, { thing: 'Local pool' });
			toast.error(title, message);
		}
	};

	const poolOptions = $derived(
		(data.availablePools ?? []).map((pool: string): [string, string] => [
			miningPoolMap.get(pool) ?? pool,
			pool
		])
	);

	// Pools that expose a ckpool-style /api/v1/pool endpoint — the firmware
	// knows this via MiningPoolInterface::supportsGlobalStats(). Kept in sync
	// by convention: add a pool here if you add the override in firmware.
	const poolsWithGlobalStats = new Set(['noderunners', 'satoshiradio']);
	const supportsGlobalStats = $derived(poolsWithGlobalStats.has(data.miningPoolName));
</script>

<CollapseCard header={m['section.settings.section.extraFeatures']()} bind:isOpen>
	<SwitchField
		id="timeBasedDnd"
		label={m['section.settings.timeBasedDnd']()}
		bind:checked={data.dnd.dndTimeEnabled}
	/>

	{#if data.dnd.dndTimeEnabled}
		<div class="grid grid-cols-2 gap-2 mt-2">
			<NumberField
				id="dndStartHour"
				label={m['section.settings.dndStartHour']()}
				bind:value={data.dnd.startHour}
				min={0}
				max={23}
			/>
			<NumberField
				id="dndStartMinute"
				label={m['section.settings.dndStartMinute']()}
				bind:value={data.dnd.startMinute}
				min={0}
				max={59}
			/>
			<NumberField
				id="dndEndHour"
				label={m['section.settings.dndEndHour']()}
				bind:value={data.dnd.endHour}
				min={0}
				max={23}
			/>
			<NumberField
				id="dndEndMinute"
				label={m['section.settings.dndEndMinute']()}
				bind:value={data.dnd.endMinute}
				min={0}
				max={59}
			/>
		</div>
	{/if}

	{#if data.dataSource === DataSourceType.THIRD_PARTY_SOURCE && ('bitaxeEnabled' in data || 'miningPoolStats' in data || 'nostrZapNotify' in data)}
		<div class="alert alert-warning text-sm mt-4">
			<span
				>⚠️ <strong>{m['warning']()}</strong>: {m[
					'section.settings.thirdPartyExtrasWarning'
				]()}</span
			>
		</div>
	{/if}

	{#if 'bitaxeEnabled' in data}
		<div class="mt-4">
			<h5 class="font-semibold mb-2">Bitaxe</h5>
			<SwitchField
				id="bitaxeEnabled"
				bind:checked={data.bitaxeEnabled}
				label={m['section.settings.bitaxeEnabled']()}
			/>
			{#if data.bitaxeEnabled}
				<div class="mt-2 space-y-2">
					<Field
						id="bitaxeHostname"
						label={m['section.settings.bitaxeHostname']()}
						bind:value={data.bitaxeHostname}
						required
						valid={validBitaxe}
					>
						{#snippet action()}
							<button
								type="button"
								class="join-item btn btn-sm btn-success"
								onclick={testBitaxe}
								data-testid="bitaxe-test-btn"
							>
								Test
							</button>
						{/snippet}
					</Field>
					{#if 'bitaxePollSec' in data}
						<NumberField
							id="bitaxePollSec"
							label={m['section.settings.bitaxePollSec']()}
							bind:value={data.bitaxePollSec}
							min={5}
							max={300}
						/>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if 'miningPoolStats' in data}
		<div class="mt-4">
			<h5 class="font-semibold mb-2">Mining Pool stats</h5>
			<SwitchField
				id="miningPoolStats"
				bind:checked={data.miningPoolStats}
				label={m['section.settings.miningPoolStats']()}
			/>
			{#if data.miningPoolStats}
				<div class="mt-2 space-y-2">
					<SelectField
						id="miningPoolName"
						label={m['section.settings.miningPoolName']()}
						bind:value={data.miningPoolName}
						options={poolOptions}
					/>
					{#if data.miningPoolName === 'local_public_pool'}
						<Field
							id="localPoolHost"
							label="Local Pool Endpoint"
							bind:value={data.localPoolHost}
							placeholder="umbrel.local:2019"
							required
							valid={validLocalPool}
						>
							{#snippet action()}
								<button
									type="button"
									class="join-item btn btn-sm btn-success"
									onclick={testLocalPool}
									data-testid="localpool-test-btn"
								>
									Test
								</button>
							{/snippet}
						</Field>
					{/if}
					{#if supportsGlobalStats}
						<SwitchField
							id="poolGlobalStats"
							bind:checked={data.poolGlobalStats}
							label={m['section.settings.poolGlobalStats']()}
						/>
					{/if}
					<Field
						id="miningPoolUser"
						label={m['section.settings.miningPoolUser']()}
						bind:value={data.miningPoolUser}
						required={!(supportsGlobalStats && data.poolGlobalStats)}
						disabled={supportsGlobalStats && data.poolGlobalStats}
					/>
					{#if 'poolWorker' in data}
						<Field
							id="poolWorker"
							label={m['section.settings.poolWorker']()}
							bind:value={data.poolWorker}
						/>
					{/if}
					{#if 'poolPollSec' in data}
						<NumberField
							id="poolPollSec"
							label={m['section.settings.poolPollSec']()}
							bind:value={data.poolPollSec}
							min={10}
							max={3600}
						/>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if 'nwcEnabled' in data}
		<div class="mt-4">
			<h5 class="font-semibold mb-2">{m['section.settings.nwcHeader']()}</h5>
			<SwitchField
				id="nwcEnabled"
				bind:checked={data.nwcEnabled}
				label={m['section.settings.nwcEnabled']()}
			/>
			{#if data.nwcEnabled || nwcUriSet}
				<div class="mt-2 space-y-2">
					<Field
						id="nwcUri"
						label={m['section.settings.nwcUri']()}
						bind:value={data.nwcUri}
						type="password"
						placeholder={nwcUriSet ? '••••••••' : 'nostr+walletconnect://…'}
						required={!nwcUriSet}
						helpText={nwcUriSet
							? m['section.settings.nwcUriHint']()
							: m['section.settings.nwcUriPlaceholder']()}
					>
						{#snippet action()}
							{#if nwcUriSet}
								<button
									type="button"
									class="join-item btn btn-sm btn-error"
									onclick={clearNwcUri}
									data-testid="nwcUri-clear-btn"
								>
									{m['section.settings.nwcUriClear']()}
								</button>
							{/if}
						{/snippet}
					</Field>
					{#if nwcUriSet && nwcUriMasked}
						<div
							class="text-xs opacity-70 font-mono break-all"
							data-testid="nwcUri-masked"
						>
							{nwcUriMasked}
						</div>
					{/if}
					{#if 'nwcRefreshSecs' in data}
						<NumberField
							id="nwcRefreshSecs"
							label={m['section.settings.nwcRefreshSecs']()}
							bind:value={data.nwcRefreshSecs}
							min={15}
							max={3600}
						/>
					{/if}
					{#if 'nwcFlashOnPay' in data}
						<SwitchField
							id="nwcFlashOnPay"
							bind:checked={data.nwcFlashOnPay}
							label={m['section.settings.nwcFlashOnPay']()}
						/>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if 'nostrZapNotify' in data}
		<div class="mt-4">
			<h5 class="font-semibold mb-2">Nostr</h5>
			<NostrRelayList
				{relays}
				onChange={setRelays}
				idPrefix="nostrRelays"
				label={m['section.settings.nostrRelays']()}
			/>
			<SwitchField
				id="nostrZapNotify"
				bind:checked={data.nostrZapNotify}
				label={m['section.settings.nostrZapNotify']()}
			/>
			{#if data.nostrZapNotify}
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1 mt-2"
				>
					<SwitchField
						id="ledFlashOnZap"
						bind:checked={data.ledFlashOnZap}
						label={m['section.settings.ledFlashOnZap']()}
					/>
					{#if data.hasFrontlight && !data.flDisable}
						<SwitchField
							id="flFlashOnZap"
							bind:checked={data.flFlashOnZap}
							label={m['section.settings.flFlashOnZap']()}
						/>
					{/if}
				</div>
				<SwitchField
					id="screenRestoreZap"
					bind:checked={data.scrnRestoreZap}
					label={((m as unknown as Record<string, ((p?: unknown) => string) | undefined>)[
						'section.settings.screenRestoreZap'
					]?.({ setting: m['section.settings.timePerScreen']() }) ??
						'Restore previous screen state after zap') as string}
				/>
				<div class="form-control mt-2" data-testid="nostrZapPubkeys">
					<label class="label" for="nostrZapPubkeys-input">
						<span class="label-text">{m['section.settings.nostrZapPubkeys']()}</span>
					</label>
					{#if zapPubkeys.length > 0}
						<ul class="flex flex-wrap gap-1 mb-2">
							{#each zapPubkeys as pk, idx (pk)}
								<li
									class="badge badge-lg gap-2 font-mono text-xs"
									class:badge-error={!isValidHexPubKey(pk)}
									class:badge-neutral={isValidHexPubKey(pk)}
									id={`nostrZapPubkeys-${idx}`}
								>
									<span class="truncate max-w-[16ch]" title={pk}>
										{pk.slice(0, 8)}…{pk.slice(-4)}
									</span>
									<button
										type="button"
										class="btn btn-xs btn-ghost btn-circle"
										aria-label={m['section.settings.nostrZapPubkeysRemove']()}
										onclick={() => removeZapPubkey(idx)}
									>
										✕
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<div class="join w-full">
						<input
							id="nostrZapPubkeys-input"
							type="text"
							class="input input-bordered input-sm join-item flex-1 font-mono"
							class:input-error={zapInputError !== null}
							placeholder={m['section.settings.nostrZapPubkeysAdd']()}
							bind:value={zapInput}
							onkeydown={handleZapInputKeydown}
							oninput={() => {
								zapInputError = null;
							}}
							disabled={zapPubkeys.length >= MAX_ZAP_PUBKEYS}
						/>
						<button
							type="button"
							class="btn btn-sm btn-success join-item"
							onclick={addZapPubkey}
							disabled={zapPubkeys.length >= MAX_ZAP_PUBKEYS ||
								zapInput.trim().length === 0}
							data-testid="nostrZapPubkeys-add"
						>
							{m['section.settings.nostrZapPubkeysAddBtn']()}
						</button>
					</div>
					<label class="label" for="nostrZapPubkeys-input">
						<span class="label-text-alt opacity-70">
							{zapInputError ?? m['section.settings.nostrZapPubkeysHint']()}
						</span>
						<span class="label-text-alt opacity-50">
							{zapPubkeys.length}/{MAX_ZAP_PUBKEYS}
						</span>
					</label>
				</div>
			{/if}
		</div>
	{/if}
</CollapseCard>
