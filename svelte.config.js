import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'bundle.html',
			precompress: false,
			strict: true
		}),
		appDir: 'build',
		output: {
			bundleStrategy: 'single'
		}
	}
};

export default config;
