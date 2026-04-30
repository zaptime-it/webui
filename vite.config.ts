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

// Rewrites SvelteKit's single-page fallback `bundle.html` into a standalone
// `bundle.js` + `index.html` pair anchored on the `.overlay` class. The BTClock
// firmware serves these two files from LittleFS.
const rewrapBundle = async ({ cssClass }: { cssClass: string }): Promise<void> => {
	const distDir = path.resolve(__dirname, 'dist');
	const bundleHtml = path.join(distDir, 'bundle.html');
	const bundleJs = path.join(distDir, 'bundle.js');
	const indexPage = path.join(distDir, 'index.page');
	const indexHtml = path.join(distDir, 'index.html');

	// Idempotent: a previous build already produced bundle.js. (The
	// adapter-static fallback regenerates bundle.html each build, so this
	// only short-circuits within a single watcher tick.)
	if (await exists(bundleJs)) return;

	console.log('\nStart re-wrapping...');
	let html: string;
	try {
		html = await fs.readFile(bundleHtml, 'utf8');
	} catch {
		console.log(
			`[Error]: No bundle.html generated, check svelte.config.js -> config.kit.adapter -> fallback: "bundle.html"`
		);
		return;
	}

	const matchData = html.match(/(?<=<script\b[^>]*>)([\s\S]*?)(?=<\/script>)/gm);
	if (!matchData?.[0]) {
		console.log('[Error]: No proper <script> tag found in bundle.html');
		return;
	}

	const cleanData = matchData[0]
		.trim()
		.replace(
			/document\.querySelector\('\[data-sveltekit-hydrate="[^"]+"\]'\)\.parentNode/,
			`document.querySelector(".${cssClass}")`
		);

	await fs.writeFile(bundleJs, cleanData);
	// `dist/index.page` is the static-adapter prerender output; rename to
	// the .html the firmware serves. Both renames + the bundle.html
	// removal are best-effort — already-renamed / already-deleted is
	// fine on subsequent builds.
	await fs.rename(indexPage, indexHtml).catch(() => {});
	await fs.rm(bundleHtml, { force: true }).catch(() => {});
	console.log('Finished: bundle.js + index.html have been regenerated.\n');
};

const exists = async (p: string): Promise<boolean> => {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
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
			name: 'postbuild-command',
			closeBundle: {
				order: 'post',
				async handler() {
					await rewrapBundle({ cssClass: 'overlay' });
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
