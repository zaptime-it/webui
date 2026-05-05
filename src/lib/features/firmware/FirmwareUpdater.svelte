<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import VersionCheck from './VersionCheck.svelte';
	import UploadForm from './UploadForm.svelte';

	const webFlasherUrl = 'https://web-flasher-v4.btclock.dev/';
	const dismissKey = 'btclock.v4announce.dismissed';

	let dismissed = $state(browser && localStorage.getItem(dismissKey) === '1');

	const dismiss = () => {
		dismissed = true;
		try {
			localStorage.setItem(dismissKey, '1');
		} catch {
			// ignore — quota / disabled storage
		}
	};
</script>

<VersionCheck />
<UploadForm />

{#if !dismissed}
	<div class="alert alert-warning mt-2" role="alert">
		<div class="flex-1">
			<h4 class="font-bold">{m['section.firmwareUpdater.v4AnnounceTitle']()}</h4>
			<p class="text-sm">{m['section.firmwareUpdater.v4AnnounceText']()}</p>
			<a
				href={webFlasherUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-sm btn-primary mt-2"
			>
				{m['section.firmwareUpdater.v4AnnounceLink']()}
			</a>
		</div>
		<button
			type="button"
			class="btn btn-sm btn-ghost btn-circle"
			aria-label={m['section.firmwareUpdater.v4AnnounceDismiss']()}
			onclick={dismiss}
		>
			✕
		</button>
	</div>
{/if}
