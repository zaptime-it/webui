<script lang="ts">
	import { Col, Container, Input, InputGroup, InputGroupText, Row } from '@sveltestrap/sveltestrap';
	import { onDestroy, onMount } from 'svelte';
	import { encode, decode } from 'msgpack-es';

	let exchangeRates = {
		USD: 57798,
		GBP: 44236,
		AUD: 86552,
		JPY: 8221088,
		EUR: 52347,
		CAD: 78508
	};

	let socket: WebSocket;

	let currencies = { ...exchangeRates };
	let btcValue = 1;
	let satsValue = 100000000;
	let lastEditedField = 'BTC';
	let inputValues = {
		BTC: '1',
		sats: '100000000',
		...Object.fromEntries(
			Object.keys(exchangeRates).map((cur) => [cur, exchangeRates[cur].toString()])
		)
	};

	function updateValues(currency: string, value: string) {
		lastEditedField = currency;
		inputValues[currency] = value;

		let numValue = value === '' ? 0 : parseFloat(value);

		if (currency === 'BTC') {
			btcValue = numValue;
			satsValue = Math.round(numValue * 100000000);
		} else if (currency === 'sats') {
			satsValue = Math.round(numValue);
			btcValue = satsValue / 100000000;
		} else {
			btcValue = numValue / exchangeRates[currency];
			satsValue = Math.round(btcValue * 100000000);
		}

		// Update other currency values
		for (let cur in currencies) {
			if (cur !== currency) {
				currencies[cur] = btcValue * exchangeRates[cur];
				inputValues[cur] = formatValue(currencies[cur], cur);
			}
		}

		inputValues.BTC = formatValue(btcValue, 'BTC');
		inputValues.sats = formatValue(satsValue, 'sats');
	}

	function formatValue(value: number, currency: string): string {
		if (currency === 'sats') {
			return Math.round(value).toString();
		} else if (currency === 'BTC') {
			return value.toFixed(8).replace(/\.?0+$/, '');
		} else {
			return value.toFixed(2);
		}
	}

	// async function fetchExchangeRates() {
	// 	try {
	// 		const response = await fetch('https://ws.btclock.dev/api/lastprice');
	// 		const data = await response.json();
	// 		exchangeRates = data;
	// 		currencies = { ...data };
	// 		updateValues(lastEditedField, inputValues[lastEditedField]);
	// 	} catch (error) {
	// 		console.error('Error fetching exchange rates:', error);
	// 	}
	// }

	onMount(() => {
		socket = new WebSocket('ws://ws.btclock.dev/api/v2/ws');
		socket.binaryType = 'arraybuffer';

		socket.addEventListener('open', () => {
			socket.send(
				encode({
					type: 'subscribe',
					eventType: 'price',
					currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
				})
			);
		});

		socket.addEventListener('message', (event) => {
			let data = decode(event.data);
			if ('price' in data) {
				let currencyKey = Object.keys(data.price);
				exchangeRates[currencyKey] = data.price[currencyKey];
				updateValues(lastEditedField, inputValues[lastEditedField]);
			}
		});
	});

	onDestroy(() => {
		socket.close();
	});
</script>

<Container fluid>
	<Row class="justify-content-center">
		<Col class="col-md-3 col-sm-12">
			<InputGroup size="lg" class="mb-2">
				<InputGroupText class="currencyCode">BTC</InputGroupText>
				<Input
					placeholder="Amount"
					type="number"
					value={inputValues.BTC}
					on:input={(e) => updateValues('BTC', e.target.value)}
				/>
			</InputGroup>
			<InputGroup size="lg" class="mb-2">
				<InputGroupText class="sats currencyCode">s</InputGroupText>
				<Input
					placeholder="Amount"
					type="number"
					value={inputValues.sats}
					on:input={(e) => updateValues('sats', e.target.value)}
				/>
			</InputGroup>
			{#each Object.entries(exchangeRates) as [cur]}
				<InputGroup size="lg" class="mb-2">
					<InputGroupText class="currencyCode">{cur}</InputGroupText>
					<Input
						placeholder="Amount"
						type="number"
						value={inputValues[cur]}
						on:input={(e) => updateValues(cur, e.target.value)}
					/>
				</InputGroup>
			{/each}
		</Col>
	</Row>
</Container>
