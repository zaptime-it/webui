/**
 * The fwCommitMismatch banner used to fire on every commit-level
 * difference between firmware and WebUI. Because the WebUI ships from a
 * separate repo, that meant the warning was almost always on, training
 * users to ignore it. The fix: a per-session dismissal stored in
 * sessionStorage, keyed on the (gitRev, fsRev) pair so a fresh build of
 * either side re-prompts.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'SystemInfo.svelte'), 'utf8');

describe('SystemInfo: fw-mismatch banner', () => {
	beforeEach(() => {
		// Each test starts with a clean session storage so dismissal state
		// doesn't bleed across cases.
		sessionStorage.clear();
	});

	test('dismissal key includes both commit hashes', () => {
		// If the key only used gitRev or fsRev alone, a unilateral upgrade
		// of the other side wouldn't re-prompt.
		expect(src).toMatch(/fwMismatchDismissed:\$\{data\.gitRev\}:\$\{data\.fsRev\}/);
	});

	test('uses sessionStorage, not localStorage (resets per tab)', () => {
		// localStorage would persist a "don't bug me" forever, hiding real
		// regressions later. sessionStorage clears on tab close.
		expect(src).toContain('sessionStorage.getItem');
		expect(src).toContain('sessionStorage.setItem');
		expect(src).not.toContain('localStorage');
	});

	test('banner gates render on `!dismissed`, not just `mismatch`', () => {
		// Without this gate, dismissing wouldn't actually hide the banner.
		expect(src).toMatch(/{#if mismatch && !dismissed}/);
	});

	test('Dismiss button writes "1" to the key and flips `dismissed`', () => {
		// `data-testid` markers + literal "1" make the wiring auditable.
		expect(src).toContain('data-testid="fw-mismatch-dismiss"');
		expect(src).toMatch(/sessionStorage\.setItem\(dismissalKey,\s*'1'\)/);
	});
});
