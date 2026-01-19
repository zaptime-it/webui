<script lang="ts">
	interface Props {
		value: unknown;
		checkValue?: unknown;
		width?: number;
	}

	let { value, checkValue = null, width = 25 }: Props = $props();

	let valueToCheck = $derived(checkValue === null ? value : checkValue);
</script>

<span class:placeholder={!valueToCheck} class={!valueToCheck ? `w-${width}` : ''}>
	{valueToCheck ? value : ''}
</span>
