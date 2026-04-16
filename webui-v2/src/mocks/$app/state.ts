import { writable } from 'svelte/store';

export const page = { url: new URL('http://localhost/'), params: {} };
export const navigating = writable(null);
export const updated = { current: false };
