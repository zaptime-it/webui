import { writable } from 'svelte/store';

export const uiSettings = writable({
	inputSize: 'sm',
	selectClass: '',
	btnSize: 'lg'
});
