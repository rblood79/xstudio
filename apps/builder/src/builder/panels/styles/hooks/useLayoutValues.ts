import { useMemo } from "react";
import { useStore } from "../../../stores";
import {
  resolveLayoutSpecPreset,
  type LayoutSpecPreset,
} from "../utils/specPresetResolver";
import { numToPx, firstDefined } from "../utils/styleValueHelpers";

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

  const specPreset = useMemo<LayoutSpecPreset>(
    () => resolveLayoutSpecPreset(type, size),
    [type, size],
  );

  return useMemo(() => {
    if (!id) return null;
    const s = style ?? {};
    return {
      display: firstDefined(s.display, undefined, "block"),
      flexDirection: firstDefined(s.flexDirection, undefined, "row"),
      alignItems: firstDefined(s.alignItems, undefined, ""),
      justifyContent: firstDefined(s.justifyContent, undefined, ""),
      gap: firstDefined(s.gap, numToPx(specPreset.gap), "0px"),
      flexWrap: firstDefined(s.flexWrap, undefined, "nowrap"),
      padding: firstDefined(s.padding, undefined, "0px"),
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
      margin: firstDefined(s.margin, undefined, "0px"),
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
