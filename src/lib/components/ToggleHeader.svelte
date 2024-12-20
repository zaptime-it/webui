<script lang="ts">
	import { Fade } from '@sveltestrap/sveltestrap';
	import CaretRightFill from 'svelte-bootstrap-icons/lib/CaretRightFill.svelte';
	import CaretDownFill from 'svelte-bootstrap-icons/lib/CaretDownFill.svelte';

	export let header;
	export let defaultOpen = false;
	export let isOpen = defaultOpen;
</script>

<h4 style="cursor: pointer">
	<span
		role="link"
		on:click={() => (isOpen = !isOpen)}
		tabindex="0"
		on:keypress={() => (isOpen = !isOpen)}
	>
		{#if isOpen}
			<CaretDownFill></CaretDownFill>
		{:else}
			<CaretRightFill></CaretRightFill>
		{/if}
		{header}
	</span>
</h4>
<Fade {isOpen}>
	<slot></slot>
</Fade>
