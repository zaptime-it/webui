import { writable } from 'svelte/store';

export interface ToastMessage {
	color: 'success' | 'danger' | 'warning' | 'info';
	text: string;
}

interface ToastState {
	isOpen: boolean;
	color: string;
	text: string;
}

function createToastStore() {
	const { subscribe, set, update } = writable<ToastState>({
		isOpen: false,
		color: 'success',
		text: ''
	});

	return {
		subscribe,
		show: (message: ToastMessage) => {
			set({
				isOpen: true,
				color: message.color,
				text: message.text
			});
		},
		close: () => {
			update((state) => ({ ...state, isOpen: false }));
		}
	};
}

export const toastStore = createToastStore();
