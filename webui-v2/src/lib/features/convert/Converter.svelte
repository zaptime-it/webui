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
</script>

<div class="flex justify-center">
	<div class="w-full md:w-1/3">
		<div class="join w-full mb-2">
			<span class="currencyCode join-item btn btn-lg pointer-events-none">BTC</span>
			<input
				type="number"
				class="input input-bordered input-lg join-item w-full"
				placeholder="Amount"
				value={inputValues.BTC}
				oninput={handleInput('BTC')}
			/>
		</div>
		<div class="join w-full mb-2">
			<span class="sats currencyCode join-item btn btn-lg pointer-events-none">s</span>
			<input
				type="number"
				class="input input-bordered input-lg join-item w-full"
				placeholder="Amount"
				value={inputValues.sats}
				oninput={handleInput('sats')}
			/>
		</div>
		{#each Object.keys(feed.rates) as cur (cur)}
			<div class="join w-full mb-2">
				<span class="currencyCode join-item btn btn-lg pointer-events-none">{cur}</span>
				<input
					type="number"
					class="input input-bordered input-lg join-item w-full"
					placeholder="Amount"
					value={inputValues[cur]}
					oninput={handleInput(cur)}
				/>
			</div>
		{/each}
	</div>
</div>
