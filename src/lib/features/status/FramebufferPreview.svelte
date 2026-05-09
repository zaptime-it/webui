<script lang="ts">
	import { previewWsUrl } from '$lib/api/client';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import {
		decodeFramebufferPreviewPacket,
		framebufferBitToLuma,
		type FramebufferPreviewFrame
	} from './framebufferPreview';

	// Geometry mirrors tools/wasm/render_doc_screens.mjs so the live
	// browser preview carries the same frame proportions and composition.
	const FRAME_W_MM = 219.6;
	const FRAME_H_MM = 81.25;
	const VIEWBOX_PAD_MM = 2;
	const SIDE_MARGIN_MM = 5;
	const PANEL_W_MM = 24;
	const PANEL_H_MM = 48;
	const PANEL_BEZEL_MM = 0.8;
	const PANEL_RADIUS_MM = 1.5;
	const GOLD_RING_W_MM = 0.6;
	const GOLD_RING_GAP_MM = 0.4;
	const ASPECT_RATIO = (FRAME_W_MM + 2 * VIEWBOX_PAD_MM) / (FRAME_H_MM + 2 * VIEWBOX_PAD_MM);
	const DEFAULT_PANEL_COUNT = 7;

	let socket: WebSocket | null = null;
	let framesByPanel = $state<Record<number, FramebufferPreviewFrame>>({});
	const orderedFrames = $derived(
		Object.values(framesByPanel).sort((a, b) => a.panelIndex - b.panelIndex)
	);

	let stageEl: HTMLDivElement | undefined;
	let canvasEl: HTMLCanvasElement | undefined;
	let fittedWidthPx = $state(0);
	let fittedHeightPx = $state(0);
	let panelRasterByIndex = $state<Record<number, HTMLCanvasElement>>({});
	const invertedColor = $derived(Boolean(settingsStore.data?.invertedColor));
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempt = 0;
	let tearingDown = false;

	const panelGutterMm = (count: number) => {
		if (count <= 1) return 0;
		return (FRAME_W_MM - 2 * SIDE_MARGIN_MM - count * PANEL_W_MM) / (count - 1);
	};

	const panelOriginMm = (layoutIndex: number, count: number) => {
		const gutterMm = panelGutterMm(count);
		const xMm = SIDE_MARGIN_MM + layoutIndex * (PANEL_W_MM + gutterMm);
		const yMm = (FRAME_H_MM - PANEL_H_MM) / 2;
		return { xMm, yMm };
	};

	const toPanelRaster = (
		frame: FramebufferPreviewFrame,
		useInvertedColor: boolean
	): HTMLCanvasElement | null => {
		const { width, height, stride, rawPixels } = frame;
		if (width <= 0 || height <= 0 || stride <= 0) return null;
		if (rawPixels.length < stride * height) return null;

		const imageData = new ImageData(width, height);
		const out = imageData.data;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const byte = rawPixels[y * stride + (x >> 3)] ?? 0;
				const bit = (byte >> (7 - (x & 7))) & 1;
				const v = framebufferBitToLuma(bit, useInvertedColor);
				const o = (y * width + x) * 4;
				out[o] = v;
				out[o + 1] = v;
				out[o + 2] = v;
				out[o + 3] = 255;
			}
		}

		const source = document.createElement('canvas');
		source.width = width;
		source.height = height;
		const srcCtx = source.getContext('2d');
		if (!srcCtx) return null;
		srcCtx.putImageData(imageData, 0, 0);

		const rotation = ((frame.rotationDeg % 360) + 360) % 360;
		const swapAxis = rotation === 90 || rotation === 270;
		const targetW = swapAxis ? height : width;
		const targetH = swapAxis ? width : height;
		const oriented = document.createElement('canvas');
		oriented.width = targetW;
		oriented.height = targetH;
		const orientedCtx = oriented.getContext('2d');
		if (!orientedCtx) return null;
		orientedCtx.imageSmoothingEnabled = false;
		orientedCtx.fillStyle = '#dadbde';
		orientedCtx.fillRect(0, 0, targetW, targetH);
		orientedCtx.save();
		if (rotation === 90) {
			orientedCtx.translate(targetW, 0);
			orientedCtx.rotate(Math.PI / 2);
		} else if (rotation === 180) {
			orientedCtx.translate(targetW, targetH);
			orientedCtx.rotate(Math.PI);
		} else if (rotation === 270) {
			orientedCtx.translate(0, targetH);
			orientedCtx.rotate(-Math.PI / 2);
		}
		orientedCtx.drawImage(source, 0, 0);
		orientedCtx.restore();
		return oriented;
	};

	const drawWordmark = (ctx: CanvasRenderingContext2D, midXPx: number, baselineYPx: number) => {
		const text = 'BTClock';
		const sizePx = Math.max(14, fittedHeightPx * 0.096);
		ctx.save();
		ctx.font = `italic 500 ${sizePx}px "Ubuntu", "Antonio", sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		const grad = ctx.createLinearGradient(0, baselineYPx - sizePx, 0, baselineYPx);
		grad.addColorStop(0, '#f1c64a');
		grad.addColorStop(1, '#d9aa2c');
		ctx.fillStyle = grad;
		ctx.fillText(text, midXPx, baselineYPx);
		ctx.restore();
	};

	const redrawComposite = () => {
		if (!canvasEl || fittedWidthPx <= 0 || fittedHeightPx <= 0) return;
		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = Math.max(1, Math.round(fittedWidthPx * dpr));
		canvasEl.height = Math.max(1, Math.round(fittedHeightPx * dpr));
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.imageSmoothingEnabled = true;
		ctx.clearRect(0, 0, fittedWidthPx, fittedHeightPx);

		const mmToPx = fittedWidthPx / (FRAME_W_MM + 2 * VIEWBOX_PAD_MM);
		const mapMm = (valueMm: number) => (valueMm + VIEWBOX_PAD_MM) * mmToPx;

		const pcbX = mapMm(0);
		const pcbY = mapMm(0);
		const pcbW = FRAME_W_MM * mmToPx;
		const pcbH = FRAME_H_MM * mmToPx;

		const boardGrad = ctx.createLinearGradient(0, pcbY, 0, pcbY + pcbH);
		boardGrad.addColorStop(0, '#101010');
		boardGrad.addColorStop(1, '#070707');
		ctx.fillStyle = boardGrad;
		ctx.fillRect(pcbX, pcbY, pcbW, pcbH);

		const renderFrames = orderedFrames.length > 0 ? orderedFrames : [];
		const panelCount = Math.max(renderFrames.length, DEFAULT_PANEL_COUNT);
		for (let i = 0; i < panelCount; i++) {
			const frame = renderFrames[i];
			const raster = frame ? panelRasterByIndex[frame.panelIndex] : undefined;
			const { xMm, yMm } = panelOriginMm(i, panelCount);
			const panelX = mapMm(xMm);
			const panelY = mapMm(yMm);
			const panelW = PANEL_W_MM * mmToPx;
			const panelH = PANEL_H_MM * mmToPx;
			const panelR = PANEL_RADIUS_MM * mmToPx;
			const ringOffsetMm = GOLD_RING_W_MM / 2 + GOLD_RING_GAP_MM;
			const ringX = mapMm(xMm - ringOffsetMm);
			const ringY = mapMm(yMm - ringOffsetMm);
			const ringW = (PANEL_W_MM + 2 * ringOffsetMm) * mmToPx;
			const ringH = (PANEL_H_MM + 2 * ringOffsetMm) * mmToPx;
			const ringR = (PANEL_RADIUS_MM + ringOffsetMm) * mmToPx;

			const ringGrad = ctx.createLinearGradient(0, ringY, 0, ringY + ringH);
			ringGrad.addColorStop(0, '#f1c64a');
			ringGrad.addColorStop(1, '#d9aa2c');
			ctx.strokeStyle = ringGrad;
			ctx.lineWidth = GOLD_RING_W_MM * mmToPx;
			ctx.beginPath();
			ctx.roundRect(ringX, ringY, ringW, ringH, ringR);
			ctx.stroke();

			ctx.fillStyle = '#dadbde';
			ctx.beginPath();
			ctx.roundRect(panelX, panelY, panelW, panelH, panelR);
			ctx.fill();

			if (!raster) continue;
			ctx.imageSmoothingEnabled = false;
			const innerX = mapMm(xMm + PANEL_BEZEL_MM);
			const innerY = mapMm(yMm + PANEL_BEZEL_MM);
			const innerW = (PANEL_W_MM - 2 * PANEL_BEZEL_MM) * mmToPx;
			const innerH = (PANEL_H_MM - 2 * PANEL_BEZEL_MM) * mmToPx;
			ctx.drawImage(raster, innerX, innerY, innerW, innerH);
			ctx.imageSmoothingEnabled = true;
		}

		drawWordmark(ctx, mapMm(FRAME_W_MM / 2), mapMm(FRAME_H_MM - 7.375));
	};

	const updateFit = () => {
		if (!stageEl) return;
		const maxW = stageEl.clientWidth;
		const maxH = stageEl.clientHeight || maxW / ASPECT_RATIO;
		if (maxW <= 0 || maxH <= 0) return;
		const width = Math.min(maxW, maxH * ASPECT_RATIO);
		fittedWidthPx = Math.max(1, Math.floor(width));
		fittedHeightPx = Math.max(1, Math.floor(width / ASPECT_RATIO));
		redrawComposite();
	};

	const clearReconnectTimer = () => {
		if (!reconnectTimer) return;
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	};

	const reconnectDelayMs = (attempt: number) => {
		const base = Math.min(1000 * 2 ** attempt, 15000);
		const jitter = Math.floor(Math.random() * 250);
		return base + jitter;
	};

	const scheduleReconnect = () => {
		if (tearingDown || reconnectTimer) return;
		const delayMs = reconnectDelayMs(reconnectAttempt);
		reconnectAttempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delayMs);
	};

	const applyFrame = (frame: FramebufferPreviewFrame) => {
		framesByPanel = { ...framesByPanel, [frame.panelIndex]: frame };
	};

	$effect(() => {
		const nextRasters: Record<number, HTMLCanvasElement> = {};
		for (const frame of Object.values(framesByPanel)) {
			const raster = toPanelRaster(frame, invertedColor);
			if (raster) nextRasters[frame.panelIndex] = raster;
		}
		panelRasterByIndex = nextRasters;
	});

	$effect(() => {
		// Keep canvas painting as a pure read-only reaction. This avoids
		// effect self-invalidations when raster-cache updates.
		redrawComposite();
	});

	const connect = () => {
		if (tearingDown) return;
		if (typeof WebSocket === 'undefined') return;
		if (
			socket &&
			(socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		clearReconnectTimer();
		const ws = new WebSocket(previewWsUrl());
		ws.binaryType = 'arraybuffer';
		ws.onopen = () => {
			if (tearingDown) {
				ws.close();
				return;
			}
			reconnectAttempt = 0;
			ws.send(JSON.stringify({ action: 'start' }));
		};
		ws.onclose = () => {
			if (socket !== ws) return;
			socket = null;
			scheduleReconnect();
		};
		ws.onerror = () => {
			// Some browsers emit only `error` without a useful payload; force
			// close so `onclose` owns reconnect scheduling.
			if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
				ws.close();
			}
		};
		ws.onmessage = async (evt: MessageEvent) => {
			if (typeof evt.data === 'string') {
				try {
					const msg = JSON.parse(evt.data) as { streaming?: boolean };
					// Keep parsing control JSON frames so the existing protocol
					// remains fully compatible, even in renderer-only mode.
					if (typeof msg.streaming === 'boolean') return;
				} catch {
					// Ignore non-JSON text frames.
				}
				return;
			}
			const packet =
				evt.data instanceof ArrayBuffer
					? evt.data
					: await new Response(evt.data).arrayBuffer();
			try {
				const frame = await decodeFramebufferPreviewPacket(packet);
				if (frame) applyFrame(frame);
			} catch (err) {
				console.error('preview decode failed', err);
			}
		};
		socket = ws;
	};

	const disconnect = () => {
		clearReconnectTimer();
		const ws = socket;
		socket = null;
		if (!ws) return;
		ws.onopen = null;
		ws.onclose = null;
		ws.onerror = null;
		ws.onmessage = null;
		if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
			ws.close();
		}
	};

	$effect(() => {
		if (!stageEl) return;
		updateFit();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => updateFit());
		observer.observe(stageEl);
		return () => observer.disconnect();
	});

	$effect(() => {
		tearingDown = false;
		connect();
		return () => {
			tearingDown = true;
			disconnect();
		};
	});
</script>

<div bind:this={stageEl} class="preview-stage">
	<canvas
		bind:this={canvasEl}
		class="preview-canvas"
		style:width={`${fittedWidthPx}px`}
		style:height={`${fittedHeightPx}px`}
	></canvas>
</div>

<style>
	.preview-stage {
		width: 100%;
		aspect-ratio: 223.6 / 85.25;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.preview-canvas {
		display: block;
		max-width: 100%;
		max-height: 100%;
	}
</style>
