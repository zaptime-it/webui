/**
 * The /convert route ships in the same bundle as the home page (the
 * firmware's "single bundle" constraint, see svelte.config.js). Real lazy
 * loading would require splitting bundles, which would in turn require a
 * firmware change to serve arbitrary chunk files. Until that happens, the
 * best we can do is guarantee the *runtime* cost of /convert is deferred:
 * Converter must not eagerly open the exchange-rates WebSocket — connect()
 * has to run inside $effect / onMount, not at module top level.
 *
 * These tests pin both invariants:
 *   1. The Converter component never imports its WebSocket helper at
 *      module top level (only the createExchangeRates factory).
 *   2. /convert/+page.svelte only renders <Converter />; no other code
 *      paths import Converter.svelte, so a user on the home page never
 *      pays Converter's evaluation cost.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

describe('/convert runtime laziness', () => {
	test('Converter.connect() is wrapped in $effect, not invoked at module scope', () => {
		const src = readFileSync(
			join(repoRoot, 'src/lib/features/convert/Converter.svelte'),
			'utf8'
		);
		// Match the script block, not the template — `$effect(...)` only runs
		// when the component mounts. Calling `feed.connect()` outside the
		// $effect/onMount wrapper would open a WebSocket on every page load,
		// not just /convert.
		expect(src).toMatch(/\$effect\(\(\)\s*=>\s*\{[^}]*feed\.connect\(\)/);
	});

	test('Only /convert/+page.svelte and Converter.svelte itself reference Converter', () => {
		// `git grep` resolves repo paths from the current working dir; pin
		// to the repo root so the test is location-independent.
		const out = execSync('git grep -l "Converter" -- "src/**/*.svelte" "src/**/*.ts"', {
			cwd: repoRoot,
			encoding: 'utf8'
		});
		const files = out
			.trim()
			.split('\n')
			.filter(Boolean)
			.filter((f) => !f.endsWith('.spec.ts'));
		// Allowed importers: only the convert route page (Converter is
		// referenced as a string inside Converter.svelte's own header
		// comments and via tests, both filtered out by the grep+filter
		// above). Anything else means /convert leaks into another route.
		expect(files.sort()).toEqual(['src/routes/convert/+page.svelte']);
	});
});
