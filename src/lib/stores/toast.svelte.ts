export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: number;
	kind: ToastKind;
	title: string;
	message?: string;
	timeoutMs: number;
}

let nextId = 1;
const state = $state<{ items: Toast[] }>({ items: [] });

export const toast = {
	get items() {
		return state.items;
	},
	push(t: Omit<Toast, 'id' | 'timeoutMs'> & { timeoutMs?: number }) {
		const item: Toast = {
			id: nextId++,
			timeoutMs: t.timeoutMs ?? 4000,
			...t
		};
		state.items = [...state.items, item];
		if (item.timeoutMs > 0) {
			setTimeout(() => this.dismiss(item.id), item.timeoutMs);
		}
		return item.id;
	},
	success(title: string, message?: string) {
		return this.push({ kind: 'success', title, message });
	},
	error(title: string, message?: string) {
		return this.push({ kind: 'error', title, message, timeoutMs: 6000 });
	},
	info(title: string, message?: string) {
		return this.push({ kind: 'info', title, message });
	},
	warning(title: string, message?: string) {
		return this.push({ kind: 'warning', title, message });
	},
	dismiss(id: number) {
		state.items = state.items.filter((t) => t.id !== id);
	}
};
