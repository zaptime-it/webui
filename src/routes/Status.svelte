<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';

	import { _ } from 'svelte-i18n';
	import { writable } from 'svelte/store';
	import {
		Button,
		ButtonGroup,
		Card,
		CardBody,
		CardHeader,
		CardTitle,
		Col,
		Input,
		Progress,
		Tooltip,
		Row
	} from '@sveltestrap/sveltestrap';
	import Rendered from './Rendered.svelte';

	export let settings;
	export let status: writable<object>;

	// Function to split array into chunks
	const chunkArray = (array, chunkSize) => {
		const result = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			result.push(array.slice(i, i + chunkSize));
		}
		return result;
	};
	let buttonChunks = chunkArray([], 6);

	const toTime = (secs: number) => {
		var hours = Math.floor(secs / (60 * 60));

		var divisor_for_minutes = secs % (60 * 60);
		var minutes = Math.floor(divisor_for_minutes / 60);

		var divisor_for_seconds = divisor_for_minutes % 60;
		var seconds = Math.ceil(divisor_for_seconds);

		var obj = {
			h: hours,
			m: minutes,
			s: seconds
		};
		return obj;
	};

	const toUptimestring = (secs: number): string => {
		let time = toTime(secs);

		return `${time.h}h ${time.m}m ${time.s}s`;
	};

	let memoryFreePercent: number = 50;
	let rssiPercent: number = 50;
	let wifiStrengthColor: string = 'info';
	let lightMode: boolean = false;

	status.subscribe((value: object) => {
		memoryFreePercent = Math.round((value.espFreeHeap / value.espHeapSize) * 100);

		rssiPercent = Math.round(((value.rssi + 120) / (-30 + 120)) * 100);

		if (value.rssi > -55) {
			wifiStrengthColor = 'success';
		} else if (value.rssi < -87) {
			wifiStrengthColor = 'warning';
		} else {
			wifiStrengthColor = 'info';
		}
	});

	settings.subscribe((value: object) => {
		lightMode = value.bgColor > value.fgColor;

		if (value.screens) buttonChunks = chunkArray(value.screens, 5);
	});

	const setScreen = (id: number) => () => {
		fetch(`${PUBLIC_BASE_URL}/api/show/screen/${id}`).catch(() => {});
	};

	const setCurrency = (c: string) => () => {
		fetch(`${PUBLIC_BASE_URL}/api/show/currency/${c}`).catch(() => {});
	};

	const toggleTimer = (currentStatus: boolean) => (e: Event) => {
		e.preventDefault();
		if (currentStatus) {
			fetch(`${PUBLIC_BASE_URL}/api/action/pause`);
		} else {
			fetch(`${PUBLIC_BASE_URL}/api/action/timer_restart`);
		}
	};

	export let xs = 12;
	export let sm = xs;
	export let md = sm;
	export let lg = md;
	export let xl = lg;
	export let xxl = xl;
</script>

