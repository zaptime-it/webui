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

	// On sub-md widths only the active section is visible (CSS hides the
	// other two), so we mirror that in the a11y tree. On md+ all three
	// cards are side-by-side and must remain exposed to assistive tech and
	// to Playwright's accessibility-driven locators.
	let isMobile = $state(false);

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

		const updateLayout = () => {
			isMobile = window.innerWidth < MD_BREAKPOINT;
			setupObserver();
		};
		updateLayout();
		window.addEventListener('resize', updateLayout);

		// Revalidate settings on window focus / tab visibility — catches the
		// "another tab saved" case without needing a firmware version field.
		// Cheap one-shot GET; the SSE hot path keeps status fresh on its own.
		const onFocus = () => {
			if (settingsStore.isReady) void settingsStore.checkRemoteDrift();
		};
		window.addEventListener('focus', onFocus);
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') onFocus();
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			window.removeEventListener('resize', updateLayout);
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onVisibilityChange);
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
		aria-hidden={isMobile && section !== 'control' ? 'true' : undefined}
	>
		<Control />
	</section>
	<section
		id="status"
		class="section-anchor mobile-tab-section min-w-0 accent-status lg:col-span-4"
		class:mobile-active={section === 'status'}
		aria-hidden={isMobile && section !== 'status' ? 'true' : undefined}
	>
		<Status />
	</section>
	<section
		id="settings"
		class="section-anchor mobile-tab-section min-w-0 accent-settings lg:col-span-4"
		class:mobile-active={section === 'settings'}
		aria-hidden={isMobile && section !== 'settings' ? 'true' : undefined}
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

	/* Shared dashboard card treatment: rounded, subtle border, clearer
	   elevation than DaisyUI's default card shadow. Each `.section-anchor`
	   gets a thin colored strip along the top edge of its inner `.card`
	   so the three panels are visually distinguishable. The accent color
	   travels via the `.accent-*` modifier on the section. */
	.section-anchor :global(> .card) {
		border: 1px solid var(--color-base-300, oklch(87% 0.01 250));
		border-radius: 1rem;
		/* `overflow: clip` clips the ::before colored top strip to the
		   rounded corner without establishing a scroll containing block,
		   which would have killed `position: sticky` on the settings
		   action bar inside the card. */
		overflow: clip;
		box-shadow:
			0 1px 2px -1px rgba(0, 0, 0, 0.06),
			0 2px 8px -4px rgba(0, 0, 0, 0.08);
	}
	.section-anchor :global(> .card::before) {
		content: '';
		display: block;
		height: 3px;
		width: 100%;
		background: currentColor;
		opacity: 0.9;
	}
	.accent-control :global(> .card) {
		color: var(--color-primary, oklch(60% 0.18 245));
	}
	.accent-status :global(> .card) {
		color: var(--color-info, oklch(70% 0.14 215));
	}
	.accent-settings :global(> .card) {
		color: var(--color-accent, oklch(72% 0.15 165));
	}
	/* Reset text color inside the card body so the accent color only
	   shows through the ::before strip (which uses currentColor). */
	.section-anchor :global(> .card > .card-body) {
		color: var(--color-base-content);
	}
	.section-anchor :global(> .card .card-title) {
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	/* Cleaner horizontal rules inside cards. */
	.section-anchor :global(.card hr) {
		border: 0;
		border-top: 1px solid var(--color-base-300, oklch(87% 0.01 250));
		opacity: 0.6;
		margin: 0.25rem 0;
	}
</style>
