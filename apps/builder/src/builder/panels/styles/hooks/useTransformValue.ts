import { useMemo } from "react";
import { useStore } from "../../../stores";
import { useLayoutValue } from "./useLayoutValue";
import {
  resolveSpecPreset,
  type TransformSpecPreset,
} from "../utils/specPresetResolver";

export type TransformProp =
  | "width"
  | "height"
  | "top"
  | "left"
  | "minWidth"
  | "maxWidth"
  | "minHeight"
  | "maxHeight"
  | "aspectRatio";

export interface TransformTier {
  inline: string | number | undefined;
  effective: number | undefined;
  specDefault: number | undefined;
}

const LAYOUT_KEY_MAP: Partial<
  Record<TransformProp, "width" | "height" | "x" | "y">
> = {
  width: "width",
  height: "height",
  top: "y",
  left: "x",
};

export function useTransformValue(
  id: string | null,
  prop: TransformProp,
): TransformTier | null {
  // inline (Zustand primitive selector)
  const inline = useStore((s) => {
    if (!id) return undefined;
    const el = s.elementsMap.get(id);
    const style = el?.props?.style as Record<string, unknown> | undefined;
    return style?.[prop] as string | number | undefined;
  });

  // effective (external store via useLayoutValue)
  const layoutKey = LAYOUT_KEY_MAP[prop];
  const effective = useLayoutValue(
    id,
    (layoutKey ?? "width") as Parameters<typeof useLayoutValue>[1],
  );

  // Spec resolution: primitive selectors for type + size
  const type = useStore((s) => (id ? s.elementsMap.get(id)?.tag : undefined));
  const size = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props?.size as string | undefined;
  });
  const specDefault = useMemo(() => {
    if (!type) return undefined;
    const p: TransformSpecPreset = resolveSpecPreset(type, size);
    return (p as Record<string, number | undefined>)[prop];
  }, [type, size, prop]);

  return useMemo(() => {
    if (!id) return null;
    return {
      inline,
      effective: layoutKey ? effective : undefined, // min/max/aspect는 layout 결과 없음
      specDefault,
    };
  }, [id, inline, effective, layoutKey, specDefault]);
}
