/**
 * Source-pattern checks that lock down the proxy section's structural
 * invariants — the bits that, if they drift, silently submit out-of-range
 * proxyType values to the device or leak the auth fields when the
 * selected proxy type doesn't actually accept auth.
 *
 * Mirrors `ExtraFeaturesSettings.spec.ts` style — read the source file
 * and assert on patterns rather than DOM-level rendering. Keeps the
 * regression visible in review without spinning a test renderer.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ProxySettings.svelte'), 'utf8');

describe('ProxySettings section', () => {
	test('proxyType integer enum matches firmware proxy_config.hpp Kind', () => {
		// btclock::proxy::Kind: kNone=0, kHttpConnect=1, kSocks4=2,
		// kSocks4a=3, kSocks5=4. The settings schema clamps to 0..4 and
		// the device rejects anything else with `range:proxyType`.
		expect(src).toMatch(/PROXY_TYPE_NONE = 0/);
		expect(src).toMatch(/PROXY_TYPE_HTTP = 1/);
		expect(src).toMatch(/PROXY_TYPE_SOCKS4 = 2/);
		expect(src).toMatch(/PROXY_TYPE_SOCKS4A = 3/);
		expect(src).toMatch(/PROXY_TYPE_SOCKS5 = 4/);
	});

	test('user/pass auth fields disable when SOCKS4/4a is selected', () => {
		// SOCKS4/4a have no auth frame — keep the inputs visible so a
		// stored credential is preserved across a type-flip, but disable
		// them so the user gets a positive signal that they are inert.
		expect(src).toMatch(
			/supportsAuth = \$derived\(\s*proxyType === PROXY_TYPE_HTTP \|\| proxyType === PROXY_TYPE_SOCKS5/
		);
		expect(src).toMatch(/id="proxyUser"[\s\S]*?disabled=\{!supportsAuth\}/);
		expect(src).toMatch(/id="proxyPass"[\s\S]*?disabled=\{!supportsAuth\}/);
	});

	test('proxyPass field placeholders dots when proxyPassSet is true', () => {
		// Same pattern as httpAuthPass / otaPass — the device never sends
		// the plaintext, just the boolean flag. The placeholder gives
		// the user a "yes, one is stored" signal without leaking content.
		expect(src).toMatch(
			/id="proxyPass"[\s\S]*?placeholder=\{data\.proxyPassSet \? '••••••••' : ''\}/
		);
	});

	test('form body is gated behind proxyEnabled toggle', () => {
		// When the proxy is off, only the master switch should render —
		// otherwise users on a non-proxied network see fields that have
		// no effect, and the dirty-form state can flicker on every load
		// from coercing optional fields.
		expect(src).toMatch(/\{#if data\.proxyEnabled\}[\s\S]*?<SelectField[\s\S]*?id="proxyType"/);
		expect(src).toMatch(
			/<SwitchField[\s\S]*?id="proxyEnabled"[\s\S]*?\{#if data\.proxyEnabled\}/
		);
	});

	test('proxyPort is bounded 1..65535 to match firmware schema', () => {
		// schema.hpp clamps proxyPort to 1..65535; the WebUI must mirror
		// the bounds so the input rejects out-of-range values client-side
		// instead of round-tripping a 422 from the device.
		expect(src).toMatch(/id="proxyPort"[\s\S]*?min=\{1\}[\s\S]*?max=\{65535\}/);
	});

	test('proxyBypass field shows the glob-syntax help text', () => {
		// The bypass syntax is non-obvious (exact / *.suffix / prefix.*),
		// so the field must surface it as inline help — not just doc.
		expect(src).toMatch(
			/id="proxyBypass"[\s\S]*?helpText=\{m\['section\.settings\.proxyBypassHelp'\]\(\)\}/
		);
	});
});
