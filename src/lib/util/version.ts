import manifest from '$lib/manifest.json';

// Minimum firmware version this WebUI bundle requires. Bumped in
// src/lib/manifest.json when the WebUI starts depending on a firmware
// endpoint or settings field that didn't exist before. Forward-compatible
// additions (firmware adds a new field the WebUI ignores) do NOT bump
// this — only removals/renames that a released WebUI relies on. Used by
// SystemInfo.svelte to render an incompatibility banner when running on
// older firmware. The same value is also written into the LittleFS image
// at build time (data/gzip_build.py → build_gz/www/manifest.json) so the
// device's `curl /manifest.json` exposes it for tooling.
export const MIN_FIRMWARE: string = manifest.minFirmware;

// `git describe --tags --always --dirty` produces strings like
//   "4.0.0-beta.13"             (clean tag)
//   "4.0.0-beta.13-dirty"       (clean tag, dirty tree)
//   "4.0.0-beta.13-5-gabc1234"  (5 commits past tag)
//   "4.0.0-beta.13-5-gabc1234-dirty"
// The `-N-g<hex>` and `-dirty` suffixes are git-describe noise, not
// semver. Strip them so the rest of this module sees a pure semver
// string ("4.0.0-beta.13") that can be compared against MIN_FIRMWARE.
const stripDevSuffix = (s: string): string => {
	const r = s.endsWith('-dirty') ? s.slice(0, -'-dirty'.length) : s;
	return r.replace(/-\d+-g[0-9a-f]+$/i, '');
};

const splitFirstDash = (s: string): [string, string] => {
	const i = s.indexOf('-');
	return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
};

const compareCore = (a: string, b: string): number => {
	const pa = a.split('.').map((p) => parseInt(p, 10) || 0);
	const pb = b.split('.').map((p) => parseInt(p, 10) || 0);
	for (let i = 0; i < 3; i++) {
		const x = pa[i] ?? 0;
		const y = pb[i] ?? 0;
		if (x > y) return 1;
		if (x < y) return -1;
	}
	return 0;
};

const isNumeric = (s: string) => /^\d+$/.test(s);

// Per semver.org §11: prerelease identifiers compared dot-separated;
// numeric identifiers compare numerically; non-numeric identifiers
// compare ASCII-lexically; numeric identifiers always have lower
// precedence than non-numeric ones; a longer set of identifiers has
// higher precedence than a shorter one when all leading parts are equal.
const comparePrerelease = (a: string[], b: string[]): number => {
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) {
		// Bounded loop guarantees these are defined; the fallback is to
		// satisfy `noUncheckedIndexedAccess` without `!` assertions.
		const ai = a[i] ?? '';
		const bi = b[i] ?? '';
		const an = isNumeric(ai);
		const bn = isNumeric(bi);
		if (an && bn) {
			const d = parseInt(ai, 10) - parseInt(bi, 10);
			if (d !== 0) return Math.sign(d);
		} else if (an) {
			return -1;
		} else if (bn) {
			return 1;
		} else {
			if (ai < bi) return -1;
			if (ai > bi) return 1;
		}
	}
	return Math.sign(a.length - b.length);
};

const compareSemver = (a: string, b: string): number => {
	// Build metadata (everything after `+`) is ignored for precedence.
	const aClean = a.split('+')[0] ?? a;
	const bClean = b.split('+')[0] ?? b;
	const [coreA, preA] = splitFirstDash(aClean);
	const [coreB, preB] = splitFirstDash(bClean);
	const core = compareCore(coreA, coreB);
	if (core !== 0) return core;
	// Per semver.org §11: a version *with* prerelease has lower
	// precedence than the same core *without* prerelease. So
	// "4.0.0-beta.1" < "4.0.0".
	if (!preA && !preB) return 0;
	if (!preA) return 1;
	if (!preB) return -1;
	return comparePrerelease(preA.split('.'), preB.split('.'));
};

// Semver-aware comparison that handles prerelease suffixes
// ("4.0.0-beta.13" < "4.0.0-beta.14" < "4.0.0" < "4.0.1") and tolerates
// `git describe` dev-build noise on either side. Returns -1, 0, or 1.
// Empty `version2` returns 0 — legacy callers (VersionCheck) use that
// to mean "no info, treat as equal".
export const compareVersions = (version1: string, version2: string): number => {
	if (!version2) return 0;
	return compareSemver(stripDevSuffix(version1), stripDevSuffix(version2));
};

// Asset names below match the v4 release pipeline output (see
// .forgejo/workflows/release.yaml in the firmware repo). Every variant
// publishes a flat `btclock_<variant>_ota.bin` and a flash-size-keyed
// `storage_<size>.bin`. Untested-but-buildable panel combos (e.g.
// REV_B_EPD_2_9, REV_V8_EPD_7_5) get entries too — they configure
// cleanly in the firmware and the WebUI shouldn't refuse the lookup.
const firmwareBinaryMap: Record<string, string> = {
	REV_A_EPD_2_13: 'btclock_rev_a_ota.bin',
	REV_A_EPD_2_9: 'btclock_rev_a_29_ota.bin',
	REV_A_EPD_7_5: 'btclock_rev_a_75_ota.bin',
	REV_B_EPD_2_13: 'btclock_rev_b_ota.bin',
	REV_B_EPD_2_9: 'btclock_rev_b_29_ota.bin',
	REV_B_EPD_7_5: 'btclock_rev_b_75_ota.bin',
	REV_V8_EPD_2_13: 'btclock_v8_ota.bin',
	REV_V8_EPD_2_9: 'btclock_v8_29_ota.bin',
	REV_V8_EPD_7_5: 'btclock_v8_75_ota.bin'
};

// LittleFS storage image is keyed by flash size, not variant. Rev A is
// 4 MB, Rev B is 8 MB, V8 is 16 MB. Multiple variants on the same flash
// size share one image — the release pipeline sha256-dedupes them and
// uploads each unique blob exactly once under `storage_<size>.bin`.
const webuiBinaryMap: Record<string, string> = {
	REV_A_EPD_2_13: 'storage_4mb.bin',
	REV_A_EPD_2_9: 'storage_4mb.bin',
	REV_A_EPD_7_5: 'storage_4mb.bin',
	REV_B_EPD_2_13: 'storage_8mb.bin',
	REV_B_EPD_2_9: 'storage_8mb.bin',
	REV_B_EPD_7_5: 'storage_8mb.bin',
	REV_V8_EPD_2_13: 'storage_16mb.bin',
	REV_V8_EPD_2_9: 'storage_16mb.bin',
	REV_V8_EPD_7_5: 'storage_16mb.bin'
};

export const getFirmwareBinaryName = (hwRev: string): string =>
	firmwareBinaryMap[hwRev] ??
	'Unsupported hardware, unable to determine firmware binary filename';

export const getWebUiBinaryName = (hwRev: string): string =>
	webuiBinaryMap[hwRev] ?? 'Unsupported hardware, unable to determine WebUI binary filename';
