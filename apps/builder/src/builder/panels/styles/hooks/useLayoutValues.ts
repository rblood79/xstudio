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
  const { style, type, size } = useElementStyleContext(id);

  const specPreset = useMemo<LayoutSpecPreset>(
    () => resolveLayoutSpecPreset(type, size),
    [type, size],
  );

  return useMemo(() => {
    if (!id) return null;
    const s = style ?? {};
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
      // 우선 표시 (단일 입력 UI) → specPreset.gap → "0px".
      gap: firstDefined(
        s.rowGap,
        s.columnGap,
        s.gap,
        numToPx(specPreset.gap),
        "0px",
      ),
      flexWrap: firstDefined(s.flexWrap, undefined, "nowrap"),
      // ADR-082 P1-2: Spec 4-way uniform 이면 shorthand 에 반영 (collapsed 모드 UX)
      padding: firstDefined(
        s.padding,
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
        s.margin,
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
