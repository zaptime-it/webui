<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Writable } from 'svelte/store';
	import {
		Button,
		Card,
		CardBody,
		CardHeader,
		CardTitle,
		Col,
		Form,
		Input,
		Label,
		Row,
		Alert
	} from '@sveltestrap/sveltestrap';
	import FirmwareUpdater from './FirmwareUpdater.svelte';
	import { uiSettings } from '$lib/uiSettings';
	import { Placeholder } from '$lib/components';

	export let settings = {};

	export let customText: string;
	export let status: Writable<{ leds: [] }>;
	let ledStatus = [];
	let keepLedsSameColor = false;

	const setCustomText = () => {
		fetch(`${PUBLIC_BASE_URL}/api/show/text/${customText}`).catch(() => {});
	};

	const checkSyncLeds = (e: Event) => {
		console.log('checksyncleds', keepLedsSameColor);
		if (keepLedsSameColor) {
			console.log(e.target.value);

			ledStatus.forEach((element, i) => {
				if (ledStatus[i].hex != e.target_value) {
					ledStatus[i].hex = e.target.value;
				}
			});
		}
	};

	const setLEDcolor = () => {
		fetch(`${PUBLIC_BASE_URL}/api/lights/set`, {
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'PATCH',
			body: JSON.stringify(ledStatus)
		}).catch(() => {});
	};

	const turnOffLeds = () => {
		fetch(`${PUBLIC_BASE_URL}/api/lights/off`).catch(() => {});
	};

	const turnOnFrontlight = () => {
		fetch(`${PUBLIC_BASE_URL}/api/frontlight/on`).catch(() => {});
	};

	const flashFrontlight = () => {
		fetch(`${PUBLIC_BASE_URL}/api/frontlight/flash`).catch(() => {});
	};

	const turnOffFrontlight = () => {
		fetch(`${PUBLIC_BASE_URL}/api/frontlight/off`).catch(() => {});
	};

	const restartClock = () => {
		fetch(`${PUBLIC_BASE_URL}/api/restart`).catch(() => {});
	};

	const forceFullRefresh = () => {
		fetch(`${PUBLIC_BASE_URL}/api/full_refresh`).catch(() => {});
	};

	let firstLedDataSubscription = () => {};

	firstLedDataSubscription = status.subscribe(async (val) => {
		if (val && val.leds) {
			ledStatus = val.leds.map((obj) => ({ ['hex']: obj['hex'] }));

			for (let led of ledStatus) {
				if (led['hex'] == '#000000') {
					led['hex'] = `#${Math.floor(Math.random() * 16777215)
						.toString(16)
						.padStart(6, '0')}`;
				}
			}

			firstLedDataSubscription();
		}
	});

	onDestroy(firstLedDataSubscription);

	// You can also add more props if needed
	export let xs = 12;
	export let sm = xs;
	export let md = sm;
	export let lg = md;
	export let xl = lg;
	export let xxl = xl;
</script>

