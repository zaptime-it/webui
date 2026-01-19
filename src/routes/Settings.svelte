<script lang="ts">
	import { PUBLIC_BASE_URL } from '$lib/config';
	import { toastStore } from '$lib/stores/toast';
	import * as m from '$lib/paraglide/messages';
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
	import type { PartialSettings } from '$lib/types/settings';

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

	const handleReset = (e: Event) => {
		e.preventDefault();
		onFormReset?.();
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
					toastStore.show({
						color: 'success',
						text: m['section.settings.settingsSaved']()
					});
				} else {
					toastStore.show({
						color: 'danger',
						text: `${data.status}: ${data.statusText}`
					});
				}
			})
			.catch(() => {
				toastStore.show({
					color: 'danger',
					text: m['section.settings.errorSavingSettings']()
				});
			});
	};

	interface Props {
		settings: PartialSettings;
		onFormReset?: () => void;
		xs?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
		xxl?: number;
	}

	let {
		settings,
		onFormReset = undefined,
		xs = 12,
		sm = xs,
		md = sm,
		lg = md,
		xl = lg,
		xxl = xl
	}: Props = $props();

	let screenSettingsIsOpen = $state(true),
		displaySettingsIsOpen = $state(false),
		dataSourceIsOpen = $state(false),
		extraFeaturesIsOpen = $state(false),
		systemIsOpen = $state(false);

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
					<button type="button" onclick={showAll} id="showAllBtn"
						>{m['section.settings.showAll']()}</button
					>
					|
					<button type="button" onclick={hideAll} id="hideAllBtn"
						>{m['section.settings.hideAll']()}</button
					>
				</small>
			</div>
			<CardTitle>{m['section.settings.title']()}</CardTitle>
		</CardHeader>
		<CardBody>
			{#if $settings.isLoaded === false}
				<div class="d-flex align-items-center">
					<strong role="status">Loading...</strong>
					<div class="spinner-border ms-auto" aria-hidden="true"></div>
				</div>
			{:else}
				<Form onsubmit={onSave}>
					<ScreenSpecificSettings {settings} bind:isOpen={screenSettingsIsOpen} />
					<DisplaySettings {settings} bind:isOpen={displaySettingsIsOpen} />
					<DataSourceSettings {settings} bind:isOpen={dataSourceIsOpen} />
					<ExtraFeaturesSettings {settings} bind:isOpen={extraFeaturesIsOpen} {miningPoolMap} />
					<SystemSettings {settings} bind:isOpen={systemIsOpen} />

					<Row class="mt-4">
						<Col>
							<Button type="submit" color="primary" class="me-2">
								{m['button.save']()}
							</Button>
							<Button type="button" color="secondary" onclick={handleReset}>
								{m['button.reset']()}
							</Button>
						</Col>
					</Row>
				</Form>
			{/if}
		</CardBody>
	</Card>
</Col>
