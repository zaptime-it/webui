<script lang="ts">
	interface Props {
		id: string;
		label: string;
		checked: boolean | undefined;
		disabled?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		onChange?: () => void;
		/**
		 * Optional helper text. When the field is disabled this is the
		 * "why" — e.g. "Requires Suffix Price to be enabled". Shown as
		 * muted text under the label and exposed to screen readers via
		 * aria-describedby. When the field is enabled it acts as plain
		 * helper copy for fields that need it (currently unused there).
		 */
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
	/*
	 * DaisyUI's default disabled .toggle is barely visible against the dark
	 * theme — the off state sits at ~oklch(70% 0 0 / 0.2) which fades into
	 * the card background. Bumping opacity gives users a positive signal
	 * that the control still exists.
	 */
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
