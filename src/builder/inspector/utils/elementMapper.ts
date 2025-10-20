import type { Element } from "../../../types/store";
import type { SelectedElement } from "../types";

/**
 * Builder의 Element 타입을 Inspector의 SelectedElement 타입으로 변환
 */
export function mapElementToSelected(element: Element): SelectedElement {
  const { style, computedStyle, ...otherProps } = element.props as Record<string, unknown>;

  return {
    id: element.id,
    type: element.tag,
    properties: otherProps,
    // style이 없으면 빈 객체로 초기화 (undefined 방지)
    style: (style as React.CSSProperties) || {},
    computedStyle: computedStyle as Partial<React.CSSProperties> | undefined,
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
    props: {
      ...selected.properties,
      // style이 undefined가 아니면 항상 포함 (빈 객체라도 포함하여 스타일 제거 반영)
      ...(selected.style !== undefined ? { style: selected.style } : {}),
    } as Element["props"],
    dataBinding: selected.dataBinding as Element["dataBinding"],
  };
}
