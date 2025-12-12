/**
 * Box Sprite
 *
 * 🚀 Phase 10 B1.2: Box, Flex, Grid 컨테이너 스프라이트
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

import { useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, cssColorToHex, type CSSStyle } from './styleConverter';

// ============================================
// Types
// ============================================

export interface BoxSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Component
// ============================================

export function BoxSprite({ element, isSelected, onClick }: BoxSpriteProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);

  const { transform, fill, stroke, borderRadius } = converted;

  // 텍스트 내용 (children, text, label 등)
  const textContent = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    const content = props?.children || props?.text || props?.label;
    return content ? String(content) : '';
  }, [element.props]);

  // 텍스트 스타일
  const textStyle = useMemo(() => {
    return new TextStyle({
      fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
      fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 14,
      fontWeight: (style?.fontWeight as 'normal' | 'bold') || 'normal',
      fill: cssColorToHex(style?.color, 0x000000),
      align: 'center',
    });
  }, [style]);

  // Draw function (PixiJS v8 API)
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Shape + Fill (PixiJS v8: rect 먼저, fill 한번)
      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
      g.fill({ color: fill.color, alpha: fill.alpha });

      // Stroke
      if (stroke) {
        if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
          g.roundRect(0, 0, transform.width, transform.height, borderRadius);
        } else {
          g.rect(0, 0, transform.width, transform.height);
        }
        g.stroke({ width: stroke.width, color: stroke.color, alpha: stroke.alpha });
      }

      // Selection highlight는 SelectionLayer에서 처리
    },
    [transform, fill, stroke, borderRadius]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 텍스트 위치 (중앙 정렬)
  const textX = transform.width / 2;
  const textY = transform.height / 2;

  return (
    <pixiContainer x={transform.x} y={transform.y}>
      <pixiGraphics
        draw={draw}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
      {textContent && (
        <pixiText
          text={textContent}
          style={textStyle}
          x={textX}
          y={textY}
          anchor={0.5}
        />
      )}
    </pixiContainer>
  );
}

export default BoxSprite;
