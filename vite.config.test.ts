import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		sourcemap: true,
		minify: false,
		rollupOptions: {
			output: {
				manualChunks: undefined // Disable code splitting
			}
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				quietDeps: true,
				silenceDeprecations: ['import'],
				api: 'modern-compiler',
				loadPaths: [path.resolve(__dirname, 'node_modules')]
			}
		}
	},
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}']
	}
});
