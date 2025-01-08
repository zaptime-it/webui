<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		Button,
		Card,
		CardBody,
		CardHeader,
		CardTitle,
		Col,
		Form,
		Row
	} from '@sveltestrap/sveltestrap';
	import {
		ScreenSpecificSettings,
		DisplaySettings,
		DataSourceSettings,
		ExtraFeaturesSettings,
		SystemSettings
	} from '$lib/components/settings';

	export let settings;

	const miningPoolMap = new Map<string, string>([
		['noderunners', 'Noderunners.network'],
		['braiins', 'Braiins Pool'],
		['ocean', 'ocean.xyz'],
		['satoshi_radio', 'Satoshi Radio pool'],
		['public_pool', 'public-pool.io'],
		['gobrrr_pool', 'Go Brrr pool'],
		['ckpool', 'CKPool'],
		['eu_ckpool', 'EU CKPool'],
		['local_public_pool', 'Public Pool (local)']
	]);

	const dispatch = createEventDispatcher();

	const handleReset = (e: Event) => {
		e.preventDefault();
		dispatch('formReset');
	};

	const onSave = async (e: Event) => {
		e.preventDefault();

		let formSettings = $settings;
		delete formSettings['gitRev'];
		delete formSettings['ip'];
		delete formSettings['lastBuildTime'];

		let headers = new Headers({
			'Content-Type': 'application/json'
		});

		await fetch(`${PUBLIC_BASE_URL}/api/json/settings`, {
			method: 'PATCH',
			headers: headers,
			credentials: 'same-origin',
			body: JSON.stringify(formSettings)
		})
			.then((data) => {
				if (data.status == 200) {
					dispatch('showToast', {
						color: 'success',
						text: $_('section.settings.settingsSaved')
					});
				} else {
					dispatch('showToast', {
						color: 'danger',
						text: `${data.status}: ${data.statusText}`
					});
				}
			})
			.catch(() => {
				dispatch('showToast', {
					color: 'danger',
					text: $_('section.settings.errorSavingSettings')
				});
			});
	};

	export let xs = 12;
	export let sm = xs;
	export let md = sm;
	export let lg = md;
	export let xl = lg;
	export let xxl = xl;

	let screenSettingsIsOpen = true,
		displaySettingsIsOpen = false,
		dataSourceIsOpen = false,
		extraFeaturesIsOpen = false,
		systemIsOpen = false;

	const showAll = () => {
		screenSettingsIsOpen = true;
		displaySettingsIsOpen = true;
		dataSourceIsOpen = true;
		extraFeaturesIsOpen = true;
		systemIsOpen = true;
	};

	const hideAll = () => {
		screenSettingsIsOpen = false;
		displaySettingsIsOpen = false;
		dataSourceIsOpen = false;
		extraFeaturesIsOpen = false;
		systemIsOpen = false;
	};
</script>

<Col {xs} {sm} {md} {lg} {xl} {xxl} class="mb-4 mb-xl-0">
	<Card id="settings">
		<CardHeader>
			<div class="float-end">
				<small>
					<button type="button" on:click={showAll} id="showAllBtn"
						>{$_('section.settings.showAll')}</button
					>
					|
					<button type="button" on:click={hideAll} id="hideAllBtn"
						>{$_('section.settings.hideAll')}</button
					>
				</small>
			</div>
			<CardTitle>{$_('section.settings.title')}</CardTitle>
		</CardHeader>
		<CardBody>
			{#if $settings.isLoaded === false}
				<div class="d-flex align-items-center">
					<strong role="status">Loading...</strong>
					<div class="spinner-border ms-auto" aria-hidden="true"></div>
				</div>
			{:else}
				<Form on:submit={onSave}>
					<ScreenSpecificSettings {settings} bind:isOpen={screenSettingsIsOpen} />
					<DisplaySettings {settings} bind:isOpen={displaySettingsIsOpen} />
					<DataSourceSettings {settings} bind:isOpen={dataSourceIsOpen} on:showToast />
					<ExtraFeaturesSettings
						{settings}
						bind:isOpen={extraFeaturesIsOpen}
						{miningPoolMap}
						on:showToast
					/>
					<SystemSettings {settings} bind:isOpen={systemIsOpen} />

					<Row class="mt-4">
						<Col>
							<Button type="submit" color="primary" class="me-2">
								{$_('button.save')}
							</Button>
							<Button type="button" color="secondary" on:click={handleReset}>
								{$_('button.reset')}
							</Button>
						</Col>
					</Row>
				</Form>
			{/if}
		</CardBody>
	</Card>
</Col>
