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

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { useCallback, useMemo, useRef, memo } from 'react';
import { Graphics as PixiGraphics, TextStyle, Text } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, applyTextTransform, buildSkiaEffects, type CSSStyle } from './styleConverter';
import { parsePadding } from './paddingUtils';
import { drawBox, parseBorderConfig } from '../utils';
import { useSkiaNode } from '../skia/useSkiaNode';


// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface TextSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onDoubleClick?: (elementId: string) => void;
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
function parseTextDecoration(decoration: string | undefined): TextDecorationConfig {
  if (!decoration || decoration === 'none') {
    return { underline: false, lineThrough: false, overline: false };
  }

  const lower = decoration.toLowerCase();
  return {
    underline: lower.includes('underline'),
    lineThrough: lower.includes('line-through'),
    overline: lower.includes('overline'),
  };
}

// ============================================
// Component
// ============================================

export const TextSprite = memo(function TextSprite({
  element,
  onClick,
  onDoubleClick,
}: TextSpriteProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const { transform, fill, text: textStyle, borderRadius } = converted;

  // Border-Box v2: parseBorderConfig로 border 정보 추출
  const borderConfig = useMemo(() => parseBorderConfig(style), [style]);

  // Text content with P7.6 textTransform applied
  const textContent = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    const rawText = String(props?.children || props?.text || props?.label || element.tag);
    // P7.6: Apply textTransform (uppercase, lowercase, capitalize)
    return applyTextTransform(rawText, style?.textTransform);
  }, [element.props, element.tag, style?.textTransform]);

  // P7.7: Parse textDecoration
  const textDecoration = useMemo(
    () => parseTextDecoration(style?.textDecoration),
    [style?.textDecoration]
  );
  const hasDecoration = textDecoration.underline || textDecoration.lineThrough || textDecoration.overline;

  // Text ref for measuring bounds
  const textRef = useRef<Text | null>(null);

  // PixiJS TextStyle (P7.2-P7.4 extended)
  const pixiTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight as 'normal' | 'bold',
        fontStyle: textStyle.fontStyle, // P7.2: italic, oblique
        fill: textStyle.fill,
        align: textStyle.align,
        letterSpacing: textStyle.letterSpacing, // P7.3
        leading: textStyle.leading, // P7.4: line height
        wordWrap: textStyle.wordWrap,
        wordWrapWidth: textStyle.wordWrapWidth || transform.width,
      }),
    [textStyle, transform.width]
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
    [hasDecoration, textStyle.fontSize, textStyle.fill, textDecoration]
  );

  // Border-Box v2: drawBox 유틸리티 사용
  const effectiveBorderRadius = typeof borderRadius === 'number' ? borderRadius : borderRadius?.[0] ?? 0;
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      const hasBg = style?.backgroundColor && style.backgroundColor !== 'transparent';
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
    [style, transform, fill, effectiveBorderRadius, borderConfig]
  );

  const handleClick = useCallback((e: unknown) => {
    // PixiJS FederatedPointerEvent has modifier keys directly
    const pixiEvent = e as {
      metaKey?: boolean;
      shiftKey?: boolean;
      ctrlKey?: boolean;
      nativeEvent?: MouseEvent | PointerEvent;
    };

    // Try direct properties first (PixiJS v8), fallback to nativeEvent
    const metaKey = pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
    const shiftKey = pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
    const ctrlKey = pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

    onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
  }, [element.id, onClick]);

  const lastPointerDownAtRef = useRef(0);
  const handlePointerDown = useCallback((e: unknown) => {
    const now = Date.now();
    const isDoubleClick = Boolean(onDoubleClick) && now - lastPointerDownAtRef.current < 300;
    lastPointerDownAtRef.current = now;

    handleClick(e);
    if (isDoubleClick) {
      onDoubleClick?.(element.id);
    }
  }, [element.id, handleClick, onDoubleClick]);

  // Padding (paddingUtils 사용)
  const padding = useMemo(() => parsePadding(style), [style]);

  // Ref callback to capture Text instance
  const textRefCallback = useCallback((text: Text | null) => {
    textRef.current = text;
  }, []);

  // Skia effects (opacity, boxShadow, filter, backdropFilter, mixBlendMode)
  const skiaEffects = useMemo(() => buildSkiaEffects(style), [style]);

  // Phase 5: Skia 렌더 데이터 부착
  const skiaNodeData = useMemo(() => {
    const r = ((textStyle.fill >> 16) & 0xff) / 255;
    const g = ((textStyle.fill >> 8) & 0xff) / 255;
    const b = (textStyle.fill & 0xff) / 255;

    // CSS fontWeight string → numeric (100–900)
    const fw = textStyle.fontWeight;
    const numericFontWeight = fw === 'normal' ? 400 : fw === 'bold' ? 700 : (parseInt(fw, 10) || 400);

    // CSS fontStyle → numeric (0=upright, 1=italic, 2=oblique)
    const numericFontStyle = textStyle.fontStyle === 'italic' ? 1 : textStyle.fontStyle === 'oblique' ? 2 : 0;

    return {
      type: 'text' as const,
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
      visible: style?.display !== 'none' && style?.visibility !== 'hidden',
      ...(skiaEffects.effects ? { effects: skiaEffects.effects } : {}),
      ...(skiaEffects.blendMode ? { blendMode: skiaEffects.blendMode } : {}),
      text: {
        content: textContent,
        fontFamilies: [textStyle.fontFamily.split(',')[0].trim()],
        fontSize: textStyle.fontSize,
        fontWeight: numericFontWeight,
        fontStyle: numericFontStyle,
        color: Float32Array.of(r, g, b, 1),
        align: textStyle.align,
        letterSpacing: textStyle.letterSpacing,
        // leading > 0이면 명시적 lineHeight 설정 (leading=0이면 폰트 기본값 사용)
        ...(textStyle.leading > 0 ? { lineHeight: textStyle.leading + textStyle.fontSize } : {}),
        // textDecoration → CanvasKit 비트마스크: underline=1, overline=2, lineThrough=4
        ...(hasDecoration ? {
          decoration: (textDecoration.underline ? 1 : 0)
            | (textDecoration.overline ? 2 : 0)
            | (textDecoration.lineThrough ? 4 : 0),
        } : {}),
        paddingLeft: padding.left,
        paddingTop: padding.top,
        maxWidth: transform.width - padding.left - padding.right,
      },
    };
  }, [transform, textStyle, textContent, padding, skiaEffects, hasDecoration, textDecoration]);

  useSkiaNode(element.id, skiaNodeData);

  return (
    <pixiContainer
      x={transform.x}
      y={transform.y}
    >
      {/* Background - clickable */}
      <pixiGraphics
        draw={drawBackground}
        eventMode="static"
        cursor="text"
        onPointerDown={handlePointerDown}
      />

      {/* Text with ref for decoration measurement */}
      <pixiText
        ref={textRefCallback}
        text={textContent}
        style={pixiTextStyle}
        x={padding.left}
        y={padding.top}
      />

      {/* P7.7: Text decoration lines (underline, line-through, overline) */}
      {hasDecoration && (
        <pixiGraphics
          draw={drawTextDecoration}
          x={padding.left}
          y={padding.top}
        />
      )}
    </pixiContainer>
  );
});

export default TextSprite;
