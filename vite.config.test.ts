import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}']
	}
});
