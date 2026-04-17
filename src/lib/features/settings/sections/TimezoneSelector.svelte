<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import timezones from '$lib/timezones.json';

	interface Props {
		value: string;
		onChange: (value: string) => void;
	}

	let { value, onChange }: Props = $props();

	// Local editable copy that initialises from the prop on first render and is
	// then driven by user picks or the auto-detect button.
	// eslint-disable-next-line svelte/prefer-writable-derived
	let selected = $state('');
	$effect(() => {
		selected = value;
	});

	const pick = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		selected = select.value;
		onChange(select.value);
	};

	const autodetect = () => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		selected = tz;
		onChange(tz);
	};
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for="timezone">
		{m['section.settings.timezoneOffset']()}
	</label>
	<div>
		<div class="join w-full">
			<select
				id="timezone"
				class="select select-bordered select-sm join-item w-full"
				bind:value={selected}
				onchange={pick}
			>
				{#each timezones as tz (tz)}
					<option value={tz}>{tz}</option>
				{/each}
			</select>
			<button type="button" class="join-item btn btn-sm btn-info" onclick={autodetect}>
				{m['auto-detect']()}
			</button>
		</div>
		<p class="label-text-alt mt-1">{m['section.settings.tzOffsetHelpText']()}</p>
	</div>
</div>
