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

	import { page } from '$app/stores';
	import { locale, locales, isLoading } from 'svelte-i18n';
	import ColorSchemeSwitcher from '../components/ColorSchemeSwitcher.svelte';

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
			return null;
		}
	};

	let languageNames = {};

	locale.subscribe(() => {
		if ($locale) {
			let newLanguageNames = new Intl.DisplayNames([$locale], { type: 'language' });

			for (let l of $locales) {
				languageNames[l] = newLanguageNames.of(l);
			}
		}
	});

	let isOpen = false;

	const toggle = () => {
		isOpen = !isOpen;
	};
</script>

<Navbar expand="md">
	<NavbarBrand>&#8383;TClock</NavbarBrand>
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
			<Dropdown id="nav-language-dropdown" inNavbar>
				<DropdownToggle nav caret>{getFlagEmoji($locale)} {languageNames[$locale]}</DropdownToggle>
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
<slot />
