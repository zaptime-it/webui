<script lang="ts">
	import { Fade } from '@sveltestrap/sveltestrap';
	import CaretRightFill from 'svelte-bootstrap-icons/lib/CaretRightFill.svelte';
	import CaretDownFill from 'svelte-bootstrap-icons/lib/CaretDownFill.svelte';

	interface Props {
		header: string;
		defaultOpen?: boolean;
		isOpen?: boolean;
		children?: import('svelte').Snippet;
	}

	let { header, defaultOpen = false, isOpen = $bindable(defaultOpen), children }: Props = $props();
</script>

<h4 style="cursor: pointer">
	<span
		role="link"
		onclick={() => (isOpen = !isOpen)}
		tabindex="0"
		onkeypress={() => (isOpen = !isOpen)}
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
	{@render children?.()}
</Fade>
