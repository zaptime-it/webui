<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value: number | undefined;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onChange?: () => void;
	}

	let { id, label, value = $bindable(), disabled = false, size = 'sm', onChange }: Props = $props();

	const intToColor = (int: number): string => `#${(int >>> 0).toString(16).padStart(6, '0')}`;
	const colorToInt = (color: string): number => parseInt(color.replace('#', ''), 16);

	const colorValue = $derived(intToColor(value ?? 0));

	const handle = (e: Event) => {
		const target = e.target as HTMLInputElement;
		value = colorToInt(target.value);
		onChange?.();
	};
</script>

<div class="grid grid-cols-1 @md:grid-cols-2 items-center gap-2">
	<label class="label" for={id}>{label}</label>
	<div>
		<input
			{id}
			type="color"
			class="input input-bordered input-{size} w-20 cursor-pointer"
			value={colorValue}
			{disabled}
			onchange={handle}
			oninput={handle}
		/>
	</div>
</div>
