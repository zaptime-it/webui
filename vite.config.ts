/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// adapter-static emits `dist/bundle.html` as the SPA fallback for non-prerendered
// routes. On-device, the firmware serves paths literally from LittleFS (no SPA
// fallback), so shipping this file just bloats the image.
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
