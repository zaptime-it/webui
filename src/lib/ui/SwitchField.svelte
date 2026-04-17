<script lang="ts">
	interface Props {
		id: string;
		label: string;
		checked: boolean | undefined;
		disabled?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		onChange?: () => void;
	}

	let {
		id,
		label,
		checked = $bindable(),
		disabled = false,
		size = 'sm',
		onChange
	}: Props = $props();
</script>

<label class="switch-field" for={id} class:disabled>
	<input
		{id}
		type="checkbox"
		class="toggle toggle-{size} shrink-0"
		bind:checked
		{disabled}
		onchange={onChange}
	/>
	<span class="switch-field__label">{label}</span>
</label>

<style>
	.switch-field {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.25rem 0;
		cursor: pointer;
		min-width: 0;
	}
	.switch-field.disabled {
		cursor: not-allowed;
	}
	.switch-field__label {
		font-size: 0.8125rem;
		line-height: 1.2;
		min-width: 0;
		flex: 1 1 0%;
		overflow-wrap: anywhere;
		white-space: normal;
	}
</style>
