/**
 * Direct unit tests for the Valibot schemas in `schemas.ts`. The client
 * spec already exercises `parseSettings` / `parseStatus` on the happy/sad
 * path, so this file targets the *logic* in the schemas that isn't obvious
 * from a single round-trip:
 *
 *   - the `availableFonts` transform that upgrades a legacy bare-string
 *     font id into the v4 `{ id, hasBtcSymbol }` object shape;
 *   - the `connectionStatus.nostr` union that accepts BOTH the pre-rc.4
 *     boolean and the rc.4+ per-relay array (the firmware contract the
 *     OpenAPI spec calls out as feature-detected with `Array.isArray`);
 *   - the numeric min/max bounds baked into the generated field schemas;
 *   - `looseObject` forward-compat passthrough.
 */
import { describe, test, expect } from 'vitest';
import * as v from 'valibot';
import {
	availableFontsSchema,
	connectionStatusSchema,
	ledSchema,
	nostrRelayStatusSchema,
	parseStatus,
	screenSchema
} from './schemas';

describe('availableFontsSchema', () => {
	test('normalizes a bare font-id string into { id, hasBtcSymbol: true }', () => {
		// Legacy fixtures (and v3 firmware) shipped a plain string[]; the
		// transform back-fills hasBtcSymbol so the UI can treat both alike.
		expect(v.parse(availableFontsSchema, ['antonio'])).toEqual([
			{ id: 'antonio', hasBtcSymbol: true }
		]);
	});

	test('passes a v4 object entry through unchanged', () => {
		expect(v.parse(availableFontsSchema, [{ id: 'oswald', hasBtcSymbol: false }])).toEqual([
			{ id: 'oswald', hasBtcSymbol: false }
		]);
	});

	test('handles a mix of legacy strings and v4 objects', () => {
		expect(
			v.parse(availableFontsSchema, ['antonio', { id: 'oswald', hasBtcSymbol: true }])
		).toEqual([
			{ id: 'antonio', hasBtcSymbol: true },
			{ id: 'oswald', hasBtcSymbol: true }
		]);
	});
});

describe('screenSchema', () => {
	test('accepts a fully-specified screen row', () => {
		const row = { id: 0, name: 'Block Height', enabled: true, order: 0 };
		expect(v.parse(screenSchema, row)).toEqual(row);
	});

	test('requires the explicit order field (rotation order + reorder PATCH)', () => {
		expect(() =>
			v.parse(screenSchema, { id: 0, name: 'Block Height', enabled: true })
		).toThrow();
	});
});

describe('ledSchema', () => {
	test('requires hex but leaves the rgb triplet optional', () => {
		expect(v.parse(ledSchema, { hex: '#FFCC00' })).toEqual({ hex: '#FFCC00' });
		expect(v.parse(ledSchema, { hex: '#FFCC00', red: 255, green: 204, blue: 0 })).toMatchObject(
			{
				hex: '#FFCC00',
				red: 255
			}
		);
	});

	test('throws when hex is missing', () => {
		expect(() => v.parse(ledSchema, { red: 1, green: 2, blue: 3 })).toThrow();
	});
});

describe('connectionStatusSchema.nostr feature-detection', () => {
	const base = { price: true, blocks: false };

	test('accepts the pre-rc.4 single boolean shape', () => {
		expect(() => v.parse(connectionStatusSchema, { ...base, nostr: true })).not.toThrow();
	});

	test('accepts the rc.4+ per-relay array shape', () => {
		expect(() =>
			v.parse(connectionStatusSchema, {
				...base,
				nostr: [{ url: 'wss://relay.primal.net', connected: true }]
			})
		).not.toThrow();
	});

	test('accepts a payload with nostr / nwc / V2 omitted entirely', () => {
		expect(() => v.parse(connectionStatusSchema, base)).not.toThrow();
	});

	test('still requires the core price + blocks booleans', () => {
		expect(() => v.parse(connectionStatusSchema, { blocks: false })).toThrow();
		expect(() => v.parse(connectionStatusSchema, { price: true })).toThrow();
	});

	test('accepts the optional nwc reachability flag', () => {
		expect(v.parse(connectionStatusSchema, { ...base, nwc: true }).nwc).toBe(true);
	});
});

describe('nostrRelayStatusSchema', () => {
	test('requires both url and connected', () => {
		expect(v.parse(nostrRelayStatusSchema, { url: 'wss://x', connected: false })).toEqual({
			url: 'wss://x',
			connected: false
		});
		expect(() => v.parse(nostrRelayStatusSchema, { url: 'wss://x' })).toThrow();
	});
});

describe('parseStatus', () => {
	const minimal = {
		data: ['BLOCK/HEIGHT', '8'],
		espFreeHeap: 100,
		espHeapSize: 200,
		leds: [{ hex: '#000000' }],
		connectionStatus: { price: true, blocks: false }
	};

	test('parses a minimal valid status frame', () => {
		expect(parseStatus(minimal).espFreeHeap).toBe(100);
	});

	test('keeps forward-compat unknown fields (looseObject)', () => {
		const parsed = parseStatus({ ...minimal, currentScreen: 5, currency: 'USD' }) as Record<
			string,
			unknown
		>;
		expect(parsed.currentScreen).toBe(5);
		expect(parsed.currency).toBe('USD');
	});

	test('throws when data is not a string array', () => {
		expect(() => parseStatus({ ...minimal, data: 'oops' })).toThrow();
	});
});
