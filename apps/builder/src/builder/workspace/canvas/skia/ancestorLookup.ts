import type { Element } from "../../../../types/core/store.types";

/**
 * 주어진 element에서 위로 올라가며 특정 tag를 가진 조상을 찾는다.
 * implicitStyles(1-depth)와 buildSpecNodeData(3-depth)의 중복 패턴 통합.
 */
export function findAncestorByTag(
  element: Element,
  tag: string,
  elementsMap: Map<string, Element>,
  maxDepth = 3,
): Element | undefined {
  let currentId: string | null | undefined = element.parent_id;
  for (let depth = 0; depth < maxDepth && currentId; depth++) {
    const ancestor = elementsMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.tag === tag) return ancestor;
    currentId = ancestor.parent_id;
  }
  return undefined;
}
