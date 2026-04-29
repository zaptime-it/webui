<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value: number | undefined;
		min?: number;
		max?: number;
		step?: number | string;
		suffix?: string;
		helpText?: string;
		size?: 'sm' | 'md' | 'lg';
		required?: boolean;
		disabled?: boolean;
		onChange?: () => void;
	}

	let {
		id,
		label,
		value = $bindable(),
		min,
		max,
		step,
		suffix,
		helpText,
		size = 'sm',
		required = false,
		disabled = false,
		onChange
	}: Props = $props();
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for={id}>{label}</label>
	<div>
		<div class="join w-full">
			<input
				{id}
				type="number"
				class="input input-bordered input-{size} join-item w-full text-right"
				bind:value
				{min}
				{max}
				{step}
				{required}
				{disabled}
				onchange={onChange}
			/>
			{#if suffix}
				<span class="join-item btn btn-{size} pointer-events-none">{suffix}</span>
			{/if}
		</div>
		{#if helpText}
			<p class="text-xs mt-1 text-base-content/70">{helpText}</p>
		{/if}
	</div>
</div>