<Col {xs} {sm} {md} {lg} {xl} {xxl} class="mb-4 mb-xl-0">
	<Card id="control">
		<CardHeader>
			<CardTitle>{$_('section.control.title', { default: 'Control' })}</CardTitle>
		</CardHeader>
		<CardBody>
			<Form>
				<Row>
					<Label md={4} for="customText" size={$uiSettings.inputSize}
						>{$_('section.control.text')}</Label
					>
					<Col md="8">
						<Input
							type="text"
							id="customText"
							bind:value={customText}
							bsSize="$uiSettings.inputSize"
							maxLength={$settings.numScreens}
						/>
					</Col>
				</Row>
				<Row>
					<Col class="d-flex justify-content-end">
						<Button color="primary" on:click={setCustomText} bsSize={$uiSettings.btnSize}
							>{$_('section.control.showText')}</Button
						>
					</Col>
				</Row>
			</Form>
			<hr />
			{#if !$settings.disableLeds}
				<h3>LEDs</h3>
				<Form>
					<Row>
						<Label md={4} for="ledColorPicker" size={$uiSettings.inputSize}
							>{$_('section.control.ledColor')}</Label
						>
						<Col md="8">
							<Row class="justify-content-between">
								{#if ledStatus}
									{#each ledStatus as led, i}
										<Col>
											<Input
												type="color"
												id="ledColorPicker[{i}]"
												bind:value={led.hex}
												class="mx-auto"
												on:change={checkSyncLeds}
											/>
										</Col>
									{/each}
								{/if}
							</Row>
							<Row>
								<Col class="d-flex justify-content-end">
									<Input
										bind:checked={keepLedsSameColor}
										type="switch"
										label={$_('sections.control.keepSameColor')}
										bsSize={$uiSettings.inputSize}
									/>
								</Col>
							</Row>
						</Col>
					</Row>
					<Row>
						<Col class="d-flex justify-content-end">
							<Button
								color="secondary"
								id="turnOffLedsBtn"
								on:click={turnOffLeds}
								bsSize={$uiSettings.inputSize}>{$_('section.control.turnOff')}</Button
							>
							<div class="mx-2"></div>
							<Button color="primary" on:click={setLEDcolor} bsSize={$uiSettings.inputSize}
								>{$_('section.control.setColor')}</Button
							>
						</Col>
					</Row>
				</Form>
				<hr />
			{/if}
			{#if $settings.hasFrontlight && !$settings.flDisable}
				<h3>{$_('section.control.frontlight')}</h3>
				<Row class="d-flex justify-content-between justify-content-md-end">
					<Col md="auto" class="">
						<Button color="secondary" id="turnOffFrontlightBtn" on:click={turnOffFrontlight}
							>{$_('section.control.turnOff')}</Button
						>
					</Col><Col md="auto" class="">
						<Button color="primary" on:click={turnOnFrontlight}
							>{$_('section.control.turnOn')}</Button
						>
					</Col><Col md="auto" class="">
						<Button color="success" id="flashFrontlight" on:click={flashFrontlight}
							>{$_('section.control.flashFrontlight')}</Button
						>
					</Col>
				</Row>
				<hr />
			{/if}
			<h3>{$_('section.control.systemInfo')}</h3>
			<ul class="small system_info">
				{#if $settings.gitTag}
					<li>
						{$_('section.control.version')}: {$settings.gitTag}
					</li>
				{/if}
				<li>
					{$_('section.control.buildTime')}: <Placeholder
						value={new Date($settings.lastBuildTime * 1000).toLocaleString()}
						checkValue={$settings.lastBuildTime}
					/>
				</li>
				<li>IP: <Placeholder value={$settings.ip} /></li>
				<li>HW revision: <Placeholder value={$settings.hwRev} /></li>
				<li>{$_('section.control.fwCommit')}: <Placeholder value={$settings.gitRev} /></li>
				<li>WebUI commit: <Placeholder value={$settings.fsRev} /></li>
				<li>{$_('section.control.hostname')}: <Placeholder value={$settings.hostname} /></li>
			</ul>
			{#if $settings.gitRev != $settings.fsRev}
				<Alert color="warning">
					⚠️ <strong>{$_('warning')}</strong>: {$_('section.control.fwCommitMismatch')}
				</Alert>
			{/if}
			<Row>
				<Col class="d-flex justify-content-end">
					<Button color="danger" id="restartBtn" on:click={restartClock}
						>{$_('button.restart')}</Button
					>
					<div class="mx-2"></div>

					<Button color="warning" id="forceFullRefresh" on:click={forceFullRefresh}
						>{$_('button.forceFullRefresh')}</Button
					>
				</Col>
			</Row>
			{#if $settings.otaEnabled}
				<hr />
				<h3>{$_('section.control.firmwareUpdate')}</h3>
				<FirmwareUpdater on:showToast bind:settings bind:status />
			{/if}
		</CardBody>
	</Card>
</Col>
