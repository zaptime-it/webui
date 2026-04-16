import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'auto';

const KEY = 'color-scheme';

const prefersDark = () => browser && window.matchMedia('(prefers-color-scheme: dark)').matches;

const effective = (mode: ThemeMode) =>
	mode === 'auto' ? (prefersDark() ? 'dark' : 'light') : mode;

const read = (): ThemeMode => {
	if (!browser) return 'auto';
	const stored = localStorage.getItem(KEY);
	return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
};

const apply = (mode: ThemeMode) => {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', effective(mode));
	document.documentElement.setAttribute('data-bs-theme', effective(mode));
};

const state = $state({ mode: read() });

if (browser) {
	apply(state.mode);
	window
		.matchMedia('(prefers-color-scheme: dark)')
		.addEventListener('change', () => apply(state.mode));
}

export const theme = {
	get mode() {
		return state.mode;
	},
	get effective() {
		return effective(state.mode);
	},
	set(mode: ThemeMode) {
		state.mode = mode;
		if (browser) localStorage.setItem(KEY, mode);
		apply(mode);
	},
	toggle() {
		this.set(this.effective === 'dark' ? 'light' : 'dark');
	}
};
