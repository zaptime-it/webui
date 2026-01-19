<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { onDestroy } from 'svelte';
	import * as m from '$lib/paraglide/messages';
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
	import type { PartialSettings } from '$lib/types/settings';

	interface Props {
		settings?: PartialSettings;
		status: Writable<{ leds: [] }>;
		// You can also add more props if needed
		xs?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
		xxl?: number;
	}

	let {
		settings = $bindable({}),
		status = $bindable(),
		xs = 12,
		sm = xs,
		md = sm,
		lg = md,
		xl = lg,
		xxl = xl
	}: Props = $props();

	let customText: string = $state();
	let ledStatus = $state([]);
	let keepLedsSameColor = $state(false);

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
</script>

<Col {xs} {sm} {md} {lg} {xl} {xxl} class="mb-4 mb-xl-0">
	<Card id="control">
		<CardHeader>
			<CardTitle>{m['section.control.title']()}</CardTitle>
		</CardHeader>
		<CardBody>
			<Form>
				<Row>
					<Label md={4} for="customText" size={$uiSettings.inputSize}
						>{m['section.control.text']()}</Label
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
						<Button color="primary" onclick={setCustomText} bsSize={$uiSettings.btnSize}
							>{m['section.control.showText']()}</Button
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
							>{m['section.control.ledColor']()}</Label
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
												onchange={checkSyncLeds}
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
										label={m['sections.control.keepSameColor']()}
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
								onclick={turnOffLeds}
								bsSize={$uiSettings.inputSize}>{m['section.control.turnOff']()}</Button
							>
							<div class="mx-2"></div>
							<Button color="primary" onclick={setLEDcolor} bsSize={$uiSettings.inputSize}
								>{m['section.control.setColor']()}</Button
							>
						</Col>
					</Row>
				</Form>
				<hr />
			{/if}
			{#if $settings.hasFrontlight && !$settings.flDisable}
				<h3>{m['section.control.frontlight']()}</h3>
				<Row class="d-flex justify-content-between justify-content-md-end">
					<Col md="auto" class="">
						<Button color="secondary" id="turnOffFrontlightBtn" onclick={turnOffFrontlight}
							>{m['section.control.turnOff']()}</Button
						>
					</Col><Col md="auto" class="">
						<Button color="primary" onclick={turnOnFrontlight}
							>{m['section.control.turnOn']()}</Button
						>
					</Col><Col md="auto" class="">
						<Button color="success" id="flashFrontlight" onclick={flashFrontlight}
							>{m['section.control.flashFrontlight']()}</Button
						>
					</Col>
				</Row>
				<hr />
			{/if}
			<h3>{m['section.control.systemInfo']()}</h3>
			<ul class="small system_info">
				{#if $settings.gitTag}
					<li>
						{m['section.control.version']()}: {$settings.gitTag}
					</li>
				{/if}
				<li>
					{m['section.control.buildTime']()}: <Placeholder
						value={new Date($settings.lastBuildTime * 1000).toLocaleString()}
						checkValue={$settings.lastBuildTime}
					/>
				</li>
				<li>IP: <Placeholder value={$settings.ip} /></li>
				<li>HW revision: <Placeholder value={$settings.hwRev} /></li>
				<li>{m['section.control.fwCommit']()}: <Placeholder value={$settings.gitRev} /></li>
				<li>WebUI commit: <Placeholder value={$settings.fsRev} /></li>
				<li>{m['section.control.hostname']()}: <Placeholder value={$settings.hostname} /></li>
			</ul>
			{#if $settings.gitRev && $settings.fsRev && $settings.gitRev != $settings.fsRev}
				<Alert color="warning">
					⚠️ <strong>{m['warning']()}</strong>: {m['section.control.fwCommitMismatch']()}
				</Alert>
			{/if}
			<Row>
				<Col class="d-flex justify-content-end">
					<Button color="danger" id="restartBtn" onclick={restartClock}
						>{m['button.restart']()}</Button
					>
					<div class="mx-2"></div>

					<Button color="warning" id="forceFullRefresh" onclick={forceFullRefresh}
						>{m['button.forceFullRefresh']()}</Button
					>
				</Col>
			</Row>
			{#if $settings.otaEnabled}
				<hr />
				<h3>{m['section.control.firmwareUpdate']()}</h3>
				<FirmwareUpdater bind:settings bind:status />
			{/if}
		</CardBody>
	</Card>
</Col>
