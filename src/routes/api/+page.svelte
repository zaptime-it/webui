<script lang="ts">
	import './swagger-dark.css';

	const loadSwagger = () => {
		const w = window as unknown as {
			SwaggerUIBundle?: (opts: unknown) => unknown;
			SwaggerUIStandalonePreset?: unknown;
			ui?: unknown;
		};
		if (!w.SwaggerUIBundle) return false;
		w.ui = w.SwaggerUIBundle({
			url: '/openapi.json',
			dom_id: '#swagger-ui-container',
			presets: [
				(w.SwaggerUIBundle as unknown as { presets: { apis: unknown } }).presets.apis,
				w.SwaggerUIStandalonePreset
			]
		});
		return true;
	};

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (loadSwagger()) return;
		const interval = setInterval(() => {
			if (loadSwagger()) clearInterval(interval);
		}, 50);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>API playground</title>
	<script
		src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.5/swagger-ui-bundle.js"
		integrity="sha512-8njFkr+dYTxMuDP/ZNLh/olQ13Xm8UNI6EtBIluL76ClDWbLJwDIUs1iltCjCfkIFTWJZ0ufexfXiBRezjinVw=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	></script>
	<script
		src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.5/swagger-ui-standalone-preset.js"
		integrity="sha512-PzDFKOEV2YYSuAB29kSkriT9BOtRSAdlPNhB/0uw2UxJpxzWNvJInE/oYX7Yeui6hjEXtQzNOE2SL52pp0mDTw=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	></script>
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.5/swagger-ui.css"
		integrity="sha512-xMCEx1YGY9/YdKYbdQB0N6ZvxbjTT10OnbvJfDcnkxE0P3UjV0jqsK0yrzVGH1OCOdV7CYzCBiqLl+/7g8ZpRQ=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	/>
</svelte:head>

<div id="swagger-ui-container"></div>
