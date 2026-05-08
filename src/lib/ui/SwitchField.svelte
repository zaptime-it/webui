<script lang="ts">
	interface Props {
		id: string;
		label: string;
		checked: boolean | undefined;
		disabled?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		onChange?: () => void;
		hint?: string;
	}

	let {
		id,
		label,
		checked = $bindable(),
		disabled = false,
		size = 'sm',
		onChange,
		hint
	}: Props = $props();

	const hintId = $derived(hint ? `${id}-hint` : undefined);
</script>

<label class="switch-field" for={id} class:disabled title={disabled ? hint : undefined}>
	<input
		{id}
		type="checkbox"
		class="toggle toggle-{size} shrink-0"
		bind:checked
		{disabled}
		onchange={onChange}
		aria-describedby={hintId}
	/>
	<span class="switch-field__label">
		{label}
		{#if hint}
			<small id={hintId} class="switch-field__hint">{hint}</small>
		{/if}
	</span>
</label>

<style>
	.switch-field {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.25rem 0;
		cursor: pointer;
		min-width: 0;
	}
	.switch-field.disabled {
		cursor: not-allowed;
	}
	.switch-field.disabled :global(.toggle:disabled) {
		opacity: 0.6;
	}
	.switch-field.disabled .switch-field__label {
		opacity: 0.7;
	}
	.switch-field__label {
		font-size: 0.8125rem;
		line-height: 1.2;
		min-width: 0;
		flex: 1 1 0%;
		overflow-wrap: anywhere;
		white-space: normal;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.switch-field__hint {
		color: var(--color-base-content);
		opacity: 0.6;
		font-size: 0.75rem;
		line-height: 1.15;
	}
</style>
