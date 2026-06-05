<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
	import LanguageMenu from '$lib/ui/LanguageMenu.svelte';
	import Toasts from '$lib/ui/Toasts.svelte';
	import { currentLocale } from '$lib/i18n.svelte';
	import { activeSection } from '$lib/stores/activeSection.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let open = $state(false);
	const closeDrawer = () => (open = false);
	const toggleDrawer = () => (open = !open);

	const isHome = $derived(page.url.pathname === '/');
	const localeKey = $derived(currentLocale.value);
	const section = $derived(activeSection.id);

	// On touch devices the browser leaves `:hover` stuck on the last-tapped
	// element until the user taps somewhere else. DaisyUI's tab CSS then
	// treats that hovered tab as "active-colored", so the previously tapped
	// tab keeps looking selected even after we scroll to a different section.
	// Blurring the anchor on click releases focus *and* clears the sticky
	// hover state on mobile Safari / Chrome for Android.
	const pickSection = (id: 'control' | 'status' | 'settings') => (e: MouseEvent) => {
		activeSection.set(id);
		(e.currentTarget as HTMLElement | null)?.blur();
	};
</script>

{#key localeKey}
	<div class="overlay">
		<!-- Wrap the navbar *and* the mobile drawer in a single sticky box so
		     the drawer pins to the top alongside the navbar. Previously only
		     `.navbar` was sticky; the drawer (its sibling) scrolled away
		     with the page and was off-screen whenever the user had scrolled
		     past the top. -->
		<div class="sticky top-0 z-50 bg-base-100 shadow-sm">
			<div class="navbar">
				<div class="navbar-start">
					<!-- Brand is a Latin wordmark led by the Bitcoin sign (₿); force LTR
					     so the bidi algorithm doesn't reorder it to "TClock₿" under RTL. -->
					<a
						class="btn btn-ghost text-xl navbar-brand hidden md:inline-flex"
						href="/"
						dir="ltr">₿TClock</a
					>
					{#if isHome}
						<nav
							class="section-tabs tabs tabs-boxed tabs-xs md:hidden"
							data-testid="section-tabs"
							aria-label="Sections"
						>
							<a
								class="tab"
								class:tab-active={section === 'control'}
								href="#control"
								onclick={pickSection('control')}
								aria-current={section === 'control' ? 'true' : undefined}
							>
								{m['section.control.title']()}
							</a>
							<a
								class="tab"
								class:tab-active={section === 'status'}
								href="#status"
								onclick={pickSection('status')}
								aria-current={section === 'status' ? 'true' : undefined}
							>
								{m['section.status.title']()}
							</a>
							<a
								class="tab"
								class:tab-active={section === 'settings'}
								href="#settings"
								onclick={pickSection('settings')}
								aria-current={section === 'settings' ? 'true' : undefined}
							>
								{m['section.settings.title']()}
							</a>
						</nav>
					{/if}
				</div>

				<div class="navbar-center hidden md:flex">
					<ul class="menu menu-horizontal px-1">
						<li>
							<a href="/" class:menu-active={page.url.pathname === '/'}>Home</a>
						</li>
						<li>
							<a href="/convert" class:menu-active={page.url.pathname === '/convert'}
								>Convert</a
							>
						</li>
						<li>
							<a href="/api" class:menu-active={page.url.pathname === '/api'}>API</a>
						</li>
					</ul>
				</div>

				<div class="navbar-end gap-2">
					<!-- Desktop: language + theme live inline in the navbar. Mobile: they
					     move into the hamburger drawer below (matches the v1 layout). -->
					<div class="hidden md:flex md:items-center md:gap-2">
						<LanguageMenu />
						<ThemeToggle />
					</div>
					<button
						type="button"
						class="btn btn-ghost btn-sm md:hidden"
						onclick={toggleDrawer}
						aria-label="Toggle navigation"
						aria-expanded={open}
						aria-controls="mobile-drawer"
						data-testid="mobile-nav-toggle"
					>
						<span class="text-xl" aria-hidden="true">≡</span>
					</button>
				</div>
			</div>

			{#if open}
				<div
					id="mobile-drawer"
					class="bg-base-100 border-b md:hidden"
					data-testid="mobile-drawer"
				>
					<ul class="menu w-full">
						<li>
							<a
								href="/"
								onclick={closeDrawer}
								class:menu-active={page.url.pathname === '/'}
							>
								Home
							</a>
						</li>
						<li>
							<a
								href="/convert"
								onclick={closeDrawer}
								class:menu-active={page.url.pathname === '/convert'}
							>
								Convert
							</a>
						</li>
						<li>
							<a
								href="/api"
								onclick={closeDrawer}
								class:menu-active={page.url.pathname === '/api'}
							>
								API
							</a>
						</li>
					</ul>
					<div class="flex items-center justify-end gap-2 px-2 pb-2">
						<LanguageMenu />
						<ThemeToggle />
					</div>
				</div>
			{/if}
		</div>

		<main class="w-full px-2 py-2 md:px-4 md:py-4">
			{@render children?.()}
		</main>

		<Toasts />
	</div>
{/key}

<style>
	.navbar-brand {
		font-style: italic;
		font-weight: 600;
	}

	/* Mobile section-tab overrides.
	 *
	 * DaisyUI 5's base `.tabs` and `.tab` both set `flex-wrap: wrap`, which
	 * let the third tab ("Settings") drop to a new row when the combined
	 * width exceeded the ~50% share of `.navbar-start`. The container also
	 * allows the user-agent's sticky `:hover` state on touch devices to
	 * keep a previously-tapped tab at the "active" color, because DaisyUI
	 * only applies the muted inactive color on tabs NOT matching `:hover`.
	 *
	 * We lock the row to a single line and make the inactive color depend
	 * strictly on `aria-current` / `.tab-active` so the visual selection
	 * follows the store, not the browser's transient input state. */
	.section-tabs {
		flex-wrap: nowrap !important;
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.section-tabs::-webkit-scrollbar {
		display: none;
	}
	.section-tabs :global(.tab) {
		flex-wrap: nowrap;
		white-space: nowrap;
	}
	/* Any tab that is NOT currently selected by the store stays muted,
	   regardless of :hover or :focus leftovers on touch devices. */
	.section-tabs :global(.tab:not([aria-current='true']):not(.tab-active)) {
		color: color-mix(in oklab, var(--color-base-content) 50%, transparent);
		background-color: transparent;
	}
	/* Give the tab row room to breathe on mobile: the default DaisyUI
	   navbar splits start/end 50/50 which is tight for three labels. */
	.navbar > :global(.navbar-start) {
		min-width: 0;
		flex: 1 1 auto;
	}
	.navbar > :global(.navbar-end) {
		flex: 0 0 auto;
	}
</style>
