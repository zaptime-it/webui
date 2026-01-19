<script lang="ts">
	import { Input, Col } from '@sveltestrap/sveltestrap';

	interface Props {
		// Props
		id: string;
		checked: boolean;
		label: string;
		size?: string;
		disabled?: boolean;
		col?: { [key: string]: string };
	}

	let {
		id,
		checked = $bindable(),
		label,
		size = 'sm',
		disabled = false,
		col = { md: '6', xl: '12', xxl: '6' }
	}: Props = $props();
</script>

<Col {...col}>
	<Input {id} bind:checked type="switch" bsSize={size} {label} {disabled} />
</Col>
