import { expect, test, type Page } from '@playwright/test';
import { initMock } from '../shared';

test.beforeEach(initMock);

/**
 * End-to-end coverage that every shipped locale resolves its messages at
 * runtime. This is the regression guard for the Paraglide `outputStructure`
 * (`locale-modules`) build setting: a broken message dispatcher or a missing
 * locale catalog would surface here as the wrong (or English) heading text.
 *
 * Each row is the `section.settings.title` / `section.control.title` value
 * from the matching `src/lib/locales/<code>.json`.
 */
const LOCALES: { code: string; settings: string; control: string }[] = [
	{ code: 'en', settings: 'Settings', control: 'Control' },
	{ code: 'nl', settings: 'Instellingen', control: 'Besturing' },
	{ code: 'de', settings: 'Einstellungen', control: 'Kontrolle' },
	{ code: 'es', settings: 'Configuración', control: 'Control' },
	{ code: 'fr', settings: 'Paramètres', control: 'Contrôle' },
	{ code: 'pt', settings: 'Definições', control: 'Controlo' },
	{ code: 'it', settings: 'Impostazioni', control: 'Controllo' },
	{ code: 'pl', settings: 'Ustawienia', control: 'Sterowanie' },
	{ code: 'cs', settings: 'Nastavení', control: 'Ovládání' },
	{ code: 'da', settings: 'Indstillinger', control: 'Styring' },
	{ code: 'tr', settings: 'Ayarlar', control: 'Kontrol' },
	{ code: 'ru', settings: 'Настройки', control: 'Управление' },
	{ code: 'ar', settings: 'الإعدادات', control: 'التحكّم' },
	{ code: 'zh', settings: '设置', control: '控制' },
	{ code: 'ja', settings: '設定', control: '操作' }
];

const bootWithLocale = (page: Page, locale: string) =>
	page.addInitScript((l) => localStorage.setItem('locale', l), locale);

for (const { code, settings, control } of LOCALES) {
	test(`resolves ${code} translations on the dashboard`, async ({ page }) => {
		await bootWithLocale(page, code);
		await page.goto('/');
		// initLocale ran on hydration and set <html lang>.
		await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(code);
		await expect(page.getByRole('heading', { name: settings, exact: true })).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByRole('heading', { name: control, exact: true })).toBeVisible();
	});
}
