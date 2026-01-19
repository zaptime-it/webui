<script lang="ts">
	import { Input, Label, FormText, Col, Row } from '@sveltestrap/sveltestrap';

	interface Props {
		id: string;
		label: string;
		value: string | number;
		options: Array<[string, string | number]>;
		size?: string;
		helpText?: string | undefined;
		selectClass?: string | undefined;
		onChange?: (() => void) | undefined;
	}

	let {
		id,
		label,
		value = $bindable(),
		options,
		size = 'sm',
		helpText = undefined,
		selectClass = undefined,
		onChange = undefined
	}: Props = $props();
</script>

<Row>
	<Label md={6} for={id} {size}>{label}</Label>
	<Col md="6">
		<Input
			{id}
			type="select"
			bind:value
			name="select"
			bsSize={size}
			class={selectClass}
			on:change={onChange}
		>
			{#each options as [key, val]}
				<option value={val}>{key}</option>
			{/each}
		</Input>
		{#if helpText}
			<FormText>{helpText}</FormText>
		{/if}
	</Col>
</Row>
