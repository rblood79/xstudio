/**
 * useTypographyValues - Typography 섹션 전용 Zustand 스타일 값 훅
 *
 * ADR-067 Phase 3: Jotai 제거, Spec preset direct lookup
 */

import { useMemo } from "react";
import { useStore } from "../../../stores";
import {
  resolveTypographySpecPreset,
  type TypographySpecPreset,
} from "../utils/specPresetResolver";
import {
  DEFAULT_FONT_FAMILY,
  extractFirstFontFamily,
  normalizeFontWeight,
} from "../../../fonts/customFonts";

export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
  whiteSpace: string;
  wordBreak: string;
  overflowWrap: string;
  textOverflow: string;
  overflow: string;
  textBehaviorPreset: string;
  isFontSizeFromPreset?: boolean;
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

function deriveTextBehaviorPreset(
  ws: string,
  wb: string,
  ow: string,
  to: string,
  of: string,
): string {
  if (ws === "nowrap" && to === "ellipsis" && of === "hidden")
    return "truncate";
  if (ws === "nowrap") return "nowrap";
  if (ws === "pre-wrap") return "preserve";
  if (wb === "break-all") return "break-all";
  if (wb === "keep-all") return "keep-all";
  if (ow === "break-word") return "break-words";
  if (
    (!ws || ws === "normal") &&
    (!wb || wb === "normal") &&
    (!ow || ow === "normal") &&
    (!to || to === "clip") &&
    (!of || of === "visible")
  )
    return "normal";
  return "custom";
}

export function useTypographyValues(
  id: string | null,
): TypographyStyleValues | null {
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

  const specPreset = useMemo<TypographySpecPreset>(
    () => resolveTypographySpecPreset(type, size),
    [type, size],
  );

  return useMemo(() => {
    if (!id) return null;
    const s = style ?? {};

    const rawFamily = firstDefined(
      s.fontFamily,
      specPreset.fontFamily,
      DEFAULT_FONT_FAMILY,
    );
    const fontFamily = extractFirstFontFamily(rawFamily);

    const hasInlineFontSize =
      s.fontSize !== undefined && s.fontSize !== null && s.fontSize !== "";
    const isFontSizeFromPreset =
      !hasInlineFontSize && specPreset.fontSize !== undefined;

    const fontSize = firstDefined(
      s.fontSize,
      numToPx(specPreset.fontSize),
      "16px",
    );

    const fontWeightRaw = firstDefined(
      s.fontWeight,
      specPreset.fontWeight,
      "400",
    );
    const fontWeight = normalizeFontWeight(fontWeightRaw);

    const lineHeight = firstDefined(
      s.lineHeight,
      numToPx(specPreset.lineHeight),
      "normal",
    );
    const letterSpacing = firstDefined(
      s.letterSpacing,
      numToPx(specPreset.letterSpacing),
      "normal",
    );

    const whiteSpace = firstDefined(s.whiteSpace, undefined, "normal");
    const wordBreak = firstDefined(s.wordBreak, undefined, "normal");
    const overflowWrap = firstDefined(s.overflowWrap, undefined, "normal");
    const textOverflow = firstDefined(s.textOverflow, undefined, "clip");
    const overflow = firstDefined(s.overflow, undefined, "visible");

    return {
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle: firstDefined(s.fontStyle, undefined, "normal"),
      lineHeight,
      letterSpacing,
      color: firstDefined(s.color, undefined, "#000000"),
      textAlign: firstDefined(s.textAlign, undefined, "left"),
      textDecoration: firstDefined(s.textDecoration, undefined, "none"),
      textTransform: firstDefined(s.textTransform, undefined, "none"),
      verticalAlign: firstDefined(s.verticalAlign, undefined, "baseline"),
      whiteSpace,
      wordBreak,
      overflowWrap,
      textOverflow,
      overflow,
      textBehaviorPreset: deriveTextBehaviorPreset(
        whiteSpace,
        wordBreak,
        overflowWrap,
        textOverflow,
        overflow,
      ),
      isFontSizeFromPreset,
    };
  }, [id, style, specPreset]);
}
