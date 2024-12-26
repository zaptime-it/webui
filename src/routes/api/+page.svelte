<script lang="ts">
	import { Button, Container } from '@sveltestrap/sveltestrap';

	import { onMount } from 'svelte';
	let swaggerLoaded: boolean = false;

	onMount(async () => {
		loadSwagger();
	});

	const loadSwagger = () => {
		// @ts-expect-error: SwaggerUIBundle is loaded from external script from CDN
		if (!SwaggerUIBundle) return; // eslint-disable-line
		swaggerLoaded = true;
		// @ts-expect-error: SwaggerUIBundle is loaded from external script from CDN
		// eslint-disable-next-line
		window.ui = SwaggerUIBundle({
			url: '/swagger.json',
			dom_id: '#swagger-ui-container',
			presets: [
				// @ts-expect-error: SwaggerUIBundle is loaded from external script from CDN
				SwaggerUIBundle.presets.apis, // eslint-disable-line
				// @ts-expect-error: SwaggerUIStandalonePreset is loaded from external script from CDN
				SwaggerUIStandalonePreset // eslint-disable-line
			]
			//	layout: "StandaloneLayout",
		});
	};
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

<Container fluid class="bg-light">
	<section class:invisible={swaggerLoaded}><Button on:click={loadSwagger}>Load</Button></section>
	<div id="swagger-ui-container" />
</Container>
