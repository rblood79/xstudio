/**
 * Text Sprite
 *
 * 🚀 Phase 10 B1.2: Text, Heading, Label 텍스트 스프라이트
 * 🚀 P7.7: textDecoration (underline, line-through, overline) 지원
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-13 P7.7 - textDecoration 속성 지원
 */

import { useCallback, useMemo, useRef } from 'react';
import { Graphics as PixiGraphics, TextStyle, Text } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, applyTextTransform, type CSSStyle } from './styleConverter';
import { parsePadding } from './paddingUtils';

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

export function TextSprite({
  element,
  isSelected,
  onClick,
  onDoubleClick,
}: TextSpriteProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const { transform, fill, stroke, text: textStyle, borderRadius } = converted;

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

  // Background draw
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Only draw if there's a background color
      if (!style?.backgroundColor || style.backgroundColor === 'transparent') {
        return;
      }

      // v8 Pattern: shape → fill (shape first, then apply fill with style)
      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
      g.fill({ color: fill.color, alpha: fill.alpha });

      // Stroke
      if (stroke) {
        g.setStrokeStyle({
          width: stroke.width,
          color: stroke.color,
          alpha: stroke.alpha,
        });
        if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
          g.roundRect(0, 0, transform.width, transform.height, borderRadius);
        } else {
          g.rect(0, 0, transform.width, transform.height);
        }
        g.stroke();
      }
    },
    [style, fill, stroke, transform, borderRadius]
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
}

export default TextSprite;
