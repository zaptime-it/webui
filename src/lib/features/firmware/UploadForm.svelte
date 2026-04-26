<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { statusStore } from '$lib/stores/status.svelte';
	import { uploadFirmware, uploadWebUi } from '$lib/api/client';
	import { getFirmwareBinaryName, getWebUiBinaryName } from '$lib/util/version';

	const settings = $derived(settingsStore.data);
	const status = $derived(statusStore.data);

	let firmwareFile = $state<File | null>(null);
	let webuiFile = $state<File | null>(null);
	let progress = $state(0);
	let success = $state(false);
	let error = $state(false);
	let countdown = $state(10);

	const countdownReload = (duration: number) => {
		countdown = duration;
		const iv = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				clearInterval(iv);
				location.reload();
			}
		}, 1000);
	};

	const handle = (set: (f: File | null) => void) => (e: Event) => {
		const input = e.target as HTMLInputElement;
		set(input.files && input.files[0] ? input.files[0] : null);
	};

	const run = async (file: File | null, fn: typeof uploadFirmware) => {
		if (!file) return;
		success = false;
		error = false;
		progress = 0;
		statusStore.beginOtaUpload();
		try {
			await fn(file, (p) => (progress = p));
			success = true;
			countdownReload(10);
			// Leave otaInProgress=true through the post-upload reboot window so
			// the disconnect overlay keeps reading "Updating firmware…" until
			// the device reconnects. markConnected() clears it.
		} catch (err) {
			console.error(err);
			error = true;
			statusStore.endOtaUpload();
		}
	};

	const fwName = $derived(getFirmwareBinaryName(settings?.hwRev ?? ''));
	const webuiName = $derived(getWebUiBinaryName(settings?.hwRev ?? ''));
</script>

{#if !status?.isOTAUpdating}
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 items-end">
		<div>
			<label for="firmwareFile" class="label">Firmware file ({fwName})</label>
			<input
				id="firmwareFile"
				type="file"
				accept=".bin"
				class="file-input file-input-bordered file-input-sm w-full"
				onchange={handle((f) => (firmwareFile = f))}
			/>
		</div>
		<button
			type="button"
			class="btn btn-sm btn-primary"
			disabled={!firmwareFile}
			onclick={() => run(firmwareFile, uploadFirmware)}
		>
			Update firmware
		</button>
		<div>
			<label for="webuiFile" class="label">WebUI file ({webuiName})</label>
			<input
				id="webuiFile"
				type="file"
				accept=".bin"
				class="file-input file-input-bordered file-input-sm w-full"
				onchange={handle((f) => (webuiFile = f))}
			/>
		</div>
		<button
			type="button"
			class="btn btn-sm btn-secondary"
			disabled={!webuiFile}
			onclick={() => run(webuiFile, uploadWebUi)}
		>
			Update WebUI
		</button>
	</div>

	{#if progress > 0}
		<div class="mt-2">
			<progress id="firmwareUploadProgress" class="progress w-full" value={progress} max="100"
			></progress>
			<div class="text-sm text-center">
				{m['section.firmwareUpdater.uploading']()}... {progress}%
			</div>
		</div>
	{/if}

	{#if success}
		<div class="alert alert-success firmwareUploadStatusAlert mt-2">
			<span>{m['section.firmwareUpdater.fileUploadSuccess']({ countdown })}</span>
		</div>
	{/if}
	{#if error}
		<div class="alert alert-error firmwareUploadStatusAlert mt-2">
			<span>{m['section.firmwareUpdater.fileUploadFailed']()}</span>
		</div>
	{/if}

	<small class="block mt-2">
		⚠️ <strong>{m['warning']()}</strong>:
		{m['section.firmwareUpdater.firmwareUpdateText']()}
	</small>
{/if}
