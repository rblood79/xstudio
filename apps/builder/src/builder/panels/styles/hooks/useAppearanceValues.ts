/**
 * useAppearanceValues - Appearance 섹션 전용 Zustand 스타일 값 훅
 *
 * ADR-067 Phase 4: Jotai 제거, Spec preset direct lookup
 */

import { useMemo } from "react";
import { useStore } from "../../../stores";
import {
  resolveAppearanceSpecPreset,
  type AppearanceSpecPreset,
} from "../utils/specPresetResolver";

export interface AppearanceStyleValues {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
  boxShadow: string;
  overflow: string;
}

function numToPx(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return `${n}px`;
}

function firstDefined(
  inline: unknown,
  specPx: string | undefined,
  fallback: string,
): string {
  if (inline !== undefined && inline !== null && inline !== "") {
    return String(inline);
  }
  if (specPx !== undefined) return specPx;
  return fallback;
}

export function useAppearanceValues(
  id: string | null,
): AppearanceStyleValues | null {
  const style = useStore((s) => {
    if (!id) return undefined;
    const el = s.elementsMap.get(id);
    return el?.props?.style as Record<string, unknown> | undefined;
  });
  const type = useStore((s) => (id ? s.elementsMap.get(id)?.tag : undefined));
  const size = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props?.size as string | undefined;
  });

  const specPreset = useMemo<AppearanceSpecPreset>(
    () => resolveAppearanceSpecPreset(type, size),
    [type, size],
  );

  return useMemo(() => {
    if (!id) return null;
    const s = style ?? {};
    return {
      backgroundColor: firstDefined(s.backgroundColor, undefined, "#FFFFFF"),
      borderColor: firstDefined(s.borderColor, undefined, "#000000"),
      borderWidth: firstDefined(
        s.borderWidth,
        numToPx(specPreset.borderWidth),
        "0px",
      ),
      borderRadius: firstDefined(
        s.borderRadius,
        numToPx(specPreset.borderRadius),
        "0px",
      ),
      borderStyle: firstDefined(s.borderStyle, undefined, "solid"),
      boxShadow: firstDefined(s.boxShadow, undefined, "none"),
      overflow: firstDefined(s.overflow, undefined, "visible"),
    };
  }, [id, style, specPreset]);
}
