<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { showScreen } from '$lib/api/client';
	import { quickJumpScreens } from '$lib/util/screens';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	const pick = (id: number) => () => {
		showScreen(id).catch(() => {});
	};
</script>

{#if settings?.screens}
	<div class="flex flex-wrap justify-center gap-1" data-testid="screen-buttons">
		{#each quickJumpScreens(settings.screens) as s (s.id)}
			<button
				type="button"
				class="btn btn-xs sm:btn-sm btn-primary"
				class:btn-outline={status?.currentScreen !== s.id}
				aria-pressed={status?.currentScreen === s.id}
				onclick={pick(s.id)}
			>
				{s.name}
			</button>
		{/each}
	</div>
{/if}
