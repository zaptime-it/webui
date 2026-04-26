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
		// `bundleStrategy: 'single'` is a deliberate constraint imposed by the
		// firmware: control_server.cpp serves a single bundle.js + index.html
		// pair from /lfs/www/, with no router-level chunk loading. Switching
		// to 'split' would require firmware changes to serve arbitrary chunk
		// files plus a corresponding gzip_build.py update. Per-route lazy
		// loading (e.g. dynamic `import('./Converter.svelte')`) gets inlined
		// into the same bundle — the parse cost is paid once on first load.
		// Components are still only *evaluated* when their route mounts, so
		// the runtime cost of /convert is correctly deferred (Converter's
		// WebSocket connect() runs in onMount only).
		output: {
			bundleStrategy: 'single'
		}
	}
};

export default config;
