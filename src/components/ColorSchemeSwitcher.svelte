<script lang="ts">
	import { onMount } from 'svelte';
	import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from '@sveltestrap/sveltestrap';

	type Theme = 'light' | 'dark' | 'auto';

	let theme: Theme = 'auto';

	// Set the theme based on user selection and store it in localStorage
	function setTheme(newTheme: Theme) {
		theme = newTheme;
		localStorage.setItem('theme', newTheme);
		applyTheme(newTheme);
	}

	// Apply the selected theme to the document
	function applyTheme(selectedTheme: Theme) {
		if (selectedTheme === 'auto') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
		} else {
			document.documentElement.setAttribute('data-bs-theme', selectedTheme);
		}
	}

	// On component mount, check localStorage and apply the saved theme
	onMount(() => {
		const savedTheme = (localStorage.getItem('theme') as Theme) || 'auto';
		applyTheme(savedTheme);
		theme = savedTheme;

		// Listen for changes in the system color scheme preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			if (theme === 'auto') {
				applyTheme('auto');
			}
		});
	});
</script>

<Dropdown inNavbar class="ms-3">
	<DropdownToggle nav caret>
		{theme === 'auto' ? '🌗' : theme === 'dark' ? '🌙' : '☀️'}
	</DropdownToggle>
	<DropdownMenu end>
		<DropdownItem active={theme === 'light'} on:click={() => setTheme('light')}
			>☀️ Light</DropdownItem
		>
		<DropdownItem active={theme === 'dark'} on:click={() => setTheme('dark')}>🌙 Dark</DropdownItem>
		<DropdownItem active={theme === 'auto'} on:click={() => setTheme('auto')}>🌗 Auto</DropdownItem>
	</DropdownMenu>
</Dropdown>
