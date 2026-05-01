import type { Element } from "@/types/builder/unified.types";
import { matchesLegacyLayoutId } from "./legacyElementFields";

export interface FrameElementLoaderDb {
  elements: {
    getAll(): Promise<Element[]>;
    getDescendants(parentId: string): Promise<Element[]>;
  };
}

function isBodyElement(element: Element): boolean {
  return element.type.toLowerCase() === "body";
}

export function isFrameElementForFrame(
  element: Element,
  frameId: string,
): boolean {
  return (
    !element.deleted &&
    matchesLegacyLayoutId(element, frameId) &&
    element.page_id == null
  );
}

function hasFrameBody(elements: Element[], frameId: string): boolean {
  return elements.some(
    (element) =>
      !element.deleted &&
      isBodyElement(element) &&
      (matchesLegacyLayoutId(element, frameId) ||
        element.parent_id === frameId),
  );
}

export function hasHydratedFrameElements(
  elementsMap: ReadonlyMap<string, Element>,
  frameId: string,
): boolean {
  for (const element of elementsMap.values()) {
    if (isFrameElementForFrame(element, frameId)) {
      return true;
    }
  }
  return false;
}

export function collectHydratedFrameElements(
  elementsMap: ReadonlyMap<string, Element>,
  frameId: string,
): Element[] {
  const frameElements: Element[] = [];
  for (const element of elementsMap.values()) {
    if (isFrameElementForFrame(element, frameId)) {
      frameElements.push(element);
    }
  }
  return frameElements;
}

export async function loadFrameElements(
  db: FrameElementLoaderDb,
  frameId: string,
): Promise<Element[]> {
  const descendants = await db.elements.getDescendants(frameId);
  if (hasFrameBody(descendants, frameId)) {
    return descendants.filter((element) => !element.deleted);
  }

  const allElements = await db.elements.getAll();
  const layoutElements = allElements.filter((element) =>
    isFrameElementForFrame(element, frameId),
  );

  return layoutElements.length > 0
    ? layoutElements
    : descendants.filter((element) => !element.deleted);
}
