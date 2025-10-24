<script lang="ts">
	import { Input, Label, FormText, Col, Row } from '@sveltestrap/sveltestrap';

	export let id: string;
	export let label: string;
	export let value: string | number;
	export let options: Array<[string, string | number]>;
	export let size: string = 'sm';
	export let helpText: string | undefined = undefined;
	export let selectClass: string | undefined = undefined;
	export let onChange: (() => void) | undefined = undefined;
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
			{#each options as [key, val] (key)}
				<option value={val}>{key}</option>
			{/each}
		</Input>
		{#if helpText}
			<FormText>{helpText}</FormText>
		{/if}
	</Col>
</Row>
