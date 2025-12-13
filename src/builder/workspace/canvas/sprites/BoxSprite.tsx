/**
 * Box Sprite
 *
 * 🚀 Phase 10 B1.2: Box, Flex, Grid 컨테이너 스프라이트
 * 🚀 P7.1: Padding 지원 추가 (TextSprite와 일관성)
 * 🚀 P7.9: borderStyle (dashed, dotted, double) 지원
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-13 P7.1 - padding 속성 지원
 * @updated 2025-12-13 P7.9 - borderStyle 속성 지원
 */

import { useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, cssColorToHex, type CSSStyle } from './styleConverter';

// ============================================
// P7.9: Border Style Types
// ============================================

type BorderStyleType = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

/**
 * P7.9: CSS borderStyle 파싱
 */
function parseBorderStyle(style: string | undefined): BorderStyleType {
  if (!style || style === 'none') return 'none';
  const lower = style.toLowerCase();
  if (lower === 'dashed') return 'dashed';
  if (lower === 'dotted') return 'dotted';
  if (lower === 'double') return 'double';
  return 'solid';
}

/**
 * P7.9: Draw dashed border
 */
function drawDashedBorder(
  g: PixiGraphics,
  width: number,
  height: number,
  strokeWidth: number,
  strokeColor: number,
  strokeAlpha: number,
  borderRadius: number
): void {
  const dashLength = Math.max(strokeWidth * 3, 6);
  const gapLength = Math.max(strokeWidth * 2, 4);

  g.setStrokeStyle({ width: strokeWidth, color: strokeColor, alpha: strokeAlpha });

  if (borderRadius > 0) {
    // For rounded corners, simplify to solid stroke (dashed corners are complex)
    g.roundRect(0, 0, width, height, borderRadius);
    g.stroke();
    return;
  }

  // Draw dashed lines for each side
  // Top
  for (let x = 0; x < width; x += dashLength + gapLength) {
    g.moveTo(x, 0);
    g.lineTo(Math.min(x + dashLength, width), 0);
  }
  // Right
  for (let y = 0; y < height; y += dashLength + gapLength) {
    g.moveTo(width, y);
    g.lineTo(width, Math.min(y + dashLength, height));
  }
  // Bottom
  for (let x = width; x > 0; x -= dashLength + gapLength) {
    g.moveTo(x, height);
    g.lineTo(Math.max(x - dashLength, 0), height);
  }
  // Left
  for (let y = height; y > 0; y -= dashLength + gapLength) {
    g.moveTo(0, y);
    g.lineTo(0, Math.max(y - dashLength, 0));
  }
  g.stroke();
}

/**
 * P7.9: Draw dotted border
 */
function drawDottedBorder(
  g: PixiGraphics,
  width: number,
  height: number,
  strokeWidth: number,
  strokeColor: number,
  strokeAlpha: number,
  borderRadius: number
): void {
  const dotRadius = strokeWidth / 2;
  const gap = strokeWidth * 2;

  // Draw dots along the border
  // Top edge
  for (let x = dotRadius; x < width - dotRadius; x += gap) {
    g.circle(x, dotRadius, dotRadius);
  }
  // Right edge
  for (let y = dotRadius; y < height - dotRadius; y += gap) {
    g.circle(width - dotRadius, y, dotRadius);
  }
  // Bottom edge
  for (let x = width - dotRadius; x > dotRadius; x -= gap) {
    g.circle(x, height - dotRadius, dotRadius);
  }
  // Left edge
  for (let y = height - dotRadius; y > dotRadius; y -= gap) {
    g.circle(dotRadius, y, dotRadius);
  }

  g.fill({ color: strokeColor, alpha: strokeAlpha });
}

/**
 * P7.9: Draw double border
 */
