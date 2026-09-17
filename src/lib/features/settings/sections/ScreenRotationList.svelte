<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { dndzone } from 'svelte-dnd-action';
	import { screenRotationValidation } from '$lib/stores/screenRotationValidation.svelte';
	import type { Screen } from '$lib/types/settings';
	import { isDebtScreen } from '$lib/util/screens';

	interface Props {
		screens: Screen[];
		activeCurrencyCount: number;
	}
	let { screens = $bindable(), activeCurrencyCount }: Props = $props();
	let debtListOpen = $state(false);

	type ScreenRow = { id: number; rowType: 'screen'; screen: Screen };
	type DebtRow = { id: string; rowType: 'debt' };
	type RotationRow = ScreenRow | DebtRow;

	// Firmware IDs for BTC ticker, sats-per-currency and market cap.
	// Kept in sync with shared.hpp on the firmware side. When the ordering
	// UI shows one of these rows we annotate it with `× N currencies` so the
	// user understands one slot actually expands into several rotation ticks.
	const CURRENCY_SPECIFIC_IDS: ReadonlySet<number> = new Set([10, 20, 30]);
	const DEBT_ROW_ID = 'debt';

	const FLIP_MS = 180;

	function debtScreens() {
		return screens.filter(isDebtScreen);
	}

	function debtGroupEnabled() {
		return debtListOpen || debtScreens().some((screen) => screen.enabled);
	}

	const debtSelectionRequired = $derived(
		debtListOpen && debtScreens().length > 0 && !debtScreens().some((screen) => screen.enabled)
	);

	$effect(() => {
		screenRotationValidation.debtSelectionRequired = debtSelectionRequired;
		return () => {
			screenRotationValidation.debtSelectionRequired = false;
		};
	});

	function computeRows(allScreens: Screen[]) {
		const rows: RotationRow[] = [];
		let debtAdded = false;

		for (const screen of allScreens) {
			if (isDebtScreen(screen)) {
				if (!debtAdded) {
					rows.push({ id: DEBT_ROW_ID, rowType: 'debt' });
					debtAdded = true;
				}
				continue;
			}

			rows.push({ id: screen.id, rowType: 'screen', screen });
		}

		return rows;
	}

	function screenSnapshot(allScreens: Screen[]) {
		return allScreens
			.map(
				(screen) => `${screen.id}:${screen.enabled ? 1 : 0}:${isDebtScreen(screen) ? 1 : 0}`
			)
			.join(',');
	}

	let rows = $state<RotationRow[]>(computeRows(screens));
	let lastSeenScreens = $state(screenSnapshot(screens));

	$effect(() => {
		const key = screenSnapshot(screens);
		if (key !== lastSeenScreens) {
			rows = computeRows(screens);
			lastSeenScreens = key;
		}
	});

	function commitScreens(next: Screen[]) {
		screens = next;
		rows = computeRows(next);
		lastSeenScreens = screenSnapshot(next);
	}

	function applyRows(nextRows: RotationRow[]) {
		const debts = debtScreens();
		const byId = new Map(
			screens.filter((screen) => !isDebtScreen(screen)).map((screen) => [screen.id, screen])
		);
		const next: Screen[] = [];
		let debtAdded = false;

		for (const row of nextRows) {
			if (row.rowType === 'debt') {
				if (!debtAdded) {
					next.push(...debts);
					debtAdded = true;
				}
				continue;
			}

			const screen = byId.get(row.screen.id);
			if (screen) next.push(screen);
		}

		if (!debtAdded) next.push(...debts);
		commitScreens(next);
	}

	function eventChecked(e: Event) {
		return (e.currentTarget as HTMLInputElement).checked;
	}

	function setScreenEnabled(id: number, enabled: boolean) {
		commitScreens(
			screens.map((screen) => (screen.id === id ? { ...screen, enabled } : screen))
		);
	}

	function setDebtScreenEnabled(id: number, enabled: boolean) {
		if (enabled) debtListOpen = true;
		setScreenEnabled(id, enabled);
	}

	function setDebtGroupEnabled(enabled: boolean) {
		debtListOpen = enabled;
		if (!enabled) {
			commitScreens(
				screens.map((screen) =>
					isDebtScreen(screen) ? { ...screen, enabled: false } : screen
				)
			);
		}
	}

	function handleConsider(e: CustomEvent<{ items: RotationRow[] }>) {
		rows = e.detail.items;
	}

	function handleFinalize(e: CustomEvent<{ items: RotationRow[] }>) {
		applyRows(e.detail.items);
	}

	function moveUp(idx: number) {
		if (idx <= 0 || idx >= rows.length) return;
		const next = [...rows];
		const a = next[idx - 1] as RotationRow;
		const b = next[idx] as RotationRow;
		next[idx - 1] = b;
		next[idx] = a;
		applyRows(next);
	}

	function moveDown(idx: number) {
		if (idx < 0 || idx >= rows.length - 1) return;
		const next = [...rows];
		const a = next[idx] as RotationRow;
		const b = next[idx + 1] as RotationRow;
		next[idx] = b;
		next[idx + 1] = a;
		applyRows(next);
	}
