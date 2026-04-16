<script lang="ts">
	interface Props {
		value: unknown;
		checkValue?: unknown;
		width?: number;
	}

	let { value, checkValue = null, width = 25 }: Props = $props();

	const valueToCheck = $derived(checkValue === null ? value : checkValue);
</script>

{#if valueToCheck}
	<span>{value}</span>
{:else}
	<span class="skeleton inline-block h-4 align-middle" style="width: {width}%" aria-hidden="true"
	></span>
{/if}
