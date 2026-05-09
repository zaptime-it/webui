<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { previewWsUrl } from '$lib/api/client';
	import {
		decodeFramebufferPreviewPacket,
		type FramebufferPreviewFrame
	} from './framebufferPreview';

	let socket: WebSocket | null = null;
	let connected = $state(false);
	let streaming = $state(false);
	let pendingStart = $state(false);
	let error = $state('');
	let lastFrameId = $state(0);
	let lastTimestampMs = $state(0);
	let framesByPanel = $state<Record<number, FramebufferPreviewFrame>>({});
	const orderedFrames = $derived(
		Object.values(framesByPanel).sort((a, b) => a.panelIndex - b.panelIndex)
	);
	let canvases = $state<Record<number, HTMLCanvasElement | undefined>>({});

	const resetSocketState = () => {
		connected = false;
		streaming = false;
		pendingStart = false;
		socket = null;
	};

	const drawFrame = (frame: FramebufferPreviewFrame) => {
		const canvas = canvases[frame.panelIndex];
		if (!canvas) return;
		const { width, height, stride, rawPixels } = frame;
		if (width <= 0 || height <= 0 || stride <= 0) return;
		if (rawPixels.length < stride * height) return;

		const imageData = new ImageData(width, height);
		const out = imageData.data;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const byte = rawPixels[y * stride + (x >> 3)] ?? 0;
				const bit = (byte >> (7 - (x & 7))) & 1;
				const white = bit === 1;
				const o = (y * width + x) * 4;
				const v = white ? 255 : 0;
				out[o] = v;
				out[o + 1] = v;
				out[o + 2] = v;
				out[o + 3] = 255;
			}
		}

		const src = document.createElement('canvas');
		src.width = width;
		src.height = height;
		const srcCtx = src.getContext('2d');
		if (!srcCtx) return;
		srcCtx.putImageData(imageData, 0, 0);

		const rotation = ((frame.rotationDeg % 360) + 360) % 360;
		const swapAxis = rotation === 90 || rotation === 270;
		const targetW = swapAxis ? height : width;
		const targetH = swapAxis ? width : height;
		canvas.width = targetW;
		canvas.height = targetH;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, targetW, targetH);
		ctx.save();
		if (rotation === 90) {
			ctx.translate(targetW, 0);
			ctx.rotate(Math.PI / 2);
		} else if (rotation === 180) {
			ctx.translate(targetW, targetH);
			ctx.rotate(Math.PI);
		} else if (rotation === 270) {
			ctx.translate(0, targetH);
			ctx.rotate(-Math.PI / 2);
		}
		ctx.drawImage(src, 0, 0);
		ctx.restore();
	};

	const applyFrame = async (frame: FramebufferPreviewFrame) => {
		framesByPanel = { ...framesByPanel, [frame.panelIndex]: frame };
		lastFrameId = frame.frameId;
		lastTimestampMs = frame.timestampMs;
		await tick();
		drawFrame(frame);
	};

	const sendAction = (action: 'start' | 'stop') => {
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			error = m['section.status.preview.connectFirst']();
			return;
		}
		socket.send(JSON.stringify({ action }));
	};

	const connect = () => {
		if (
			socket &&
			(socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		error = '';
		const ws = new WebSocket(previewWsUrl());
		ws.binaryType = 'arraybuffer';
		ws.onopen = () => {
			connected = true;
			error = '';
			if (pendingStart) sendAction('start');
		};
		ws.onclose = () => {
			resetSocketState();
		};
		ws.onerror = () => {
			error = m['section.status.preview.connectionError']();
		};
		ws.onmessage = async (evt: MessageEvent) => {
			if (typeof evt.data === 'string') {
				try {
					const msg = JSON.parse(evt.data) as { streaming?: boolean };
					if (typeof msg.streaming === 'boolean') streaming = msg.streaming;
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
				if (frame) await applyFrame(frame);
			} catch (err) {
				console.error('preview decode failed', err);
				error = m['section.status.preview.decodeError']();
			}
		};
		socket = ws;
	};

	const disconnect = () => {
		pendingStart = false;
		socket?.close();
		resetSocketState();
	};

	const startPreview = () => {
		pendingStart = true;
		if (!socket || socket.readyState === WebSocket.CLOSED) connect();
		if (socket && socket.readyState === WebSocket.OPEN) sendAction('start');
	};

	const stopPreview = () => {
		pendingStart = false;
		sendAction('stop');
	};

	onDestroy(() => {
		disconnect();
	});
</script>

<section class="preview card border border-base-300 bg-base-100/60">
	<div class="card-body gap-3 p-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h3 class="text-sm font-semibold">{m['section.status.preview.title']()}</h3>
				<p class="text-xs text-base-content/70">{m['section.status.preview.hint']()}</p>
			</div>
			<div class="badge" class:badge-success={connected} class:badge-ghost={!connected}>
				{connected
					? m['section.status.preview.connected']()
					: m['section.status.preview.disconnected']()}
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button class="btn btn-xs" type="button" onclick={connect} disabled={connected}>
				{m['section.status.preview.connect']()}
			</button>
			<button class="btn btn-xs" type="button" onclick={disconnect} disabled={!connected}>
				{m['section.status.preview.disconnect']()}
			</button>
			<button
				class="btn btn-xs btn-primary"
				type="button"
				onclick={startPreview}
				disabled={!connected && pendingStart}
			>
				{m['section.status.preview.start']()}
			</button>
			<button class="btn btn-xs" type="button" onclick={stopPreview} disabled={!connected}>
				{m['section.status.preview.stop']()}
			</button>
		</div>

		{#if error}
			<p class="text-xs text-error">{error}</p>
		{/if}

		<div class="text-xs text-base-content/70">
			{m['section.status.preview.streaming']()}: {streaming ? 'on' : 'off'} |
			{m['section.status.preview.lastFrame']()}: {lastFrameId || '-'} |
			{m['section.status.preview.lastTs']()}: {lastTimestampMs || '-'}
		</div>

		{#if orderedFrames.length === 0}
			<p class="text-xs text-base-content/70">{m['section.status.preview.empty']()}</p>
		{:else}
			<div class="grid grid-cols-1 gap-2 @md:grid-cols-2 @xl:grid-cols-3">
				{#each orderedFrames as frame (frame.panelIndex)}
					<div class="rounded border border-base-300 p-2">
						<div class="mb-1 text-xs text-base-content/70">
							#{frame.panelIndex}
							{frame.width}x{frame.height} bpp1
						</div>
						<canvas
							bind:this={canvases[frame.panelIndex]}
							class="w-full border border-base-300"
						></canvas>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
