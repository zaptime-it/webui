<script lang="ts">
	/**
	 * Read-only colour swatch for the live LED indicators in Status.svelte.
	 *
	 * Replaces a `<input type="color" disabled>`: browsers still let users
	 * click a disabled native colour input and open the OS picker — they
	 * just can't commit the change. A plain coloured div with an aria-label
	 * has none of that affordance and matches the LED-row visual exactly.
	 */
	interface Props {
		hex: string;
		label: string;
	}

	let { hex, label }: Props = $props();
</script>

<div
	class="led-swatch"
	role="img"
	aria-label="{label}: {hex}"
	style="background-color: {hex};"
></div>

<style>
	.led-swatch {
		width: 2.25rem;
		height: 2.25rem;
		padding: 0.15rem;
		border: 1px solid var(--color-base-300, oklch(87% 0.01 250));
		border-radius: 0.375rem;
		box-sizing: border-box;
		flex-shrink: 0;
	}
</style>
