import { useMemo } from "react";
import { useStore } from "../../../stores/elements";
import {
  inferSizeMode,
  type SizeMode,
} from "../../../stores/utils/sizeModeResolver";

function useParentId(id: string | null): string | null {
  return useStore((s) =>
    id ? (s.elementsMap.get(id)?.parentId ?? null) : null,
  );
}

export function useParentDisplay(id: string | null): string {
  const parentId = useParentId(id);
  return useStore((s) => {
    if (!parentId) return "block";
    const p = s.elementsMap.get(parentId);
    const style = p?.properties?.style as Record<string, unknown> | undefined;
    return (style?.display as string) ?? "block";
  });
}

export function useParentFlexDirection(id: string | null): string {
  const parentId = useParentId(id);
  return useStore((s) => {
    if (!parentId) return "row";
    const p = s.elementsMap.get(parentId);
    const style = p?.properties?.style as Record<string, unknown> | undefined;
    return (style?.flexDirection as string) ?? "row";
  });
}

function useSizeMode(id: string | null, axis: "width" | "height"): SizeMode {
  const style = useStore((s) => {
    if (!id) return null;
    return (
      (s.elementsMap.get(id)?.properties?.style as Record<
        string,
        unknown
      > | null) ?? null
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
    const style = s.elementsMap.get(id)?.properties?.style as
      | Record<string, unknown>
      | undefined;
    return String(style?.alignSelf ?? "");
  });
  const justifySelf = useStore((s) => {
    if (!id) return "";
    const style = s.elementsMap.get(id)?.properties?.style as
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
