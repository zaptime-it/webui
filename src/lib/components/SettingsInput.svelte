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

	interface Props {
		id: string;
		label: string;
		value: string | number;
		type?: string;
		size?: string;
		required?: boolean;
		min?: number | undefined;
		max?: number | undefined;
		step?: number | string | undefined;
		suffix?: string | undefined;
		helpText?: string | undefined;
		disabled?: boolean;
		valid?: boolean | undefined;
		invalid?: boolean | undefined;
		minlength?: string | undefined;
		onChange?: (() => void) | undefined;
		onInput?: ((e: Event) => void) | undefined;
		children?: import('svelte').Snippet;
	}

	let {
		id,
		label,
		value = $bindable(),
		type = 'text',
		size = 'sm',
		required = false,
		min = undefined,
		max = undefined,
		step = undefined,
		suffix = undefined,
		helpText = undefined,
		disabled = false,
		valid = undefined,
		invalid = undefined,
		minlength = undefined,
		onChange = undefined,
		onInput = undefined,
		children
	}: Props = $props();

	const onInputHandler = (e: Event) => {
		onInput?.(e);
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
			{@render children?.()}
		</InputGroup>
		{#if helpText}
			<FormText>{helpText}</FormText>
		{/if}
	</Col>
</Row>
