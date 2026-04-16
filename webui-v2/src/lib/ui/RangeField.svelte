<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value: number | undefined;
		min?: number;
		max?: number;
		step?: number;
		helpText?: string;
		disabled?: boolean;
		onChange?: () => void;
	}

	let {
		id,
		label,
		value = $bindable(),
		min = 0,
		max = 100,
		step = 1,
		helpText,
		disabled = false,
		onChange
	}: Props = $props();
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for={id}>{label}</label>
	<div>
		<input
			{id}
			type="range"
			class="range range-sm"
			bind:value
			{min}
			{max}
			{step}
			{disabled}
			onchange={onChange}
		/>
		<div class="text-right label-text-alt mt-1">{value}</div>
		{#if helpText}
			<p class="label-text-alt mt-1">{helpText}</p>
		{/if}
	</div>
</div>
