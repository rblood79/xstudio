/**
 * Box Sprite
 *
 * 🚀 Phase 10 B1.2: Box, Flex, Grid 컨테이너 스프라이트
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

import { useCallback, useMemo } from 'react';
import { Container } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, type CSSStyle } from './styleConverter';

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

  // Draw function
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Fill
      g.fill({ color: fill.color, alpha: fill.alpha });

      // Shape (rounded rect if borderRadius > 0)
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
    [transform, fill, stroke, borderRadius, isSelected]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  return (
    <Container
      x={transform.x}
      y={transform.y}
      eventMode="static"
      cursor="pointer"
      onclick={handleClick}
    >
      <pixiGraphics draw={draw} />
    </Container>
  );
}

export default BoxSprite;
