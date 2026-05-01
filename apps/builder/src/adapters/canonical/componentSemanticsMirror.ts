import type { Element } from "@/types/builder/unified.types";
import {
  getInstanceMasterReference,
  getLegacyDescendants,
  getLegacyOverrides,
  isLegacyInstanceElement,
  isLegacyMasterElement,
  LEGACY_COMPONENT_ROLE_FIELD,
  LEGACY_DESCENDANTS_FIELD,
  LEGACY_MASTER_ID_FIELD,
  LEGACY_OVERRIDES_FIELD,
} from "./legacyElementFields";

export const COMPONENT_ROLE_MIRROR_FIELD = LEGACY_COMPONENT_ROLE_FIELD;
export const COMPONENT_MASTER_ID_MIRROR_FIELD = LEGACY_MASTER_ID_FIELD;
export const COMPONENT_OVERRIDES_MIRROR_FIELD = LEGACY_OVERRIDES_FIELD;
export const COMPONENT_DESCENDANTS_MIRROR_FIELD = LEGACY_DESCENDANTS_FIELD;

export function getComponentMasterReference(
  element: Element,
): string | undefined {
  return getInstanceMasterReference(element);
}

export function getComponentOverridesMirror(
  element: Element,
): Record<string, unknown> | undefined {
  return getLegacyOverrides(element);
}

export function getComponentDescendantsMirror(
  element: Element,
): Record<string, unknown> | undefined {
  return getLegacyDescendants(element);
}

export function isComponentInstanceMirrorElement(element: Element): boolean {
  return isLegacyInstanceElement(element);
}

export function isComponentOriginMirrorElement(element: Element): boolean {
  return isLegacyMasterElement(element);
}
