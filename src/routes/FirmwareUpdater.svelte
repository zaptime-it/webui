<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { onMount } from 'svelte';
	import { toastStore } from '$lib/stores/toast';
	import * as m from '$lib/paraglide/messages';
	import { writable } from 'svelte/store';
	import { Progress, Alert, Button } from '@sveltestrap/sveltestrap';
	import HourglassSplitIcon from 'svelte-bootstrap-icons/lib/HourglassSplit.svelte';

	let { settings = { hwRev: '' }, status = writable({ isOTAUpdating: false }) } = $props();
	let currentVersion: string = $settings.gitTag; // Replace with your current version

	let latestVersion: string = $state('');
	let isNewerVersionAvailable: boolean = $state(false);
	let releaseDate: string = $state('');
	let releaseUrl: string = $state('');

	const countdown = writable(10);
	let firmwareUploadFile: File | null = $state(null);
	let firmwareWebUiFile: File | null = $state(null);

	let firmwareUploadProgress = $state(0);
	let firmwareUploadSuccess = $state(false);
	let firmwareUploadError = $state(false);

	const handleFileChange = (event: Event, setFile: (file: File) => void) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			setFile(target.files[0]);
		}
	};

	function startCountdownToReload(duration: number) {
		let timeRemaining = duration;

		const interval = setInterval(() => {
			timeRemaining -= 1;
			countdown.set(timeRemaining);

			if (timeRemaining <= 0) {
				clearInterval(interval);
				location.reload();
			}
		}, 1000); // Update every second
	}

	const uploadFile = async (file: File | null, endpoint: string) => {
		if (!file) return;

		const formData = new FormData();
		formData.append('file', file);
		firmwareUploadSuccess = false;
		firmwareUploadError = false;
		try {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', endpoint);

			xhr.upload.onprogress = (event: ProgressEvent) => {
				if (event.lengthComputable) {
					firmwareUploadProgress = Math.round((event.loaded * 100) / event.total);
				}
			};

			xhr.onload = () => {
				if (xhr.status === 200 && xhr.responseText != 'FAIL') {
					firmwareUploadSuccess = true;
					startCountdownToReload(10);
				} else {
					firmwareUploadError = true;
				}
			};

			xhr.onerror = () => {
				firmwareUploadError = true;
			};

			xhr.send(formData);
		} catch (error) {
			firmwareUploadError = true;
			console.error(error);
		}
	};

	const uploadFirmwareFile = () => {
		uploadFile(firmwareUploadFile, `${PUBLIC_BASE_URL}/upload/firmware`);
	};

	const uploadWebUiFile = () => {
		uploadFile(firmwareWebUiFile, `${PUBLIC_BASE_URL}/upload/webui`);
	};

	const getFirmwareBinaryName = () => {
		let binaryFilename = '';
		switch ($settings.hwRev) {
			case 'REV_V8_EPD_2_13':
				binaryFilename = 'btclock_rev_v8_213epd_firmware.bin';
				break;
			case 'REV_B_EPD_2_13':
				binaryFilename = 'btclock_rev_b_213epd_firmware.bin';
				break;
			case 'REV_A_EPD_2_13':
				binaryFilename = 'lolin_s3_mini_213epd_firmware.bin';
				break;
			case 'REV_A_EPD_2_9':
				binaryFilename = 'lolin_s3_mini_29epd_firmware.bin';
				break;
			default:
				binaryFilename = 'Unsupported hardware, unable to determine firmware binary filename';
		}

		return binaryFilename;
	};

	const getWebUiBinaryName = () => {
		let webuiFilename = '';
		switch ($settings.hwRev) {
			case 'REV_V8_EPD_2_13':
				webuiFilename = 'littlefs_16MB.bin';
				break;
			case 'REV_B_EPD_2_13':
				webuiFilename = 'littlefs_8MB.bin';
				break;
			case 'REV_A_EPD_2_13':
				webuiFilename = 'littlefs_4MB.bin';
				break;
			default:
				webuiFilename = 'Unsupported hardware, unable to determine WebUI binary filename';
		}

		return webuiFilename;
	};

	const onAutoUpdate = async (e: Event) => {
		e.preventDefault();

		try {
			const response = await fetch(`${PUBLIC_BASE_URL}/api/firmware/auto_update`);

			if (!response.ok) {
				let msg = (await response.json()).msg;

				toastStore.show({
					color: 'danger',
					text: msg
				});
			} else {
				let msg = (await response.json()).msg;

				toastStore.show({
					color: 'info',
					text: msg
				});
			}
		} catch (error) {
			toastStore.show({
				color: 'danger',
				text: String(error)
			});
			console.error('Error fetching latest version:', error);
		}
	};

	onMount(async () => {
		try {
			const response = await fetch(
				'https://git.btclock.dev/api/v1/repos/btclock/btclock_v3/releases/latest'
			);

			if (!response.ok) {
				latestVersion = 'error';
			} else {
				const data = await response.json();
				latestVersion = data.tag_name;
				releaseDate = new Date(data.created_at).toLocaleString();
				releaseUrl = data.html_url;

				isNewerVersionAvailable = compareVersions(latestVersion, currentVersion) === 1;
			}
		} catch (error) {
			console.error('Error fetching latest version:', error);
		}
	});

	function compareVersions(version1: string, version2: string): number {
		if (!version2) return 0;

		const parts1 = version1.split('.').map((part) => parseInt(part, 10));
		const parts2 = version2.split('.').map((part) => parseInt(part, 10));

		for (let i = 0; i < 3; i++) {
			if (parts1[i] > parts2[i]) {
				return 1;
			} else if (parts1[i] < parts2[i]) {
				return -1;
			}
		}

		return 0;
	}
