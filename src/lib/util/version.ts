export const compareVersions = (version1: string, version2: string): number => {
	if (!version2) return 0;
	const parts1 = version1.split('.').map((p) => parseInt(p, 10));
	const parts2 = version2.split('.').map((p) => parseInt(p, 10));
	for (let i = 0; i < 3; i++) {
		if (parts1[i] > parts2[i]) return 1;
		if (parts1[i] < parts2[i]) return -1;
	}
	return 0;
};

const firmwareBinaryMap: Record<string, string> = {
	REV_V8_EPD_2_13: 'btclock_rev_v8_213epd_firmware.bin',
	REV_B_EPD_2_13: 'btclock_rev_b_213epd_firmware.bin',
	REV_A_EPD_2_13: 'lolin_s3_mini_213epd_firmware.bin',
	REV_A_EPD_2_9: 'lolin_s3_mini_29epd_firmware.bin'
};

const webuiBinaryMap: Record<string, string> = {
	REV_V8_EPD_2_13: 'littlefs_16MB.bin',
	REV_B_EPD_2_13: 'littlefs_8MB.bin',
	REV_A_EPD_2_13: 'littlefs_4MB.bin'
};

export const getFirmwareBinaryName = (hwRev: string): string =>
	firmwareBinaryMap[hwRev] ?? 'Unsupported hardware, unable to determine firmware binary filename';

export const getWebUiBinaryName = (hwRev: string): string =>
	webuiBinaryMap[hwRev] ?? 'Unsupported hardware, unable to determine WebUI binary filename';
