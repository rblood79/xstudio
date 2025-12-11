/**
 * Text Sprite
 *
 * 🚀 Phase 10 B1.2: Text, Heading, Label 텍스트 스프라이트
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

import { useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, type CSSStyle } from './styleConverter';

// ============================================
// Types
// ============================================

export interface TextSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
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

  // Text content
  const textContent = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    return String(props?.children || props?.text || props?.label || element.tag);
  }, [element.props, element.tag]);

  // PixiJS TextStyle
  const pixiTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight as 'normal' | 'bold',
        fill: textStyle.fill,
        align: textStyle.align,
        wordWrap: textStyle.wordWrap,
        wordWrapWidth: textStyle.wordWrapWidth || transform.width,
      }),
    [textStyle, transform.width]
  );

  // Background draw
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Only draw if there's a background color
      if (!style?.backgroundColor || style.backgroundColor === 'transparent') {
        return;
      }

      g.fill({ color: fill.color, alpha: fill.alpha });

      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
      g.fill();

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

      // Selection highlight
      if (isSelected) {
        g.setStrokeStyle({ width: 2, color: 0x3b82f6, alpha: 1 });
        g.rect(-1, -1, transform.width + 2, transform.height + 2);
        g.stroke();
      }
    },
    [style, fill, stroke, transform, borderRadius, isSelected]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.(element.id);
  }, [element.id, onDoubleClick]);

  // Padding
  const paddingLeft = useMemo(() => {
    const p = style?.paddingLeft || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style]);

  const paddingTop = useMemo(() => {
    const p = style?.paddingTop || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style]);

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
        onPointerDown={handleClick}
      />

      {/* Text */}
      <pixiText
        text={textContent}
        style={pixiTextStyle}
        x={paddingLeft}
        y={paddingTop}
      />
    </pixiContainer>
  );
}

export default TextSprite;
