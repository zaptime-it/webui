import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as sass from 'sass';
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
				api: 'modern-compiler',
				quietDeps: true,
				silenceDeprecations: ['import'],
				loadPaths: [path.resolve(__dirname, 'node_modules')],
				importers: [new sass.NodePackageImporter()]
			}
		}
	},
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}']
	}
});
