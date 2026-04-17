<script lang="ts">
	import Field from './Field.svelte';

	interface Props {
		withAction: boolean;
	}
	let { withAction }: Props = $props();
	let value = $state('hello');
</script>

{#if withAction}
	<Field id="demo" label="Demo" bind:value>
		{#snippet action()}
			<button type="button" class="join-item btn btn-sm btn-success" data-testid="demo-action">
				Test
			</button>
		{/snippet}
	</Field>
{:else}
	<Field id="demo" label="Demo" bind:value />
{/if}
