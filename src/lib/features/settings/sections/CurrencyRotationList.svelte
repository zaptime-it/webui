<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { dndzone } from 'svelte-dnd-action';

	interface CurrencyRow {
		id: string;
		code: string;
		enabled: boolean;
	}

	interface Props {
		availableCurrencies: string[];
		actCurrencies: string[];
		onChange: (newActCurrencies: string[]) => void;
	}
	let { availableCurrencies, actCurrencies, onChange }: Props = $props();

	// Local reorderable state. Shows all available currencies — active ones
	// first in their rotation order, then inactive in canonical order. Only
	// the active subset (in list order) is persisted back to the store, so
	// re-enabling a disabled currency appends it at the end. Matches the
	// "enabling a feature-gated screen puts it at the end" behaviour on the
	// screen rotation side.
	const FLIP_MS = 180;

	function computeRows(avail: string[], act: string[]): CurrencyRow[] {
		const actSet = new Set(act);
		return [
			...act.map((c) => ({ id: c, code: c, enabled: true })),
			...avail.filter((c) => !actSet.has(c)).map((c) => ({ id: c, code: c, enabled: false }))
		];
	}

	// svelte-ignore state_referenced_locally
	let rows = $state<CurrencyRow[]>(computeRows(availableCurrencies, actCurrencies));

	// Tracker so our own writes don't retrigger a rebuild and clobber the
	// user's in-flight drag. External prop changes (store reset, settings
	// reload) still rebuild, because their snapshot differs from what we
	// last committed. The initial-value capture is intentional — the
	// $effect below keeps these in sync with the live props.
	// svelte-ignore state_referenced_locally
	let lastSeenAct = $state(actCurrencies.join(','));
	// svelte-ignore state_referenced_locally
	let lastSeenAvail = $state(availableCurrencies.join(','));

	$effect(() => {
		const actKey = actCurrencies.join(',');
		const availKey = availableCurrencies.join(',');
		if (actKey !== lastSeenAct || availKey !== lastSeenAvail) {
			rows = computeRows(availableCurrencies, actCurrencies);
			lastSeenAct = actKey;
			lastSeenAvail = availKey;
		}
	});

	function commit() {
		const newActive = rows.filter((r) => r.enabled).map((r) => r.code);
		// Echo the write into our tracker before calling onChange so the
		// $effect above sees the matching snapshot and skips the rebuild.
		lastSeenAct = newActive.join(',');
		onChange(newActive);
	}

	function handleConsider(e: CustomEvent<{ items: CurrencyRow[] }>) {
		rows = e.detail.items;
	}
	function handleFinalize(e: CustomEvent<{ items: CurrencyRow[] }>) {
		rows = e.detail.items;
		commit();
	}

	function moveUp(idx: number) {
		if (idx <= 0 || idx >= rows.length) return;
		const next = [...rows];
		const a = next[idx - 1] as CurrencyRow;
		const b = next[idx] as CurrencyRow;
		next[idx - 1] = b;
		next[idx] = a;
		rows = next;
		commit();
	}
	function moveDown(idx: number) {
		if (idx < 0 || idx >= rows.length - 1) return;
		const next = [...rows];
		const a = next[idx] as CurrencyRow;
		const b = next[idx + 1] as CurrencyRow;
		next[idx] = b;
		next[idx + 1] = a;
		rows = next;
		commit();
	}
	function toggle(idx: number) {
		const row = rows[idx];
		if (!row) return;
		row.enabled = !row.enabled;
		commit();
	}
</script>

<p class="text-xs opacity-70 mb-2">{m['section.settings.dragToReorder']()}</p>

<ul
	class="flex flex-col gap-1"
	data-testid="currencies-reorder-list"
	use:dndzone={{ items: rows, flipDurationMs: FLIP_MS, dropTargetStyle: {} }}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each rows as r, idx (r.id)}
		<li
			class="flex items-center gap-2 py-1 px-2 rounded border border-base-300 bg-base-100"
			class:opacity-60={!r.enabled}
			data-currency-code={r.code}
		>
			<span class="cursor-grab select-none opacity-60" aria-hidden="true">⋮⋮</span>

			<input
				id="currency_{r.code}"
				type="checkbox"
				class="checkbox checkbox-sm shrink-0"
				checked={r.enabled}
				onchange={() => toggle(idx)}
			/>

			<label
				for="currency_{r.code}"
				class="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
			>
				{r.code}
			</label>

			<div class="flex gap-0.5">
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					aria-label={m['button.moveUp']()}
					onclick={() => moveUp(idx)}
					disabled={idx === 0}
					data-testid="currency-move-up-{r.code}"
				>
					↑
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					aria-label={m['button.moveDown']()}
					onclick={() => moveDown(idx)}
					disabled={idx === rows.length - 1}
					data-testid="currency-move-down-{r.code}"
				>
					↓
				</button>
			</div>
		</li>
	{/each}
</ul>
