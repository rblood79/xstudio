import type { CanonicalNode } from "@composition/shared";
import type { Element } from "../../types/core/store.types";

type ElementWithSlotMetadata = Element & {
  metadata?: { slot?: unknown };
};

export function getCanonicalSlotDeclaration(
  element: Element,
): Pick<CanonicalNode, "slot"> {
  if (element.slot === false || Array.isArray(element.slot)) {
    return { slot: element.slot };
  }

  const metadataSlot = (element as ElementWithSlotMetadata).metadata?.slot;
  if (metadataSlot === false || Array.isArray(metadataSlot)) {
    return { slot: metadataSlot };
  }

  return {};
}
