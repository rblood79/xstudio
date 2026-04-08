/**
 * Spec-Driven Text Style Extraction
 *
 * Spec shapes에서 TextShape의 font 속성을 추출하여
 * 레이아웃 엔진의 텍스트 폭 측정과 Skia 렌더링의 정합성을 보장한다.
 *
 * 기존 BUTTON_SIZE_CONFIG 등의 하드코딩된 fontSize를 대체하여
 * Spec을 단일 소스(Single Source of Truth)로 사용.
 */

import type { ComponentSpec, TextShape } from "@composition/specs";
import {
  ButtonSpec,
  BadgeSpec,
  ToggleButtonSpec,
  LinkSpec,
  CheckboxSpec,
  RadioSpec,
  SwitchSpec,
  InputSpec,
  BreadcrumbSpec,
  normalizeBreadcrumbRspSizeKey,
  StatusLightSpec,
  SelectValueSpec,
  MenuSpec,
  ProgressBarValueSpec,
  MeterValueSpec,
  SliderOutputSpec,
} from "@composition/specs";

/** Spec shapes에서 추출한 텍스트 스타일 */
export interface SpecTextStyle {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  letterSpacing?: number;
}

/** tag → Spec + 기본 size 매핑 (텍스트 폭 측정이 필요한 inline 컴포넌트만) */
const TEXT_BEARING_SPECS: Record<
  string,
  { spec: ComponentSpec<Record<string, unknown>>; defaultSize: string }
> = {
  button: { spec: ButtonSpec, defaultSize: "md" },
  submitbutton: { spec: ButtonSpec, defaultSize: "md" },
  fancybutton: { spec: ButtonSpec, defaultSize: "md" },
  badge: { spec: BadgeSpec, defaultSize: "sm" },
  tag: { spec: BadgeSpec, defaultSize: "sm" },
  chip: { spec: BadgeSpec, defaultSize: "sm" },
  togglebutton: { spec: ToggleButtonSpec, defaultSize: "md" },
  link: { spec: LinkSpec, defaultSize: "md" },
  a: { spec: LinkSpec, defaultSize: "md" },
  linkbutton: { spec: LinkSpec, defaultSize: "md" },
  checkbox: { spec: CheckboxSpec, defaultSize: "md" },
  radio: { spec: RadioSpec, defaultSize: "md" },
  switch: { spec: SwitchSpec, defaultSize: "md" },
  input: { spec: InputSpec, defaultSize: "sm" },
  /** `breadcrumbs` 태그는 extractSpecTextStyle 내부에서 BreadcrumbSpec으로 처리 */
  breadcrumb: { spec: BreadcrumbSpec, defaultSize: "M" },
  statuslight: { spec: StatusLightSpec, defaultSize: "md" },
  selectvalue: { spec: SelectValueSpec, defaultSize: "md" },
  menu: {
    spec: MenuSpec as ComponentSpec<Record<string, unknown>>,
    defaultSize: "md",
  },
  progressbarvalue: {
    spec: ProgressBarValueSpec as ComponentSpec<Record<string, unknown>>,
    defaultSize: "md",
  },
  metervalue: {
    spec: MeterValueSpec as ComponentSpec<Record<string, unknown>>,
    defaultSize: "md",
  },
  slideroutput: {
    spec: SliderOutputSpec as ComponentSpec<Record<string, unknown>>,
    defaultSize: "md",
  },
};

/**
 * Spec shapes에서 TextShape의 font 속성을 추출한다.
 *
 * Spec의 render.shapes()를 호출하여 실제 렌더링에 사용되는
 * fontSize, fontWeight, fontFamily를 반환한다.
 * 사용자 style override(props.style.fontSize 등)도 Spec 내부에서 반영된다.
 *
 * @param tag - 컴포넌트 태그 (lowercase)
 * @param props - Element props (size, variant, style 포함)
 * @returns TextShape 기반 font 스타일, 또는 null (Spec 미등록 태그)
 */
export function extractSpecTextStyle(
  tag: string,
  props?: Record<string, unknown>,
): SpecTextStyle | null {
  const lower = tag.toLowerCase();
  const mapKey = lower === "breadcrumbs" ? "breadcrumb" : lower;
  const entry = TEXT_BEARING_SPECS[mapKey];
  if (!entry) return null;

  const { spec } = entry;
  const rawSize = (props?.size as string) ?? entry.defaultSize;
  const sizeName =
    mapKey === "breadcrumb" ? normalizeBreadcrumbRspSizeKey(rawSize) : rawSize;
  const variantName = (props?.variant as string) ?? spec.defaultVariant;

  const variant =
    spec.variants[variantName] ?? spec.variants[spec.defaultVariant];
  const size = spec.sizes[sizeName] ?? spec.sizes[spec.defaultSize];
  if (!variant || !size) return null;

  const propsForShapes: Record<string, unknown> =
    lower === "breadcrumbs"
      ? {
          ...props,
          size: sizeName,
          children: "x",
          _isLast: true,
        }
      : mapKey === "breadcrumb"
        ? { ...props, size: sizeName }
        : { ...(props ?? {}) };

  const shapes = spec.render.shapes(propsForShapes, variant, size, "default");

  const textShape = shapes.find(
    (s): s is TextShape & { type: "text" } => s.type === "text",
  );
  if (!textShape) return null;

  const fw = textShape.fontWeight;
  return {
    fontSize: textShape.fontSize,
    fontWeight:
      typeof fw === "number"
        ? fw
        : typeof fw === "string"
          ? parseInt(fw, 10) || 400
          : 400,
    fontFamily: textShape.fontFamily,
    letterSpacing: textShape.letterSpacing,
  };
}
