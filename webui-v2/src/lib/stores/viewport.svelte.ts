/**
 * Reactive viewport store that replaces the old `screenSize` + `uiSettings`
 * stores. Emits a DaisyUI-friendly size category instead of Bootstrap-specific
 * class fragments — components that need to vary layout by size check
 * `viewport.size` and map it themselves.
 */

import { browser } from '$app/environment';

export type ViewportSize = 'sm' | 'md' | 'lg';

const classify = (width: number): ViewportSize => {
	if (width < 576) return 'sm';
	if (width < 992) return 'md';
	return 'lg';
};

const state = $state({
	width: browser ? window.innerWidth : 1024,
	size: classify(browser ? window.innerWidth : 1024)
});

const update = () => {
	if (!browser) return;
	state.width = window.innerWidth;
	state.size = classify(state.width);
};

if (browser) window.addEventListener('resize', update);

export const viewport = {
	get width() {
		return state.width;
	},
	get size() {
		return state.size;
	}
};

/** Maps the viewport size to DaisyUI `*-sm` / `*-md` / `*-lg` classes. */
export const daisySize = (prefix: string, size: ViewportSize = viewport.size): string => {
	if (size === 'sm') return `${prefix}-sm`;
	if (size === 'md') return `${prefix}-md`;
	return `${prefix}-lg`;
};
