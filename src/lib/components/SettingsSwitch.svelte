<script lang="ts">
	import { Input, Col } from '@sveltestrap/sveltestrap';

	// Props
	export let id: string;
	export let checked: boolean;
	export let label: string;
	export let size: string = 'sm';
	export let disabled: boolean = false;
	export let col: { [key: string]: string } = { md: '6', xl: '12', xxl: '6' };
</script>

<Col {...col}>
	<Input {id} bind:checked type="switch" bsSize={size} {label} {disabled} />
</Col>
