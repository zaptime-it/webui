import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import GithubActionsReporter from 'vitest-github-actions-reporter';
// import { visualizer } from 'rollup-plugin-visualizer';

import * as fs from 'fs';
import * as path from 'path';

const doRewrap = ({ cssClass }) => {
	try {
		if (fs.existsSync(path.resolve(__dirname, 'dist/bundle.js'))) {
			return;
		}
	} catch {
		// do nothing
	}
	console.log('\nStart re-wrapping...');
	fs.readFile(path.resolve(__dirname, 'dist/bundle.html'), 'utf8', function (err, data) {
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
					`document.querySelector('[data-sveltekit-hydrate="45h"]').parentNode`,
					`document.querySelector(".${cssClass}")`
				);
			fs.writeFile(path.resolve(__dirname, 'dist/bundle.js'), cleanData, (err) => {
				if (err) console.log(err);
				else {
					try {
						fs.rename(
							path.resolve(__dirname, 'dist/index.page'),
							path.resolve(__dirname, 'dist/index.html'),
							() => {}
						);
					} catch {
						// do nothing
					}
					try {
						fs.unlinkSync(path.resolve(__dirname, 'dist/bundle.html'));
					} catch {
						// do nothing
					}
					console.log('Finished: bundle.js + index.html have been regenerated.\n');
				}
			});
		} else console.log(`[Error]: No proper <script> tag found in bundle.html`);
	});
};

export default defineConfig({
	plugins: [
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
		// visualizer({
		// 	emitFile: true,
		// 	filename: "stats.html",
		//   })
	],
	build: {
		minify: 'esbuild',
		cssCodeSplit: false,
		chunkSizeWarningLimit: 550,
		rollupOptions: {
			output: {
				// assetFileNames: '[hash][extname]',
				entryFileNames: `[hash][extname]`,
				chunkFileNames: `[hash][extname]`,
				assetFileNames: `[hash][extname]`,
				preserveModules: false,

				manualChunks: () => {
					return 'app';
				}
			}
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				quietDeps: true,
				silenceDeprecations: ['import']
			}
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : 'default'
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
	}
});
