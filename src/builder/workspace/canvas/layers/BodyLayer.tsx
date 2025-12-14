/**
 * Body Layer
 *
 * Body 요소의 스타일 (배경색, 패딩, 테두리 등)을 렌더링합니다.
 *
 * @since 2025-12-12
 */

import { useCallback, useMemo, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { useStore } from '../../../stores';
import { cssColorToHex, cssColorToAlpha, parseCSSSize } from '../sprites/styleConverter';
import type { CSSStyle } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface BodyLayerProps {
  /** 페이지 너비 */
  pageWidth: number;
  /** 페이지 높이 */
  pageHeight: number;
  /** 클릭 핸들러 */
  onClick?: (elementId: string) => void;
}

// ============================================
// Component
// ============================================

/**
 * BodyLayer
 *
 * 현재 페이지의 Body 요소 스타일을 렌더링합니다.
 * - backgroundColor
 * - borderRadius
 * - border
 * - boxShadow (TODO)
 */
export const BodyLayer = memo(function BodyLayer({
  pageWidth,
  pageHeight,
  onClick,
}: BodyLayerProps) {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);

  // Body 요소 찾기
  const bodyElement = useMemo(() => {
    return elements.find(
      (el) => el.page_id === currentPageId && el.tag.toLowerCase() === 'body'
    );
  }, [elements, currentPageId]);

  // Body 스타일
  const bodyStyle = bodyElement?.props?.style as CSSStyle | undefined;
  const backgroundColorCss = bodyStyle?.backgroundColor;

  // 스타일 값 추출
  const backgroundColor = useMemo(() => {
    return cssColorToHex(backgroundColorCss, 0xffffff);
  }, [backgroundColorCss]);

  const backgroundAlpha = useMemo(() => {
    if (!backgroundColorCss) return 1;
    return cssColorToAlpha(backgroundColorCss);
  }, [backgroundColorCss]);

  const borderRadius = useMemo(() => {
    return parseCSSSize(bodyStyle?.borderRadius, undefined, 0);
  }, [bodyStyle?.borderRadius]);

  const borderWidth = useMemo(() => {
    return parseCSSSize(bodyStyle?.borderWidth, undefined, 0);
  }, [bodyStyle?.borderWidth]);

  const borderColor = useMemo(() => {
    return cssColorToHex(bodyStyle?.borderColor, 0x000000);
  }, [bodyStyle?.borderColor]);

  // Draw function
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 배경
      if (borderRadius > 0) {
        g.roundRect(0, 0, pageWidth, pageHeight, borderRadius);
      } else {
        g.rect(0, 0, pageWidth, pageHeight);
      }
      g.fill({ color: backgroundColor, alpha: backgroundAlpha });

      // 테두리
      if (borderWidth > 0) {
        if (borderRadius > 0) {
          g.roundRect(0, 0, pageWidth, pageHeight, borderRadius);
        } else {
          g.rect(0, 0, pageWidth, pageHeight);
        }
        g.stroke({ width: borderWidth, color: borderColor, alpha: 1 });
      }
    },
    [pageWidth, pageHeight, backgroundColor, backgroundAlpha, borderRadius, borderWidth, borderColor]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    if (bodyElement && onClick) {
      onClick(bodyElement.id);
    }
  }, [bodyElement, onClick]);

  return (
    <pixiGraphics
      label="BodyLayer"
      draw={draw}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    />
  );
});

export default BodyLayer;
