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
		value: number;
		size?: 'sm' | 'lg' | undefined;
		required?: boolean;
		suffix?: string | undefined;
		helpText?: string | undefined;
		disabled?: boolean;
		onChange?: (() => void) | undefined;
		children?: import('svelte').Snippet;
	}

	let {
		id,
		label,
		value = $bindable(),
		size = 'sm',
		required = false,
		suffix = undefined,
		helpText = undefined,
		disabled = false,
		onChange = undefined,
		children
	}: Props = $props();

	// Convert unsigned integer to hex color string
	function intToColor(int: number): string {
		const hex = (int >>> 0).toString(16).padStart(6, '0');
		return `#${hex}`;
	}

	// Convert hex color string to unsigned integer
	function colorToInt(color: string): number {
		const hex = color.replace('#', '');
		return parseInt(hex, 16);
	}

	// Local color string for the input
	let colorValue = $state(intToColor(value));

	// Update integer value when color changes
	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		colorValue = target.value;
		value = colorToInt(colorValue);
		onChange?.();
	}

	// Update color string when integer value changes externally
	$effect(() => {
		colorValue = intToColor(value);
	});
</script>

<Row>
	<Label md={6} for={id} {size}>{label}</Label>
	<Col md="6">
		<InputGroup {size}>
			<Input
				{id}
				type="color"
				value={colorValue}
				{required}
				{disabled}
				bsSize={size}
				onchange={handleColorChange}
				oninput={handleColorChange}
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
