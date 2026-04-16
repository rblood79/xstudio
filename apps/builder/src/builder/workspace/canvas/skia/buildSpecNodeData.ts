/**
 * buildSpecNodeData — Spec 기반 컴포넌트 SkiaNodeData 빌드 (ADR-100 Phase 8)
 *
 * ElementSprite의 Spec→shapes→specShapesToSkia 파이프라인을 순수 함수로 추출.
 * Button, Checkbox, Switch 등 TAG_SPEC_MAP에 등록된 모든 컴포넌트를 처리.
 *
 * Phase 8 추가:
 * - Parent→child value propagation (size delegation, progress, slider, date, icon, label)
 * - Column layout (rearrangeShapesForColumn)
 * - Text auto-height (measureSpecTextMinHeight)
 * - Accent override (withAccentOverride)
 * - Phantom indicator offset (padding/align-items)
 * - Disabled opacity, focus ring, text wrapping props
 *
 * PixiJS 의존성 없음. element.props + layout + theme + elementsMap에서 구축.
 */

import type { Element } from "../../../../types/core/store.types";
import type { SkiaNodeData } from "./nodeRendererTypes";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import {
  normalizeBreadcrumbRspSizeKey,
  type ComponentState,
} from "@composition/specs";
import { getSpecForTag } from "../sprites/tagSpecMap";
import { specShapesToSkia } from "./specShapeConverter";
import {
  withAccentOverride,
  type TintPreset,
} from "../../../../utils/theme/tintToSkiaColors";
import { getParentTagsForChild } from "../../../utils/propagationRegistry";
import { getNecessityIndicatorSuffix } from "@composition/shared/components";
import { formatProgressValue } from "../layout/engines/implicitStyles";
import {
  PHANTOM_INDICATOR_CONFIGS,
  parseLineHeight,
} from "../layout/engines/utils";
import {
  parseCSSSize,
  cssColorToHex,
  colorIntToFloat32,
  parseTextShadow,
  parseTextDecoration,
  parseDecorationColor,
} from "../sprites/styleConverter";
import {
  rearrangeShapesForColumn,
  measureSpecTextMinHeight,
  normalizeMiddleBaselineTextLineHeight,
} from "./specBuildHelpers";
import { findAncestorByTag } from "./ancestorLookup";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpecBuildInput {
  element: Element;
  layout: ComputedLayout | undefined;
  theme: "light" | "dark";
  /** childrenMap에서 조회한 자식 Element 목록 */
  childElements?: Element[];
  /** 부모 체인 조회용 (Phase 8) */
  elementsMap: Map<string, Element>;
  /** 형제 조회용 — resolveBreadcrumbItemContext, resolveToggleGroupPosition */
  childrenMap?: Map<string, Element[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTAINER_DIMENSION_TAGS = new Set([
  "Tag",
  "Breadcrumbs",
  "Tabs",
  "TabList",
  "Tab",
  "Toast",
  "ProgressBar",
  "ProgressBarTrack",
  "Meter",
  "MeterTrack",
  "TextField",
  "TextArea",
  "Input",
  "Select",
  "SelectTrigger",
  "ComboBox",
  "SearchField",
  "NumberField",
  "GridList",
  "Image",
  "Slider",
  "SliderTrack",
  "ListBox",
  "ColorField",
  "ColorSlider",
  "DateSegment",
  "Skeleton",
  "Switcher",
]);

// spec.render.shapes()가 _hasChildren 분기를 갖는 컨테이너.
// 자식 변경 시 부모 Skia 노드 재빌드 필요 (StoreRenderBridge.incrementalSync 참조).
export const CHILD_COMPOSITION_EXCLUDE_TAGS = new Set([
  "Breadcrumbs",
  "ButtonGroup",
  "Calendar",
  "Card",
  "CheckboxGroup",
  "ColorPicker",
  "ComboBox",
  "Dialog",
  "Disclosure",
  "DisclosureGroup",
  "Form",
  "GridList",
  "ListBox",
  "Menu",
  "Popover",
  "RadioGroup",
  "Section",
  "Select",
  "TabPanel",
  "TabPanels",
  "Table",
  "Tabs",
  "TagGroup",
  "ToggleButtonGroup",
  "Toolbar",
  "Tooltip",
  "Tree",
]);

const NOWRAP_PARENTS = new Set([
  "Checkbox",
  "CheckBox",
  "CheckboxGroup",
  "Radio",
  "RadioGroup",
  "Switch",
  "Toggle",
  "ProgressBar",
  "Meter",
  "Slider",
]);

const FORM_INHERITANCE_TAGS = new Set([
  "TextField",
  "NumberField",
  "SearchField",
  "ColorField",
]);

const DATE_INPUT_PARENT_TAGS = new Set([
  "DateField",
  "TimeField",
  "DatePicker",
  "DateRangePicker",
]);

// ---------------------------------------------------------------------------
// Parent Lookup Helpers (pure functions — no hooks)
// ---------------------------------------------------------------------------

function getProps(element: Element): Record<string, unknown> {
  return (element.props ?? {}) as Record<string, unknown>;
}

/** Registry 기반 부모 size delegation (0-3 level 조상 탐색) */
function resolveParentDelegatedSize(
  element: Element,
  elementsMap: Map<string, Element>,
): string | null {
  if (element.tag === "Breadcrumb" && element.parent_id) {
    const parent = elementsMap.get(element.parent_id);
    if (parent?.tag === "Breadcrumbs") {
      return (getProps(parent).size as string) ?? "M";
    }
  }

  const delegationParents = getParentTagsForChild(element.tag);
  if (!delegationParents || !element.parent_id) return null;

  let currentId: string | null | undefined = element.parent_id;
  for (let depth = 0; depth < 3 && currentId; depth++) {
    const ancestor = elementsMap.get(currentId);
    if (!ancestor) break;
    if (delegationParents.has(ancestor.tag.toLowerCase())) {
      return (getProps(ancestor).size as string) ?? null;
    }
    currentId = ancestor.parent_id;
  }
  return null;
}

/** Breadcrumb → 부모 Breadcrumbs의 구분자·마지막 여부·비활성 */
function resolveBreadcrumbItemContext(
  element: Element,
  elementsMap: Map<string, Element>,
  childrenMap?: Map<string, Element[]>,
): {
  _isLast: boolean;
  _separator: string;
  _parentIsDisabled: boolean;
} | null {
  if (element.tag !== "Breadcrumb" || !element.parent_id) return null;
  const parent = elementsMap.get(element.parent_id);
  if (!parent || parent.tag !== "Breadcrumbs") return null;

  const pp = getProps(parent);
  // childrenMap이 있으면 O(siblings)로 조회, 없으면 fallback O(n)
  const rawSiblings = childrenMap?.get(parent.id);
  const siblings = rawSiblings
    ? rawSiblings.filter((el) => el.tag === "Breadcrumb")
    : (() => {
        const result: Element[] = [];
        for (const el of elementsMap.values()) {
          if (el.parent_id === parent.id && el.tag === "Breadcrumb") {
            result.push(el);
          }
        }
        return result;
      })();
  siblings.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
  const idx = siblings.findIndex((s) => s.id === element.id);
  if (idx === -1) return null;

  return {
    _isLast: idx === siblings.length - 1,
    _separator: String(pp.separator ?? "›"),
    _parentIsDisabled: Boolean(pp.isDisabled),
  };
}

/** ToggleButton group position */
function resolveToggleGroupPosition(
  element: Element,
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, Element[]> | null,
): {
  orientation: string;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
} | null {
  if (element.tag !== "ToggleButton" || !element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent || parent.tag !== "ToggleButtonGroup") return null;

  const orientation = (getProps(parent).orientation as string) || "horizontal";

  const siblings = childrenMap?.get(parent.id);
  if (!siblings || siblings.length === 0) return null;

  const sorted = [...siblings].sort(
    (a, b) => (a.order_num ?? 0) - (b.order_num ?? 0),
  );
  const index = sorted.findIndex((s) => s.id === element.id);
  if (index === -1) return null;

  return {
    orientation,
    isFirst: index === 0,
    isLast: index === sorted.length - 1,
    isOnly: sorted.length === 1,
  };
}

/** DateInput parent tag/granularity/hourCycle/locale */
function resolveDateInputParent(
  element: Element,
  elementsMap: Map<string, Element>,
): Record<string, unknown> | null {
  if (element.tag !== "DateInput" || !element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent || !DATE_INPUT_PARENT_TAGS.has(parent.tag)) return null;

  const pp = getProps(parent);
  const result: Record<string, unknown> = { _parentTag: parent.tag };
  if (pp.granularity != null) result._granularity = pp.granularity;
  if (pp.hourCycle != null) result._hourCycle = pp.hourCycle;
  if (pp.locale != null) result._locale = pp.locale;
  return result;
}

/** Label necessity indicator from parent field */
function resolveLabelNecessity(
  element: Element,
  elementsMap: Map<string, Element>,
): { indicator: string; isRequired: boolean } | null {
  if (element.tag !== "Label" || !element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent) return null;

  const pp = getProps(parent);
  const indicator = pp.necessityIndicator as string | undefined;
  if (!indicator) return null;

  return { indicator, isRequired: Boolean(pp.isRequired) };
}

/** Label alignment from Form ancestor chain */
function resolveLabelAlignment(
  element: Element,
  elementsMap: Map<string, Element>,
): string | null {
  if (element.tag !== "Label" || !element.parent_id) return null;

  // Walk from parent → ancestors looking for Form
  let currentId: string | null | undefined = element.parent_id;
  while (currentId) {
    const ancestor = elementsMap.get(currentId);
    if (!ancestor) break;

    if (ancestor.tag === "Form" || FORM_INHERITANCE_TAGS.has(ancestor.tag)) {
      const pp = getProps(ancestor);
      if (pp.labelPosition === "side" && pp.labelAlign) {
        return pp.labelAlign as string;
      }
    }

    currentId = ancestor.parent_id;
  }
  return null;
}

/** ProgressBar/Meter → Track/Value value propagation */
function resolveProgressProps(
  element: Element,
  elementsMap: Map<string, Element>,
): Record<string, unknown> | null {
  const isTrack =
    element.tag === "ProgressBarTrack" || element.tag === "MeterTrack";
  const isValue =
    element.tag === "ProgressBarValue" || element.tag === "MeterValue";
  if (!isTrack && !isValue) return null;
  if (!element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent) return null;

  const pp = getProps(parent);
  const rawVal = (pp.value as number) ?? 0;
  const minV = (pp.minValue as number) ?? 0;
  const maxV = (pp.maxValue as number) ?? 100;
  const normalizedValue =
    maxV > minV
      ? Math.max(0, Math.min(100, ((rawVal - minV) / (maxV - minV)) * 100))
      : 0;

  if (isTrack) {
    return {
      value: normalizedValue,
      isIndeterminate: Boolean(pp.isIndeterminate),
      variant: (pp.variant as string) ?? undefined,
      size: (pp.size as string) ?? undefined,
    };
  }

  // isValue
  const showValueLabel = pp.showValueLabel !== false;
  if (!showValueLabel) return null;

  const valueLabel = pp.valueLabel as string | undefined;
  const formatted =
    valueLabel && valueLabel.length > 0
      ? valueLabel
      : formatProgressValue(
          rawVal,
          minV,
          maxV,
          pp.formatOptions && typeof pp.formatOptions === "object"
            ? (pp.formatOptions as Record<string, unknown>)
            : null,
        );

  return {
    children: formatted,
    size: (pp.size as string) ?? undefined,
    _clearFontSize: true, // signal to clear fontSize from style
  };
}

/** Slider → SliderTrack value propagation */
function resolveSliderProps(
  element: Element,
  elementsMap: Map<string, Element>,
): Record<string, unknown> | null {
  if (element.tag !== "SliderTrack" || !element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent) return null;

  const pp = getProps(parent);
  return {
    value: pp.value ?? 50,
    minValue: (pp.minValue as number) ?? 0,
    maxValue: (pp.maxValue as number) ?? 100,
    variant: (pp.variant as string) ?? "default",
  };
}

/** SelectIcon/ComboBoxTrigger → parent/grandparent iconName */
function resolveIconDelegation(
  element: Element,
  elementsMap: Map<string, Element>,
): string | null {
  if (element.tag !== "SelectIcon" && element.tag !== "ComboBoxTrigger")
    return null;
  if (!element.parent_id) return null;

  const parent = elementsMap.get(element.parent_id);
  if (!parent) return null;

  const parentIcon = getProps(parent).iconName as string | undefined;
  if (parentIcon) return parentIcon;

  // Grandparent fallback (SelectIcon → SelectTrigger → Select)
  if (parent.parent_id) {
    const gp = elementsMap.get(parent.parent_id);
    if (gp) {
      const gpIcon = getProps(gp).iconName as string | undefined;
      if (gpIcon) return gpIcon;
    }
  }
  return null;
}

/** TagGroup allowsRemoving → Tag child */
function resolveTagGroupAllowsRemoving(
  element: Element,
  elementsMap: Map<string, Element>,
): boolean {
  if (element.tag !== "Tag" || !element.parent_id) return false;

  const tagList = elementsMap.get(element.parent_id);
  if (!tagList?.parent_id) return false;

  const ancestor =
    tagList.tag === "TagList"
      ? elementsMap.get(tagList.parent_id)
      : tagList.tag === "TagGroup"
        ? tagList
        : null;
  if (!ancestor || ancestor.tag !== "TagGroup") return false;

  return Boolean(getProps(ancestor).allowsRemoving);
}

/** Label in nowrap parent detection */
function isLabelInNowrapParent(
  element: Element,
  elementsMap: Map<string, Element>,
): boolean {
  if (element.tag !== "Label" || !element.parent_id) return false;
  const parent = elementsMap.get(element.parent_id);
  if (!parent) return false;
  return NOWRAP_PARENTS.has(parent.tag);
}

/** Accent color from element or ancestor chain */
function resolveAccentColor(
  element: Element,
  elementsMap: Map<string, Element>,
): TintPreset | undefined {
  const elementAccent = getProps(element).accentColor as TintPreset | undefined;
  if (elementAccent) return elementAccent;

  let pid = element.parent_id;
  while (pid) {
    const p = elementsMap.get(pid);
    if (!p) break;
    const ac = getProps(p).accentColor as TintPreset | undefined;
    if (ac) return ac;
    pid = p.parent_id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Main Builder
// ---------------------------------------------------------------------------

/**
 * Spec 기반 컴포넌트의 SkiaNodeData를 생성 (Phase 8 — 전체 기능).
 *
 * 1. TAG_SPEC_MAP에서 ComponentSpec 조회
 * 2. Parent→child value propagation
 * 3. spec.render.shapes() 호출
 * 4. Column layout / text auto-height 보정
 * 5. Accent override + specShapesToSkia() 변환
 * 6. Phantom indicator offset
 * 7. Disabled opacity / focus ring
 */
export function buildSpecNodeData(input: SpecBuildInput): SkiaNodeData | null {
  const { element, layout, theme, childElements, elementsMap } = input;
  const tag = element.tag;

  const spec = getSpecForTag(tag);
  if (!spec) return null;

  const w = layout?.width ?? 0;
  const h = layout?.height ?? 0;

  // 엔진 미확정 + 크기 없음 → 렌더링 보류
  if (w <= 0 && h <= 0) return null;

  // ---------- variant / size spec 해석 ----------
  const props = getProps(element);
  const style = (props.style || {}) as Record<string, unknown>;

  // Parent-delegated size
  const delegatedSize = resolveParentDelegatedSize(element, elementsMap);
  const rawSize = (props.size as string) ?? delegatedSize ?? spec.defaultSize;
  const size =
    element.tag === "Breadcrumb"
      ? normalizeBreadcrumbRspSizeKey(rawSize)
      : rawSize;
  const sizeSpec = spec.sizes[size] ?? spec.sizes[spec.defaultSize];
  if (!sizeSpec) return null;

  // ---------- flexDirection → column detection ----------
  const flexDir = (style.flexDirection as string) || "";
  const isColumn = flexDir === "column" || flexDir === "column-reverse";

  // ---------- specProps 준비 ----------
  let specProps: Record<string, unknown> = { ...props };

  // Size injection — Breadcrumb은 항상 RSP 키 S|M|L (Skia shapes·패딩·typography 토큰 정합)
  if (element.tag === "Breadcrumb") {
    specProps = { ...specProps, size };
  } else if (delegatedSize && !props.size) {
    specProps = { ...specProps, size: delegatedSize };
  }

  // ToggleButton group position
  const togglePos = resolveToggleGroupPosition(
    element,
    elementsMap,
    input.childrenMap ?? null,
  );
  if (togglePos) {
    specProps = { ...specProps, _groupPosition: togglePos };
  }

  // DateInput parent delegation
  const dateProps = resolveDateInputParent(element, elementsMap);
  if (dateProps) {
    specProps = { ...specProps, ...dateProps };
  }

  const breadcrumbCtx = resolveBreadcrumbItemContext(
    element,
    elementsMap,
    input.childrenMap,
  );
  if (breadcrumbCtx) {
    specProps = {
      ...specProps,
      _isLast: breadcrumbCtx._isLast,
      _separator: breadcrumbCtx._separator,
    };
  }

  // Label necessity indicator
  const necessity = resolveLabelNecessity(element, elementsMap);
  if (necessity) {
    const originalText =
      (specProps.children as string) || (specProps.label as string) || "";
    const indicatorText = getNecessityIndicatorSuffix(
      necessity.indicator,
      necessity.isRequired,
    );
    if (indicatorText) {
      specProps = {
        ...specProps,
        children: originalText + indicatorText,
        _necessityIndicator: necessity.indicator,
        _isRequired: necessity.isRequired,
      };
    }
  }

  // Label alignment from Form ancestor
  const labelAlign = resolveLabelAlignment(element, elementsMap);
  if (labelAlign) {
    const existingStyle = (specProps.style || {}) as Record<string, unknown>;
    specProps = {
      ...specProps,
      style: {
        ...existingStyle,
        textAlign: existingStyle.textAlign ?? labelAlign,
      },
    };
  }

  // ProgressBar/Meter value propagation
  const progressProps = resolveProgressProps(element, elementsMap);
  if (progressProps) {
    const clearFontSize = progressProps._clearFontSize;
    const { _clearFontSize: _, ...rest } = progressProps;
    specProps = {
      ...specProps,
      ...Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      ),
      ...(specProps.value != null && !clearFontSize
        ? { value: specProps.value }
        : {}),
    };

    if (clearFontSize) {
      const existingStyle = (specProps.style || {}) as Record<string, unknown>;
      specProps = {
        ...specProps,
        style: { ...existingStyle, fontSize: undefined },
      };
    }
  }

  // Slider value propagation
  const sliderProps = resolveSliderProps(element, elementsMap);
  if (sliderProps) {
    specProps = { ...specProps, ...sliderProps };
  }

  // SelectIcon/ComboBoxTrigger icon delegation
  const delegatedIcon = resolveIconDelegation(element, elementsMap);
  if (delegatedIcon && !specProps.iconName) {
    specProps = { ...specProps, iconName: delegatedIcon };
  }

  // TagGroup allowsRemoving
  if (resolveTagGroupAllowsRemoving(element, elementsMap)) {
    specProps = { ...specProps, allowsRemoving: true };
  }

  // Tab/TabList: 조상 Tabs 1회 조회 → _isSelected, _showIndicator, orientation 주입
  if (element.tag === "Tab" || element.tag === "TabList") {
    const tabsAncestor = element.parent_id
      ? findAncestorByTag(element, "Tabs", elementsMap, 3)
      : undefined;

    if (tabsAncestor && element.tag === "Tab") {
      const ap = getProps(tabsAncestor);
      // _isSelected
      const tabId = getProps(element).tabId as string | undefined;
      if (tabId) {
        const selectedKey =
          (ap.selectedKey as string | undefined) ??
          (ap.defaultSelectedKey as string | undefined);
        specProps = {
          ...specProps,
          _isSelected: selectedKey != null ? selectedKey === tabId : false,
        };
      }
      // _showIndicator
      specProps = { ...specProps, _showIndicator: ap.showIndicator !== false };
    }

    // orientation (Tab + TabList 모두)
    if (tabsAncestor && !specProps.orientation) {
      specProps = {
        ...specProps,
        orientation:
          (getProps(tabsAncestor).orientation as string) ?? "horizontal",
      };
    }
  }

  // _hasChildren injection
  if (!CHILD_COMPOSITION_EXCLUDE_TAGS.has(tag)) {
    if (childElements && childElements.length > 0) {
      specProps = { ...specProps, _hasChildren: true };
    }
  }

  // Container dimension injection
  if (CONTAINER_DIMENSION_TAGS.has(tag)) {
    specProps = {
      ...specProps,
      _containerWidth: w,
      _containerHeight: h,
    };
  }

  // ---------- component state ----------
  // Breadcrumb 마지막 항목: Preview CSS와 동일 — isDisabled·부모 isDisabled와 무관하게 비활성 opacity/톤 미적용
  const componentState: ComponentState = (() => {
    if (breadcrumbCtx?._isLast) return "default";
    if (specProps.isDisabled || specProps.disabled) return "disabled";
    if (breadcrumbCtx?._parentIsDisabled) return "disabled";
    return "default";
  })();

  // ---------- width/height injection ----------
  let specHeight = h;
  if (w > 0 || h > 0) {
    const existingStyle = (specProps.style || {}) as Record<string, unknown>;
    const existingW = existingStyle.width;
    const resolvedWidth =
      typeof existingW === "number" ? existingW : w > 0 ? w : undefined;
    specProps = {
      ...specProps,
      style: {
        ...existingStyle,
        width: resolvedWidth,
        height: existingStyle.height ?? (h > 0 ? h : undefined),
      },
    };
  }

  // ---------- shapes 생성 ----------
  const shapes = spec.render.shapes(specProps, sizeSpec, componentState);

  normalizeMiddleBaselineTextLineHeight(
    shapes,
    sizeSpec as unknown as Record<string, unknown>,
  );

  // ---------- Column layout ----------
  if (isColumn) {
    rearrangeShapesForColumn(shapes, w, sizeSpec.gap ?? 8);
  }

  // ---------- Text auto-height ----------
  const hasExplicitHeight =
    style.height !== undefined && style.height !== "auto";
  if (!hasExplicitHeight && w > 0) {
    const textMinHeight = measureSpecTextMinHeight(
      shapes,
      w,
      sizeSpec as unknown as Record<string, unknown>,
      style.whiteSpace as string | undefined,
      style.wordBreak as string | undefined,
      style.overflowWrap as string | undefined,
    );
    if (textMinHeight !== undefined && textMinHeight > specHeight) {
      specHeight = textMinHeight;
    }
  }

  // ---------- Accent override + specShapesToSkia ----------
  const resolvedAccent = resolveAccentColor(element, elementsMap);
  const specNode = withAccentOverride(resolvedAccent, () =>
    specShapesToSkia(shapes, theme, w, specHeight, element.id),
  );

  // ---------- Inline CSS border overlay ----------
  applyInlineBorderOverlay(specNode, style);

  // ---------- Phantom indicator offset ----------
  applyPhantomIndicatorOffset(specNode, tag, size, style, specHeight);

  // ---------- Disabled opacity ----------
  if (componentState === "disabled") {
    const opacityVal =
      (spec.states?.disabled?.opacity as number | undefined) ?? 0.38;
    specNode.effects = [
      ...(specNode.effects ?? []),
      { type: "opacity" as const, value: opacityVal },
    ];
  }

  // Focus ring: componentState가 focusVisible/focused를 지원하게 되면 활성화
  // 현재 componentState는 "default" | "disabled"만 가능

  // ---------- Text style overrides (ADR-057 Phase A/B: style → child.text) ----------
  // 기존 whiteSpace-only override를 13개 필드로 일반화.
  // Phase A (Layout 영향 6): whiteSpace, wordBreak, overflowWrap, lineHeight, textIndent, clipText
  // Phase B (Paint 영향 7): textDecoration(+style/color), textOverflow, wordSpacing,
  //                        fontVariant, fontStretch, textShadow, verticalAlign
  // Tag/Badge 기본 nowrap + Label-in-nowrap-parent 특수 케이스 유지.
  if (specNode.children) {
    const labelNowrap = isLabelInNowrapParent(element, elementsMap);
    const isNowrapTag = tag === "Tag" || tag === "Badge";
    const hasOverflowClip =
      style.overflow === "hidden" || style.overflow === "clip";

    for (const child of specNode.children) {
      if (child.type !== "text" || !child.text) continue;

      // ===== Phase A — Layout 영향 =====

      // 1. whiteSpace — style 우선, 없으면 Tag/Badge/Label-in-nowrap-parent 기본값
      const effectiveWhiteSpace =
        (style.whiteSpace as string) ??
        (labelNowrap || isNowrapTag ? "nowrap" : undefined);
      if (effectiveWhiteSpace) {
        child.text.whiteSpace =
          effectiveWhiteSpace as typeof child.text.whiteSpace;
      }

      // 2. wordBreak
      if (style.wordBreak) {
        child.text.wordBreak = style.wordBreak as typeof child.text.wordBreak;
      }

      // 3. overflowWrap
      if (style.overflowWrap) {
        child.text.overflowWrap =
          style.overflowWrap as typeof child.text.overflowWrap;
      }

      // 4. lineHeight — style.lineHeight 명시 시 spec 기본값 override
      if (style.lineHeight != null && style.lineHeight !== "normal") {
        const parsed = parseLineHeight(style, child.text.fontSize);
        if (parsed != null && parsed > 0) {
          child.text.lineHeight = parsed;
        }
      }

      // 5. textIndent
      if (style.textIndent != null) {
        child.text.textIndent = parseCSSSize(
          style.textIndent as string | number,
          undefined,
          0,
        );
      }

      // 6. clipText — style.overflow: hidden | clip 파생
      if (hasOverflowClip) {
        child.text.clipText = true;
      }

      // ===== Phase B — Paint 영향 =====

      // 7. textDecoration — style 풀셋(underline/overline/line-through 조합) override
      if (style.textDecoration != null && style.textDecoration !== "none") {
        const mask = parseTextDecoration(style.textDecoration as string);
        if (mask > 0) {
          child.text.decoration = mask;
        }
      }
      // 7a. decorationStyle
      if (style.textDecorationStyle) {
        child.text.decorationStyle =
          style.textDecorationStyle as typeof child.text.decorationStyle;
      }
      // 7b. decorationColor
      if (style.textDecorationColor) {
        const dc = parseDecorationColor(style.textDecorationColor as string);
        if (dc) child.text.decorationColor = dc;
      }

      // 8. textOverflow
      if (style.textOverflow) {
        child.text.textOverflow =
          style.textOverflow as typeof child.text.textOverflow;
      }

      // 9. wordSpacing
      if (style.wordSpacing != null) {
        child.text.wordSpacing = parseCSSSize(
          style.wordSpacing as string | number,
          undefined,
          0,
        );
      }

      // 10. fontVariant (small-caps 등)
      if (style.fontVariant && style.fontVariant !== "normal") {
        child.text.fontVariant = style.fontVariant as string;
      }

      // 11. fontStretch (condensed 등)
      if (style.fontStretch && style.fontStretch !== "normal") {
        child.text.fontStretch = style.fontStretch as string;
      }

      // 12. textShadow — CSS text-shadow → TextShadow[] 배열
      if (style.textShadow && style.textShadow !== "none") {
        const shadows = parseTextShadow(style.textShadow as string);
        if (shadows.length > 0) {
          child.text.textShadows = shadows;
        }
      }

      // 13. verticalAlign
      if (style.verticalAlign) {
        child.text.verticalAlign =
          style.verticalAlign as typeof child.text.verticalAlign;
      }
    }
  }

  // ---------- layout 좌표 적용 ----------
  specNode.x = layout?.x ?? 0;
  specNode.y = layout?.y ?? 0;
  specNode.width = w;
  specNode.height = specHeight;
  specNode.elementId = element.id;

  return specNode;
}

// ---------------------------------------------------------------------------
// Phantom Indicator Offset
// ---------------------------------------------------------------------------

function applyPhantomIndicatorOffset(
  specNode: SkiaNodeData,
  tag: string,
  size: string,
  style: Record<string, unknown>,
  specHeight: number,
): void {
  const tagLower = tag.toLowerCase();
  const indicatorConfig = PHANTOM_INDICATOR_CONFIGS[tagLower];
  if (!indicatorConfig) return;

  const padFallback =
    style.padding !== undefined
      ? parseCSSSize(style.padding as string | number)
      : 0;
  const padTop =
    style.paddingTop !== undefined
      ? parseCSSSize(style.paddingTop as string | number)
      : padFallback;
  const padBottom =
    style.paddingBottom !== undefined
      ? parseCSSSize(style.paddingBottom as string | number)
      : padFallback;
  const padLeft =
    style.paddingLeft !== undefined
      ? parseCSSSize(style.paddingLeft as string | number)
      : padFallback;

  // content area 높이 = border-box - padding
  const contentH = specHeight - padTop - padBottom;

  // align-items 세로 정렬
  const s = (size as "sm" | "md" | "lg") || "md";
  const indicatorH = indicatorConfig.heights[s] ?? indicatorConfig.heights.md;
  const alignItems = style.alignItems as string | undefined;
  let alignOffsetY = 0;
  if (alignItems === "center" && contentH > indicatorH) {
    alignOffsetY = (contentH - indicatorH) / 2;
  } else if (alignItems === "flex-end" && contentH > indicatorH) {
    alignOffsetY = contentH - indicatorH;
  }

  // padding + align-items 합산 오프셋
  specNode.x = (specNode.x ?? 0) + padLeft;
  specNode.y = (specNode.y ?? 0) + padTop + alignOffsetY;
}

// ---------------------------------------------------------------------------
// Inline CSS Border Overlay
// ---------------------------------------------------------------------------

/**
 * 사용자가 스타일 패널에서 설정한 inline CSS border를 spec node 위에 오버레이.
 * Spec shapes는 컴포넌트 기본 외관을 정의하고, inline border는 사용자 커스터마이징.
 */
function applyInlineBorderOverlay(
  specNode: SkiaNodeData,
  style: Record<string, unknown>,
): void {
  const borderWidth = style.borderWidth;
  if (borderWidth == null) return;

  const bw = parseCSSSize(borderWidth as string | number);
  if (bw <= 0) return;

  // Skip fully transparent borders — matches CSS behavior
  const borderColorStr = style.borderColor as string | undefined;
  const normalized = borderColorStr?.trim().toLowerCase();
  if (
    normalized === "transparent" ||
    normalized === "rgba(0,0,0,0)" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "#0000" ||
    normalized === "#00000000"
  ) {
    return;
  }

  // box가 없으면 생성
  if (!specNode.box) {
    specNode.box = {
      fillColor: Float32Array.of(0, 0, 0, 0),
      borderRadius: 0,
    };
  }

  // borderColor
  const borderHex = borderColorStr
    ? cssColorToHex(borderColorStr, 0x808080)
    : 0x808080;
  specNode.box.strokeColor = colorIntToFloat32(borderHex, 1);
  specNode.box.strokeWidth = bw;

  // borderStyle
  const borderStyle = style.borderStyle as string | undefined;
  if (borderStyle && borderStyle !== "solid" && borderStyle !== "none") {
    specNode.box.strokeStyle = borderStyle as "dashed" | "dotted";
  }

  // borderRadius (inline override)
  if (style.borderRadius != null) {
    specNode.box.borderRadius = parseCSSSize(
      style.borderRadius as string | number,
    );
  }
}