</script>

<p class="text-xs opacity-70 mb-2">{m['section.settings.dragToReorder']()}</p>

<ul
	class="flex flex-col gap-1"
	data-testid="screens-reorder-list"
	use:dndzone={{ items: rows, flipDurationMs: FLIP_MS, dropTargetStyle: {} }}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each rows as row, idx (row.id)}
		<li
			class="flex items-center gap-2 py-1 px-2 rounded border border-base-300 bg-base-100"
			class:opacity-60={row.rowType === 'debt' ? !debtGroupEnabled() : !row.screen.enabled}
			data-screen-id={row.id}
		>
			<span class="cursor-grab select-none opacity-60" aria-hidden="true">⋮⋮</span>

			<input
				id="screens_{row.id}"
				type="checkbox"
				class="toggle toggle-sm shrink-0"
				checked={row.rowType === 'debt' ? debtGroupEnabled() : row.screen.enabled}
				onchange={(e) =>
					row.rowType === 'debt'
						? setDebtGroupEnabled(eventChecked(e))
						: setScreenEnabled(row.screen.id, eventChecked(e))}
			/>

			<label
				for="screens_{row.id}"
				class="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
			>
				{row.rowType === 'debt' ? m['section.settings.debt']() : row.screen.name}
				{#if row.rowType === 'screen' && CURRENCY_SPECIFIC_IDS.has(row.screen.id) && activeCurrencyCount > 1}
					<span class="badge badge-ghost badge-xs ms-1 align-middle">
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
					data-testid="move-up-{row.id}"
				>
					↑
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					aria-label={m['button.moveDown']()}
					onclick={() => moveDown(idx)}
					disabled={idx === rows.length - 1}
					data-testid="move-down-{row.id}"
				>
					↓
				</button>
			</div>
		</li>
	{/each}
</ul>

{#if debtScreens().length > 0 && debtGroupEnabled()}
	<h5 class="font-semibold mb-2 mt-4">{m['section.settings.debtScreens']()}</h5>
	<p class="mb-2 text-xs opacity-70">{m['section.settings.debtScreensHint']()}</p>
	<ul
		class="debt-screen-list grid max-h-[14.75rem] grid-cols-1 gap-1 overflow-y-auto rounded border border-base-300 p-2 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2"
		data-testid="debt-screen-list"
		id="debt-screen-list"
		data-debt-invalid={debtSelectionRequired}
		aria-label={m['section.settings.debtScreens']()}
	>
		{#each debtScreens() as screen (screen.id)}
			<li
				class="flex min-h-10 items-center gap-2 rounded border border-base-300 bg-base-100 px-2 py-1"
				class:opacity-60={!screen.enabled}
				data-screen-id={screen.id}
			>
				<input
					id="debt_screen_{screen.id}"
					type="checkbox"
					class="toggle toggle-sm shrink-0"
					checked={screen.enabled}
					onchange={(e) => setDebtScreenEnabled(screen.id, eventChecked(e))}
				/>

				<label
					for="debt_screen_{screen.id}"
					class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm"
				>
					{screen.name}
				</label>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.debt-screen-list {
		scrollbar-color: hsl(var(--bc) / 0.35) transparent;
		scrollbar-width: thin;
	}

	.debt-screen-list::-webkit-scrollbar {
		width: 0.25rem;
	}

	.debt-screen-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.debt-screen-list::-webkit-scrollbar-thumb {
		background-color: hsl(var(--bc) / 0.35);
		border-radius: 999px;
	}
</style>
