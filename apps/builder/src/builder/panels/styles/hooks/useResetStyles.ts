/**
 * useResetStyles - 경량 스타일 리셋 훅
 *
 * 🚀 Phase 4.2c: 래퍼 컴포넌트 최적화
 * - 섹션 래퍼 (TransformSection 등)는 resetStyles만 필요
 * - useStyleActions의 useCopyPaste 훅 오버헤드 제거
 * - 안정적인 함수 참조 반환 (useCallback + 빈 deps)
 *
 * 🚀 Body 기본값 보존: Reset 시 컴포넌트 기본값으로 복원
 */

import { useCallback } from "react";
import { useStore } from "../../../stores";
import { getDefaultProps } from "../../../../types/builder/unified.types";
import {
  resolveAppearanceSpecPreset,
  resolveLayoutSpecPreset,
  resolveSpecPreset,
  resolveTypographySpecPreset,
} from "../utils/specPresetResolver";
import { numToPx, uniform4Way } from "../utils/styleValueHelpers";
import { LAYOUT_PRESETS } from "../../properties/editors/LayoutPresetSelector/presetDefinitions";
import { normalizeFramePresetContainerStyle } from "../../properties/editors/LayoutPresetSelector/presetStyle";

const PX_LIKE_STYLE_PROPS = new Set([
  "width",
  "height",
  "top",
  "left",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "borderWidth",
  "borderRadius",
  "gap",
  "rowGap",
  "columnGap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "fontSize",
  "lineHeight",
  "letterSpacing",
]);

function normalizeStyleValue(prop: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && PX_LIKE_STYLE_PROPS.has(prop)) {
    return `${value}px`;
  }
  return String(value);
}

function resolveSpecStyleDefaults(
  type: string,
  props: Readonly<Record<string, unknown>> | undefined,
): Record<string, string | undefined> {
  const size = typeof props?.size === "string" ? props.size : undefined;
  const transformPreset = resolveSpecPreset(type, size);
  const layoutPreset = resolveLayoutSpecPreset(type, size, props);
  const appearancePreset = resolveAppearanceSpecPreset(type, size);
  const typographyPreset = resolveTypographySpecPreset(type, size);

  return {
    width: normalizeStyleValue("width", transformPreset.width),
    height: normalizeStyleValue("height", transformPreset.height),
    top: normalizeStyleValue("top", transformPreset.top),
    left: normalizeStyleValue("left", transformPreset.left),
    minWidth: normalizeStyleValue("minWidth", transformPreset.minWidth),
    maxWidth: normalizeStyleValue("maxWidth", transformPreset.maxWidth),
    minHeight: normalizeStyleValue("minHeight", transformPreset.minHeight),
    maxHeight: normalizeStyleValue("maxHeight", transformPreset.maxHeight),
    aspectRatio: normalizeStyleValue(
      "aspectRatio",
      transformPreset.aspectRatio,
    ),
    display: normalizeStyleValue("display", layoutPreset.display),
    flexDirection: normalizeStyleValue(
      "flexDirection",
      layoutPreset.flexDirection,
    ),
    alignItems: normalizeStyleValue("alignItems", layoutPreset.alignItems),
    justifyContent: normalizeStyleValue(
      "justifyContent",
      layoutPreset.justifyContent,
    ),
    flexWrap: normalizeStyleValue("flexWrap", layoutPreset.flexWrap),
    gap: normalizeStyleValue(
      "gap",
      layoutPreset.rowGap ?? layoutPreset.columnGap ?? layoutPreset.gap,
    ),
    padding: normalizeStyleValue(
      "padding",
      numToPx(layoutPreset.padding) ??
        uniform4Way(
          numToPx(layoutPreset.paddingTop),
          numToPx(layoutPreset.paddingRight),
          numToPx(layoutPreset.paddingBottom),
          numToPx(layoutPreset.paddingLeft),
        ),
    ),
    paddingTop: normalizeStyleValue(
      "paddingTop",
      numToPx(layoutPreset.paddingTop),
    ),
    paddingRight: normalizeStyleValue(
      "paddingRight",
      numToPx(layoutPreset.paddingRight),
    ),
    paddingBottom: normalizeStyleValue(
      "paddingBottom",
      numToPx(layoutPreset.paddingBottom),
    ),
    paddingLeft: normalizeStyleValue(
      "paddingLeft",
      numToPx(layoutPreset.paddingLeft),
    ),
    margin: normalizeStyleValue(
      "margin",
      numToPx(layoutPreset.margin) ??
        uniform4Way(
          numToPx(layoutPreset.marginTop),
          numToPx(layoutPreset.marginRight),
          numToPx(layoutPreset.marginBottom),
          numToPx(layoutPreset.marginLeft),
        ),
    ),
    marginTop: normalizeStyleValue(
      "marginTop",
      numToPx(layoutPreset.marginTop),
    ),
    marginRight: normalizeStyleValue(
      "marginRight",
      numToPx(layoutPreset.marginRight),
    ),
    marginBottom: normalizeStyleValue(
      "marginBottom",
      numToPx(layoutPreset.marginBottom),
    ),
    marginLeft: normalizeStyleValue(
      "marginLeft",
      numToPx(layoutPreset.marginLeft),
    ),
    backgroundColor: normalizeStyleValue(
      "backgroundColor",
      appearancePreset.backgroundColor,
    ),
    borderColor: normalizeStyleValue(
      "borderColor",
      appearancePreset.borderColor,
    ),
    borderWidth: normalizeStyleValue(
      "borderWidth",
      numToPx(appearancePreset.borderWidth),
    ),
    borderRadius: normalizeStyleValue(
      "borderRadius",
      numToPx(appearancePreset.borderRadius),
    ),
    fontFamily: normalizeStyleValue("fontFamily", typographyPreset.fontFamily),
    fontSize: normalizeStyleValue(
      "fontSize",
      numToPx(typographyPreset.fontSize),
    ),
    fontWeight: normalizeStyleValue("fontWeight", typographyPreset.fontWeight),
    lineHeight: normalizeStyleValue(
      "lineHeight",
      numToPx(typographyPreset.lineHeight),
    ),
    letterSpacing: normalizeStyleValue(
      "letterSpacing",
      numToPx(typographyPreset.letterSpacing),
    ),
  };
}

