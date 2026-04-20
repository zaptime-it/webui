<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { dndzone } from 'svelte-dnd-action';
	import type { Screen } from '$lib/types/settings';

	interface Props {
		screens: Screen[];
		activeCurrencyCount: number;
	}
	let { screens = $bindable(), activeCurrencyCount }: Props = $props();

	// Firmware IDs for BTC ticker, sats-per-currency and market cap.
	// Kept in sync with shared.hpp on the firmware side. When the ordering
	// UI shows one of these rows we annotate it with `× N currencies` so the
	// user understands one slot actually expands into several rotation ticks.
	const CURRENCY_SPECIFIC_IDS: ReadonlySet<number> = new Set([10, 20, 30]);

	const FLIP_MS = 180;

	function handleConsider(e: CustomEvent<{ items: Screen[] }>) {
		screens = e.detail.items;
	}
	function handleFinalize(e: CustomEvent<{ items: Screen[] }>) {
		screens = e.detail.items;
	}

	function moveUp(idx: number) {
		if (idx <= 0) return;
		const next = [...screens];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		screens = next;
	}
	function moveDown(idx: number) {
		if (idx >= screens.length - 1) return;
		const next = [...screens];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		screens = next;
	}
</script>

<p class="text-xs opacity-70 mb-2">{m['section.settings.dragToReorder']()}</p>

<ul
	class="flex flex-col gap-1"
	data-testid="screens-reorder-list"
	use:dndzone={{ items: screens, flipDurationMs: FLIP_MS, dropTargetStyle: {} }}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each screens as s, idx (s.id)}
		<li
			class="flex items-center gap-2 py-1 px-2 rounded border border-base-300 bg-base-100"
			class:opacity-60={!s.enabled}
			data-screen-id={s.id}
		>
			<span class="cursor-grab select-none opacity-60" aria-hidden="true">⋮⋮</span>

			<input
				id="screens_{s.id}"
				type="checkbox"
				class="toggle toggle-sm shrink-0"
				bind:checked={s.enabled}
			/>

			<label
				for="screens_{s.id}"
				class="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
			>
				{s.name}
				{#if CURRENCY_SPECIFIC_IDS.has(s.id) && activeCurrencyCount > 1}
					<span class="badge badge-ghost badge-xs ml-1 align-middle">
						× {activeCurrencyCount}
						{m['section.settings.perCurrency']()}
					</span>
				{/if}
			</label>

			<div class="flex gap-0.5">
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					aria-label={m['button.moveUp']()}
					onclick={() => moveUp(idx)}
					disabled={idx === 0}
					data-testid="move-up-{s.id}"
				>
					↑
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					aria-label={m['button.moveDown']()}
					onclick={() => moveDown(idx)}
					disabled={idx === screens.length - 1}
					data-testid="move-down-{s.id}"
				>
					↓
				</button>
			</div>
		</li>
	{/each}
</ul>
