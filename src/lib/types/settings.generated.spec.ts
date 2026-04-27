/**
 * Cross-checks the generated firmware metadata against the WebUI's
 * hand-maintained markup. Drift here means either:
 *   - the WebUI is lying ("restart required" on a runtime field, or
 *     vice-versa), or
 *   - the firmware schema changed and someone forgot to regenerate
 *     settings.generated.ts.
 *
 * Catching it in unit tests is much cheaper than catching it on the
 * device.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { settingsFieldsByKey, isBootOnly } from './settings.generated';

const here = dirname(fileURLToPath(import.meta.url));
const sectionsDir = join(here, '..', 'features', 'settings', 'sections');

const sectionSrc = readdirSync(sectionsDir)
	.filter((f) => f.endsWith('.svelte'))
	.map((f) => readFileSync(join(sectionsDir, f), 'utf8'))
	.join('\n');

// We walk the section source line-by-line: when a line declares
// `id="<key>"` we look at the following 8 lines for `restartRequired`.
// 8 is chosen empirically — every existing element fits its closing
// `/>` (or `</Component>` when there's a snippet) inside that window,
// while the next element's opening tag never reaches into it. Using a
// fixed window keeps the test free of brittle fully-balanced HTML
// parsing while still catching cases where the label and the id sit
// inside the same component but on different lines.
const labelledKeys = new Set<string>();
const lines = sectionSrc.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
	const idMatch = lines[i].match(/\bid="([A-Za-z][A-Za-z0-9]*)"/);
	if (!idMatch) continue;
	const window = lines.slice(i, i + 8).join('\n');
	// Stop the window at the next element opening so we don't bleed
	// into a neighbouring component's label.
	const cutoff = window.search(
		/<(?:SwitchField|NumberField|SelectField|RangeField|ColorField|Field)\b(?!.*?id="[A-Za-z]+")/
	);
	const scoped = cutoff > 0 ? window.slice(0, cutoff) : window;
	if (/restartRequired/.test(scoped)) labelledKeys.add(idMatch[1]);
}

describe('settings.generated.ts ↔ UI cross-check', () => {
	test('every field the UI labels "restart required" is marked bootOnly in firmware', () => {
		const wronglyLabelled: string[] = [];
		for (const key of labelledKeys) {
			if (settingsFieldsByKey[key] && !settingsFieldsByKey[key].bootOnly) {
				wronglyLabelled.push(key);
			}
		}
		// If a field appears here, either:
		//   (a) the firmware really does need a reboot but its kFields
		//       entry is missing boot_only — fix the firmware schema and
		//       regenerate, or
		//   (b) the WebUI is over-conservative and the label should drop
		//       the `({m['restartRequired']()})` suffix.
		expect(wronglyLabelled).toEqual([]);
	});

	test('isBootOnly() returns the same answer as settingsFieldsByKey lookup', () => {
		// Sanity: the convenience helper must not diverge from the table.
		for (const f of Object.values(settingsFieldsByKey)) {
			expect(isBootOnly(f.key)).toBe(f.bootOnly);
		}
	});

	test('isBootOnly returns false for unknown keys (no false positives)', () => {
		expect(isBootOnly('zzNotARealKey')).toBe(false);
	});

	test('a known boot-only key (mdnsEnabled) reports true', () => {
		expect(isBootOnly('mdnsEnabled')).toBe(true);
	});

	test('a known runtime key (mowMode) reports false', () => {
		expect(isBootOnly('mowMode')).toBe(false);
	});
});
