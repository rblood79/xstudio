import { useMemo } from "react";
import {
  resolveLayoutSpecPreset,
  type LayoutSpecPreset,
} from "../utils/specPresetResolver";
import { numToPx, firstDefined, uniform4Way } from "../utils/styleValueHelpers";
import { useElementStyleContext } from "./useElementStyleContext";

export interface LayoutStyleValues {
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  flexWrap: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

export function useLayoutValues(id: string | null): LayoutStyleValues | null {
  const { style, type, size, props } = useElementStyleContext(id);

  const specPreset = useMemo<LayoutSpecPreset>(
    () => resolveLayoutSpecPreset(type, size, props),
    [type, size, props],
  );

  return useMemo(() => {
    if (!id) return null;
    const s = style ?? {};
    const inlineUniformPadding = uniform4Way(
      numToPx(s.paddingTop as number | string | undefined),
      numToPx(s.paddingRight as number | string | undefined),
      numToPx(s.paddingBottom as number | string | undefined),
      numToPx(s.paddingLeft as number | string | undefined),
    );
    const inlineUniformMargin = uniform4Way(
      numToPx(s.marginTop as number | string | undefined),
      numToPx(s.marginRight as number | string | undefined),
      numToPx(s.marginBottom as number | string | undefined),
      numToPx(s.marginLeft as number | string | undefined),
    );
    return {
      display: firstDefined(s.display, specPreset.display, "block"),
      flexDirection: firstDefined(
        s.flexDirection,
        specPreset.flexDirection,
        "row",
      ),
      alignItems: firstDefined(s.alignItems, specPreset.alignItems, ""),
      justifyContent: firstDefined(
        s.justifyContent,
        specPreset.justifyContent,
        "",
      ),
      // store 는 longhand (rowGap/columnGap) 만 유지 — shorthand gap 은
      // inspectorActions 에서 longhand 로 분배. Panel Gap 필드는 rowGap
      // 우선, 없으면 columnGap, 없으면 shorthand `s.gap` (legacy) 표시.
      gap: firstDefined(
        s.rowGap ?? s.columnGap ?? s.gap,
        numToPx(specPreset.rowGap ?? specPreset.columnGap ?? specPreset.gap),
        "0px",
      ),
      flexWrap: firstDefined(
        s.flexWrap,
        typeof specPreset.flexWrap === "string" ? specPreset.flexWrap : undefined,
        "nowrap",
      ),
      // ADR-082 P1-2: Spec 4-way uniform 이면 shorthand 에 반영 (collapsed 모드 UX)
      padding: firstDefined(
        numToPx(s.padding as number | string | undefined) ?? inlineUniformPadding,
        numToPx(specPreset.padding) ??
        uniform4Way(
          numToPx(specPreset.paddingTop),
          numToPx(specPreset.paddingRight),
          numToPx(specPreset.paddingBottom),
          numToPx(specPreset.paddingLeft),
        ),
        "0px",
      ),
      paddingTop: firstDefined(
        s.paddingTop,
        numToPx(specPreset.paddingTop),
        "0px",
      ),
      paddingRight: firstDefined(
        s.paddingRight,
        numToPx(specPreset.paddingRight),
        "0px",
      ),
      paddingBottom: firstDefined(
        s.paddingBottom,
        numToPx(specPreset.paddingBottom),
        "0px",
      ),
      paddingLeft: firstDefined(
        s.paddingLeft,
        numToPx(specPreset.paddingLeft),
        "0px",
      ),
      // ADR-082 P1-2: margin 도 4-way uniform fallback 동일 적용
      margin: firstDefined(
        numToPx(s.margin as number | string | undefined) ?? inlineUniformMargin,
        numToPx(specPreset.margin) ??
        uniform4Way(
          numToPx(specPreset.marginTop),
          numToPx(specPreset.marginRight),
          numToPx(specPreset.marginBottom),
          numToPx(specPreset.marginLeft),
        ),
        "0px",
      ),
      marginTop: firstDefined(
        s.marginTop,
        numToPx(specPreset.marginTop),
        "0px",
      ),
      marginRight: firstDefined(
        s.marginRight,
        numToPx(specPreset.marginRight),
        "0px",
      ),
      marginBottom: firstDefined(
        s.marginBottom,
        numToPx(specPreset.marginBottom),
        "0px",
      ),
      marginLeft: firstDefined(
        s.marginLeft,
        numToPx(specPreset.marginLeft),
        "0px",
      ),
    };
  }, [id, style, specPreset]);
}
