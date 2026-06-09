import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Keep the test build's message output structure identical to
			// production (see vite.config.ts) so Playwright exercises the same
			// locale-modules bundle that ships to the device.
			outputStructure: 'locale-modules'
		}),
		sveltekit()
	],
	build: {
		// No minify override → uses rolldown-vite's default oxc minifier
		// (faster, smaller here, and not deprecated like minify:'esbuild').
		// Silence rolldown's PLUGIN_TIMINGS check — this is the build the
		// Playwright webServer runs, so it's where the warning showed up.
		// See vite.config.ts for the rationale.
		rolldownOptions: {
			checks: { pluginTimings: false }
		}
	}
});
