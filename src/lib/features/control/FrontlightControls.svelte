<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { frontlightOn, frontlightOff, frontlightFlash } from '$lib/api/client';

	const on = () => {
		frontlightOn().catch(() => {});
	};
	const off = () => {
		frontlightOff().catch(() => {});
	};
	const flash = () => {
		frontlightFlash().catch(() => {});
	};
</script>

<section class="space-y-2">
	<h3 class="text-lg font-semibold">{m['section.control.frontlight']()}</h3>
	<div class="flex flex-wrap justify-end gap-2">
		<button type="button" class="btn btn-sm" id="turnOffFrontlightBtn" onclick={off}>
			{m['section.control.turnOff']()}
		</button>
		<button type="button" class="btn btn-sm btn-primary" onclick={on}>
			{m['section.control.turnOn']()}
		</button>
		<button type="button" class="btn btn-sm btn-success" id="flashFrontlight" onclick={flash}>
			{m['section.control.flashFrontlight']()}
		</button>
	</div>
</section>
