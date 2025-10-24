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
	export let value: number;
	export let size: 'sm' | 'lg' | undefined = 'sm';
	export let required: boolean = false;
	export let suffix: string | undefined = undefined;
	export let helpText: string | undefined = undefined;
	export let disabled: boolean = false;
	export let onChange: (() => void) | undefined = undefined;

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
	let colorValue = intToColor(value);

	// Update integer value when color changes
	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		colorValue = target.value;
		value = colorToInt(colorValue);
		onChange?.();
	}

	// Update color string when integer value changes externally
	$: colorValue = intToColor(value);
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
				on:change={handleColorChange}
				on:input={handleColorChange}
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
