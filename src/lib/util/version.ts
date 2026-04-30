export const compareVersions = (version1: string, version2: string): number => {
	if (!version2) return 0;
	const parts1 = version1.split('.').map((p) => parseInt(p, 10));
	const parts2 = version2.split('.').map((p) => parseInt(p, 10));
	for (let i = 0; i < 3; i++) {
		const a = parts1[i] ?? 0;
		const b = parts2[i] ?? 0;
		if (a > b) return 1;
		if (a < b) return -1;
	}
	return 0;
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
	firmwareBinaryMap[hwRev] ?? 'Unsupported hardware, unable to determine firmware binary filename';

export const getWebUiBinaryName = (hwRev: string): string =>
	webuiBinaryMap[hwRev] ?? 'Unsupported hardware, unable to determine WebUI binary filename';
