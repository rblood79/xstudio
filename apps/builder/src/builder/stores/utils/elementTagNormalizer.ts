import type { Element } from "../../../types/core/store.types";

const LEGACY_TAG_MAP: Record<string, string> = {
  section: "Section",
};

/**
 * 레거시 태그를 현재 canonical 태그로 정규화합니다.
 * 현재는 section -> Section만 지원합니다.
 */
export function normalizeElementTag(tag: string): string {
  return LEGACY_TAG_MAP[tag] ?? tag;
}

function shouldApplySectionDefaultDisplay(
  style: Record<string, unknown> | undefined
): boolean {
  if (!style) return true;

  if (style.display !== undefined && style.display !== null && style.display !== "") {
    return false;
  }

  // 사용자가 flex 관련 속성을 지정한 경우는 의도된 flex 컨테이너로 간주
  if (style.flexDirection !== undefined) return false;
  if (style.justifyContent !== undefined) return false;
  if (style.alignItems !== undefined) return false;
  if (style.flexWrap !== undefined) return false;

  return true;
}

/**
 * 단일 Element의 tag를 정규화합니다.
 */
export function normalizeElementTagInElement(element: Element): Element {
  const normalizedTag = normalizeElementTag(element.tag);
  let changed = normalizedTag !== element.tag;
  let normalizedProps = element.props;

  // Section은 기본 display:block 보장
  if (normalizedTag === "Section") {
    const currentStyle =
      (normalizedProps?.style as Record<string, unknown> | undefined) ?? undefined;

    if (shouldApplySectionDefaultDisplay(currentStyle)) {
      normalizedProps = {
        ...(normalizedProps ?? {}),
        style: {
          ...(currentStyle ?? {}),
          display: "block",
        },
      };
      changed = true;
    }
  }

  if (!changed) return element;
  return {
    ...element,
    tag: normalizedTag,
    props: normalizedProps,
  };
}

/**
 * Element 배열의 tag를 일괄 정규화합니다.
 * 변경된 요소 목록도 함께 반환합니다.
 */
export function normalizeElementTags(elements: Element[]): {
  elements: Element[];
  updatedElements: Element[];
} {
  const updatedElements: Element[] = [];

  const normalizedElements = elements.map((element) => {
    const updated = normalizeElementTagInElement(element);
    if (updated !== element) {
      updatedElements.push(updated);
    }
    return updated;
  });

  if (updatedElements.length === 0) {
    return { elements, updatedElements };
  }

  return {
    elements: normalizedElements,
    updatedElements,
  };
}
