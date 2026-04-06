/**
 * buildTextNodeData — TextSprite SkiaNodeData 빌드 로직 추출 (ADR-100 Phase 6)
 *
 * TextSprite.tsx useMemo (lines 300-507)의 순수 함수 버전.
 * PixiJS 의존성 없음. element.props + layoutMap에서 구축.
 *
 * buildBoxNodeData와 동일한 패턴:
 * - Element + Layout → SkiaNodeData
 * - convertStyle / buildSkiaEffects 재사용
 * - Float32Array 색상, theme-aware 기본값
 */

import type { Element } from "../../../../types/core/store.types";
import type { SkiaNodeData } from "./nodeRendererTypes";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import type { EffectStyle } from "./types";
import {
  convertStyle,
  buildSkiaEffects,
  parseClipPath,
  applyTextTransform,
  applyTransformOrigin,
  parseTransformOrigin,
  parseCSSSize,
  cssColorToAlpha,
} from "../sprites/styleConverter";
import {
  parseZIndex,
  createsStackingContext,
} from "../layout/engines/cssStackingContext";
import { parsePadding } from "../sprites/paddingUtils";
import { skiaFontManager } from "./fontManager";
import { colord } from "colord";
import { hexStringToNumber, lightColors, darkColors } from "@xstudio/specs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TextBuildInput {
  element: Element;
  layout: ComputedLayout | undefined;
  theme: "light" | "dark";
}

// ---------------------------------------------------------------------------
// Text Decoration
// ---------------------------------------------------------------------------

function parseTextDecoration(decoration: string | undefined): number {
  if (!decoration || decoration === "none") return 0;
  const lower = decoration.toLowerCase();
  // CanvasKit bitmask: underline=1, overline=2, lineThrough=4
  return (
    (lower.includes("underline") ? 1 : 0) |
    (lower.includes("overline") ? 2 : 0) |
    (lower.includes("line-through") ? 4 : 0)
  );
}

function parseDecorationColor(
  colorStr: string | undefined,
): Float32Array | undefined {
  if (!colorStr) return undefined;
  const parsed = colord(colorStr);
  if (!parsed.isValid()) return undefined;
  const rgba = parsed.toRgb();
  return Float32Array.of(rgba.r / 255, rgba.g / 255, rgba.b / 255, rgba.a);
}

// ---------------------------------------------------------------------------
// Flex Alignment → Text Alignment
// ---------------------------------------------------------------------------

function resolveFlexAlignment(style: Record<string, unknown> | undefined): {
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
} | null {
  if (!style || style.display !== "flex") return null;

  const dir = (style.flexDirection as string) ?? "row";
  const isRow = dir === "row" || dir === "row-reverse";
  const jc = (style.justifyContent as string) ?? "flex-start";
  const ai = (style.alignItems as string) ?? "stretch";

  const toHAlign = (v: string): "left" | "center" | "right" => {
    if (v === "center") return "center";
    if (v === "flex-end" || v === "end") return "right";
    return "left";
  };

  const toVAlign = (v: string): "top" | "middle" | "bottom" => {
    if (v === "center") return "middle";
    if (v === "flex-end" || v === "end") return "bottom";
    return "top";
  };

  return isRow
    ? { textAlign: toHAlign(jc), verticalAlign: toVAlign(ai) }
    : { textAlign: toHAlign(ai), verticalAlign: toVAlign(jc) };
}

// ---------------------------------------------------------------------------
// Font helpers
// ---------------------------------------------------------------------------

function parseFontWeight(value: unknown): number {
  if (value === undefined || value === null) return 400;
  if (value === "bold") return 700;
  if (value === "normal") return 400;
  const n = parseInt(String(value), 10);
  return isNaN(n) ? 400 : n;
}

