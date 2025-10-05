import type { Element } from "../../../types/store";
import type { SelectedElement } from "../types";

/**
 * Builder의 Element 타입을 Inspector의 SelectedElement 타입으로 변환
 */
export function mapElementToSelected(element: Element): SelectedElement {
  return {
    id: element.id,
    type: element.tag,
    properties: {
      ...(element.props as Record<string, unknown>),
    },
    semanticClasses: [],
    cssVariables: {},
    dataBinding: element.dataBinding as SelectedElement["dataBinding"],
    events: [],
  };
}

/**
 * Inspector의 변경사항을 Builder의 Element 업데이트 형식으로 변환
 */
export function mapSelectedToElementUpdate(
  selected: SelectedElement
): Partial<Element> {
  return {
    id: selected.id,
    tag: selected.type,
    props: selected.properties as Element["props"],
    dataBinding: selected.dataBinding as Element["dataBinding"],
  };
}
