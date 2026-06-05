<script lang="ts">
	import { createExchangeRates } from './useExchangeRates.svelte';

	const feed = createExchangeRates();

	$effect(() => {
		feed.connect();
		return () => feed.close();
	});

	const SATS_PER_BTC = 100_000_000;

	let lastEdited = $state<string>('BTC');
	let btc = $state(1);

	const formatValue = (value: number, currency: string): string => {
		if (currency === 'sats') return Math.round(value).toString();
		if (currency === 'BTC') return value.toFixed(8).replace(/\.?0+$/, '');
		return value.toFixed(2);
	};

	const derivedValue = (currency: string): string => {
		if (currency === 'BTC') return formatValue(btc, 'BTC');
		if (currency === 'sats') return formatValue(btc * SATS_PER_BTC, 'sats');
		const rate = feed.rates[currency];
		return formatValue(btc * (rate ?? 0), currency);
	};

	let inputValues = $state<Record<string, string>>({
		BTC: '1',
		sats: String(SATS_PER_BTC),
		...Object.fromEntries(Object.entries(feed.rates).map(([k, v]) => [k, String(v)]))
	});

	const handleInput = (currency: string) => (e: Event) => {
		const raw = (e.target as HTMLInputElement).value;
		inputValues[currency] = raw;
		lastEdited = currency;
		const num = raw === '' ? 0 : parseFloat(raw);

		if (currency === 'BTC') btc = num;
		else if (currency === 'sats') btc = num / SATS_PER_BTC;
		else btc = num / (feed.rates[currency] ?? 1);

		for (const key of Object.keys(inputValues)) {
			if (key !== currency) inputValues[key] = derivedValue(key);
		}
	};

	$effect(() => {
		const rates = feed.rates;
		void rates;
		for (const key of Object.keys(inputValues)) {
			if (key !== lastEdited) inputValues[key] = derivedValue(key);
		}
	});

	const fiatCurrencies = $derived(Object.keys(feed.rates));

	const statusLabel = $derived.by(() => {
		switch (feed.status) {
			case 'open':
				return 'Live rates';
			case 'connecting':
				return 'Connecting…';
			case 'closed':
				return 'Disconnected';
			default:
				return 'Connection error';
		}
	});
</script>

<div class="mx-auto w-full max-w-xl">
	<div class="card bg-base-100 shadow border border-base-300 rounded-2xl">
		<div class="card-body gap-4">
			<header class="flex items-center justify-between gap-2">
				<div>
					<h1 class="card-title">Convert</h1>
					<p class="text-sm text-base-content/70">Live Bitcoin exchange rates</p>
				</div>
				<span
					class="conn-pill"
					class:conn-pill--ok={feed.status === 'open'}
					class:conn-pill--bad={feed.status !== 'open'}
					title={statusLabel}
				>
					<span class="conn-dot" aria-hidden="true"></span>
					<span>{statusLabel}</span>
				</span>
			</header>

			<div class="space-y-2">
				<div class="cur-row">
					<span class="cur-code currencyCode" aria-hidden="true">BTC</span>
					<input
						type="number"
						inputmode="decimal"
						class="input input-bordered input-lg cur-input"
						placeholder="0"
						aria-label="BTC"
						value={inputValues.BTC}
						oninput={handleInput('BTC')}
					/>
				</div>
				<div class="cur-row">
					<span class="cur-code currencyCode sats" aria-hidden="true">s</span>
					<input
						type="number"
						inputmode="numeric"
						class="input input-bordered input-lg cur-input"
						placeholder="0"
						aria-label="sats"
						value={inputValues.sats}
						oninput={handleInput('sats')}
					/>
				</div>
			</div>

			<div class="divider my-0 text-xs text-base-content/60">Fiat</div>

			<div class="space-y-2">
				{#each fiatCurrencies as cur (cur)}
					<div class="cur-row">
						<span class="cur-code currencyCode" aria-hidden="true">{cur}</span>
						<input
							type="number"
							inputmode="decimal"
							class="input input-bordered input-lg cur-input"
							placeholder="0"
							aria-label={cur}
							value={inputValues[cur]}
							oninput={handleInput(cur)}
						/>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.cur-row {
		display: flex;
		align-items: stretch;
		width: 100%;
	}
	.cur-code {
		flex: 0 0 4.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.75rem;
		font-weight: 600;
		font-size: 1rem;
		line-height: 1;
		background: color-mix(in oklab, var(--color-base-200) 85%, transparent);
		color: var(--color-base-content);
		border: 1px solid var(--color-base-300);
		/* Logical props so the joined prefix/input group flips under RTL:
		   the prefix rounds on its leading (outer) edge and drops the border
		   facing the input. */
		border-inline-end: 0;
		border-start-start-radius: 0.75rem;
		border-end-start-radius: 0.75rem;
	}
	.cur-code.sats {
		font-family: 'Satoshi Symbol', sans-serif;
		font-size: 1.75rem;
		padding-bottom: 0.1rem;
	}
	.cur-input {
		flex: 1 1 auto;
		min-width: 0;
		border-start-start-radius: 0;
		border-end-start-radius: 0;
	}

	.conn-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.15rem 0.6rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		font-size: 0.72rem;
		font-weight: 500;
		line-height: 1.25;
		white-space: nowrap;
	}
	.conn-pill--ok {
		background: color-mix(in oklab, var(--color-success) 12%, transparent);
		color: color-mix(in oklab, var(--color-success) 70%, var(--color-base-content));
		border-color: color-mix(in oklab, var(--color-success) 35%, transparent);
	}
	.conn-pill--bad {
		background: color-mix(in oklab, var(--color-error) 12%, transparent);
		color: color-mix(in oklab, var(--color-error) 75%, var(--color-base-content));
		border-color: color-mix(in oklab, var(--color-error) 35%, transparent);
	}
	.conn-dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: currentColor;
	}
	.conn-pill--ok .conn-dot {
		animation: conn-pulse 2s ease-in-out infinite;
	}
	@keyframes conn-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in oklab, currentColor 40%, transparent);
		}
		50% {
			box-shadow: 0 0 0 4px color-mix(in oklab, currentColor 0%, transparent);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.conn-pill--ok .conn-dot {
			animation: none;
		}
	}

	/* Compact currency-code label used by both BTC/sats and the fiat
	   inputs above. DaisyUI 5's `.join-item.btn` layout already handles
	   sizing, so this only sets the typographic presentation. */
	.currencyCode {
		text-align: center;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}
</style>
