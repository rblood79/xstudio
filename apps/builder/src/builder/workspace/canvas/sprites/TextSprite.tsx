/**
 * Text Sprite
 *
 * 🚀 Phase 10 B1.2: Text, Heading, Label 텍스트 스프라이트
 * 🚀 P7.7: textDecoration (underline, line-through, overline) 지원
 * 🚀 Border-Box v2: border-box 방식 렌더링
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-13 P7.7 - textDecoration 속성 지원
 * @updated 2025-12-15 Border-Box v2 - drawBox 유틸리티 적용
 */

import { useExtend } from "@pixi/react";
import { PIXI_COMPONENTS } from "../pixiSetup";
import { useCallback, useMemo, useRef, useContext, memo } from "react";
import { Graphics as PixiGraphics, TextStyle, Text } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import {
  convertStyle,
  applyTextTransform,
  buildSkiaEffects,
  parseCSSSize,
  type CSSStyle,
} from "./styleConverter";
import { colord } from "colord";
import {
  parseZIndex,
  createsStackingContext,
} from "../layout/engines/cssStackingContext";
import { parsePadding } from "./paddingUtils";
import { drawBox, parseBorderConfig } from "../utils";
import { useSkiaNode } from "../skia/useSkiaNode";
import type { SkiaNodeData } from "../skia/nodeRenderers";
import { skiaFontManager } from "../skia/fontManager";
import { LayoutComputedSizeContext } from "../layoutContext";

// ============================================
// Types
// ============================================

export interface TextSpriteProps {
  element: Element;
  isSelected?: boolean;
}

// ============================================
// P7.7: Text Decoration Types
// ============================================

interface TextDecorationConfig {
  underline: boolean;
  lineThrough: boolean;
  overline: boolean;
}

/**
 * P7.7: CSS textDecoration 파싱
 * @example
 * parseTextDecoration('underline') // { underline: true, lineThrough: false, overline: false }
 * parseTextDecoration('underline line-through') // { underline: true, lineThrough: true, overline: false }
 */
function parseTextDecoration(
  decoration: string | undefined,
): TextDecorationConfig {
  if (!decoration || decoration === "none") {
    return { underline: false, lineThrough: false, overline: false };
  }

  const lower = decoration.toLowerCase();
  return {
    underline: lower.includes("underline"),
    lineThrough: lower.includes("line-through"),
    overline: lower.includes("overline"),
  };
}

// ============================================
// Component
// ============================================

