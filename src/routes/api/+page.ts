// /api is reached only via in-app SvelteKit client navigation; the firmware
// does not map this path to a file. Skip prerendering so adapter-static
// stops emitting an unused dist/api.html alongside index.html.
export const prerender = false;
