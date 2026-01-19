<script lang="ts">
	import { run } from 'svelte/legacy';

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
	import * as m from '$lib/paraglide/messages';

	import { page } from '$app/stores';
	import { currentLocale, setLocale, locales, type SupportedLocale } from '$lib/i18n';
	import { ColorSchemeSwitcher } from '$lib/components';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const changeLocale = (lang: string) => () => {
		setLocale(lang as SupportedLocale);
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

	let languageNames: Record<string, string> = $state({});

	run(() => {
		const localeToUse = $currentLocale || 'en';
		const newLanguageNames = new Intl.DisplayNames([localeToUse], { type: 'language' });

		for (const l of locales) {
			languageNames[l] = newLanguageNames.of(l) || l;
		}
		// Trigger reactivity
		languageNames = languageNames;
	});

	let isOpen = $state(false);

	const toggle = () => {
		isOpen = !isOpen;
	};
</script>

{#key $currentLocale}
	<Navbar expand="md" sticky="xs-top" theme="auto">
		<NavbarBrand class="d-none d-sm-block">&#8383;TClock</NavbarBrand>
		<Nav class="d-md-none" pills>
			<NavItem>
				<NavLink href="#control" active>{m['section.control.title']()}</NavLink>
			</NavItem>
			<NavItem>
				<NavLink href="#status">{m['section.status.title']()}</NavLink>
			</NavItem>
			<NavItem>
				<NavLink class="nav-link" href="#settings">{m['section.settings.title']()}</NavLink>
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
			<Dropdown id="nav-language-dropdown" inNavbar class="me-3">
				<DropdownToggle nav caret
					>{getFlagEmoji($currentLocale)}
					{languageNames[$currentLocale] || 'English'}</DropdownToggle
				>
				<DropdownMenu end>
					{#each locales as locale}
						<DropdownItem on:click={changeLocale(locale)}
							>{getFlagEmoji(locale)} {languageNames[locale]}</DropdownItem
						>
					{/each}
				</DropdownMenu>
			</Dropdown>
			<ColorSchemeSwitcher></ColorSchemeSwitcher>
		</Collapse>
	</Navbar>

	<!-- +layout.svelte -->
	<main>
		{@render children?.()}
	</main>
{/key}
