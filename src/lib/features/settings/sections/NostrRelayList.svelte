<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { isValidNostrRelayUrl, isValidNostrRelay, fetchNostrRelayInfo } from '$lib/util/nostr';
	import { toast } from '$lib/stores/toast.svelte';

	interface Props {
		relays: string[];
		onChange: (next: string[]) => void;
		// DOM ids embed this prefix so two instances of the list (Data Source
		// + Extra Features sections both render the same shared list) don't
		// clash when the user opens both CollapseCards at once.
		idPrefix: string;
		label: string;
		disabled?: boolean;
	}
	let { relays, onChange, idPrefix, label, disabled = false }: Props = $props();

	// Cap matches the firmware's kMaxNostrRelays (settings/nostr_config.hpp).
	// Each entry opens one WebSocket; the data source and zap listener share
	// a single WSS per relay via NIP-01 multi-sub.
	const MAX_NOSTR_RELAYS = 4;

	// Cap how long we wait for the browser-side WSS handshake before
	// declaring the relay unreachable. nostr-tools' Relay.connect doesn't
	// expose a timeout knob, so we race it ourselves. 8s is comfortably
	// above the relays we've measured (~300ms) and below the user's
	// patience threshold for a button click.
	const RELAY_PROBE_TIMEOUT_MS = 8000;

	let input = $state('');
	let inputError = $state<string | null>(null);
	let testing = $state(false);

	const probeRelay = async (url: string): Promise<boolean> => {
		const probe = isValidNostrRelay(url);
		const timeout = new Promise<boolean>((resolve) =>
			setTimeout(() => resolve(false), RELAY_PROBE_TIMEOUT_MS)
		);
		return Promise.race([probe, timeout]);
	};

	const addRelay = async () => {
		inputError = null;
		const url = input.trim();
		if (!url) return;
		if (relays.length >= MAX_NOSTR_RELAYS) {
			inputError = m['section.settings.nostrRelaysFull']();
			return;
		}
		if (!isValidNostrRelayUrl(url)) {
			inputError = m['section.settings.invalidNostrRelay']();
			return;
		}
		if (relays.includes(url)) {
			inputError = m['section.settings.nostrRelaysDuplicate']();
			return;
		}
		// Probe the relay from the browser before persisting it. A relay
		// that won't open a WSS handshake from here usually won't open one
		// from the device either — refusing to add it short-circuits a
		// "saved but never connects" mystery. NIP-11 metadata is fetched
		// in parallel for the success toast; its absence isn't fatal
		// (some private relays don't serve NIP-11).
		testing = true;
		try {
			const [reachable, info] = await Promise.all([
				probeRelay(url),
				fetchNostrRelayInfo(url)
			]);
			if (!reachable) {
				inputError = m['section.settings.nostrRelaysUnreachable']();
				return;
			}
			const title = info?.name
				? `${m['section.settings.nostrRelaysAddedTitle']()}: ${info.name}`
				: m['section.settings.nostrRelaysAddedTitle']();
			toast.success(title, url);
			onChange([...relays, url]);
			input = '';
		} finally {
			testing = false;
		}
	};

	const removeRelay = (idx: number) => {
		onChange(relays.filter((_, i) => i !== idx));
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			void addRelay();
		}
	};
</script>

<div class="form-control mt-2" data-testid={idPrefix}>
	<label class="label" for={`${idPrefix}-input`}>
		<span class="label-text">{label}</span>
	</label>
	{#if relays.length > 0}
		<ul class="flex flex-wrap gap-1 mb-2">
			{#each relays as url, idx (url)}
				<li
					class="badge badge-lg gap-2 font-mono text-xs"
					class:badge-error={!isValidNostrRelayUrl(url)}
					class:badge-neutral={isValidNostrRelayUrl(url)}
					id={`${idPrefix}-${idx}`}
				>
					<span class="truncate max-w-[24ch]" title={url}>{url}</span>
					<button
						type="button"
						class="btn btn-xs btn-ghost btn-circle"
						aria-label={m['section.settings.nostrRelaysRemove']()}
						onclick={() => removeRelay(idx)}
						{disabled}
					>
						✕
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="join w-full">
		<input
			id={`${idPrefix}-input`}
			type="text"
			class="input input-bordered input-sm join-item flex-1 font-mono"
			class:input-error={inputError !== null}
			placeholder={m['section.settings.nostrRelaysAdd']()}
			bind:value={input}
			onkeydown={handleKeydown}
			oninput={() => {
				inputError = null;
			}}
			disabled={disabled || testing || relays.length >= MAX_NOSTR_RELAYS}
		/>
		<button
			type="button"
			class="btn btn-sm btn-success join-item"
			onclick={addRelay}
			disabled={disabled ||
				testing ||
				relays.length >= MAX_NOSTR_RELAYS ||
				input.trim().length === 0}
			data-testid={`${idPrefix}-add`}
		>
			{testing ? '…' : m['section.settings.nostrRelaysAddBtn']()}
		</button>
	</div>
	<label class="label" for={`${idPrefix}-input`}>
		<span class="label-text-alt opacity-70">
			{inputError ?? m['section.settings.nostrRelaysHint']()}
		</span>
		<span class="label-text-alt opacity-50">
			{relays.length}/{MAX_NOSTR_RELAYS}
		</span>
	</label>
</div>
