import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser,
				svelteFeatures: {
					experimentalGenerics: true
				}
			}
		},
		rules: {
			'svelte/valid-compile': ['error', { ignoreWarnings: true }],
			// The WebUI runs at root on-device; SvelteKit's base-path resolve() is
			// unnecessary and would add runtime cost for no benefit.
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'build_gz/',
			'output/',
			'src/lib/paraglide/',
			'tests/',
			'playwright.*.config.ts',
			'playwright.config.ts'
		]
	}
];
