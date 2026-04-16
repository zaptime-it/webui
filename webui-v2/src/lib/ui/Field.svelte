<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends Omit<HTMLInputAttributes, 'size'> {
		id: string;
		label: string;
		value: string | number | undefined;
		suffix?: string;
		helpText?: string;
		invalid?: boolean;
		valid?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onChange?: () => void;
		action?: Snippet;
	}

	let {
		id,
		label,
		value = $bindable(),
		suffix,
		helpText,
		invalid,
		valid,
		size = 'sm',
		onChange,
		action,
		type = 'text',
		...rest
	}: Props = $props();

	const inputClass = $derived(
		[
			'input',
			'input-bordered',
			`input-${size}`,
			'w-full',
			invalid ? 'input-error' : '',
			valid ? 'input-success' : ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for={id}>{label}</label>
	<div>
		{#if suffix || action}
			<div class="join w-full">
				<input
					{id}
					{type}
					class="{inputClass} join-item"
					bind:value
					onchange={onChange}
					spellcheck={type === 'text' ? 'false' : undefined}
					{...rest}
				/>
				{#if suffix}
					<span class="join-item btn btn-{size} pointer-events-none">{suffix}</span>
				{/if}
				{#if action}
					{@render action()}
				{/if}
			</div>
		{:else}
			<input
				{id}
				{type}
				class={inputClass}
				bind:value
				onchange={onChange}
				spellcheck={type === 'text' ? 'false' : undefined}
				{...rest}
			/>
		{/if}
		{#if helpText}
			<p class="label-text-alt mt-1">{helpText}</p>
		{/if}
	</div>
</div>
