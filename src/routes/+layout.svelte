<script lang="ts">
	import {
		Collapse,
		Dropdown,
		DropdownItem,
		DropdownMenu,
		DropdownToggle,
		Nav,
		NavItem,
		NavLink,
		Navbar,
		NavbarBrand,
		NavbarToggler
	} from '@sveltestrap/sveltestrap';
	import { _ } from 'svelte-i18n';

	import { page } from '$app/stores';
	import { locale, locales, isLoading } from 'svelte-i18n';
	import { ColorSchemeSwitcher } from '$lib/components';
	import { derived } from 'svelte/store';

	export const setLocale = (lang: string) => () => {
		locale.set(lang);
		localStorage.setItem('locale', lang);
	};

	export const getFlagEmoji = (languageCode: string): string | null => {
		const flagMap: { [key: string]: string } = {
			en: '🇬🇧', // English flag emoji
			nl: '🇳🇱', // Dutch flag emoji
			es: '🇪🇸', // Spanish flag emoji
			de: '🇩🇪' // German flag emoji
		};

		// Convert the language code to lowercase for case-insensitive matching
		const lowercaseCode = languageCode.toLowerCase();

		// Check if the language code is in the flagMap
		if (Object.prototype.hasOwnProperty.call(flagMap, lowercaseCode)) {
			return flagMap[lowercaseCode];
		} else {
			// Return null for unsupported language codes
			return flagMap['en'];
		}
	};

	let languageNames = {};

	const currentLocale = derived(locale, ($locale) => $locale || 'en');

	locale.subscribe(() => {
		const localeToUse = $locale || 'en';
		let newLanguageNames = new Intl.DisplayNames([localeToUse], { type: 'language' });

		for (let l of $locales) {
			languageNames[l] = newLanguageNames.of(l) || l;
		}
	});

	let isOpen = false;

	const toggle = () => {
		isOpen = !isOpen;
	};
</script>

<Navbar expand="md" sticky="xs-top" theme="auto">
	<NavbarBrand class="d-none d-sm-block">&#8383;TClock</NavbarBrand>
	<Nav class="d-md-none" pills>
		<NavItem>
			<NavLink href="#control" active>{$_('section.control.title', { default: 'Control' })}</NavLink
			>
		</NavItem>
		<NavItem>
			<NavLink href="#status">{$_('section.status.title', { default: 'Status' })}</NavLink>
		</NavItem>
		<NavItem>
			<NavLink class="nav-link" href="#settings"
				>{$_('section.settings.title', { default: 'Settings' })}</NavLink
			>
		</NavItem>
	</Nav>

	<NavbarToggler on:click={toggle} />

	<Collapse {isOpen} navbar expand="sm">
		<Nav class="me-auto" navbar>
			<NavItem>
				<NavLink href="/" active={$page.url.pathname === '/'}>Home</NavLink>
			</NavItem>
			<NavItem>
				<NavLink href="/convert" active={$page.url.pathname === '/convert'}>Convert</NavLink>
			</NavItem>
			<NavItem>
				<NavLink href="/api" active={$page.url.pathname === '/api'}>API</NavLink>
			</NavItem>
		</Nav>
		{#if !$isLoading}
			<Dropdown id="nav-language-dropdown" inNavbar class="me-3">
				<DropdownToggle nav caret
					>{getFlagEmoji($currentLocale)}
					{languageNames[$currentLocale] || 'English'}</DropdownToggle
				>
				<DropdownMenu end>
					{#each $locales as locale}
						<DropdownItem on:click={setLocale(locale)}
							>{getFlagEmoji(locale)} {languageNames[locale]}</DropdownItem
						>
					{/each}
				</DropdownMenu>
			</Dropdown>
		{/if}
		<ColorSchemeSwitcher></ColorSchemeSwitcher>
	</Collapse>
</Navbar>

<!-- +layout.svelte -->
<main>
	<slot />
</main>
