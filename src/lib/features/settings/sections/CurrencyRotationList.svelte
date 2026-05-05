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

	// Above this threshold the inactive set is large enough (e.g. nostr's
	// long-list mode) that listing every currency as a checkbox row gets
	// unwieldy. Switch to "active list + typeahead-add" UX in that case.
	const LARGE_LIST_THRESHOLD = 10;

	const FLIP_MS = 180;

	// Local reorderable state. Below the threshold this matches the original
	// behaviour: actives first in rotation order, then inactives in canonical
	// order — re-enabling a disabled currency keeps it where it sits. Above
	// the threshold only enabled currencies appear; inactives live in the
	// add-currency typeahead instead.
	function computeRows(avail: string[], act: string[], large: boolean): CurrencyRow[] {
		const actSet = new Set(act);
		const actives = act.map((c) => ({ id: c, code: c, enabled: true }));
		if (large) return actives;
		return [
			...actives,
			...avail.filter((c) => !actSet.has(c)).map((c) => ({ id: c, code: c, enabled: false }))
		];
	}

	const largeMode = $derived(availableCurrencies.length > LARGE_LIST_THRESHOLD);

	// svelte-ignore state_referenced_locally
	let rows = $state<CurrencyRow[]>(computeRows(availableCurrencies, actCurrencies, largeMode));

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
			rows = computeRows(availableCurrencies, actCurrencies, largeMode);
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

	// Large-mode "remove" action: drops the row entirely, since inactives
	// no longer live in the visible list — the user can re-add via typeahead.
	function removeAt(idx: number) {
		const row = rows[idx];
		if (!row) return;
		rows = rows.filter((_, i) => i !== idx);
		void row;
		commit();
	}

	// Large-mode add-typeahead state. The dropdown shows up to MAX_SUGGESTIONS
	// inactive currencies whose code contains the query (case-insensitive).
	const MAX_SUGGESTIONS = 8;
	let query = $state('');
	let suggestionsOpen = $state(false);
	let highlightIdx = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const inactiveCurrencies = $derived.by(() => {
		const actSet = new Set(rows.filter((r) => r.enabled).map((r) => r.code));
		return availableCurrencies.filter((c) => !actSet.has(c));
	});

	const suggestions = $derived.by(() => {
		const q = query.trim().toUpperCase();
		const pool = inactiveCurrencies;
		const matched = q ? pool.filter((c) => c.toUpperCase().includes(q)) : pool;
		return matched.slice(0, MAX_SUGGESTIONS);
	});

	$effect(() => {
		// Reset the highlighted index whenever the suggestion set shrinks
		// past it (e.g. typing narrows the list to one result).
		if (highlightIdx >= suggestions.length) highlightIdx = 0;
	});

	function addCode(code: string) {
		if (!availableCurrencies.includes(code)) return;
		if (rows.some((r) => r.code === code && r.enabled)) return;
		// Drop any disabled instance (defensive — shouldn't occur in largeMode
		// since rows holds only enabled rows there) before appending.
		const next = rows.filter((r) => r.code !== code);
		next.push({ id: code, code, enabled: true });
		rows = next;
		query = '';
		suggestionsOpen = false;
		commit();
		inputEl?.focus();
	}

	function onInput(e: Event) {
		query = (e.target as HTMLInputElement).value;
		suggestionsOpen = true;
		highlightIdx = 0;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			suggestionsOpen = true;
			if (suggestions.length === 0) return;
			highlightIdx = (highlightIdx + 1) % suggestions.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (suggestions.length === 0) return;
			highlightIdx = (highlightIdx - 1 + suggestions.length) % suggestions.length;
		} else if (e.key === 'Enter') {
			if (!suggestionsOpen || suggestions.length === 0) return;
			e.preventDefault();
			const pick = suggestions[highlightIdx];
			if (pick) addCode(pick);
		} else if (e.key === 'Escape') {
			suggestionsOpen = false;
		}
	}

	function onBlur() {
		// Defer so a click on a suggestion can register before the dropdown
		// unmounts. The click handler itself closes the menu.
		setTimeout(() => {
			suggestionsOpen = false;
		}, 120);
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

			{#if largeMode}
				<span
					class="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
				>
					{r.code}
				</span>
			{:else}
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
			{/if}

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
				{#if largeMode}
					<button
						type="button"
						class="btn btn-ghost btn-xs"
						aria-label={m['section.settings.removeCurrency']()}
						onclick={() => removeAt(idx)}
						data-testid="currency-remove-{r.code}"
					>
						✕
					</button>
				{/if}
			</div>
		</li>
	{/each}
</ul>

{#if largeMode}
	<div
		class="dropdown w-full mt-3"
		class:dropdown-open={suggestionsOpen && suggestions.length > 0}
		data-testid="currency-add-typeahead"
	>
		<input
			type="text"
			class="input input-sm input-bordered w-full"
			placeholder={m['section.settings.addCurrency']()}
			aria-label={m['section.settings.addCurrency']()}
			value={query}
			bind:this={inputEl}
			oninput={onInput}
			onkeydown={onKeydown}
			onfocus={() => (suggestionsOpen = true)}
			onblur={onBlur}
			autocomplete="off"
			data-testid="currency-add-input"
		/>
		{#if suggestionsOpen && suggestions.length > 0}
			<ul
				class="menu dropdown-content bg-base-100 rounded-box shadow z-[1000] w-full mt-1 p-1 max-h-64 overflow-auto"
				role="listbox"
				data-testid="currency-add-suggestions"
			>
				{#each suggestions as code, i (code)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={i === highlightIdx}
							class:menu-active={i === highlightIdx}
							onmousedown={(e) => e.preventDefault()}
							onclick={() => addCode(code)}
							data-testid="currency-add-suggestion-{code}"
						>
							{code}
						</button>
					</li>
				{/each}
			</ul>
		{:else if suggestionsOpen && query.trim().length > 0}
			<div
				class="dropdown-content bg-base-100 rounded-box shadow z-[1000] w-full mt-1 p-2 text-sm opacity-70"
				data-testid="currency-add-empty"
			>
				{m['section.settings.noMatchingCurrency']()}
			</div>
		{/if}
	</div>
{/if}
