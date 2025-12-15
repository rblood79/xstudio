/**
 * Body Layer
 *
 * Body 요소의 스타일 (배경색, 패딩, 테두리 등)을 렌더링합니다.
 * 🚀 Border-Box v2: border-box 방식 렌더링
 *
 * @since 2025-12-12
 * @updated 2025-12-15 Border-Box v2 - drawBox 유틸리티 적용
 */

import { useCallback, useMemo, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { useStore } from '../../../stores';
import { cssColorToHex, cssColorToAlpha, parseCSSSize } from '../sprites/styleConverter';
import type { CSSStyle } from '../sprites/styleConverter';
import { drawBox, parseBorderConfig } from '../utils';

// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface BodyLayerProps {
  /** 페이지 너비 */
  pageWidth: number;
  /** 페이지 높이 */
  pageHeight: number;
  /** 클릭 핸들러 */
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
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

  // Border-Box v2: parseBorderConfig로 border 정보 추출
  const borderConfig = useMemo(() => parseBorderConfig(bodyStyle), [bodyStyle]);

  // Border-Box v2: borderRadius 파싱 (border와 독립적으로 적용)
  const borderRadius = useMemo(() => {
    return parseCSSSize(bodyStyle?.borderRadius, undefined, 0);
  }, [bodyStyle?.borderRadius]);

  // Border-Box v2: drawBox 유틸리티 사용
  const draw = useCallback(
    (g: PixiGraphics) => {
      drawBox(g, {
        width: pageWidth,
        height: pageHeight,
        backgroundColor,
        backgroundAlpha,
        borderRadius,
        border: borderConfig,
      });
    },
    [pageWidth, pageHeight, backgroundColor, backgroundAlpha, borderRadius, borderConfig]
  );

  // 클릭 핸들러 (modifier 키 전달)
  const handleClick = useCallback((e: unknown) => {
    if (bodyElement && onClick) {
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

      onClick(bodyElement.id, { metaKey, shiftKey, ctrlKey });
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
