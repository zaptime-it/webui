/**
 * Settings types for the BTClock device.
 *
 * `Settings` is inferred from `settingsSchema` in `$lib/api/schemas` —
 * that schema is the single source of truth for both the runtime
 * Valibot validation and the static TS type. To add a field, edit the
 * schema; the type follows automatically.
 *
 * Notes on a few fields kept here as TS-only constructs:
 *  - `DataSourceType` is an integer enum re-exported for ergonomic
 *    `DataSourceType.NOSTR_SOURCE` references in components.
 *  - `httpAuthPass` / `otaPass` are PATCH-only buffers; the device
 *    reports `httpAuthPassSet` / `otaPassSet` booleans on GET. The
 *    SettingsPanel submit handler strips the *Set flags and skips the
 *    plaintext fields when empty (see SettingsPanel.handleSubmit).
 */

import type { InferOutput } from 'valibot';
import type { dndSettingsSchema, screenSchema, settingsSchema } from '$lib/api/schemas';

export enum DataSourceType {
	BTCLOCK_SOURCE = 0,
	THIRD_PARTY_SOURCE = 1,
	NOSTR_SOURCE = 2,
	CUSTOM_SOURCE = 3
}

export type Screen = InferOutput<typeof screenSchema>;
export type DndSettings = InferOutput<typeof dndSettingsSchema>;
export type Settings = InferOutput<typeof settingsSchema>;

/**
 * Store-facing state for the loaded settings. Using a discriminated union
 * eliminates the `isLoaded` sentinel and gives TypeScript narrowing for free.
 */
export type SettingsState =
	| { status: 'loading' }
	| { status: 'error'; error: string }
	| { status: 'ready'; data: Settings };
