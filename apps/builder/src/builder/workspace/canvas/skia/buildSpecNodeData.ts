/**
 * buildSpecNodeData — Spec 기반 컴포넌트 SkiaNodeData 빌드 (ADR-100 Phase 6)
 *
 * ElementSprite의 Spec→shapes→specShapesToSkia 파이프라인을 순수 함수로 추출.
 * Button, Checkbox, Switch 등 TAG_SPEC_MAP에 등록된 모든 컴포넌트를 처리.
 *
 * PixiJS 의존성 없음. element.props + layout + theme에서 구축.
 */

import type { Element } from "../../../../types/core/store.types";
import type { SkiaNodeData } from "./nodeRendererTypes";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import type { ComponentState } from "@xstudio/specs";
import { getSpecForTag } from "../sprites/tagSpecMap";
import { specShapesToSkia } from "./specShapeConverter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpecBuildInput {
  element: Element;
  layout: ComputedLayout | undefined;
  theme: "light" | "dark";
  /** 부모 체인에서 자식 Element 목록 (childrenMap에서 조회) */
  childElements?: Element[];
}

// ---------------------------------------------------------------------------
// Main Builder
// ---------------------------------------------------------------------------

/**
 * Spec 기반 컴포넌트의 SkiaNodeData를 생성.
 *
 * 1. TAG_SPEC_MAP에서 ComponentSpec 조회
 * 2. variant/size spec 해석
 * 3. spec.render.shapes() 호출
 * 4. specShapesToSkia() 변환
 *
 * TAG_SPEC_MAP에 없는 태그는 null 반환.
 */
export function buildSpecNodeData(input: SpecBuildInput): SkiaNodeData | null {
  const { element, layout, theme, childElements } = input;

  const spec = getSpecForTag(element.tag);
  if (!spec) return null;

  const w = layout?.width ?? 0;
  const h = layout?.height ?? 0;

  // 엔진 미확정 + 크기 없음 → 렌더링 보류
  if (w <= 0 && h <= 0) return null;

  // ---------- variant / size spec 해석 ----------
  const props = (element.props ?? {}) as Record<string, unknown>;
  const variant = (props.variant as string) ?? spec.defaultVariant;
  const size = (props.size as string) ?? spec.defaultSize;

  const variantSpec =
    spec.variants[variant] ?? spec.variants[spec.defaultVariant];
  const sizeSpec = spec.sizes[size] ?? spec.sizes[spec.defaultSize];
  if (!variantSpec || !sizeSpec) return null;

  // ---------- component state ----------
  const componentState: ComponentState = (() => {
    if (props.isDisabled || props.disabled) return "disabled";
    return "default";
  })();

  // ---------- specProps 준비 ----------
  let specProps: Record<string, unknown> = { ...props };

  // width/height 주입 (spec shapes는 숫자 기대)
  const existingStyle = (specProps.style || {}) as Record<string, unknown>;
  specProps = {
    ...specProps,
    style: {
      ...existingStyle,
      width:
        typeof existingStyle.width === "number"
          ? existingStyle.width
          : w > 0
            ? w
            : undefined,
      height: existingStyle.height ?? (h > 0 ? h : undefined),
    },
  };

  // _hasChildren 패턴: 자식이 있으면 spec은 shell만 반환
  if (childElements && childElements.length > 0) {
    specProps = { ...specProps, _hasChildren: true };
  }

  // _containerWidth/_containerHeight 주입
  specProps = {
    ...specProps,
    _containerWidth: w,
    _containerHeight: h,
  };

  // ---------- shapes 생성 ----------
  const shapes = spec.render.shapes(
    specProps,
    variantSpec,
    sizeSpec,
    componentState,
  );

  // ---------- specShapesToSkia 변환 ----------
  const specNode = specShapesToSkia(shapes, theme, w, h, element.id);

  // layout 좌표 적용 (specShapesToSkia는 x=0, y=0으로 생성)
  specNode.x = layout?.x ?? 0;
  specNode.y = layout?.y ?? 0;
  specNode.width = w;
  specNode.height = h;
  specNode.elementId = element.id;

  return specNode;
}
