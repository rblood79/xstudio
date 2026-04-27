import { useMemo } from "react";
import { useStore } from "../../../stores";
import {
  inferSizeMode,
  type SizeMode,
} from "../../../stores/utils/sizeModeResolver";
import { TAG_SPEC_MAP } from "../../../workspace/canvas/sprites/tagSpecMap";

function useParentId(id: string | null): string | null {
  return useStore((s) =>
    id ? (s.elementsMap.get(id)?.parent_id ?? null) : null,
  );
}

/**
 * ADR-082 A1: 부모 Spec containerStyles.{display|flexDirection} fallback.
 *
 * inline 값이 없으면 부모의 type 기반 Spec containerStyles 에서 조회.
 * SelfAlignment 9-grid 가 부모 Spec 기본값(예: ListBoxSpec.display="flex")에서도
 * 활성화되도록 함. 소비 우선순위: `props.style` → `spec.containerStyles` → 기본값.
 */
function resolveParentContainerStyle(
  parentId: string | null,
  property: "display" | "flexDirection",
  fallback: string,
  state: {
    elementsMap: Map<
      string,
      { type?: string; props?: { style?: Record<string, unknown> } }
    >;
  },
): string {
  if (!parentId) return fallback;
  const p = state.elementsMap.get(parentId);
  const style = p?.props?.style as Record<string, unknown> | undefined;
  const inline = style?.[property];
  if (typeof inline === "string" && inline) return inline;
  const type = p?.type;
  if (type) {
    const spec = TAG_SPEC_MAP[type];
    const specValue = spec?.containerStyles?.[property];
    if (typeof specValue === "string") return specValue;
  }
  return fallback;
}

export function useParentDisplay(id: string | null): string {
  const parentId = useParentId(id);
  return useStore((s) =>
    resolveParentContainerStyle(parentId, "display", "block", s),
  );
}

export function useParentFlexDirection(id: string | null): string {
  const parentId = useParentId(id);
  return useStore((s) =>
    resolveParentContainerStyle(parentId, "flexDirection", "row", s),
  );
}

function useSizeMode(id: string | null, axis: "width" | "height"): SizeMode {
  const style = useStore((s) => {
    if (!id) return null;
    return (
      (s.elementsMap.get(id)?.props?.style as Record<string, unknown> | null) ??
      null
    );
  });
  const parentDisplay = useParentDisplay(id);
  const parentFlexDirection = useParentFlexDirection(id);
  return useMemo(
    () =>
      style
        ? inferSizeMode(style, axis, parentDisplay, parentFlexDirection)
        : "fit",
    [style, axis, parentDisplay, parentFlexDirection],
  );
}

export function useWidthSizeMode(id: string | null): SizeMode {
  return useSizeMode(id, "width");
}

export function useHeightSizeMode(id: string | null): SizeMode {
  return useSizeMode(id, "height");
}

const V_MAP: Record<string, string> = {
  "flex-start": "Top",
  start: "Top",
  center: "Center",
  "flex-end": "Bottom",
  end: "Bottom",
  stretch: "",
};
const H_MAP: Record<string, string> = {
  "flex-start": "left",
  start: "left",
  center: "center",
  "flex-end": "right",
  end: "right",
  stretch: "",
};

export function useSelfAlignmentKeys(id: string | null): string[] {
  const parentDisplay = useParentDisplay(id);
  const alignSelf = useStore((s) => {
    if (!id) return "";
    const style = s.elementsMap.get(id)?.props?.style as
      | Record<string, unknown>
      | undefined;
    return String(style?.alignSelf ?? "");
  });
  const justifySelf = useStore((s) => {
    if (!id) return "";
    const style = s.elementsMap.get(id)?.props?.style as
      | Record<string, unknown>
      | undefined;
    return String(style?.justifySelf ?? "");
  });
  return useMemo(() => {
    const isFlexOrGrid =
      parentDisplay === "flex" ||
      parentDisplay === "inline-flex" ||
      parentDisplay === "grid" ||
      parentDisplay === "inline-grid";
    if (!isFlexOrGrid) return [];
    const v = V_MAP[alignSelf] ?? "";
    const h = H_MAP[justifySelf] ?? "";
    if (!v && !h) return [];
    return [`${h}${v}`];
  }, [parentDisplay, alignSelf, justifySelf]);
}
