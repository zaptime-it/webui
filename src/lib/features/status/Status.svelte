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

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	const lightMode = $derived(!settings?.invertedColor);
	const connected = $derived(statusStore.connected && !(status?.isFake ?? false));

	const toggleTimer = (running: boolean) => (e: Event) => {
		e.preventDefault();
		(running ? pauseTimer() : timerRestart()).catch(() => {});
	};

	const toggleDnd = (enabled: boolean) => (e: Event) => {
		e.preventDefault();
		(enabled ? dndDisable() : dndEnable()).catch(() => {});
	};
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
						<div class="connection-lost-overlay">
							<div class="overlay-content">
								<h4>Lost connection</h4>
								<p>Trying to reconnect...</p>
							</div>
						</div>
					{/if}
					<ClockDisplay status={status ?? {}} verticalDesc={settings?.verticalDesc} />
				</section>
				<div class="text-sm">
					{m['section.status.screenCycle']()}:
					<button
						id="timerStatusText"
						type="button"
						class="btn btn-link btn-xs px-1"
						onclick={toggleTimer(!!status?.timerRunning)}
					>
						{#if status?.timerRunning}⏵ {m['timer.running']()}{:else}⏸ {m['timer.stopped']()}{/if}
					</button>
					<br />
					{m['section.status.doNotDisturb']()}:
					<button
						id="dndStatusText"
						type="button"
						class="btn btn-link btn-xs px-1"
						onclick={toggleDnd(!!status?.dnd?.enabled)}
					>
						{#if status?.dnd?.active}⏵ On{:else}⏸ Off{/if}
					</button>
					{#if status?.dnd?.dndTimeEnabled && settings?.dnd}
						<small>
							{m['section.status.timeBasedDnd']()} ({settings.dnd.startHour}:{String(
								settings.dnd.startMinute
							).padStart(2, '0')} - {settings.dnd.endHour}:{String(settings.dnd.endMinute).padStart(
								2,
								'0'
							)})
						</small>
					{/if}
				</div>
			{/if}

			<hr class="border-base-300" />

			{#if !settings?.disableLeds && status?.leds}
				<div class="flex flex-wrap justify-evenly gap-2">
					{#each status.leds as led, i (i)}
						<input
							type="color"
							class="led-indicator"
							value={led.hex}
							disabled
							aria-label="LED {i + 1}"
						/>
					{/each}
				</div>
				<hr class="border-base-300" />
			{/if}

			<ResourceBars />

			<hr class="border-base-300" />
			<div class="text-sm">
				{m['section.status.uptime']()}: {toUptimeString(status?.espUptime ?? 0)}
			</div>

			<ConnectionStatus />
		{/if}
	</div>
</div>

<style>
	.led-indicator {
		width: 2.25rem;
		height: 2.25rem;
		padding: 0.15rem;
		border: 1px solid var(--color-base-300, oklch(87% 0.01 250));
		border-radius: 0.375rem;
		background: transparent;
		box-sizing: border-box;
		appearance: none;
		-webkit-appearance: none;
		cursor: default;
	}
	.led-indicator::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.led-indicator::-webkit-color-swatch {
		border: none;
		border-radius: 0.25rem;
	}
	.led-indicator::-moz-color-swatch {
		border: none;
		border-radius: 0.25rem;
	}
</style>
