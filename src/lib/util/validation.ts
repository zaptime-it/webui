/**
 * Form-level validation for settings.
 *
 * Each section already computes its own per-field invalid state for the
 * inline `Field` errors (e.g. `pubkeyInvalid` in DataSourceSettings). This
 * module rolls those checks into a single function the SettingsPanel can
 * call to render an aggregate summary at the top of the form, with anchor
 * links that focus the offending input.
 *
 * Adding a new validator is two lines: import the predicate, append a row
 * to `validateSettings`. Keep validators *cheap* and pure — this runs on
 * every reactive update.
 */

import type { Settings } from '$lib/types/settings';
import { DataSourceType } from '$lib/types/settings';
import { isValidHexPubKey, isValidNostrRelayUrl } from '$lib/util/nostr';

export interface FieldValidationError {
	/** DOM id of the offending input — used to anchor + focus. */
	id: string;
	/** Section the input lives in (drives which CollapseCard pops open). */
	section: 'screen' | 'display' | 'dataSource' | 'extra' | 'system';
	/** i18n message key already loaded by the caller, or a literal fallback. */
	message: string;
	/** Top-level Settings field this error pertains to (best-effort). */
	field: keyof Settings | string;
}

/**
 * Run every cheap validator against the current settings and return any
 * failures. The caller is expected to have already populated localised
 * messages (we accept them as ready strings rather than message keys to
 * keep this util free of paraglide imports).
 */
export const validateSettings = (
	data: Settings | null,
	messages: { invalidNostrPubkey: string; invalidNostrRelay: string; nostrRelayRequired: string }
): FieldValidationError[] => {
	if (!data) return [];
	const out: FieldValidationError[] = [];

	const pubkey = data.nostrPubKey;
	if (typeof pubkey === 'string' && pubkey.length > 0 && !isValidHexPubKey(pubkey)) {
		out.push({
			id: 'nostrPubKey',
			section: 'dataSource',
			message: messages.invalidNostrPubkey,
			field: 'nostrPubKey'
		});
	}

	// Resolve the chip list using the same legacy-bridge fallback the
	// settings sections use, so a v3 / pre-rc.4 device (only `nostrRelay`)
	// still validates the singular slot through this code path.
	const relays: string[] = Array.isArray(data.nostrRelays)
		? (data.nostrRelays as string[])
		: typeof data.nostrRelay === 'string' && data.nostrRelay.length > 0
			? [data.nostrRelay as string]
			: [];

	relays.forEach((entry, idx) => {
		if (typeof entry !== 'string' || entry.length === 0) return;
		if (!isValidNostrRelayUrl(entry)) {
			out.push({
				// nostrRelays-${idx} is also the chip's DOM id in
				// NostrRelayList.svelte (idPrefix="nostrRelays" — ExtraFeatures
				// wins the focus when both sections are open, which matches
				// the original behaviour where the Extra section's relay input
				// was the canonical "Nostr Relay" field).
				id: `nostrRelays-${idx}`,
				section: 'extra',
				message: messages.invalidNostrRelay,
				field: 'nostrRelays'
			});
		}
	});

	// At least one relay is required when the firmware needs one — Nostr
	// data source or zap notify both open subscriptions through nostrRelays.
	// Surface this as a form-level error (firmware would 4xx the PATCH
	// otherwise; cheaper to flag client-side). Use the chip-list input id
	// so the anchor link focuses the field where the user adds entries.
	const needsRelay =
		data.dataSource === DataSourceType.NOSTR_SOURCE || data.nostrZapNotify === true;
	if (needsRelay && relays.length === 0) {
		out.push({
			id: 'nostrRelays-input',
			section: 'extra',
			message: messages.nostrRelayRequired,
			field: 'nostrRelays'
		});
	}

	const zaps = data.nostrZapPubkeys;
	if (Array.isArray(zaps)) {
		// One error row per malformed entry; index in the DOM id so the
		// anchor link can focus the offending chip rather than the whole
		// list. Empty entries are tolerated (the firmware drops them on
		// PATCH) but are skipped here so a partially-typed entry doesn't
		// trigger a top-of-form error before the user finishes pasting.
		zaps.forEach((entry, idx) => {
			if (typeof entry !== 'string' || entry.length === 0) return;
			if (!isValidHexPubKey(entry)) {
				out.push({
					id: `nostrZapPubkeys-${idx}`,
					section: 'extra',
					message: messages.invalidNostrPubkey,
					field: 'nostrZapPubkeys'
				});
			}
		});
	}

	return out;
};
