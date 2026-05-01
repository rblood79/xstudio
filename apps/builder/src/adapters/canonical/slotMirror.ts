import {
  getLegacySlotName,
  LEGACY_SLOT_NAME_FIELD,
  withLegacySlotName,
} from "./legacyElementFields";

export const SLOT_NAME_MIRROR_FIELD = LEGACY_SLOT_NAME_FIELD;

export function getSlotMirrorName(value: unknown): string | null {
  return getLegacySlotName(value);
}

export function withSlotMirrorName<T extends object>(
  value: T,
  slotName: string | null,
): T {
  return withLegacySlotName(value, slotName);
}
