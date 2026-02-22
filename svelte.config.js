import adapter from '@sveltejs/adapter-static';
import { sveltePreprocess } from 'svelte-preprocess';
import { svelteDefaultImportPreprocess } from './svelte-default-import-preprocess.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	// Run default-import rewrite before svelte-preprocess to avoid Svelte 5 parse error on "import X from './Y.svelte'"
	preprocess: [svelteDefaultImportPreprocess(), sveltePreprocess({})],
	build: {
		rollupOptions: {
			output: {
				assetFilenames: '[hash]'
			}
		}
	},
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'dist',
			assets: 'dist',
			fallback: 'bundle.html',
			precompress: false,
			strict: true
		}),
		appDir: 'build'
		// inlineStyleThreshold: 9999999999
	}
};

export default config;
