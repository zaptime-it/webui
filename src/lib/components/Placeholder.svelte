<script lang="ts">
	export let value: unknown;
	export let checkValue: unknown = null;
	export let width: number = 25;

	$: valueToCheck = checkValue === null ? value : checkValue;
</script>

<span class:placeholder={!valueToCheck} class={!valueToCheck ? `w-${width}` : ''}>
	{valueToCheck ? value : ''}
</span>
