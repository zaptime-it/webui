<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Row, Button, Col, Label, InputGroup, Input, FormText } from '@sveltestrap/sveltestrap';
	import { onMount } from 'svelte';

	export let value: string;
	export let onChange: (value: string) => void;
	export let size: string = 'sm';

	let timezones: string[] = [];
	let selectedTimezone: string = '';

	onMount(async () => {
		const response = await fetch('/zones.json');
		const zones = await response.json();

		// Convert zones data into array of {name, offset} objects
		timezones = Object.keys(zones);

		// Set the selected timezone to the current value
		selectedTimezone = value;
	});

	function handleTimezoneChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		onChange(select.value);
	}

	function getTzOffsetFromSystem() {
		const detectedTzString = Intl.DateTimeFormat().resolvedOptions().timeZone;

		onChange(detectedTzString);
		selectedTimezone = detectedTzString;
	}
</script>

<Row>
	<Label md={6} {size} for="timezone">
		{$_('section.settings.timezoneOffset')}
	</Label>
	<Col md="6" {size}>
		<InputGroup>
			<Input type="select" {size} bind:value={selectedTimezone} on:change={handleTimezoneChange}>
				{#each timezones as tz}
					<option value={tz}>
						{tz}
					</option>
				{/each}
			</Input>
			<Button type="button" color="info" on:click={getTzOffsetFromSystem}>
				{$_('auto-detect')}
			</Button>
		</InputGroup>
		<FormText>{$_('section.settings.tzOffsetHelpText')}</FormText>
	</Col>
</Row>
