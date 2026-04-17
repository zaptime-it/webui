<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { showScreen } from '$lib/api/client';
	import { chunkArray } from '$lib/util/format';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	const mobileChunks = $derived(settings?.screens ? chunkArray(settings.screens, 4) : []);
	const desktopChunks = $derived(settings?.screens ? chunkArray(settings.screens, 5) : []);

	const pick = (id: number) => () => {
		showScreen(id).catch(() => {});
	};
</script>

{#if settings?.screens}
	<div class="flex flex-col items-center gap-1 sm:hidden">
		{#each mobileChunks as chunk, ci (ci)}
			<div class="join">
				{#each chunk as s (s.id)}
					<button
						type="button"
						class="btn btn-xs join-item btn-outline btn-primary"
						class:btn-active={status?.currentScreen === s.id}
						onclick={pick(s.id)}
					>
						{s.name}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<div class="hidden sm:flex sm:flex-col sm:items-center gap-1">
		{#each desktopChunks as chunk, ci (ci)}
			<div class="join">
				{#each chunk as s (s.id)}
					<button
						type="button"
						class="btn btn-sm join-item btn-outline btn-primary"
						class:btn-active={status?.currentScreen === s.id}
						onclick={pick(s.id)}
					>
						{s.name}
					</button>
				{/each}
			</div>
		{/each}
	</div>
{/if}
