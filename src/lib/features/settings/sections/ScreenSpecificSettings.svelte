<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import CollapseCard from '$lib/ui/CollapseCard.svelte';
	import SwitchField from '$lib/ui/SwitchField.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { DataSourceType } from '$lib/types/settings';

	interface Props {
		isOpen?: boolean;
	}
	let { isOpen = $bindable(true) }: Props = $props();

	const data = $derived(settingsStore.data!);

	const showCurrencies = $derived(
		data?.actCurrencies &&
			(data.dataSource === DataSourceType.BTCLOCK_SOURCE ||
				data.dataSource === DataSourceType.CUSTOM_SOURCE ||
				data.dataSource === DataSourceType.THIRD_PARTY_SOURCE)
	);
</script>

<CollapseCard header={m['section.settings.section.screenSettings']()} bind:isOpen>
	<div
		class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1"
		data-testid="screen-switches-grid"
	>
		<SwitchField
			id="stealFocus"
			bind:checked={data.stealFocus}
			label={m['section.settings.StealFocusOnNewBlock']()}
		/>
		<SwitchField
			id="mcapBigChar"
			bind:checked={data.mcapBigChar}
			label={m['section.settings.useBigCharsMcap']()}
		/>
		<SwitchField
			id="useBlkCountdown"
			bind:checked={data.useBlkCountdown}
			label={m['section.settings.useBlkCountdown']()}
		/>
		<SwitchField
			id="useSatsSymbol"
			bind:checked={data.useSatsSymbol}
			label={m['section.settings.useSatsSymbol']()}
		/>
		<SwitchField
			id="useMscwTime"
			bind:checked={data.useMscwTime}
			label={m['section.settings.useMscwTime']()}
		/>
		<SwitchField
			id="suffixPrice"
			bind:checked={data.suffixPrice}
			label={m['section.settings.suffixPrice']()}
		/>
		<SwitchField
			id="mowMode"
			bind:checked={data.mowMode}
			label={m['section.settings.mowMode']()}
			disabled={!data.suffixPrice}
		/>
		<SwitchField
			id="suffixShareDot"
			bind:checked={data.suffixShareDot}
			label={m['section.settings.suffixShareDot']()}
			disabled={!data.suffixPrice}
		/>
		<SwitchField
			id="verticalDesc"
			bind:checked={data.verticalDesc}
			label={m['section.settings.verticalDesc']()}
		/>
		<SwitchField
			id="blockFeeDec"
			bind:checked={data.blockFeeDec}
			label={m['section.settings.blockFeeDec']()}
		/>
		<SwitchField
			id="supplyPercent"
			bind:checked={data.supplyPercent}
			label={m['section.settings.supplyPercent']()}
		/>
	</div>

	<div class="mt-4">
		<h5 class="font-semibold mb-2">{m['section.settings.screens']()}</h5>
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1"
			data-testid="screens-grid"
		>
			{#each data.screens as s (s.id)}
				<SwitchField id="screens_{s.id}" bind:checked={s.enabled} label={s.name} />
			{/each}
		</div>
	</div>

	{#if showCurrencies && data.availableCurrencies}
		<div class="mt-4">
			<h5 class="font-semibold">{m['section.settings.currencies']()}</h5>
			<small>{m['restartRequired']()}</small>
			<div
				class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-x-4 gap-y-1 mt-2"
				data-testid="currencies-grid"
			>
				{#each data.availableCurrencies as c (c)}
					<label class="label cursor-pointer justify-start gap-2 py-1" for="currency_{c}">
						<input
							id="currency_{c}"
							type="checkbox"
							class="checkbox checkbox-sm"
							bind:group={data.actCurrencies}
							value={c}
						/>
						<span class="label-text">{c}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</CollapseCard>
