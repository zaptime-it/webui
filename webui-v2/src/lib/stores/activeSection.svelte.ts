// Reactive rune store tracking which on-page section (Control / Status /
// Settings) is currently in view on the home route. Used by the mobile
// navbar tabs to highlight the active section.
//
// Keeping this in a dedicated rune file so both `+layout.svelte` (which
// renders the tabs) and `+page.svelte` (which owns the IntersectionObserver)
// can reactively read/write the same state without prop drilling.

export type SectionId = 'control' | 'status' | 'settings';

const state = $state<{ id: SectionId }>({ id: 'control' });

export const activeSection = {
	get id(): SectionId {
		return state.id;
	},
	set(id: SectionId) {
		state.id = id;
	}
};
