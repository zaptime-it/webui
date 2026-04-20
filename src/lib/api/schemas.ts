/**
 * Valibot schemas for runtime validation of `/api/settings` and `/api/status`
 * payloads. Only the critical invariants are enforced; unknown fields are
 * passed through so the firmware can grow the contract without breaking the UI.
 */

import * as v from 'valibot';

export const dndSettingsSchema = v.object({
	enabled: v.boolean(),
	dndTimeEnabled: v.boolean(),
	startHour: v.number(),
	startMinute: v.number(),
	endHour: v.number(),
	endMinute: v.number()
});

export const screenSchema = v.object({
	id: v.number(),
	name: v.string(),
	enabled: v.boolean(),
	order: v.number()
});

export const settingsSchema = v.looseObject({
	numScreens: v.number(),
	timerSeconds: v.number(),
	dataSource: v.number(),
	screens: v.array(screenSchema),
	dnd: dndSettingsSchema
});

export const parseSettings = (raw: unknown) => v.parse(settingsSchema, raw);

export const ledSchema = v.object({
	hex: v.string(),
	red: v.optional(v.number()),
	green: v.optional(v.number()),
	blue: v.optional(v.number())
});

export const connectionStatusSchema = v.object({
	price: v.boolean(),
	blocks: v.boolean(),
	V2: v.optional(v.boolean()),
	nostr: v.optional(v.boolean())
});

export const statusSchema = v.looseObject({
	data: v.array(v.string()),
	espFreeHeap: v.number(),
	espHeapSize: v.number(),
	leds: v.array(ledSchema),
	connectionStatus: connectionStatusSchema
});

export const parseStatus = (raw: unknown) => v.parse(statusSchema, raw);
