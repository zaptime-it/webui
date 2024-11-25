<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { writable } from 'svelte/store';
	import { Progress, Alert, Button } from '@sveltestrap/sveltestrap';

	const dispatch = createEventDispatcher();

	export let settings = { hwRev: '' };

	let currentVersion: string = $settings.gitTag; // Replace with your current version

	let latestVersion: string = '';
	let isNewerVersionAvailable: boolean = false;
	let releaseDate: string = '';
	let releaseUrl: string = '';

	const countdown = writable(10);
	let firmwareUploadFile: File | null = null;
	let firmwareWebUiFile: File | null = null;

	let firmwareUploadProgress = 0;
	let firmwareUploadSuccess = false;
	let firmwareUploadError = false;

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

	const onAutoUpdate = async (e: Event) => {
		e.preventDefault();

		try {
			const response = await fetch(`${PUBLIC_BASE_URL}/api/firmware/auto_update`);

			if (!response.ok) {
				let msg = (await response.json()).msg;

				dispatch('showToast', {
					color: 'danger',
					text: msg
				});
			} else {
				let msg = (await response.json()).msg;

				dispatch('showToast', {
					color: 'info',
					text: msg
				});
			}
		} catch (error) {
			dispatch('showToast', {
				color: 'danger',
				text: error
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
		{$_('section.firmwareUpdater.latestVersion')}: {latestVersion} - {$_(
			'section.firmwareUpdater.releaseDate'
		)}: {releaseDate} -
		<a href={releaseUrl} target="_blank">{$_('section.firmwareUpdater.viewRelease')}</a><br />
		{#if isNewerVersionAvailable}
			{$_('section.firmwareUpdater.swUpdateAvailable')} -
			<a href="/" on:click={onAutoUpdate}>{$_('section.firmwareUpdater.autoUpdate')}</a>.
		{:else}
			{$_('section.firmwareUpdater.swUpToDate')}
		{/if}
	</p>
{:else if latestVersion == 'error'}
	<p>Error loading version, try again later.</p>
{:else}
	<p>Loading...</p>
{/if}
<section class="row row-cols-lg-auto align-items-end">
	<div class="col-12">
		<label for="firmwareFile" class="form-label">Firmware file ({getFirmwareBinaryName()})</label>
		<input
			type="file"
			id="firmwareFile"
			on:change={(e) => handleFileChange(e, (file) => (firmwareUploadFile = file))}
			name="update"
			class="form-control"
			accept=".bin"
		/>
	</div>
	<div class="flex-fill">
		<Button block on:click={uploadFirmwareFile} color="primary" disabled={!firmwareUploadFile}
			>Update firmware</Button
		>
	</div>
	<div class="col mt-2">
		<label for="webuiFile" class="form-label">WebUI file (littlefs.bin)</label>
		<input
			type="file"
			id="webuiFile"
			name="update"
			class="form-control"
			placeholder="littlefs.bin"
			on:change={(e) => handleFileChange(e, (file) => (firmwareWebUiFile = file))}
			accept=".bin"
		/>
	</div>
	<div class="flex-fill">
		<Button block on:click={uploadWebUiFile} color="secondary" disabled={!firmwareWebUiFile}
			>Update WebUI</Button
		>
	</div>
</section>
{#if firmwareUploadProgress > 0}
	<Progress striped value={firmwareUploadProgress} class="progress" id="firmwareUploadProgress"
		>{$_('section.firmwareUpdater.uploading')}... {firmwareUploadProgress}%</Progress
	>
{/if}
{#if firmwareUploadSuccess}
	<Alert color="success" class="firmwareUploadStatusAlert"
		>{$_('section.firmwareUpdater.fileUploadSuccess', { values: { countdown: $countdown } })}
	</Alert>
{/if}

{#if firmwareUploadError}
	<Alert color="danger" class="firmwareUploadStatusAlert"
		>{$_('section.firmwareUpdater.fileUploadFailed')}</Alert
	>
{/if}
<small
	>⚠️ <strong>{$_('warning')}</strong>: {$_('section.firmwareUpdater.firmwareUpdateText')}</small
>
