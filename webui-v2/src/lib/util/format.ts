export const toUptimeString = (secs: number): string => {
	const h = Math.floor(secs / 3600);
	const m = Math.floor((secs % 3600) / 60);
	const s = Math.ceil(secs % 60);
	return `${h}h ${m}m ${s}s`;
};

export const chunkArray = <T>(array: T[], size: number): T[][] => {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
	return result;
};
