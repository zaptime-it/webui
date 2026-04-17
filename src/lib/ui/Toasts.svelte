<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';

	const variant = (kind: string) =>
		kind === 'success'
			? 'alert-success'
			: kind === 'error'
				? 'alert-error'
				: kind === 'warning'
					? 'alert-warning'
					: 'alert-info';
</script>

<div class="toast toast-end toast-bottom z-[2000]">
	{#each toast.items as t (t.id)}
		<button
			type="button"
			class="alert {variant(t.kind)} shadow cursor-pointer pr-8 text-left"
			onclick={() => toast.dismiss(t.id)}
		>
			<div>
				<div class="font-semibold">{t.title}</div>
				{#if t.message}
					<div class="text-sm opacity-90">{t.message}</div>
				{/if}
			</div>
		</button>
	{/each}
</div>
