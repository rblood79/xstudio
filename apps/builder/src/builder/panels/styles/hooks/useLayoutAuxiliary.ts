import { useMemo } from "react";
import { useStore } from "../../../stores";
import { TAG_SPEC_MAP } from "../../../workspace/canvas/sprites/tagSpecMap";

function useStyleProp(id: string | null, prop: string): string {
  return useStore((s) => {
    if (!id) return "";
    const style = s.elementsMap.get(id)?.props?.style as
      | Record<string, unknown>
      | undefined;
    return String(style?.[prop] ?? "");
  });
}

/**
 * ADR-079 P2: Panel hook 이 Spec defaults 를 fallback 으로 읽는 read-through.
 *
 * 기존 instance (store.props.style 에 `display` 등이 저장되지 않은 경우) 도 Spec
 * `containerStyles` 를 읽어 Panel 에 정확한 값 표시. `elementsMap` 기반이라
 * 기존 `useStyleProp` 와 동일 store subscription 범위. Preview/Canvas 영향 없음.
 *
 * 참조 범위: 최상위 `spec.containerStyles` 만. `spec.composition.containerStyles`
 * (자식 Element 에 전달되는 CSS 주입) 는 의미론이 달라 읽지 않음 — 후속 ADR scope.
 */
function useContainerStyleDefault(
  id: string | null,
  property: "display" | "flexDirection" | "alignItems" | "justifyContent",
): string {
  return useStore((s) => {
    if (!id) return "";
    const tag = s.elementsMap.get(id)?.tag;
    if (!tag) return "";
    const spec = TAG_SPEC_MAP[tag];
    const value = spec?.containerStyles?.[property];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  });
}

function useDisplay(id: string | null): string {
  const inline = useStyleProp(id, "display");
  const specDefault = useContainerStyleDefault(id, "display");
  return inline || specDefault || "block";
}

function useFlexDirection(id: string | null): string {
  const inline = useStyleProp(id, "flexDirection");
  const specDefault = useContainerStyleDefault(id, "flexDirection");
  return inline || specDefault || "row";
}

/**
 * ADR-082 P4 (ADR-079 P2 완결): alignItems/justifyContent 도 Spec fallback 소비.
 * 기존 `useFlexAlignmentKeys` 가 inline only 로 9-grid 하이라이트가 Spec 기본값 반영 불가.
 */
function useAlignItems(id: string | null): string {
  const inline = useStyleProp(id, "alignItems");
  const specDefault = useContainerStyleDefault(id, "alignItems");
  return inline || specDefault || "";
}

function useJustifyContent(id: string | null): string {
  const inline = useStyleProp(id, "justifyContent");
  const specDefault = useContainerStyleDefault(id, "justifyContent");
  return inline || specDefault || "";
}

/**
 * Flex Direction 토글 키 — display=flex 이면 column|row, 아니면 block
 */
export function useFlexDirectionKeys(id: string | null): string[] {
  const display = useDisplay(id);
  const flexDirection = useFlexDirection(id);
  return useMemo(() => {
    if (display !== "flex") return ["block"];
    if (flexDirection === "column") return ["column"];
    return ["row"];
  }, [display, flexDirection]);
}

const V_MAP: Record<string, string> = {
  "flex-start": "Top",
  start: "Top",
  center: "Center",
  "flex-end": "Bottom",
  end: "Bottom",
};
const H_MAP: Record<string, string> = {
  "flex-start": "left",
  start: "left",
  center: "center",
  "flex-end": "right",
  end: "right",
};

/**
 * Flex Alignment 9-grid 토글 키
 */
export function useFlexAlignmentKeys(id: string | null): string[] {
  const display = useDisplay(id);
  const flexDirection = useFlexDirection(id);
  const alignItems = useAlignItems(id);
  const justifyContent = useJustifyContent(id);
  return useMemo(() => {
    if (display !== "flex") return [];
    let vertical: string;
    let horizontal: string;
    if (flexDirection === "column") {
      vertical = V_MAP[justifyContent] ?? "";
      horizontal = H_MAP[alignItems] ?? "";
    } else {
      vertical = V_MAP[alignItems] ?? "";
      horizontal = H_MAP[justifyContent] ?? "";
    }
    if (!vertical && !horizontal) return [];
    return [`${horizontal}${vertical}`];
  }, [display, flexDirection, alignItems, justifyContent]);
}

const SPACING_VALUES = new Set([
  "space-around",
  "space-between",
  "space-evenly",
]);

/**
 * Justify Content Spacing 토글 키
 */
export function useJustifyContentSpacingKeys(id: string | null): string[] {
  const justifyContent = useJustifyContent(id);
  return useMemo(() => {
    if (SPACING_VALUES.has(justifyContent)) return [justifyContent];
    return [];
  }, [justifyContent]);
}

/**
 * Flex Wrap 토글 키
 */
export function useFlexWrapKeys(id: string | null): string[] {
  const flexWrap = useStyleProp(id, "flexWrap");
  return useMemo(() => [flexWrap || "nowrap"], [flexWrap]);
}
