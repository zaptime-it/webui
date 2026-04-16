<script lang="ts">
	import {
		locales,
		setLocale,
		currentLocale,
		getFlagEmoji,
		type SupportedLocale
	} from '$lib/i18n.svelte';

	const current = $derived(currentLocale.value);

	const names = $derived.by(() => {
		const dn = new Intl.DisplayNames([current], { type: 'language' });
		const map: Record<string, string> = {};
		for (const l of locales) map[l] = dn.of(l) ?? l;
		return map;
	});

	let open = $state(false);

	const pick = (locale: string) => () => {
		setLocale(locale as SupportedLocale);
		open = false;
	};

	const onDocumentClick = (e: MouseEvent) => {
		const t = e.target as HTMLElement | null;
		if (!t?.closest('[data-language-menu]')) open = false;
	};

	$effect(() => {
		if (!open) return;
		document.addEventListener('click', onDocumentClick);
		return () => document.removeEventListener('click', onDocumentClick);
	});
</script>

<div class="dropdown dropdown-end" class:dropdown-open={open} data-language-menu>
	<button
		type="button"
		class="btn btn-ghost btn-sm"
		aria-haspopup="listbox"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{getFlagEmoji(current)}
		<span class="hidden sm:inline">{names[current] ?? 'English'}</span>
	</button>
	{#if open}
		<ul
			role="listbox"
			class="menu dropdown-content bg-base-100 rounded-box shadow z-[1000] w-48 p-2 mt-2"
		>
			{#each locales as locale (locale)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={locale === current}
						onclick={pick(locale)}
					>
						{getFlagEmoji(locale)}
						{names[locale]}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
