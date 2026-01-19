<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Row, Button, Col, Label, InputGroup, Input, FormText } from '@sveltestrap/sveltestrap';
	import { onMount } from 'svelte';

	interface Props {
		value: string;
		onChange: (value: string) => void;
		size?: string;
	}

	let { value, onChange, size = 'sm' }: Props = $props();

	let timezones: string[] = $state([]);
	let selectedTimezone: string = $state('');

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
		{m['section.settings.timezoneOffset']()}
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
				{m['auto-detect']()}
			</Button>
		</InputGroup>
		<FormText>{m['section.settings.tzOffsetHelpText']()}</FormText>
	</Col>
</Row>
