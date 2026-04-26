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
import { isValidHexPubKey } from '$lib/util/nostr';

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
	messages: { invalidNostrPubkey: string }
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

	const zap = data.nostrZapPubkey;
	if (typeof zap === 'string' && zap.length > 0 && !isValidHexPubKey(zap)) {
		out.push({
			id: 'nostrZapPubkey',
			section: 'extra',
			message: messages.invalidNostrPubkey,
			field: 'nostrZapPubkey'
		});
	}

	return out;
};
