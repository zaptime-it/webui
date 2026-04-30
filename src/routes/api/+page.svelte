<script lang="ts">
	import { onMount } from 'svelte';
	import './swagger-dark.css';

	let swaggerLoaded = $state(false);

	const loadSwagger = () => {
		const w = window as unknown as {
			SwaggerUIBundle?: (opts: unknown) => unknown;
			SwaggerUIStandalonePreset?: unknown;
			ui?: unknown;
		};
		if (!w.SwaggerUIBundle) return;
		swaggerLoaded = true;
		w.ui = w.SwaggerUIBundle({
			url: '/swagger.json',
			dom_id: '#swagger-ui-container',
			presets: [
				(w.SwaggerUIBundle as unknown as { presets: { apis: unknown } }).presets.apis,
				w.SwaggerUIStandalonePreset
			]
		});
	};

	onMount(() => loadSwagger());
</script>

<svelte:head>
	<title>API playground</title>
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"
		integrity="sha512-7ihPQv5ibiTr0DW6onbl2MIKegdT6vjpPySyIb4Ftp68kER6Z7Yiub0tFoMmCHzZfQE9+M+KSjQndv6NhYxDgg=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	></script>
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js"
		integrity="sha512-UrYi+60Ci3WWWcoDXbMmzpoi1xpERbwjPGij6wTh8fXl81qNdioNNHExr9ttnBebKF0ZbVnPlTPlw+zECUK1Xw=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	></script>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css"
		integrity="sha512-+9UD8YSD9GF7FzOH38L9S6y56aYNx3R4dYbOCgvTJ2ZHpJScsahNdaMQJU/8osUiz9FPu0YZ8wdKf4evUbsGSg=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	/>
</svelte:head>

<section class:invisible={swaggerLoaded}>
	<button type="button" class="btn" onclick={loadSwagger}>Load</button>
</section>
<div id="swagger-ui-container"></div>
