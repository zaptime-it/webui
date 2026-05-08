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
		minify: 'esbuild',
		cssCodeSplit: false,
		chunkSizeWarningLimit: 550,
		rollupOptions: {
			output: {
				entryFileNames: `[hash][extname]`,
				chunkFileNames: `[hash][extname]`,
				assetFileNames: `[hash][extname]`,
				preserveModules: false
			}
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
	resolve: {
		conditions: process.env.VITEST ? ['browser'] : []
	}
});