function drawDoubleBorder(
  g: PixiGraphics,
  width: number,
  height: number,
  strokeWidth: number,
  strokeColor: number,
  strokeAlpha: number,
  borderRadius: number
): void {
  const outerOffset = 0;
  const innerOffset = strokeWidth * 2;
  const lineWidth = strokeWidth / 2;

  g.setStrokeStyle({ width: lineWidth, color: strokeColor, alpha: strokeAlpha });

  // Outer border
  if (borderRadius > 0) {
    g.roundRect(outerOffset, outerOffset, width - outerOffset * 2, height - outerOffset * 2, borderRadius);
  } else {
    g.rect(outerOffset, outerOffset, width - outerOffset * 2, height - outerOffset * 2);
  }
  g.stroke();

  // Inner border
  if (borderRadius > 0) {
    g.roundRect(innerOffset, innerOffset, width - innerOffset * 2, height - innerOffset * 2, Math.max(0, borderRadius - innerOffset));
  } else {
    g.rect(innerOffset, innerOffset, width - innerOffset * 2, height - innerOffset * 2);
  }
  g.stroke();
}

// ============================================
// Types
// ============================================

export interface BoxSpriteProps {
  element: Element;
  isSelected?: boolean;
  /** onClick callback with modifier keys for multi-select */
  onClick?: (elementId: string, modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean }) => void;
}

// ============================================
// Component
// ============================================

export function BoxSprite({ element, isSelected, onClick }: BoxSpriteProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);

  const { transform, fill, stroke, borderRadius } = converted;

  // P7.9: Parse borderStyle
  const borderStyle = useMemo(
    () => parseBorderStyle(style?.borderStyle),
    [style?.borderStyle]
  );

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

  // P7.1: Padding 파싱 (TextSprite와 동일한 패턴)
  const paddingLeft = useMemo(() => {
    const p = style?.paddingLeft || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style?.paddingLeft, style?.padding]);

  const paddingRight = useMemo(() => {
    const p = style?.paddingRight || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style?.paddingRight, style?.padding]);

  const paddingTop = useMemo(() => {
    const p = style?.paddingTop || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style?.paddingTop, style?.padding]);

  const paddingBottom = useMemo(() => {
    const p = style?.paddingBottom || style?.padding;
    return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
  }, [style?.paddingBottom, style?.padding]);

  // Draw function (PixiJS v8 API) with P7.9 borderStyle support
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const radius = typeof borderRadius === 'number' ? borderRadius : 0;

      // Shape + Fill (PixiJS v8: rect 먼저, fill 한번)
      if (radius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, radius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
      g.fill({ color: fill.color, alpha: fill.alpha });

      // P7.9: Stroke with borderStyle support
      if (stroke && borderStyle !== 'none') {
        switch (borderStyle) {
          case 'dashed':
            drawDashedBorder(
              g,
              transform.width,
              transform.height,
              stroke.width,
              stroke.color,
              stroke.alpha,
              radius
            );
            break;
          case 'dotted':
            drawDottedBorder(
              g,
              transform.width,
              transform.height,
              stroke.width,
              stroke.color,
              stroke.alpha,
              radius
            );
            break;
          case 'double':
            drawDoubleBorder(
              g,
              transform.width,
              transform.height,
              stroke.width,
              stroke.color,
              stroke.alpha,
              radius
            );
            break;
          case 'solid':
          default:
            // Default solid stroke
            if (radius > 0) {
              g.roundRect(0, 0, transform.width, transform.height, radius);
            } else {
              g.rect(0, 0, transform.width, transform.height);
            }
            g.stroke({ width: stroke.width, color: stroke.color, alpha: stroke.alpha });
            break;
        }
      }

      // Selection highlight는 SelectionLayer에서 처리
    },
    [transform, fill, stroke, borderRadius, borderStyle]
  );

  const handleClick = useCallback((e: { metaKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean }) => {
    onClick?.(element.id, {
      metaKey: e.metaKey ?? false,
      shiftKey: e.shiftKey ?? false,
      ctrlKey: e.ctrlKey ?? false,
    });
  }, [element.id, onClick]);

  // P7.1: 텍스트 위치 (padding 적용 후 콘텐츠 영역 중앙)
  const contentWidth = transform.width - paddingLeft - paddingRight;
  const contentHeight = transform.height - paddingTop - paddingBottom;
  const textX = paddingLeft + contentWidth / 2;
  const textY = paddingTop + contentHeight / 2;

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
