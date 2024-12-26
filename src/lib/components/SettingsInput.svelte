<script lang="ts">
	import {
		Input,
		InputGroup,
		InputGroupText,
		Label,
		FormText,
		Col,
		Row
	} from '@sveltestrap/sveltestrap';

	export let id: string;
	export let label: string;
	export let value: string | number;
	export let type: string = 'text';
	export let size: string = 'sm';
	export let required: boolean = false;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let step: number | string | undefined = undefined;
	export let suffix: string | undefined = undefined;
	export let helpText: string | undefined = undefined;
	export let disabled: boolean = false;
	export let valid: boolean | undefined = undefined;
	export let invalid: boolean | undefined = undefined;
	export let minlength: string | undefined = undefined;
	export let onChange: (() => void) | undefined = undefined;
	export let onInput: (() => void) | undefined = undefined;

	const onInputHandler = () => {
		onInput?.();
	};
</script>

<Row>
	<Label md={6} for={id} {size}>{label}</Label>
	<Col md="6">
		<InputGroup {size}>
			<Input
				{id}
				{type}
				bind:value
				{required}
				{min}
				{max}
				{step}
				{disabled}
				{valid}
				{invalid}
				{minlength}
				bsSize={size}
				on:change={onChange}
				on:input={onInputHandler}
				spellcheck={type === 'text' ? 'false' : undefined}
			/>
			{#if suffix}
				<InputGroupText>{suffix}</InputGroupText>
			{/if}
			<slot />
		</InputGroup>
		{#if helpText}
			<FormText>{helpText}</FormText>
		{/if}
	</Col>
</Row>
