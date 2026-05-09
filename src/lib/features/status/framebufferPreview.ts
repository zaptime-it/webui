export const PREVIEW_HEADER_BYTES = 34;
export const PREVIEW_MAGIC = 'BTFB';
export const PREVIEW_VERSION = 1;
export const PREVIEW_KIND_PANEL_FRAME = 1;
export const PREVIEW_COMPRESSION_DEFLATE = 1;

export interface FramebufferPreviewFrame {
	panelIndex: number;
	width: number;
	height: number;
	stride: number;
	rotationDeg: number;
	frameId: number;
	timestampMs: number;
	payloadCompressedBytes: number;
	payloadRawBytes: number;
	rawPixels: Uint8Array;
}

// Device inversion is a framebuffer-byte XOR before panel write. Mirror that
// parity in WebUI by flipping each unpacked bit when invertedColor is set.
export const framebufferBitToLuma = (bit: number, invertedColor: boolean): number => {
	const normalized = bit & 1;
	const effectiveBit = invertedColor ? normalized ^ 1 : normalized;
	return effectiveBit === 1 ? 255 : 16;
};

const decoder = new TextDecoder();

const readMagic = (buf: Uint8Array): string => decoder.decode(buf.subarray(0, 4));

const inflateDeflate = async (compressed: Uint8Array): Promise<Uint8Array> => {
	if (typeof DecompressionStream !== 'function') {
		throw new Error('deflate unsupported in this browser');
	}
	const copy = new Uint8Array(compressed.byteLength);
	copy.set(compressed);
	const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
};

export const decodeFramebufferPreviewPacket = async (
	packet: ArrayBuffer
): Promise<FramebufferPreviewFrame | null> => {
	const bytes = new Uint8Array(packet);
	if (bytes.length < PREVIEW_HEADER_BYTES) return null;
	if (readMagic(bytes) !== PREVIEW_MAGIC) return null;
	const dv = new DataView(packet);
	const version = dv.getUint8(4);
	const kind = dv.getUint8(5);
	const compression = dv.getUint8(6);
	const bitDepth = dv.getUint8(7);
	if (version !== PREVIEW_VERSION || kind !== PREVIEW_KIND_PANEL_FRAME || bitDepth !== 1) {
		return null;
	}
	const payloadCompressedBytes = dv.getUint32(26, true);
	const payloadRawBytes = dv.getUint32(30, true);
	const total = PREVIEW_HEADER_BYTES + payloadCompressedBytes;
	if (total > bytes.length) return null;
	const payload = bytes.subarray(PREVIEW_HEADER_BYTES, total);
	const rawPixels =
		compression === PREVIEW_COMPRESSION_DEFLATE ? await inflateDeflate(payload) : payload;
	if (rawPixels.length !== payloadRawBytes) return null;
	return {
		panelIndex: dv.getUint8(8),
		width: dv.getUint16(10, true),
		height: dv.getUint16(12, true),
		stride: dv.getUint16(14, true),
		rotationDeg: dv.getUint16(16, true),
		frameId: dv.getUint32(18, true),
		timestampMs: dv.getUint32(22, true),
		payloadCompressedBytes,
		payloadRawBytes,
		rawPixels
	};
};
