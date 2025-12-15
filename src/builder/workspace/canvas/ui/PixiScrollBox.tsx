/**
 * Pixi ScrollBox
 *
 * 🚀 Phase 6.7: @pixi/ui ScrollBox 래퍼
 *
 * @pixi/ui의 ScrollBox 컴포넌트를 xstudio Element 시스템과 통합
 * 스크롤 가능한 컨테이너를 제공합니다.
 *
 * @since 2025-12-13 Phase 6.7
 */

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { ScrollBox } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiScrollBoxProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface ScrollBoxLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
  scrollbarWidth: number;
  scrollbarColor: number;
  scrollbarBgColor: number;
}

function convertToScrollBoxStyle(style: CSSStyle | undefined): ScrollBoxLayoutStyle {
  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 300),
    height: parseCSSSize(style?.height, undefined, 200),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    borderColor: cssColorToHex(style?.borderColor, 0xe5e7eb),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 1),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    scrollbarWidth: 8,
    scrollbarColor: 0x9ca3af,
    scrollbarBgColor: 0xe5e7eb,
  };
}

// ============================================
// Graphics Creation
// ============================================

/**
 * ScrollBox 배경 생성
 */
function createScrollBoxBackground(
  width: number,
  height: number,
  backgroundColor: number,
  borderColor: number,
  borderWidth: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();

  // 배경
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color: backgroundColor, alpha: 1 });

  // 테두리
  if (borderWidth > 0) {
    g.roundRect(0, 0, width, height, borderRadius);
    g.stroke({ width: borderWidth, color: borderColor, alpha: 1 });
  }

  return g;
}

/**
 * 샘플 콘텐츠 생성 (데모용)
 */
function createSampleContent(width: number, itemCount: number): Container {
  const container = new Container();

  const textStyle = new TextStyle({
    fontSize: 14,
    fontFamily: 'Pretendard, sans-serif',
    fill: 0x374151,
  });

  for (let i = 0; i < itemCount; i++) {
    const itemBg = new Graphics();
    itemBg.roundRect(8, i * 40 + 8, width - 24, 32, 4);
    itemBg.fill({ color: i % 2 === 0 ? 0xf3f4f6 : 0xffffff, alpha: 1 });
    container.addChild(itemBg);

    const text = new Text({ text: `Item ${i + 1}`, style: textStyle });
    text.x = 16;
    text.y = i * 40 + 14;
    container.addChild(text);
  }

  return container;
}

// ============================================
// Component
// ============================================

/**
 * PixiScrollBox
 *
 * @pixi/ui의 ScrollBox를 사용하여 스크롤 가능한 컨테이너 렌더링
 *
 * @example
 * <PixiScrollBox
 *   element={scrollBoxElement}
 *   onClick={(id) => handleClick(id)}
 * />
 */
export const PixiScrollBox = memo(function PixiScrollBox({
  element,
  isSelected,
  onClick,
}: PixiScrollBoxProps) {
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const scrollBoxRef = useRef<ScrollBox | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // ScrollBox 스타일
  const layoutStyle = useMemo(() => convertToScrollBoxStyle(style), [style]);

  // 콘텐츠 아이템 수
  const itemCount = useMemo(() => {
    const count = Number(props?.itemCount ?? props?.count ?? 10);
    return Math.max(1, count);
  }, [props?.itemCount, props?.count]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // ScrollBox 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 배경
    const bg = createScrollBoxBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderColor,
      layoutStyle.borderWidth,
      layoutStyle.borderRadius
    );
    container.addChild(bg);

    // 샘플 콘텐츠
    const content = createSampleContent(layoutStyle.width, itemCount);

    // @pixi/ui ScrollBox 생성
    const scrollBox = new ScrollBox({
      width: layoutStyle.width - layoutStyle.borderWidth * 2,
      height: layoutStyle.height - layoutStyle.borderWidth * 2,
      elementsMargin: 0,
      globalScroll: false,
      type: 'vertical',
      radius: layoutStyle.borderRadius,
      padding: 0,
    });

    // 콘텐츠 추가
    scrollBox.addItem(content);

    // 위치 조정 (테두리 두께만큼)
    scrollBox.x = layoutStyle.borderWidth;
    scrollBox.y = layoutStyle.borderWidth;

    // 컨테이너에 추가
    container.addChild(scrollBox);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    scrollBoxRef.current = scrollBox;

    return () => {
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      scrollBoxRef.current = null;
    };
  }, [app, layoutStyle, itemCount, handleClick]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiScrollBox;