</script>

{#if latestVersion && latestVersion != 'error'}
	<p>
		{m['section.firmwareUpdater.latestVersion']()}: {latestVersion} - {m[
			'section.firmwareUpdater.releaseDate'
		]()}: {releaseDate} -
		<a href={releaseUrl} target="_blank">{m['section.firmwareUpdater.viewRelease']()}</a><br />
		{#if isNewerVersionAvailable}
			{#if !$status.isOTAUpdating}
				{m['section.firmwareUpdater.swUpdateAvailable']()} -
				<a href="/" onclick={onAutoUpdate}>{m['section.firmwareUpdater.autoUpdate']()}</a>.
			{:else}
				<HourglassSplitIcon /> {m['section.firmwareUpdater.autoUpdateInProgress']()}
			{/if}
		{:else}
			{m['section.firmwareUpdater.swUpToDate']()}
		{/if}
	</p>
{:else if latestVersion == 'error'}
	<p>Error loading version, try again later.</p>
{:else}
	<p>Loading...</p>
{/if}
{#if !$status.isOTAUpdating}
	<section class="row row-cols-lg-auto align-items-end">
		<div class="col flex-fill">
			<label for="firmwareFile" class="form-label">Firmware file ({getFirmwareBinaryName()})</label>
			<input
				type="file"
				id="firmwareFile"
				onchange={(e) => handleFileChange(e, (file) => (firmwareUploadFile = file))}
				name="update"
				class="form-control"
				accept=".bin"
			/>
		</div>
		<div class="flex-fill">
			<Button block onclick={uploadFirmwareFile} color="primary" disabled={!firmwareUploadFile}
				>Update firmware</Button
			>
		</div>
		<div class="col flex-fill">
			<label for="webuiFile" class="form-label">WebUI file ({getWebUiBinaryName()})</label>
			<input
				type="file"
				id="webuiFile"
				name="update"
				class="form-control"
				placeholder="littlefs.bin"
				onchange={(e) => handleFileChange(e, (file) => (firmwareWebUiFile = file))}
				accept=".bin"
			/>
		</div>
		<div class="flex-fill">
			<Button block onclick={uploadWebUiFile} color="secondary" disabled={!firmwareWebUiFile}
				>Update WebUI</Button
			>
		</div>
	</section>
	{#if firmwareUploadProgress > 0}
		<Progress striped value={firmwareUploadProgress} class="progress" id="firmwareUploadProgress"
			>{m['section.firmwareUpdater.uploading']()}... {firmwareUploadProgress}%</Progress
		>
	{/if}
	{#if firmwareUploadSuccess}
		<Alert color="success" class="firmwareUploadStatusAlert"
			>{m['section.firmwareUpdater.fileUploadSuccess']({ countdown: $countdown })}
		</Alert>
	{/if}

	{#if firmwareUploadError}
		<Alert color="danger" class="firmwareUploadStatusAlert"
			>{m['section.firmwareUpdater.fileUploadFailed']()}</Alert
		>
	{/if}
	<small
		>⚠️ <strong>{m['warning']()}</strong>: {m[
			'section.firmwareUpdater.firmwareUpdateText'
		]()}</small
	>
{/if}
