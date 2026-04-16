<script lang="ts">
	import Sun from 'lucide-svelte/icons/sun';
	import Moon from 'lucide-svelte/icons/moon';
	import { theme } from '$lib/stores/theme.svelte';
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm btn-circle"
	aria-label="Toggle color scheme"
	onclick={() => theme.toggle()}
>
	{#if theme.effective === 'dark'}
		<Sun size="18" />
	{:else}
		<Moon size="18" />
	{/if}
</button>
