import { useMemo } from "react";
import { useStore } from "../../../stores/elements";
import { useTransformValue, type TransformTier } from "./useTransformValue";

export interface TransformValuesBundle {
  width: TransformTier;
  height: TransformTier;
  top: TransformTier;
  left: TransformTier;
  minWidth: TransformTier;
  maxWidth: TransformTier;
  minHeight: TransformTier;
  maxHeight: TransformTier;
  aspectRatio: TransformTier;
  isBody: boolean;
}

export function useTransformValues(
  id: string | null,
): TransformValuesBundle | null {
  const width = useTransformValue(id, "width");
  const height = useTransformValue(id, "height");
  const top = useTransformValue(id, "top");
  const left = useTransformValue(id, "left");
  const minWidth = useTransformValue(id, "minWidth");
  const maxWidth = useTransformValue(id, "maxWidth");
  const minHeight = useTransformValue(id, "minHeight");
  const maxHeight = useTransformValue(id, "maxHeight");
  const aspectRatio = useTransformValue(id, "aspectRatio");
  const isBody = useStore((s) => {
    if (!id) return false;
    return s.elementsMap.get(id)?.type?.toLowerCase() === "body";
  });

  return useMemo(() => {
    if (!id || !width || !height) return null;
    return {
      width,
      height,
      top: top!,
      left: left!,
      minWidth: minWidth!,
      maxWidth: maxWidth!,
      minHeight: minHeight!,
      maxHeight: maxHeight!,
      aspectRatio: aspectRatio!,
      isBody,
    };
  }, [
    id,
    width,
    height,
    top,
    left,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    aspectRatio,
    isBody,
  ]);
}
