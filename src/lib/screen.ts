import { writable } from 'svelte/store';

// Check if window is available
let initialWidth: number = 0;
if (typeof window !== 'undefined') {
	initialWidth = window.innerWidth;
}

// Create a writable store to track screen size
export const screenSize = writable<number>(initialWidth);

// Function to update the screen size
export const updateScreenSize = (): void => {
	// Check if window is available before setting the screen size
	if (typeof window !== 'undefined') {
		screenSize.set(window.innerWidth);
	}
};
