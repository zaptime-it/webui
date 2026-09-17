<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { scanDistPeers, type DistScanPeer } from '$lib/api/client';
	import { toast } from '$lib/stores/toast.svelte';

	interface Props {
		peers: string[];
		onChange: (next: string[]) => void;
		idPrefix: string;
		label: string;
		disabled?: boolean;
	}
	let { peers, onChange, idPrefix, label, disabled = false }: Props = $props();

	// Matches the firmware's kMaxDistPeers (settings_api.cpp).
	const MAX_DIST_PEERS = 8;

	let input = $state('');
	let inputError = $state<string | null>(null);
	let scanning = $state(false);

	// Only `,` and whitespace are rejected (they'd corrupt the CSV the
	// firmware stores) — everything else (host, host:port, host:port:panels)
	// is accepted verbatim so the firmware's own parser stays the source of
	// truth for the shape.
	const isValidPeer = (s: string): boolean => s.length > 0 && !/[\s,]/.test(s);

	const addValue = (value: string): boolean => {
		const v = value.trim();
		if (!v) return false;
		if (peers.length >= MAX_DIST_PEERS) {
			inputError = m['section.settings.distPeersFull']();
			return false;
		}
		if (!isValidPeer(v)) {
			inputError = m['section.settings.distPeersInvalid']();
			return false;
		}
		if (peers.includes(v)) {
			inputError = m['section.settings.distPeersDuplicate']();
			return false;
		}
		onChange([...peers, v]);
		return true;
	};

	const addPeer = () => {
		inputError = null;
		if (addValue(input)) input = '';
	};

	const removePeer = (idx: number) => {
		onChange(peers.filter((_, i) => i !== idx));
	};

	// Compose a `host[:port[:panels]]` CSV token from a scan result.
	const peerToken = (p: DistScanPeer): string | null => {
		const host = p.host || p.ip;
		if (!host) return null;
		const port = p.port && p.port !== 80 ? p.port : undefined;
		const panels = p.panels && /^\d+$/.test(p.panels) ? p.panels : undefined;
		// panels needs an explicit port ahead of it in the CSV grammar.
		if (panels) return `${host}:${port ?? 80}:${panels}`;
		if (port) return `${host}:${port}`;
		return host;
	};

	const scan = async () => {
		inputError = null;
		scanning = true;
		try {
			const found = await scanDistPeers();
			let added = 0;
			for (const p of found) {
				const token = peerToken(p);
				// Skip anything already present (by exact token or by host prefix
				// so a bare host and a host:port form of the same device don't
				// both land).
				if (!token) continue;
				const host = token.split(':')[0];
				if (peers.some((x) => x.split(':')[0] === host)) continue;
				if (peers.length + added >= MAX_DIST_PEERS) break;
				onChange([...peers, token]);
				added++;
			}
			if (added > 0) {
				toast.success(m['section.settings.distScanFound']({ count: added }));
			} else {
				toast.info(m['section.settings.distScanNone']());
			}
		} catch {
			toast.error(m['section.settings.distScanFailed']());
		} finally {
			scanning = false;
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addPeer();
		}
	};
</script>

<div class="form-control mt-2" data-testid={idPrefix}>
	<label class="label" for={`${idPrefix}-input`}>
		<span class="label-text">{label}</span>
	</label>
	{#if peers.length > 0}
		<ul class="flex flex-wrap gap-1 mb-2">
			{#each peers as peer, idx (peer)}
				<li
					class="badge badge-lg badge-neutral gap-2 font-mono text-xs"
					id={`${idPrefix}-${idx}`}
				>
					<span class="opacity-50">{idx}</span>
					<span class="truncate max-w-[24ch]" title={peer}>{peer}</span>
					<button
						type="button"
						class="btn btn-xs btn-ghost btn-circle"
						aria-label={m['section.settings.distPeersRemove']()}
						onclick={() => removePeer(idx)}
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
			placeholder={m['section.settings.distPeersAdd']()}
			bind:value={input}
			onkeydown={handleKeydown}
			oninput={() => {
				inputError = null;
			}}
			disabled={disabled || peers.length >= MAX_DIST_PEERS}
		/>
		<button
			type="button"
			class="btn btn-sm btn-success join-item"
			onclick={addPeer}
			disabled={disabled || peers.length >= MAX_DIST_PEERS || input.trim().length === 0}
			data-testid={`${idPrefix}-add`}
		>
			{m['section.settings.distPeersAddBtn']()}
		</button>
		<button
			type="button"
			class="btn btn-sm btn-primary join-item"
			onclick={scan}
			disabled={disabled || scanning || peers.length >= MAX_DIST_PEERS}
			data-testid={`${idPrefix}-scan`}
		>
			{scanning ? m['section.settings.distScanning']() : m['section.settings.distScan']()}
		</button>
	</div>
	<label class="label" for={`${idPrefix}-input`}>
		<span class="label-text-alt opacity-70">
			{inputError ?? m['section.settings.distPeersHint']()}
		</span>
		<span class="label-text-alt opacity-50">
			{peers.length}/{MAX_DIST_PEERS}
		</span>
	</label>
</div>
