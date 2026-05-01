<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { pauseTimer, timerRestart, dndEnable, dndDisable } from '$lib/api/client';
	import { toUptimeString } from '$lib/util/format';

	import ClockDisplay from '$lib/features/clock/ClockDisplay.svelte';
	import ScreenButtons from './ScreenButtons.svelte';
	import CurrencyButtons from './CurrencyButtons.svelte';
	import ResourceBars from './ResourceBars.svelte';
	import ConnectionStatus from './ConnectionStatus.svelte';
	import LedSwatch from '$lib/ui/LedSwatch.svelte';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	const lightMode = $derived(!settings?.invertedColor);
	const connected = $derived(statusStore.connected && !(status?.isFake ?? false));
	const otaInProgress = $derived(statusStore.otaInProgress);

	// Optimistic toggle: flip the local view first, then fire. If the call
	// rejects, snap back to server truth (clearOptimistic) so the button
	// doesn't lie. The next SSE frame also clears the overlay on its own.
	const toggleTimer = (running: boolean) => async (e: Event) => {
		e.preventDefault();
		statusStore.applyOptimistic({ timerRunning: !running });
		try {
			const res = await (running ? pauseTimer() : timerRestart());
			if (!res.ok) statusStore.clearOptimistic();
		} catch {
			statusStore.clearOptimistic();
		}
	};

	const toggleDnd = (enabled: boolean) => async (e: Event) => {
		e.preventDefault();
		statusStore.applyOptimistic({ dndEnabled: !enabled, dndActive: !enabled });
		try {
			const res = await (enabled ? dndDisable() : dndEnable());
			if (!res.ok) statusStore.clearOptimistic();
		} catch {
			statusStore.clearOptimistic();
		}
	};

	const timerRunning = $derived(statusStore.timerRunning ?? false);
	const dndActive = $derived(statusStore.dndActive ?? false);
	const dndEnabled = $derived(statusStore.dndEnabled ?? false);
</script>

<div class="card bg-base-100 shadow @container" id="status-card">
	<div class="card-body space-y-3">
		<h2 class="card-title">{m['section.status.title']()}</h2>

		{#if !settingsStore.isReady}
			<div class="flex items-center gap-2">
				<span class="loading loading-spinner" aria-hidden="true"></span>
				<strong role="status">Loading…</strong>
			</div>
		{:else}
			<ScreenButtons />
			<CurrencyButtons />

			<hr class="border-base-300" />

			{#if status?.data}
				<section class={lightMode ? 'lightMode' : 'darkMode'} style="position: relative;">
					{#if !connected}
						<div class="connection-lost-overlay" data-testid="connection-lost-overlay">
							<div class="overlay-content">
								{#if otaInProgress}
									<h4>{m['section.status.otaInProgressTitle']()}</h4>
									<p>{m['section.status.otaInProgressBody']()}</p>
								{:else}
									<h4>{m['section.status.lostConnectionTitle']()}</h4>
									<p>{m['section.status.lostConnectionBody']()}</p>
								{/if}
							</div>
						</div>
					{/if}
					<ClockDisplay
						status={status ?? {}}
						verticalDesc={settings?.verticalDesc}
						satsVariant={settings?.useSatsSymbol ? settings?.satsVariant : undefined}
					/>
				</section>

				<div class="flex flex-wrap gap-x-6 gap-y-3 text-sm">
					<div class="flex min-w-0 flex-col gap-1">
						<span class="text-base-content/70">{m['section.status.screenCycle']()}</span
						>
						<button
							id="timerStatusText"
							type="button"
							class="btn btn-xs gap-1 self-start {timerRunning
								? 'btn-success'
								: 'btn-ghost'}"
							onclick={toggleTimer(timerRunning)}
							aria-pressed={timerRunning}
						>
							{#if timerRunning}
								<span aria-hidden="true">⏵</span>
								{m['timer.running']()}
							{:else}
								<span aria-hidden="true">⏸</span>
								{m['timer.stopped']()}
							{/if}
						</button>
					</div>

					<div class="flex min-w-0 flex-col gap-1">
						<span class="text-base-content/70"
							>{m['section.status.doNotDisturb']()}</span
						>
						<button
							id="dndStatusText"
							type="button"
							class="btn btn-xs gap-1 self-start {dndActive
								? 'btn-warning'
								: 'btn-ghost'}"
							onclick={toggleDnd(dndEnabled)}
							aria-pressed={dndActive}
						>
							{#if dndActive}
								<span aria-hidden="true">⏵</span> On
							{:else}
								<span aria-hidden="true">⏸</span> Off
							{/if}
						</button>
						{#if status?.dnd?.dndTimeEnabled && settings?.dnd}
							<small class="text-base-content/70 leading-snug">
								{m['section.status.timeBasedDnd']()} ({settings.dnd
									.startHour}:{String(settings.dnd.startMinute).padStart(2, '0')} -
								{settings.dnd.endHour}:{String(settings.dnd.endMinute).padStart(
									2,
									'0'
								)})
							</small>
						{/if}
					</div>
				</div>
			{/if}

			<hr class="border-base-300" />

			{#if !settings?.disableLeds && status?.leds}
				<div class="flex flex-wrap justify-evenly gap-2" data-testid="led-indicators">
					{#each status.leds as led, i (i)}
						<LedSwatch hex={led.hex} label="LED {i + 1}" />
					{/each}
				</div>
				<hr class="border-base-300" />
			{/if}

			<ResourceBars uptime={toUptimeString(status?.espUptime ?? 0)} />

			<ConnectionStatus />
		{/if}
	</div>
</div>

<style>
	.connection-lost-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 1050;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.connection-lost-overlay :global(.overlay-content) {
		background-color: rgba(255, 255, 255, 0.85);
		color: #000;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		text-align: center;
	}

	.connection-lost-overlay :global(.overlay-content h4) {
		margin: 0 0 0.25rem 0;
		font-weight: 600;
	}

	.connection-lost-overlay :global(.overlay-content p) {
		margin: 0;
		font-size: 0.875rem;
	}
</style>
