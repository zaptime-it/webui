/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rewrites SvelteKit's single-page fallback `bundle.html` into a standalone
// `bundle.js` + `index.html` pair anchored on the `.overlay` class. The BTClock
// firmware serves these two files from LittleFS.
const doRewrap = ({ cssClass }: { cssClass: string }) => {
	try {
		if (fs.existsSync(path.resolve(__dirname, 'dist/bundle.js'))) {
			return;
		}
	} catch {
		// ignore
	}
	console.log('\nStart re-wrapping...');
	fs.readFile(
		path.resolve(__dirname, 'dist/bundle.html'),
		'utf8',
		function (_err: unknown, data: string) {
			if (!data) {
				console.log(
					`[Error]: No bundle.html generated, check svelte.config.js -> config.kit.adapter -> fallback: "bundle.html"`
				);
				return;
			}
			const matchData = data.match(/(?<=<script\b[^>]*>)([\s\S]*?)(?=<\/script>)/gm);
			if (matchData) {
				const cleanData = matchData[0]
					.trim()
					.replace(
						/document\.querySelector\('\[data-sveltekit-hydrate="[^"]+"\]'\)\.parentNode/,
						`document.querySelector(".${cssClass}")`
					);
				fs.writeFile(path.resolve(__dirname, 'dist/bundle.js'), cleanData, (err: unknown) => {
					if (err) console.log(err);
					else {
						try {
							fs.renameSync(
								path.resolve(__dirname, 'dist/index.page'),
								path.resolve(__dirname, 'dist/index.html')
							);
						} catch {
							// ignore
						}
						try {
							fs.unlinkSync(path.resolve(__dirname, 'dist/bundle.html'));
						} catch {
							// ignore
						}
						console.log('Finished: bundle.js + index.html have been regenerated.\n');
					}
				});
			} else console.log(`[Error]: No proper <script> tag found in bundle.html`);
		}
	);
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		sveltekit(),
		{
			name: 'postbuild-command',
			closeBundle: {
				order: 'post',
				handler() {
					setTimeout(() => doRewrap({ cssClass: 'overlay' }), Math.random() * 500 + 500);
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
				preserveModules: false,
				manualChunks: () => 'app'
			}
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		alias: {
			$app: path.resolve('./src/mocks/$app'),
			$lib: path.resolve('./src/lib')
		}
	},
	resolve: {
		conditions: process.env.VITEST ? ['browser'] : []
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
	}
});
