/**
 * Regression: Paraglide's `getLocale()` is not reactive, so earlier revisions
 * would only update the dropdown label when the user switched languages
 * without re-rendering the rest of the UI. `currentLocale.value` is our
 * rune-backed mirror that other components depend on to re-derive their
 * translated strings after `setLocale(...)`.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { currentLocale, setLocale, getLocale, getFlagEmoji, isRtl } from './i18n.svelte';

describe('i18n locale store', () => {
	beforeEach(() => {
		setLocale('en');
	});

	test('getLocale returns the current value', () => {
		setLocale('nl');
		expect(getLocale()).toBe('nl');
	});

	test('currentLocale.value mirrors setLocale updates', () => {
		expect(currentLocale.value).toBe('en');
		setLocale('de');
		expect(currentLocale.value).toBe('de');
		setLocale('es');
		expect(currentLocale.value).toBe('es');
		setLocale('fr');
		expect(currentLocale.value).toBe('fr');
		setLocale('ru');
		expect(currentLocale.value).toBe('ru');
	});

	test('getFlagEmoji maps supported locales to flags', () => {
		expect(getFlagEmoji('en')).toBe('🇬🇧');
		expect(getFlagEmoji('nl')).toBe('🇳🇱');
		expect(getFlagEmoji('es')).toBe('🇪🇸');
		expect(getFlagEmoji('de')).toBe('🇩🇪');
		expect(getFlagEmoji('fr')).toBe('🇫🇷');
		expect(getFlagEmoji('ar')).toBe('🇸🇦');
		expect(getFlagEmoji('pt')).toBe('🇵🇹');
		expect(getFlagEmoji('ru')).toBe('🇷🇺');
	});

	test('getFlagEmoji falls back to the English flag for unknown codes', () => {
		expect(getFlagEmoji('zz')).toBe('🇬🇧');
	});

	test('isRtl is true only for right-to-left locales', () => {
		expect(isRtl('ar')).toBe(true);
		expect(isRtl('AR')).toBe(true);
		expect(isRtl('en')).toBe(false);
		expect(isRtl('fr')).toBe(false);
		expect(isRtl('ru')).toBe(false);
	});
});
