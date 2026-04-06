/**
 * buildSkiaNodeData — Element→SkiaNodeData 순수 변환 (ADR-100 Phase 6)
 *
 * PixiJS Sprite 컴포넌트 없이 store 데이터에서 직접 SkiaNodeData를 구축한다.
 * 기존 유틸리티(convertStyle, buildSkiaEffects)를 재사용.
 *
 * 지원 범위:
 * - box (div, section 등 컨테이너)
 * - text (Heading, Text, Label 등)
 * - image (Image)
 */

import type { Element } from "../../../../types/core/store.types";
import type { SkiaNodeData } from "./nodeRendererTypes";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import {
  convertStyle,
  buildSkiaEffects,
  parseClipPath,
} from "../sprites/styleConverter";
import {
  parseZIndex,
  createsStackingContext,
} from "../layout/engines/cssStackingContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildContext {
  /** Taffy 레이아웃 결과 */
  layoutMap: Map<string, ComputedLayout>;
  /** 현재 테마 (dark/light) */
  theme: "light" | "dark";
  /** 스크롤 상태 */
  scrollMap?: Map<string, { scrollTop: number; scrollLeft: number }>;
}

// ---------------------------------------------------------------------------
// Main Builder
// ---------------------------------------------------------------------------

/**
 * Element → SkiaNodeData 순수 변환.
 * PixiJS 의존성 없음. store 데이터만으로 렌더 데이터를 구축.
 */
export function buildSkiaNodeData(
  element: Element,
  ctx: BuildContext,
): SkiaNodeData | null {
  const style = element.props?.style as Record<string, unknown> | undefined;
  if (!style) return null;

  // display:none → 렌더 스킵
  if (style.display === "none") return null;
  if (style.visibility === "hidden" || style.visibility === "collapse") {
    return null;
  }

  const layout = ctx.layoutMap.get(element.id);
  const converted = convertStyle(
    style as Parameters<typeof convertStyle>[0],
    style.color as string | undefined,
  );

  const width = layout?.width ?? converted.transform.width;
  const height = layout?.height ?? converted.transform.height;
  const x = layout?.x ?? converted.transform.x;
  const y = layout?.y ?? converted.transform.y;

  const skiaEffects = buildSkiaEffects(
    style as Parameters<typeof buildSkiaEffects>[0],
  );

  const overflow = style.overflow as string | undefined;
  const clipChildren =
    overflow === "hidden" ||
    overflow === "clip" ||
    overflow === "scroll" ||
    overflow === "auto";

  const zIndex = parseZIndex(style as Record<string, unknown>);
  const isStackingContext = createsStackingContext(
    style as Record<string, unknown>,
  );

  // 스크롤 상태
  const scrollState = ctx.scrollMap?.get(element.id);
  const scrollOffset = scrollState
    ? { scrollTop: scrollState.scrollTop, scrollLeft: scrollState.scrollLeft }
    : undefined;

  // clip-path
  const clipPath =
    typeof style.clipPath === "string"
      ? parseClipPath(style.clipPath, width, height)
      : undefined;

  // 기본 SkiaNodeData (box 타입)
  const nodeData: SkiaNodeData = {
    type: "box",
    elementId: element.id,
    x,
    y,
    width,
    height,
    visible: true,
    effects: skiaEffects.effects,
    blendMode: skiaEffects.blendMode,
    transform: skiaEffects.transform,
    clipPath,
    clipChildren,
    scrollOffset,
    zIndex,
    isStackingContext,
    box: {
      fillColor: converted.fill.color,
      fill: converted.fill.gradient ?? undefined,
      borderRadius: converted.borderRadius,
      strokeColor: converted.stroke?.color,
      strokeWidth: converted.stroke?.width,
      strokeStyle: converted.stroke?.style as string | undefined,
    },
  };

  return nodeData;
}

/**
 * 텍스트 요소에 대한 SkiaNodeData 구축.
 */
export function buildTextSkiaNodeData(
  element: Element,
  ctx: BuildContext,
): SkiaNodeData | null {
  const base = buildSkiaNodeData(element, ctx);
  if (!base) return null;

  const style = element.props?.style as Record<string, unknown> | undefined;
  const content =
    (element.props?.children as string) ??
    (element.props?.text as string) ??
    (element.props?.label as string) ??
    "";

  if (!content) return base;

  const converted = convertStyle(
    style as Parameters<typeof convertStyle>[0],
    style?.color as string | undefined,
  );

  base.type = "text";
  base.text = {
    content,
    fontFamilies: [
      (style?.fontFamily as string) ?? "Pretendard",
      "Pretendard",
      "sans-serif",
    ],
    fontSize: parseFloat(String(style?.fontSize ?? "16")),
    fontWeight: parseFontWeight(style?.fontWeight),
    color: converted.fill.color,
    paddingLeft: parseFloat(String(style?.paddingLeft ?? "0")),
    paddingTop: parseFloat(String(style?.paddingTop ?? "0")),
    maxWidth: base.width,
  };

  return base;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFontWeight(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = parseInt(String(value), 10);
  if (!isNaN(n)) return n;
  if (value === "bold") return 700;
  if (value === "normal") return 400;
  return undefined;
}
