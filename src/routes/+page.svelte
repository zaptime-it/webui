<script lang="ts">
	import Control from '$lib/features/control/Control.svelte';
	import Status from '$lib/features/status/Status.svelte';
	import SettingsPanel from '$lib/features/settings/SettingsPanel.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { activeSection, type SectionId } from '$lib/stores/activeSection.svelte';

	// Tailwind's `md` breakpoint. Keep this in sync with the navbar, which
	// hides/shows the section tab bar at the same width (`md:hidden`).
	const MD_BREAKPOINT = 768;
	const SECTION_IDS: readonly SectionId[] = ['control', 'status', 'settings'];

	const section = $derived(activeSection.id);

	let observer: IntersectionObserver | undefined;

	const setupObserver = () => {
		observer?.disconnect();
		observer = undefined;
		if (typeof window === 'undefined') return;
		// Only drive the tab bar from the observer while it is visible; on
		// larger viewports the three sections sit side-by-side so "which one
		// is scrolled into view" is not a meaningful concept.
		if (window.innerWidth >= MD_BREAKPOINT) return;

		observer = new IntersectionObserver(
			(entries) => {
				// Pick the entry with the largest visible area so two adjacent
				// sections straddling the viewport don't fight each other.
				const best = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				if (!best) return;
				const id = best.target.id as SectionId;
				if (SECTION_IDS.includes(id)) activeSection.set(id);
			},
			{
				// Shrink the top of the root so sections hidden behind the
				// sticky navbar don't count as "active", and require a decent
				// slice to be visible before promoting a section.
				rootMargin: '-72px 0px -40% 0px',
				threshold: [0.1, 0.25, 0.5]
			}
		);
		for (const id of SECTION_IDS) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}
	};

	// NOTE: `onMount` from 'svelte' intermittently fails to fire under SvelteKit
	// 2.57 + Svelte 5 when `ssr = false`. `$effect` with an empty dep set works
	// reliably and is the recommended replacement in Svelte 5.
	$effect(() => {
		(async () => {
			await settingsStore.load();
			await statusStore.load();
			if (settingsStore.isReady && statusStore.state.status === 'ready') {
				statusStore.connect();
			}
		})();

		setupObserver();
		const onResize = () => setupObserver();
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			observer?.disconnect();
			statusStore.disconnect();
		};
	});
</script>

<svelte:head>
	<title>BTClock</title>
</svelte:head>

<div class="grid w-full grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
	<section
		id="control"
		class="section-anchor mobile-tab-section min-w-0 accent-control lg:col-span-4"
		class:mobile-active={section === 'control'}
		aria-hidden={section !== 'control' ? 'true' : undefined}
	>
		<Control />
	</section>
	<section
		id="status"
		class="section-anchor mobile-tab-section min-w-0 accent-status lg:col-span-4"
		class:mobile-active={section === 'status'}
		aria-hidden={section !== 'status' ? 'true' : undefined}
	>
		<Status />
	</section>
	<section
		id="settings"
		class="section-anchor mobile-tab-section min-w-0 accent-settings lg:col-span-4"
		class:mobile-active={section === 'settings'}
		aria-hidden={section !== 'settings' ? 'true' : undefined}
	>
		<SettingsPanel />
	</section>
</div>

<style>
	/* Anchor links (#control, #status, #settings) would otherwise scroll the
	   target under the sticky navbar; compensate so the heading lands just
	   below it. */
	.section-anchor {
		scroll-margin-top: 4.5rem;
	}
	/* Mobile tabbed layout: at sub-md widths only the active section is
	   rendered, eliminating the long vertical scroll through all three
	   cards. The desktop grid is restored at md and above. */
	@media (max-width: 767px) {
		.mobile-tab-section {
			display: none;
		}
		.mobile-tab-section.mobile-active {
			display: block;
		}
	}
</style>
