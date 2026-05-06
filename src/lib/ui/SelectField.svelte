<script lang="ts">
	type Value = string | number;

	interface Props {
		id: string;
		// Allow undefined so callers can bind to optional schema fields
		// (e.g. v4-only fields with `v.optional(...)`). NumberField follows
		// the same pattern; the `$effect` in the calling section seeds a
		// default before the user can interact.
		value: Value | undefined;
		label: string;
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
