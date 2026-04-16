<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { statusStore } from '$lib/stores/status.svelte';
	import { lightsSet, lightsOff } from '$lib/api/client';

	let ledStatus = $state<{ hex: string }[]>([]);
	let keepLedsSameColor = $state(false);
	let initialized = false;

	$effect(() => {
		const s = statusStore.data;
		if (initialized || !s?.leds?.length) return;
		ledStatus = s.leds.map((led) => {
			let hex = led.hex;
			if (hex === '#000000') {
				hex = `#${Math.floor(Math.random() * 16777215)
					.toString(16)
					.padStart(6, '0')}`;
			}
			return { hex };
		});
		initialized = true;
	});

	const syncIfLinked = (e: Event) => {
		if (!keepLedsSameColor) return;
		const newHex = (e.target as HTMLInputElement).value;
		ledStatus = ledStatus.map((l) => (l.hex === newHex ? l : { hex: newHex }));
	};

	const apply = () => {
		lightsSet(ledStatus).catch(() => {});
	};

	const turnOff = () => {
		lightsOff().catch(() => {});
	};
</script>

<section class="space-y-3">
	<h3 class="text-lg font-semibold">LEDs</h3>
	<div class="grid grid-cols-1 @sm:grid-cols-3 items-center gap-2">
		<label class="label @sm:col-span-1" for="ledColorPicker-0">
			{m['section.control.ledColor']()}
		</label>
		<div class="@sm:col-span-2">
			<div class="flex items-center justify-between gap-2 flex-wrap">
				{#each ledStatus as led, i (i)}
					<input
						type="color"
						id="ledColorPicker-{i}"
						class="led-swatch cursor-pointer"
						bind:value={led.hex}
						onchange={syncIfLinked}
					/>
				{/each}
			</div>
			<label class="label cursor-pointer justify-end gap-2 py-1" for="keep-same">
				<span class="label-text">{m['sections.control.keepSameColor']()}</span>
				<input
					id="keep-same"
					type="checkbox"
					class="toggle toggle-sm"
					bind:checked={keepLedsSameColor}
				/>
			</label>
		</div>
	</div>
	<div class="flex justify-end gap-2">
		<button type="button" class="btn btn-sm" id="turnOffLedsBtn" onclick={turnOff}>
			{m['section.control.turnOff']()}
		</button>
		<button type="button" class="btn btn-sm btn-primary" onclick={apply}>
			{m['section.control.setColor']()}
		</button>
	</div>
</section>

<style>
	.led-swatch {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0.15rem;
		border: 1px solid var(--color-base-300, oklch(87% 0.01 250));
		border-radius: 0.375rem;
		background: transparent;
		box-sizing: border-box;
		appearance: none;
		-webkit-appearance: none;
	}
	.led-swatch::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.led-swatch::-webkit-color-swatch {
		border: none;
		border-radius: 0.25rem;
	}
	.led-swatch::-moz-color-swatch {
		border: none;
		border-radius: 0.25rem;
	}
</style>
