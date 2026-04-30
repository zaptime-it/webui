<script lang="ts">
	type Value = string | number;

	interface Props {
		id: string;
		label: string;
		value: Value;
		options: Array<[string, Value]>;
		helpText?: string;
		size?: 'sm' | 'md' | 'lg';
		onChange?: () => void;
	}

	let {
		id,
		label,
		value = $bindable(),
		options,
		helpText,
		size = 'sm',
		onChange
	}: Props = $props();
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for={id}>{label}</label>
	<div>
		<select
			{id}
			class="select select-bordered select-{size} w-full"
			bind:value
			onchange={onChange}
		>
			{#each options as [key, val] (val)}
				<option value={val}>{key}</option>
			{/each}
		</select>
		{#if helpText}
			<p class="text-xs mt-1 text-base-content/70">{helpText}</p>
		{/if}
	</div>
</div>