export const TextSprite = memo(function TextSprite({
  element,
}: TextSpriteProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const { fill, text: textStyle, borderRadius } = converted;
  const computedContainerSize = useContext(LayoutComputedSizeContext);

  // BoxSprite 패턴: Yoga 계산 크기를 우선 사용 (기본값 100×100 대신)
  const transform = useMemo(() => {
    if (!computedContainerSize) return converted.transform;

    const styleWidth = style?.width;
    const styleHeight = style?.height;
    const usesLayoutWidth =
      styleWidth === undefined ||
      styleWidth === "auto" ||
      styleWidth === "fit-content" ||
      styleWidth === "min-content" ||
      styleWidth === "max-content" ||
      (typeof styleWidth === "string" && styleWidth.endsWith("%"));
    const usesLayoutHeight =
      styleHeight === undefined ||
      styleHeight === "auto" ||
      styleHeight === "fit-content" ||
      styleHeight === "min-content" ||
      styleHeight === "max-content" ||
      (typeof styleHeight === "string" && styleHeight.endsWith("%"));

    if (!usesLayoutWidth && !usesLayoutHeight) return converted.transform;

    return {
      ...converted.transform,
      width: usesLayoutWidth
        ? computedContainerSize.width
        : converted.transform.width,
      height: usesLayoutHeight
        ? computedContainerSize.height
        : converted.transform.height,
    };
  }, [computedContainerSize, converted.transform, style?.width, style?.height]);

  // display: flex일 때 flex 속성 → 텍스트 정렬 매핑
  // Text는 leaf 요소이므로 justify-content/align-items를 텍스트 수평/수직 정렬로 변환
  const flexAlignment = useMemo(() => {
    if (style?.display !== "flex") return null;

    const dir = (style?.flexDirection as string) ?? "row";
    const isRow = dir === "row" || dir === "row-reverse";
    const jc = (style?.justifyContent as string) ?? "flex-start";
    const ai = (style?.alignItems as string) ?? "stretch";

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
  }, [
    style?.display,
    style?.flexDirection,
    style?.justifyContent,
    style?.alignItems,
  ]);

  // Border-Box v2: parseBorderConfig로 border 정보 추출
  const borderConfig = useMemo(() => parseBorderConfig(style), [style]);

  // Text content with P7.6 textTransform applied
  const textContent = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    const rawText = String(
      props?.children || props?.text || props?.label || element.tag,
    );
    // P7.6: Apply textTransform (uppercase, lowercase, capitalize)
    return applyTextTransform(rawText, style?.textTransform);
  }, [element.props, element.tag, style?.textTransform]);

  // P7.7: Parse textDecoration
  const textDecoration = useMemo(
    () => parseTextDecoration(style?.textDecoration),
    [style?.textDecoration],
  );
  const hasDecoration =
    textDecoration.underline ||
    textDecoration.lineThrough ||
    textDecoration.overline;

  // Text ref for measuring bounds
  const textRef = useRef<Text | null>(null);

  // PixiJS TextStyle (P7.2-P7.4 extended)
  const pixiTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight as "normal" | "bold",
        fontStyle: textStyle.fontStyle, // P7.2: italic, oblique
        fill: textStyle.fill,
        align: flexAlignment?.textAlign ?? textStyle.align,
        letterSpacing: textStyle.letterSpacing, // P7.3
        leading: textStyle.leading, // P7.4: line height
        wordWrap: textStyle.wordWrap,
        wordWrapWidth: transform.width,
      }),
    [textStyle, transform.width, flexAlignment],
  );

  // P7.7: Draw text decoration lines
  const drawTextDecoration = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (!hasDecoration || !textRef.current) return;

      const textBounds = textRef.current.getBounds();
      const textWidth = textBounds.width;
      const textHeight = textBounds.height;
      const fontSize = textStyle.fontSize;
      const lineColor = textStyle.fill; // Use text color
      const lineThickness = Math.max(1, Math.floor(fontSize / 12)); // Proportional to font size

      g.setStrokeStyle({ width: lineThickness, color: lineColor, alpha: 1 });

      // Underline: positioned at baseline (approximately 85% of text height)
      if (textDecoration.underline) {
        const y = textHeight * 0.85;
        g.moveTo(0, y);
        g.lineTo(textWidth, y);
        g.stroke();
      }

      // Line-through: positioned at middle of text
      if (textDecoration.lineThrough) {
        const y = textHeight * 0.45;
        g.moveTo(0, y);
        g.lineTo(textWidth, y);
        g.stroke();
      }

      // Overline: positioned at top
      if (textDecoration.overline) {
        const y = lineThickness;
        g.moveTo(0, y);
        g.lineTo(textWidth, y);
        g.stroke();
      }
    },
    [hasDecoration, textStyle.fontSize, textStyle.fill, textDecoration],
  );

  // Border-Box v2: drawBox 유틸리티 사용
  const effectiveBorderRadius =
    typeof borderRadius === "number" ? borderRadius : (borderRadius?.[0] ?? 0);
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      const hasBg =
        style?.backgroundColor && style.backgroundColor !== "transparent";
      const hasVisual = hasBg || borderConfig || effectiveBorderRadius;

      if (hasVisual) {
        drawBox(g, {
          width: transform.width,
          height: transform.height,
          backgroundColor: fill.color,
          backgroundAlpha: fill.alpha,
          borderRadius: effectiveBorderRadius,
          border: borderConfig,
        });
      } else {
        // 배경이 없어도 투명 히트 영역을 그려서 클릭 선택이 가능하도록 함
        g.clear();
        g.rect(0, 0, transform.width, transform.height);
        g.fill({ color: 0xffffff, alpha: 0.001 });
      }
    },
    [style, transform, fill, effectiveBorderRadius, borderConfig],
  );

  // Pencil-style: 선택은 BuilderCanvas 중앙 핸들러가 처리
  const handleClick = useCallback(() => {
    // no-op: selection handled by central handler
  }, []);

  // Padding (paddingUtils 사용)
  const padding = useMemo(() => parsePadding(style), [style]);

  // Ref callback to capture Text instance
  const textRefCallback = useCallback((text: Text | null) => {
    textRef.current = text;
  }, []);

  // Phase 6: Interaction 속성
  const isPointerEventsNone = style?.pointerEvents === "none";
  const pixiCursor = style?.cursor ?? "default";

  // Skia effects (opacity, boxShadow, filter, backdropFilter, mixBlendMode)
  const skiaEffects = useMemo(() => buildSkiaEffects(style), [style]);

  // Phase 5: Skia 렌더 데이터 부착
  const skiaNodeData = useMemo(() => {
    const r = ((textStyle.fill >> 16) & 0xff) / 255;
    const g = ((textStyle.fill >> 8) & 0xff) / 255;
    const b = (textStyle.fill & 0xff) / 255;

    // CSS fontWeight string → numeric (100–900)
    const fw = textStyle.fontWeight;
    const numericFontWeight =
      fw === "normal" ? 400 : fw === "bold" ? 700 : parseInt(fw, 10) || 400;

    // CSS fontStyle → numeric (0=upright, 1=italic, 2=oblique)
    const numericFontStyle =
      textStyle.fontStyle === "italic"
        ? 1
        : textStyle.fontStyle === "oblique"
          ? 2
          : 0;

    const zIndex = parseZIndex(style?.zIndex);
    const isStackingCtx = createsStackingContext(
      style as Record<string, unknown>,
    );

    // Box 데이터: background/border를 Skia에서도 렌더링 (CSS 정합성)
    const bgR = ((fill.color >> 16) & 0xff) / 255;
    const bgG = ((fill.color >> 8) & 0xff) / 255;
    const bgB = (fill.color & 0xff) / 255;
    const fillColor = Float32Array.of(bgR, bgG, bgB, fill.alpha);
    const br = borderRadius ?? 0;

    const boxData: {
      fillColor: Float32Array;
      borderRadius: number | [number, number, number, number];
      strokeColor?: Float32Array;
      strokeWidth?: number;
      strokeStyle?: string;
    } = {
      fillColor,
      borderRadius: br,
    };
    if (borderConfig) {
      const sc = borderConfig.color ?? 0x000000;
      boxData.strokeColor = Float32Array.of(
        ((sc >> 16) & 0xff) / 255,
        ((sc >> 8) & 0xff) / 255,
        (sc & 0xff) / 255,
        borderConfig.alpha ?? 1,
      );
      boxData.strokeWidth = borderConfig.width;
      if (borderConfig.style !== "solid" && borderConfig.style !== "none") {
        boxData.strokeStyle = borderConfig.style;
      }
    }

    return {
      type: "text" as const,
      elementId: element.id,
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
      visible:
        style?.display !== "none" &&
        style?.visibility !== "hidden" &&
        style?.visibility !== "collapse",
      ...(skiaEffects.effects ? { effects: skiaEffects.effects } : {}),
      ...(skiaEffects.blendMode ? { blendMode: skiaEffects.blendMode } : {}),
      ...(zIndex !== undefined ? { zIndex } : {}),
      ...(isStackingCtx ? { isStackingContext: true } : {}),
      box: boxData,
      text: {
        content: textContent,
        fontFamilies: [
          skiaFontManager.resolveFamily(
            textStyle.fontFamily.split(",")[0].trim(),
          ),
          "Pretendard",
        ],
        fontSize: textStyle.fontSize,
        fontWeight: numericFontWeight,
        fontStyle: numericFontStyle,
        color: Float32Array.of(r, g, b, 1),
        align: flexAlignment?.textAlign ?? textStyle.align,
        letterSpacing: textStyle.letterSpacing,
        // leading > 0이면 명시적 lineHeight 설정 (leading=0이면 폰트 기본값 사용)
        ...(textStyle.leading > 0
          ? { lineHeight: textStyle.leading + textStyle.fontSize }
          : {}),
        // textDecoration → CanvasKit 비트마스크: underline=1, overline=2, lineThrough=4
        ...(hasDecoration
          ? {
              decoration:
                (textDecoration.underline ? 1 : 0) |
                (textDecoration.overline ? 2 : 0) |
                (textDecoration.lineThrough ? 4 : 0),
              // text-decoration-style (C-5)
              ...(style?.textDecorationStyle
                ? {
                    decorationStyle: style.textDecorationStyle as
                      | "solid"
                      | "dashed"
                      | "dotted"
                      | "double"
                      | "wavy",
                  }
                : {}),
              // text-decoration-color (C-6): colord로 파싱 후 Float32Array로 변환
              ...(style?.textDecorationColor
                ? (() => {
                    const parsed = colord(style.textDecorationColor);
                    if (!parsed.isValid()) return {};
                    const rgba = parsed.toRgb();
                    return {
                      decorationColor: Float32Array.of(
                        rgba.r / 255,
                        rgba.g / 255,
                        rgba.b / 255,
                        rgba.a,
                      ),
                    };
                  })()
                : {}),
            }
          : {}),
        paddingLeft: padding.left,
        paddingTop: padding.top,
        maxWidth: transform.width - padding.left - padding.right,
        ...(flexAlignment?.verticalAlign
          ? { verticalAlign: flexAlignment.verticalAlign }
          : style?.verticalAlign
            ? {
                verticalAlign: style.verticalAlign as
                  | "top"
                  | "middle"
                  | "bottom"
                  | "baseline",
              }
            : {}),
        ...(style?.whiteSpace
          ? {
              whiteSpace: style.whiteSpace as
                | "normal"
                | "nowrap"
                | "pre"
                | "pre-wrap"
                | "pre-line",
            }
          : {}),
        ...(style?.wordBreak
          ? {
              wordBreak: style.wordBreak as "normal" | "break-all" | "keep-all",
            }
          : {}),
        ...(style?.overflowWrap
          ? {
              overflowWrap: style.overflowWrap as
                | "normal"
                | "break-word"
                | "anywhere",
            }
          : {}),
        ...(style?.wordSpacing != null
          ? { wordSpacing: parseCSSSize(style.wordSpacing, undefined, 0) }
          : {}),
        // text-overflow: ellipsis (C-1): overflow:hidden + white-space:nowrap 조합에서 동작
        ...(style?.textOverflow
          ? { textOverflow: style.textOverflow as "ellipsis" | "clip" }
          : {}),
        // ADR-008 Phase 3: overflow:hidden|clip → 텍스트 영역 클리핑
        ...(style?.overflow === "hidden" || style?.overflow === "clip"
          ? { clipText: true }
          : {}),
        // text-indent: 첫 줄 들여쓰기 (C-3)
        ...(style?.textIndent != null
          ? { textIndent: parseCSSSize(style.textIndent, undefined, 0) }
          : {}),
        // font-variant: OpenType feature (예: small-caps)
        ...(style?.fontVariant && style.fontVariant !== "normal"
          ? { fontVariant: style.fontVariant }
          : {}),
        // font-stretch: CanvasKit FontWidth (예: condensed, 75%)
        ...(style?.fontStretch && style.fontStretch !== "normal"
          ? { fontStretch: style.fontStretch }
          : {}),
      },
    };
  }, [
    transform,
    textStyle,
    textContent,
    padding,
    skiaEffects,
    hasDecoration,
    textDecoration,
    fill,
    borderRadius,
    borderConfig,
    flexAlignment,
    style,
  ]);

  useSkiaNode(element.id, skiaNodeData as SkiaNodeData);

  return (
    <pixiContainer x={transform.x} y={transform.y}>
      {/* Background - clickable */}
      <pixiGraphics
        draw={drawBackground}
        eventMode={isPointerEventsNone ? "none" : "static"}
        cursor={pixiCursor}
        {...(!isPointerEventsNone && { onPointerDown: handleClick })}
      />

      {/* Text with ref for decoration measurement
           eventMode="none": hit testing에서 제외 — pixiText의 containsPoint가
           hitTestRecursive에서 빈 배열 []을 반환하여 아래 Graphics 테스트를 차단하는 문제 방지 */}
      <pixiText
        ref={textRefCallback}
        text={textContent}
        style={pixiTextStyle}
        x={padding.left}
        y={padding.top}
        eventMode="none"
      />

      {/* P7.7: Text decoration lines (underline, line-through, overline)
           eventMode="none": 위와 동일한 이유 */}
      {hasDecoration && (
        <pixiGraphics
          draw={drawTextDecoration}
          x={padding.left}
          y={padding.top}
          eventMode="none"
        />
      )}
    </pixiContainer>
  );
});

export default TextSprite;
