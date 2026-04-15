import { useMemo } from "react";
import { useStore } from "../../../stores";

function useStyleProp(id: string | null, prop: string): string {
  return useStore((s) => {
    if (!id) return "";
    const style = s.elementsMap.get(id)?.props?.style as
      | Record<string, unknown>
      | undefined;
    return String(style?.[prop] ?? "");
  });
}

function useDisplay(id: string | null): string {
  const inline = useStyleProp(id, "display");
  return inline || "block";
}

function useFlexDirection(id: string | null): string {
  const inline = useStyleProp(id, "flexDirection");
  return inline || "row";
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
  const alignItems = useStyleProp(id, "alignItems");
  const justifyContent = useStyleProp(id, "justifyContent");
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
  const justifyContent = useStyleProp(id, "justifyContent");
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