<Col {xs} {sm} {md} {lg} {xl} {xxl} class="mb-4 mb-xl-0">
	<Card id="status">
		<CardHeader>
			<CardTitle>{$_('section.status.title', { default: 'Status' })}</CardTitle>
		</CardHeader>
		<CardBody>
			{#if $settings.screens}
				<div class=" d-block d-sm-none mx-auto text-center">
					{#each buttonChunks as chunk}
						<ButtonGroup size="sm" class="mx-auto mb-1">
							{#each chunk as s}
								<Button
									color="outline-primary"
									active={$status.currentScreen == s.id}
									on:click={setScreen(s.id)}>{s.name}</Button
								>
							{/each}
						</ButtonGroup>
					{/each}
				</div>
				<div class="d-flex justify-content-center d-none d-sm-flex">
					<ButtonGroup size="sm">
						{#each $settings.screens as s}
							<Button
								color="outline-primary"
								active={$status.currentScreen == s.id}
								on:click={setScreen(s.id)}>{s.name}</Button
							>
						{/each}
					</ButtonGroup>
				</div>
				{#if $settings.actCurrencies && $settings.ownDataSource}
					<div class="d-flex justify-content-center d-sm-flex mt-2">
						<ButtonGroup size="sm">
							{#each $settings.actCurrencies as c}
								<Button
									color="outline-success"
									active={$status.currency == c}
									on:click={setCurrency(c)}>{c}</Button
								>
							{/each}
						</ButtonGroup>
					</div>
				{/if}
				<hr />
				{#if $status.data}
					<section class={lightMode ? 'lightMode' : 'darkMode'}>
						<Rendered status={$status} className="btclock-wrapper"></Rendered>
					</section>
					{$_('section.status.screenCycle')}:
					<a
						id="timerStatusText"
						href={'#'}
						style="cursor: pointer"
						tabindex="0"
						role="button"
						aria-pressed="false"
						on:click={toggleTimer($status.timerRunning)}
						>{#if $status.timerRunning}&#9205; {$_('timer.running')}{:else}&#9208; {$_(
								'timer.stopped'
							)}{/if}</a
					>
				{/if}
			{/if}
			<hr />
			{#if !$settings.disableLeds}
				<Row class="justify-content-evenly">
					{#if $status.leds}
						{#each $status.leds as led}
							<Col>
								<Input
									type="color"
									id="ledColorPicker"
									bind:value={led.hex}
									class="mx-auto"
									disabled
								/>
							</Col>
						{/each}
					{/if}
				</Row>
				<hr />
			{/if}
			<Progress striped value={memoryFreePercent}>{memoryFreePercent}%</Progress>
			<div class="d-flex justify-content-between">
				<div>{$_('section.status.memoryFree')}</div>
				<div>
					{Math.round($status.espFreeHeap / 1024)} / {Math.round($status.espHeapSize / 1024)} KiB
				</div>
			</div>
			<hr />
			{#if $settings.hasLightLevel}
				{$_('section.status.lightSensor')}: {Number(Math.round($status.lightLevel))} lux
				<hr />
			{/if}
			<Progress striped id="rssiBar" color={wifiStrengthColor} value={rssiPercent}
				>{rssiPercent}%</Progress
			>
			<Tooltip target="rssiBar" placement="bottom">{$_('rssiBar.tooltip')}</Tooltip>

			<div class="d-flex justify-content-between">
				<div>{$_('section.status.wifiSignalStrength')}</div>
				<div>
					{$status.rssi} dBm
				</div>
			</div>
			<hr />
			{$_('section.status.uptime')}: {toUptimestring($status.espUptime)}
			<br />
			<p>
				{#if $settings.useNostr || $settings.nostrZapNotify}
					{$_('section.status.nostrConnection')}:
					<span>
						{#if $status.connectionStatus && $status.connectionStatus.nostr}
							&#9989;
						{:else}
							&#10060;
						{/if}
					</span>
				{/if}
				{#if !$settings.useNostr}
					{#if !$settings.ownDataSource}
						{$_('section.status.wsPriceConnection')}:
						<span>
							{#if $status.connectionStatus && $status.connectionStatus.price}
								&#9989;
							{:else}
								&#10060;
							{/if}
						</span>
						-
						{$_('section.status.wsMempoolConnection', {
							values: { instance: $settings.mempoolInstance }
						})}:
						<span>
							{#if $status.connectionStatus && $status.connectionStatus.blocks}
								&#9989;
							{:else}
								&#10060;
							{/if}
						</span><br />
					{:else}
						{$_('section.status.wsDataConnection')}:
						<span>
							{#if $status.connectionStatus && $status.connectionStatus.V2}
								&#9989;
							{:else}
								&#10060;
							{/if}
						</span>
					{/if}
				{/if}
				{#if $settings.fetchEurPrice}
					<small>{$_('section.status.fetchEuroNote')}</small>
				{/if}
			</p>
		</CardBody>
	</Card>
</Col>
