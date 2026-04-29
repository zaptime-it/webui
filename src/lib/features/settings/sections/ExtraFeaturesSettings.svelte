<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import Field from '$lib/ui/Field.svelte';
	import NumberField from '$lib/ui/NumberField.svelte';
	import SelectField from '$lib/ui/SelectField.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import {
		isValidHexPubKey,
		getPubKey,
		isValidNpub,
		isValidNostrRelayUrl,
		isValidNostrRelay,
		fetchNostrRelayInfo
	} from '$lib/util/nostr';
	import { fetchBitaxeInfo, fetchLocalPoolInfo, FetchError } from '$lib/api/external';
	import { toast } from '$lib/stores/toast.svelte';
	import { DataSourceType } from '$lib/types/settings';

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
	let validNostrRelay = $state(false);
	let testingNostrRelay = $state(false);

	const relayInvalid = $derived(
		'nostrZapNotify' in data && !isValidNostrRelayUrl(data.nostrRelay ?? '')
	);

	const normalizeNostrKey = (key: 'nostrPubKey' | 'nostrZapPubkey') => {
		const raw = (data[key] as string).trim();
		data[key] = raw;
		if (isValidNpub(raw)) toast.info(m['section.settings.convertingValidNpub']());
		const pk = getPubKey(raw);
		if (pk) data[key] = pk;
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

	const describeRelayInfo = (info: Awaited<ReturnType<typeof fetchNostrRelayInfo>>): string => {
		if (!info) return '';
		const parts: string[] = [];
		if (info.software) {
			parts.push(info.version ? `${info.software} ${info.version}` : info.software);
		} else if (info.version) {
			parts.push(info.version);
		}
		if (Array.isArray(info.supported_nips) && info.supported_nips.length > 0) {
			parts.push(`${info.supported_nips.length} NIPs`);
		}
		return parts.join(' · ');
	};

	const testNostrRelay = async () => {
		if (relayInvalid) {
			toast.error(m['section.settings.invalidNostrRelay']());
			return;
		}
		testingNostrRelay = true;
		try {
			const [ok, info] = await Promise.all([
				isValidNostrRelay(data.nostrRelay),
				fetchNostrRelayInfo(data.nostrRelay)
			]);
			if (ok) {
				const title = info?.name
					? `Connected to ${info.name}`
					: 'Connected to Nostr relay';
				const detail = describeRelayInfo(info) || data.nostrRelay;
				toast.success(title, detail);
				validNostrRelay = true;
			} else {
				validNostrRelay = false;
				toast.error('Could not connect to Nostr relay', data.nostrRelay);
			}
		} catch (err) {
			validNostrRelay = false;
			const [title, message] = describeError(err, { thing: 'Nostr relay' });
			toast.error(title, message);
		} finally {
			testingNostrRelay = false;
		}
	};

	const testLocalPool = async () => {
		try {
			const info = await fetchLocalPoolInfo(data.localPoolHost, data.miningPoolUser);
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

	const zapInvalid = $derived(!isValidHexPubKey(data.nostrZapPubkey ?? ''));
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

	{#if 'nostrZapNotify' in data}
		<div class="mt-4">
			<h5 class="font-semibold mb-2">Nostr</h5>
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
				<Field
					id="nostrZapPubkey"
					label={m['section.settings.nostrZapPubkey']()}
					bind:value={data.nostrZapPubkey}
					required
					minlength={64}
					invalid={zapInvalid}
					helpText={zapInvalid ? m['section.settings.invalidNostrPubkey']() : undefined}
					onChange={() => normalizeNostrKey('nostrZapPubkey')}
				/>
			{/if}
		</div>
	{/if}
</CollapseCard>
