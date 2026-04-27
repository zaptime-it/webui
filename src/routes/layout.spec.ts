/**
 * Regression tests for the mobile navbar layout.
 *
 * Two bugs we are locking in here:
 *
 *   1. On the original (v1) BTClock WebUI the language picker and the
 *      dark/light theme toggle lived *inside* the hamburger drawer on
 *      narrow viewports, not in the top navbar. The v2 rewrite initially
 *      shipped them pinned to `navbar-end` at every width, which made the
 *      mobile navbar look different from v1. Both controls must now be
 *      hidden from the top navbar on mobile (`hidden md:flex`) and also
 *      rendered inside the `#mobile-drawer` container that the hamburger
 *      button toggles.
 *
 *   2. The section tabs (Control / Status / Settings) used to hardcode
 *      `tab-active` on the first tab and then mutate DOM classes from an
 *      IntersectionObserver. That left the clicked tab "stuck" active when
 *      the user scrolled to a different section. The template now binds
 *      `tab-active` reactively to the `activeSection` store, so the class
 *      is driven entirely by state.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const layoutSrc = readFileSync(join(here, '+layout.svelte'), 'utf8');
const pageSrc = readFileSync(join(here, '+page.svelte'), 'utf8');

describe('mobile navbar: language + theme live under the hamburger', () => {
	test('hamburger button exists and controls #mobile-drawer', () => {
		expect(layoutSrc).toMatch(/data-testid="mobile-nav-toggle"/);
		expect(layoutSrc).toMatch(/aria-controls="mobile-drawer"/);
		expect(layoutSrc).toMatch(/id="mobile-drawer"/);
	});

	test('navbar-end renders LanguageMenu + ThemeToggle only at md and up', () => {
		// Narrow in on the `<div class="navbar-end ...">...</div>` block so
		// we can prove that the inline copies of LanguageMenu/ThemeToggle are
		// inside a `hidden md:flex` wrapper, not visible on mobile.
		const navbarEnd = layoutSrc.match(
			/<div class="navbar-end[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*{#if open}/
		);
		expect(navbarEnd, 'navbar-end block not found').not.toBeNull();
		const inline = navbarEnd![1];
		// Desktop-only wrapper.
		expect(inline).toMatch(
			/<div class="hidden md:flex[^"]*"[\s\S]*?<LanguageMenu[\s\S]*?<ThemeToggle[\s\S]*?<\/div>/
		);
	});

	test('mobile drawer hosts LanguageMenu + ThemeToggle', () => {
		const drawer = layoutSrc.match(/id="mobile-drawer"[\s\S]*?<\/div>\s*{\/if}/);
		expect(drawer, 'mobile-drawer block not found').not.toBeNull();
		const body = drawer![0];
		expect(body).toContain('<LanguageMenu');
		expect(body).toContain('<ThemeToggle');
	});
});

describe('section tabs: driven by activeSection store', () => {
	test('no hardcoded tab-active — class is bound reactively', () => {
		// The previous implementation had `class="tab tab-active"` baked
		// into the Control tab. That forced it to look selected even after
		// the user scrolled away. We now rely exclusively on the
		// `class:tab-active={...}` binding.
		expect(layoutSrc).not.toMatch(/class="tab tab-active"/);
		const bindings = layoutSrc.match(/class:tab-active=\{section === '[^']+'\}/g) ?? [];
		expect(bindings).toEqual([
			"class:tab-active={section === 'control'}",
			"class:tab-active={section === 'status'}",
			"class:tab-active={section === 'settings'}"
		]);
	});

	test('active tab also exposes aria-current for accessibility', () => {
		const matches = layoutSrc.match(/aria-current=\{section === '[^']+' \? 'true' : undefined\}/g);
		expect(matches?.length ?? 0).toBe(3);
	});

	test('layout imports the activeSection store', () => {
		expect(layoutSrc).toContain("from '$lib/stores/activeSection.svelte'");
	});

	test('home page wires IntersectionObserver to activeSection.set, not DOM mutation', () => {
		// Direct classList manipulation made the active tab depend on
		// observer ordering and could desync from the URL hash.
		expect(pageSrc).not.toContain("link.classList.remove('tab-active')");
		expect(pageSrc).not.toMatch(/querySelectorAll\(['"`]\.tabs/);
		expect(pageSrc).toContain('activeSection.set(');
	});

	test('observer breakpoint matches the `md:hidden` navbar breakpoint', () => {
		// If this drifts, the tab bar and the observer disagree about what
		// counts as "mobile" and the active pill will freeze on wide
		// viewports where the tabs are hidden anyway.
		expect(pageSrc).toMatch(/MD_BREAKPOINT\s*=\s*768/);
		expect(pageSrc).toMatch(/window\.innerWidth\s*>=\s*MD_BREAKPOINT/);
		expect(layoutSrc).toMatch(/class="section-tabs tabs tabs-boxed tabs-xs md:hidden"/);
	});

	test('sections carry scroll-margin so anchor jumps clear the sticky navbar', () => {
		// Without scroll-margin-top the #control/#status/#settings anchors
		// land behind the sticky navbar, which makes the observer pick the
		// wrong section.
		expect(pageSrc).toContain('section-anchor');
		expect(pageSrc).toMatch(/scroll-margin-top:\s*\d/);
	});
});

describe('section tabs: mobile styling overrides', () => {
	// Two regressions worth locking in:
	//   1. DaisyUI 5's base `.tab` rule makes `:hover` count as
	//      "active-colored". On touch devices `:hover` sticks to the last
	//      tapped element until the user taps elsewhere, so the previously
	//      clicked tab kept looking selected even after scrolling to a
	//      different section. We force the muted color for any tab that is
	//      not marked active via `aria-current` / `.tab-active`.
	//   2. `.tabs` and `.tab` both default to `flex-wrap: wrap`, which let
	//      "Settings" drop to a second row. We pin the row to `nowrap` and
	//      give `.navbar-start` room to grow past the default 50% share.

	test('click handler blurs the tapped anchor to clear sticky :hover', () => {
		expect(layoutSrc).toMatch(
			/pickSection[\s\S]*?\(e: MouseEvent\)[\s\S]*?\(e\.currentTarget as HTMLElement[^)]*\)\?\.blur\(\)/
		);
	});

	test('row cannot wrap and hovered inactive tabs stay muted', () => {
		// Single-row layout
		expect(layoutSrc).toMatch(/\.section-tabs\s*\{[^}]*flex-wrap:\s*nowrap/);
		// Inactive tabs do not inherit the `:hover` color boost from DaisyUI
		expect(layoutSrc).toMatch(
			/\.section-tabs\s+:global\(\.tab:not\(\[aria-current=['"]true['"]\]\):not\(\.tab-active\)\)/
		);
		expect(layoutSrc).toMatch(/color:\s*color-mix\(in oklab,\s*var\(--color-base-content\)\s*50%/);
	});

	test('navbar-start grows past the default 50% so three labels fit', () => {
		expect(layoutSrc).toMatch(
			/\.navbar\s*>\s*:global\(\.navbar-start\)\s*\{[^}]*flex:\s*1\s+1\s+auto/
		);
		expect(layoutSrc).toMatch(
			/\.navbar\s*>\s*:global\(\.navbar-end\)\s*\{[^}]*flex:\s*0\s+0\s+auto/
		);
	});
});

describe('mobile tabbed layout: only the active section renders below md', () => {
	// At sub-md widths each section gets `mobile-tab-section` plus a
	// reactive `mobile-active` class driven by `activeSection.id`, and the
	// inactive sections are `display:none` via CSS. This eliminates the
	// long vertical scroll through Control + Status + Settings on phones.

	test('every home-page section gets the mobile-tab-section + mobile-active classes', () => {
		// Each <section> should be tagged with both mobile-tab-section
		// and a class:mobile-active binding tied to the activeSection store.
		const tagged = pageSrc.match(/mobile-tab-section/g) ?? [];
		expect(tagged.length).toBeGreaterThanOrEqual(3);
		const reactive = pageSrc.match(/class:mobile-active=\{section === '[^']+'\}/g) ?? [];
		expect(reactive).toEqual([
			"class:mobile-active={section === 'control'}",
			"class:mobile-active={section === 'status'}",
			"class:mobile-active={section === 'settings'}"
		]);
	});

	test('inactive sections are aria-hidden so screen readers skip them on mobile', () => {
		const ariaHidden = pageSrc.match(/aria-hidden=\{section !== '[^']+' \? 'true' : undefined\}/g);
		expect(ariaHidden?.length ?? 0).toBe(3);
	});

	test('CSS hides non-active sections under 768px and restores grid above', () => {
		expect(pageSrc).toMatch(
			/@media \(max-width: 767px\)\s*\{[\s\S]*?\.mobile-tab-section\s*\{[^}]*display:\s*none/
		);
		expect(pageSrc).toMatch(/\.mobile-tab-section\.mobile-active\s*\{[^}]*display:\s*block/);
	});
});

describe('mobile drawer: pinned to the viewport together with the navbar', () => {
	// Previously only `.navbar` was `sticky top-0`, so when the user scrolled
	// past the top of the page and then tapped the hamburger button, the
	// `#mobile-drawer` element — rendered as a sibling *below* the navbar —
	// was already off-screen. We now wrap navbar + drawer in a single
	// sticky container so they pin together at the top of the viewport.

	test('.navbar itself no longer carries sticky positioning', () => {
		expect(layoutSrc).not.toMatch(/class="navbar[^"]*\bsticky\b/);
	});

	test('there is a sticky wrapper that hosts both the navbar and the drawer', () => {
		const stickyWrapper = layoutSrc.match(
			/<div class="sticky top-0 z-50[^"]*"[\s\S]*?<div class="navbar"[\s\S]*?{#if open}[\s\S]*?id="mobile-drawer"[\s\S]*?{\/if}\s*<\/div>/
		);
		expect(stickyWrapper, 'sticky wrapper containing navbar + drawer not found').not.toBeNull();
	});
});