function parseFontStyle(value: unknown): number {
  // 0=upright, 1=italic, 2=oblique
  if (value === "italic") return 1;
  if (value === "oblique") return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// Main Builder
// ---------------------------------------------------------------------------

/**
 * TextSprite의 skiaNodeData useMemo 로직을 순수 함수로 추출.
 *
 * TextSprite.tsx lines 300-507의 완전한 이식:
 * - theme-aware 기본 텍스트 색상
 * - flex alignment → text alignment 매핑
 * - textDecoration bitmask + decorationStyle/Color
 * - padding, maxWidth, verticalAlign
 * - whiteSpace, wordBreak, overflowWrap, wordSpacing
 * - textOverflow, clipText, textIndent
 * - fontVariant, fontStretch, textTransform
 * - box (Float32Array fillColor, borderRadius, stroke)
 */
export function buildTextNodeData(input: TextBuildInput): SkiaNodeData | null {
  const { element, layout, theme } = input;

  const style = element.props?.style as Record<string, unknown> | undefined;
  if (!style) return null;

  const converted = convertStyle(
    style as Parameters<typeof convertStyle>[0],
    style.color as string | undefined,
  );
  const { fill, text: textStyle, borderRadius, stroke } = converted;
  const skiaEffects = buildSkiaEffects(
    style as Parameters<typeof buildSkiaEffects>[0],
  );

  // Layout dimensions (layoutMap 우선, 없으면 convertStyle 결과)
  const w = layout?.width ?? converted.transform.width;
  const h = layout?.height ?? converted.transform.height;
  const x = layout?.x ?? converted.transform.x;
  const y = layout?.y ?? converted.transform.y;

  // Visibility — TextSprite는 visible flag로 처리 (null 반환 아님)
  const visible =
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.visibility !== "collapse";

  // ---------- Text content ----------
  const props = element.props as Record<string, unknown> | undefined;
  const rawText = String(
    props?.children || props?.text || props?.label || element.tag,
  );
  const textContent = applyTextTransform(
    rawText,
    style.textTransform as string | undefined,
  );

  // ---------- Text color (theme-aware) ----------
  const effectiveFill = style.color
    ? textStyle.fill
    : hexStringToNumber(
        theme === "dark" ? darkColors.neutral : lightColors.neutral,
      );
  const textColor = Float32Array.of(
    ((effectiveFill >> 16) & 0xff) / 255,
    ((effectiveFill >> 8) & 0xff) / 255,
    (effectiveFill & 0xff) / 255,
    1,
  );

  // ---------- Font properties ----------
  const numericFontWeight = parseFontWeight(textStyle.fontWeight);
  const numericFontStyle = parseFontStyle(textStyle.fontStyle);

  // fontFamilies: split(",") 필수 (canvas-rendering.md 규칙)
  const fontFamilies = [
    skiaFontManager.resolveFamily(textStyle.fontFamily.split(",")[0].trim()),
    "Pretendard",
  ];

  // ---------- Flex alignment → text alignment ----------
  const flexAlignment = resolveFlexAlignment(style);

  // ---------- Padding ----------
  const padding = parsePadding(style as Parameters<typeof parsePadding>[0]);

  // ---------- Text decoration ----------
  const decorationBitmask = parseTextDecoration(
    style.textDecoration as string | undefined,
  );
  const hasDecoration = decorationBitmask !== 0;

  // ---------- z-index / stacking context ----------
  const zIndex = parseZIndex(style.zIndex as string | number | undefined);
  const isStackingCtx = createsStackingContext(style);

  // ---------- Box data (Float32Array) ----------
  const bgAlpha = skiaEffects.effects?.some(
    (e: EffectStyle) => e.type === "opacity",
  )
    ? cssColorToAlpha(style.backgroundColor as string | undefined)
    : fill.alpha;
  const fillColor = Float32Array.of(
    ((fill.color >> 16) & 0xff) / 255,
    ((fill.color >> 8) & 0xff) / 255,
    (fill.color & 0xff) / 255,
    bgAlpha,
  );

  const boxData: SkiaNodeData["box"] = {
    fillColor,
    borderRadius: borderRadius ?? 0,
  };
  if (stroke) {
    boxData.strokeColor = Float32Array.of(
      ((stroke.color >> 16) & 0xff) / 255,
      ((stroke.color >> 8) & 0xff) / 255,
      (stroke.color & 0xff) / 255,
      stroke.alpha ?? 1,
    );
    boxData.strokeWidth = stroke.width;
    if (stroke.style !== "solid" && stroke.style !== "none") {
      boxData.strokeStyle = stroke.style as SkiaNodeData["box"] extends {
        strokeStyle?: infer S;
      }
        ? S
        : never;
    }
  }

  // ---------- CSS transform ----------
  let skiaTransform: Float32Array | undefined;
  if (skiaEffects.transform) {
    const [ox, oy] = parseTransformOrigin(
      style.transformOrigin as string | undefined,
      w,
      h,
    );
    skiaTransform = applyTransformOrigin(skiaEffects.transform, ox, oy);
  }

  // ---------- Clip path ----------
  const clipPath =
    typeof style.clipPath === "string"
      ? parseClipPath(style.clipPath, w, h)
      : undefined;

  // ---------- Assemble SkiaNodeData ----------
  const nodeData: SkiaNodeData = {
    type: "text",
    elementId: element.id,
    x,
    y,
    width: w,
    height: h,
    visible,
    box: boxData,
    text: {
      content: textContent,
      fontFamilies,
      fontSize: textStyle.fontSize,
      fontWeight: numericFontWeight,
      fontStyle: numericFontStyle,
      color: textColor,
      align: flexAlignment?.textAlign ?? textStyle.align,
      letterSpacing: textStyle.letterSpacing,
      // leading > 0이면 명시적 lineHeight (leading=0이면 폰트 기본값)
      ...(textStyle.leading > 0
        ? { lineHeight: textStyle.leading + textStyle.fontSize }
        : {}),
      // textDecoration → CanvasKit bitmask
      ...(hasDecoration
        ? {
            decoration: decorationBitmask,
            ...(style.textDecorationStyle
              ? {
                  decorationStyle: style.textDecorationStyle as
                    | "solid"
                    | "dashed"
                    | "dotted"
                    | "double"
                    | "wavy",
                }
              : {}),
            ...(style.textDecorationColor
              ? (() => {
                  const dc = parseDecorationColor(
                    style.textDecorationColor as string,
                  );
                  return dc ? { decorationColor: dc } : {};
                })()
              : {}),
          }
        : {}),
      paddingLeft: padding.left,
      paddingTop: padding.top,
      maxWidth: w - padding.left - padding.right,
      // verticalAlign
      ...(flexAlignment?.verticalAlign
        ? { verticalAlign: flexAlignment.verticalAlign }
        : style.verticalAlign
          ? {
              verticalAlign: style.verticalAlign as
                | "top"
                | "middle"
                | "bottom"
                | "baseline",
            }
          : {}),
      // whiteSpace
      ...(style.whiteSpace
        ? {
            whiteSpace: style.whiteSpace as
              | "normal"
              | "nowrap"
              | "pre"
              | "pre-wrap"
              | "pre-line",
          }
        : {}),
      // wordBreak
      ...(style.wordBreak
        ? {
            wordBreak: style.wordBreak as "normal" | "break-all" | "keep-all",
          }
        : {}),
      // overflowWrap
      ...(style.overflowWrap
        ? {
            overflowWrap: style.overflowWrap as
              | "normal"
              | "break-word"
              | "anywhere",
          }
        : {}),
      // wordSpacing
      ...(style.wordSpacing != null
        ? {
            wordSpacing: parseCSSSize(
              style.wordSpacing as string | number,
              undefined,
              0,
            ),
          }
        : {}),
      // textOverflow: ellipsis (overflow:hidden + nowrap 조합)
      ...(style.textOverflow
        ? { textOverflow: style.textOverflow as "ellipsis" | "clip" }
        : {}),
      // overflow:hidden|clip → 텍스트 영역 클리핑
      ...(style.overflow === "hidden" || style.overflow === "clip"
        ? { clipText: true }
        : {}),
      // textIndent
      ...(style.textIndent != null
        ? {
            textIndent: parseCSSSize(
              style.textIndent as string | number,
              undefined,
              0,
            ),
          }
        : {}),
      // fontVariant (small-caps 등)
      ...(style.fontVariant && style.fontVariant !== "normal"
        ? { fontVariant: style.fontVariant as string }
        : {}),
      // fontStretch (condensed 등)
      ...(style.fontStretch && style.fontStretch !== "normal"
        ? { fontStretch: style.fontStretch as string }
        : {}),
    },
  };

  // Optional top-level fields
  if (skiaEffects.effects) nodeData.effects = skiaEffects.effects;
  if (skiaEffects.blendMode) nodeData.blendMode = skiaEffects.blendMode;
  if (skiaTransform) nodeData.transform = skiaTransform;
  if (clipPath) nodeData.clipPath = clipPath;
  if (zIndex !== undefined) nodeData.zIndex = zIndex;
  if (isStackingCtx) nodeData.isStackingContext = true;

  return nodeData;
}