function resolveResetBaseline(element: {
  type: string;
  props?: Readonly<Record<string, unknown>>;
}): {
  legacyStyle: Record<string, unknown>;
  specStyle: Record<string, string | undefined>;
} {
  const defaultProps = getDefaultProps(element.type);
  const presetStyle = resolveAppliedPresetBaselineStyle(element);
  return {
    legacyStyle: {
      ...((defaultProps?.style || {}) as Record<string, unknown>),
      ...presetStyle,
    },
    specStyle: resolveSpecStyleDefaults(element.type, element.props),
  };
}

function resolveAppliedPresetBaselineStyle(element: {
  type: string;
  props?: Readonly<Record<string, unknown>>;
}): Record<string, unknown> {
  if (element.type.toLowerCase() !== "body") {
    return {};
  }

  const appliedPreset =
    typeof element.props?.appliedPreset === "string"
      ? element.props.appliedPreset
      : undefined;
  if (!appliedPreset) {
    return {};
  }

  const preset = LAYOUT_PRESETS[appliedPreset];
  if (!preset) {
    return {};
  }

  return normalizeFramePresetContainerStyle(preset.containerStyle) as Record<
    string,
    unknown
  >;
}

function resolveTargetValue(
  prop: string,
  specStyle: Record<string, string | undefined>,
  legacyStyle: Record<string, unknown>,
): string {
  return specStyle[prop] ?? normalizeStyleValue(prop, legacyStyle[prop]) ?? "";
}

function resolveCurrentStyleValue(
  prop: string,
  currentStyle: Record<string, unknown>,
): string | undefined {
  if (prop === "gap") {
    return (
      normalizeStyleValue("rowGap", currentStyle.rowGap) ??
      normalizeStyleValue("columnGap", currentStyle.columnGap) ??
      normalizeStyleValue("gap", currentStyle.gap)
    );
  }
  return normalizeStyleValue(prop, currentStyle[prop]);
}

/**
 * 선택된 요소의 특정 속성들이 기본값과 다른지 확인하는 훅
 * 리셋 버튼 조건부 표시용
 */
export function useHasDirtyStyles(properties: string[]): boolean {
  return useStore((state) => {
    const selectedId = state.selectedElementId;
    if (!selectedId) return false;

    const element = state.elementsMap.get(selectedId);
    if (!element) return false;

    const currentStyle =
      (element.props?.style as Record<string, unknown>) || {};
    const { legacyStyle, specStyle } = resolveResetBaseline(element);

    for (const prop of properties) {
      const currentValue = resolveCurrentStyleValue(prop, currentStyle);
      if (currentValue === undefined) continue;
      const resetValue = resolveTargetValue(prop, specStyle, legacyStyle);
      if (currentValue !== resetValue) return true;
    }
    return false;
  });
}

/**
 * resetStyles 함수만 반환하는 경량 훅
 * Section 래퍼 컴포넌트용
 *
 * Reset 시 컴포넌트의 기본 스타일 값으로 복원 (완전 삭제가 아님)
 */
export function useResetStyles() {
  const resetStyles = useCallback((properties: string[]) => {
    const state = useStore.getState();
    const selectedId = state.selectedElementId;
    if (!selectedId) return;

    const element = state.elementsMap.get(selectedId);
    if (!element) return;

    const currentStyle =
      (element.props?.style as Record<string, unknown>) || {};
    const { legacyStyle, specStyle } = resolveResetBaseline(element);

    // 실제로 변경이 필요한 속성만 포함 (dirty check)
    const resetObj: Record<string, string> = {};
    properties.forEach((prop) => {
      const currentValue = resolveCurrentStyleValue(prop, currentStyle);
      if (currentValue === undefined) return;
      const targetValue = resolveTargetValue(prop, specStyle, legacyStyle);
      const resetValue =
        specStyle[prop] !== undefined
          ? ""
          : (normalizeStyleValue(prop, legacyStyle[prop]) ?? "");
      if (currentValue !== targetValue) {
        resetObj[prop] = resetValue;
      }
    });

    // 변경할 속성이 없으면 히스토리 기록 없이 조기 반환
    if (Object.keys(resetObj).length === 0) return;

    state.updateSelectedStyles(resetObj);
  }, []);

  return resetStyles;
}
