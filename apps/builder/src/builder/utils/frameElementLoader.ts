import type { Element } from "../../types/core/store.types";

export interface FrameElementLoaderDb {
  elements: {
    getAll(): Promise<Element[]>;
    getDescendants(parentId: string): Promise<Element[]>;
  };
}

function isBodyElement(element: Element): boolean {
  return element.type.toLowerCase() === "body";
}

function isFrameLayoutElement(element: Element, frameId: string): boolean {
  return (
    !element.deleted && element.layout_id === frameId && element.page_id == null
  );
}

function hasFrameBody(elements: Element[], frameId: string): boolean {
  return elements.some(
    (element) =>
      !element.deleted &&
      isBodyElement(element) &&
      (element.layout_id === frameId || element.parent_id === frameId),
  );
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
    isFrameLayoutElement(element, frameId),
  );

  return layoutElements.length > 0
    ? layoutElements
    : descendants.filter((element) => !element.deleted);
}
