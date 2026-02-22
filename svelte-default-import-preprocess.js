/**
 * Workaround for Svelte 5 + svelte-preprocess parse error on default .svelte imports.
 * Rewrites "import X from './Y.svelte'" to namespace import + const so the compiler parses correctly.
 */
export function svelteDefaultImportPreprocess() {
	return {
		script: ({ content }) => {
			const rewritten = content.replace(
				/import\s+(\w+)\s+from\s+['"]([^'"]+\.svelte)['"]\s*;?/g,
				(_, name, path) =>
					`import * as __${name} from '${path}';\n\tconst ${name} = __${name}.default;`
			);
			return { code: rewritten };
		}
	};
}
