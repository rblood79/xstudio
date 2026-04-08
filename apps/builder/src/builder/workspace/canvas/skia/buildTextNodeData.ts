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
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import type { SkiaNodeData } from "./nodeRendererTypes";
import type { EffectStyle } from "./types";
import {
  applyTextTransform,
  parseCSSSize,
  cssColorToAlpha,
  colorIntToFloat32,
  parseTextShadow,
} from "../sprites/styleConverter";
import { buildBaseNodeProps } from "./buildBaseNodeProps";
import { parsePadding } from "../sprites/paddingUtils";
import { skiaFontManager } from "./fontManager";
import { colord } from "colord";
import { hexStringToNumber, lightColors, darkColors } from "@composition/specs";

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
// Text Size Presets — TextSpec.sizes의 TokenRef를 resolve한 px 값.
// TextSpec(packages/specs/src/components/Text.spec.ts)과 동기화 유지.
// ---------------------------------------------------------------------------

const TEXT_SIZE_MAP: Record<string, { fontSize: number; lineHeight: number }> =
  {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    md: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    "2xl": { fontSize: 24, lineHeight: 32 },
    "3xl": { fontSize: 30, lineHeight: 36 },
  };

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

  const base = buildBaseNodeProps(element, layout);
  if (!base) return null;

  const {
    converted,
    effects,
    blendMode,
    skiaTransform,
    x,
    y,
    w,
    h,
    visible,
    zIndex,
    isStackingContext,
    clipPath,
    style,
  } = base;
  const { fill, text: textStyle, borderRadius, stroke } = converted;

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
  const textColor = colorIntToFloat32(effectiveFill, 1);

  // ---------- Size preset → fontSize/lineHeight ----------
  const sizePreset = (props?.size as string) ?? "md";
  const sizeConfig = TEXT_SIZE_MAP[sizePreset] ?? TEXT_SIZE_MAP.md;
  // style.fontSize가 명시되어 있으면 style 우선, 없으면 preset 사용
  const effectiveFontSize = textStyle.fontSize || sizeConfig.fontSize;

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

  // ---------- Box data (Float32Array) ----------
  const bgAlpha = effects?.some((e: EffectStyle) => e.type === "opacity")
    ? cssColorToAlpha(style.backgroundColor as string | undefined)
    : fill.alpha;
  const fillColor = colorIntToFloat32(fill.color, bgAlpha);

  const boxData: SkiaNodeData["box"] = {
    fillColor,
    borderRadius: borderRadius ?? 0,
  };
  if (stroke) {
    boxData.strokeColor = colorIntToFloat32(stroke.color, stroke.alpha ?? 1);
    boxData.strokeWidth = stroke.width;
  }

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
      fontSize: effectiveFontSize,
      fontWeight: numericFontWeight,
      fontStyle: numericFontStyle,
      color: textColor,
      align: flexAlignment?.textAlign ?? textStyle.align,
      letterSpacing: textStyle.letterSpacing,
      // lineHeight: style.lineHeight 명시 > leading > size preset > 폰트 기본값
      ...(textStyle.leading > 0
        ? { lineHeight: textStyle.leading + effectiveFontSize }
        : style.lineHeight
          ? {}
          : { lineHeight: sizeConfig.lineHeight }),
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
      paddingBottom: padding.bottom,
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
      // G4: text-shadow
      ...(style.textShadow && style.textShadow !== "none"
        ? (() => {
            const shadows = parseTextShadow(style.textShadow as string);
            return shadows.length > 0 ? { textShadows: shadows } : {};
          })()
        : {}),
    },
  };

  if (effects) nodeData.effects = effects;
  if (blendMode) nodeData.blendMode = blendMode;
  if (skiaTransform) nodeData.transform = skiaTransform;
  if (clipPath) nodeData.clipPath = clipPath;
  if (zIndex !== undefined) nodeData.zIndex = zIndex;
  if (isStackingContext) nodeData.isStackingContext = true;

  return nodeData;
}
