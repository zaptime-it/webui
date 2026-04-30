<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	interface Props {
		header: string;
		defaultOpen?: boolean;
		isOpen?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		header,
		defaultOpen = false,
		isOpen = $bindable(defaultOpen),
		children
	}: Props = $props();

	const toggle = () => (isOpen = !isOpen);
</script>

<div>
	<button
		type="button"
		class="flex items-center gap-1 text-lg font-semibold w-full text-left mb-2"
		onclick={toggle}
	>
		{#if isOpen}
			<ChevronDown size="20" />
		{:else}
			<ChevronRight size="20" />
		{/if}
		{header}
	</button>
	{#if isOpen}
		<div>
			{@render children?.()}
		</div>
	{/if}
</div>
