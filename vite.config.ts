/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vitest/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// adapter-static emits `dist/bundle.html` as the SPA fallback for the
// non-prerendered `/api` and `/convert` routes. The firmware doesn't
// route unknown paths to it (no SPA fallback in control_server.cpp), so
// it would only bloat the LittleFS image. Drop it post-build.
const dropFallbackHtml = async (): Promise<void> => {
	await fs.rm(path.resolve(__dirname, 'dist/bundle.html'), { force: true });
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		sveltekit(),
		// Opt-in bundle analyzer. `pnpm build:report` (or any other build
		// invoked with ANALYZE=1) drops a treemap at <repo>/stats.html so
		// we can spot what's pulling weight on the LittleFS partition.
		// Absolute path because SvelteKit hands rollup an emit dir that
		// gets relocated mid-build, so a relative `dist/stats.html` ends
		// up somewhere unhelpful.
		...(process.env.ANALYZE
			? [
					visualizer({
						filename: path.resolve(__dirname, 'stats.html'),
						gzipSize: true,
						brotliSize: true,
						template: 'treemap',
						emitFile: false
					})
				]
			: []),
		{
			name: 'postbuild-cleanup',
			closeBundle: {
				order: 'post',
				async handler() {
					await dropFallbackHtml();
				}
			}
		}
	],
	build: {
		// No `minify` override → rolldown-vite's default oxc minifier, which
		// is faster, ~9 KB smaller (gzipped) here than the old esbuild path,
		// and not deprecated like `minify: 'esbuild'`.
		chunkSizeWarningLimit: 550,
		// No rollupOptions.output here on purpose: SvelteKit's
		// `bundleStrategy: 'single'` (svelte.config.js) owns cssCodeSplit and
		// the entry/chunk/asset file names, and the LittleFS filename
		// shortening lives in patches/@sveltejs__kit@2.63.0.patch. Anything set
		// here is overridden by SvelteKit (it logs a "will be overridden"
		// notice either way), so it would be dead config.
		rolldownOptions: {
			// Vite 8 runs on rolldown. Its PLUGIN_TIMINGS check warns whenever
			// JS plugins outweigh the (tiny) Rust link stage by >100x — which a
			// small SvelteKit app always trips, and which isn't actionable (the
			// dominant plugin, vite-plugin-sveltekit-guard, is internal).
			checks: { pluginTimings: false }
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test-setup.ts'],
		alias: {
			$app: path.resolve('./src/mocks/$app'),
			$lib: path.resolve('./src/lib')
		}
	},
	// Only override resolve.conditions under Vitest. As of Vite 6 the field
	// REPLACES the built-in defaults (`module`, `browser`,
	// `development|production`) — even when set to `[]` — instead of
	// extending them as in v5. Setting it unconditionally would also drop
	// the `svelte` condition injected by @sveltejs/vite-plugin-svelte, which
	// loads two distinct svelte runtimes and breaks getContext with
	// `lifecycle_outside_component`. See sveltejs/svelte#16933.
	...(process.env.VITEST
		? {
				resolve: {
					conditions: ['browser']
				}
			}
		: {})
});
