/**
 * Pixi List
 *
 * 🚀 Phase 6.8: @pixi/ui List 래퍼
 *
 * @pixi/ui의 List 컴포넌트를 xstudio Element 시스템과 통합
 * 수직/수평 리스트 레이아웃을 제공합니다.
 *
 * @since 2025-12-13 Phase 6.8
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { List } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { drawBox } from '../utils';
import { getVariantColors } from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

// ============================================
// Types
// ============================================

export interface PixiListProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onItemClick?: (elementId: string, itemIndex: number) => void;
}

interface ListItem {
  label: string;
  value?: string;
}

// ============================================
// Style Conversion
// ============================================

interface ListLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  itemBackgroundColor: number;
  itemHoverColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  borderRadius: number;
  itemHeight: number;
  gap: number;
  padding: number;
}

function convertToListStyle(style: CSSStyle | undefined): ListLayoutStyle {
  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 200),
    height: parseCSSSize(style?.height, undefined, 250),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    itemBackgroundColor: 0xf3f4f6,
    itemHoverColor: 0xe5e7eb,
    textColor: cssColorToHex(style?.color, 0x374151),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    itemHeight: 40,
    gap: parseCSSSize(style?.gap, undefined, 4),
    padding: parseCSSSize(style?.padding, undefined, 8),
  };
}

function parseListItems(props: Record<string, unknown> | undefined): ListItem[] {
  if (!props) return [];

  if (Array.isArray(props.items)) {
    return props.items.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { label: item, value: item };
      }
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        return {
          label: String(itemObj.label || itemObj.name || itemObj.title || `Item ${index + 1}`),
          value: String(itemObj.value || itemObj.id || index),
        };
      }
      return { label: `Item ${index + 1}`, value: String(index) };
    });
  }

  // 기본 샘플 아이템
  return [
    { label: 'Item 1', value: '1' },
    { label: 'Item 2', value: '2' },
    { label: 'Item 3', value: '3' },
    { label: 'Item 4', value: '4' },
    { label: 'Item 5', value: '5' },
  ];
}

// ============================================
// Graphics Creation
// ============================================

/**
 * 리스트 아이템 뷰 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createListItemView(
  width: number,
  height: number,
  label: string,
  style: ListLayoutStyle
): Container {
  const container = new Container();

  // 배경 - Border-Box v2: drawBox 유틸리티 사용
  const bg = new Graphics();
  drawBox(bg, {
    width,
    height,
    backgroundColor: style.itemBackgroundColor,
    backgroundAlpha: 1,
    borderRadius: 4,
  });
  container.addChild(bg);

  // 텍스트
  const textStyle = new TextStyle({
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fill: style.textColor,
  });
  const text = new Text({ text: label, style: textStyle });
  text.x = 12;
  text.y = (height - text.height) / 2;
  container.addChild(text);

  // 인터랙션 설정
  container.eventMode = 'static';
  container.cursor = 'pointer';

  // 호버 효과 - Border-Box v2: drawBox 유틸리티 사용
  container.on('pointerover', () => {
    drawBox(bg, {
      width,
      height,
      backgroundColor: style.itemHoverColor,
      backgroundAlpha: 1,
      borderRadius: 4,
    });
  });

  container.on('pointerout', () => {
    drawBox(bg, {
      width,
      height,
      backgroundColor: style.itemBackgroundColor,
      backgroundAlpha: 1,
      borderRadius: 4,
    });
  });

  return container;
}

/**
 * 리스트 배경 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createListBackground(
  width: number,
  height: number,
  color: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();

  // Border-Box v2: drawBox 유틸리티 사용
  drawBox(g, {
    width,
    height,
    backgroundColor: color,
    backgroundAlpha: 1,
    borderRadius,
    border: {
      width: 1,
      color: 0xe5e7eb,
      alpha: 1,
      style: 'solid',
      radius: borderRadius,
    },
  });

  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiList
 *
 * @pixi/ui의 List를 사용하여 리스트 렌더링
 *
 * @example
 * <PixiList
 *   element={listElement}
 *   onClick={(id) => handleClick(id)}
 *   onItemClick={(id, index) => handleItemClick(id, index)}
 * />
 */
export const PixiList = memo(function PixiList({
  element,
  onClick,
  onItemClick,
}: PixiListProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const listRef = useRef<List | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // List 스타일
  const layoutStyle = useMemo(() => convertToListStyle(style), [style]);

  // 🚀 테마 인식 색상
  const themeAwareColors = useMemo(() => ({
    focusRingColor: variantColors.bg,
    selectedBgColor: variantColors.bg,
    selectedTextColor: variantColors.text,
  }), [variantColors]);

  // 아이템들
  const items = useMemo(() => parseListItems(props), [props]);

  // 방향
  const isHorizontal = useMemo(() => {
    const direction = props?.direction || props?.orientation;
    return direction === 'horizontal' || direction === 'row';
  }, [props?.direction, props?.orientation]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handleItemClick = useCallback(
    (index: number) => {
      onItemClick?.(element.id, index);
    },
    [element.id, onItemClick]
  );

  // List 생성 및 관리
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
    const bg = createListBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderRadius
    );
    container.addChild(bg);

    // 아이템 너비/높이 계산
    const itemWidth = isHorizontal
      ? (layoutStyle.width - layoutStyle.padding * 2 - layoutStyle.gap * (items.length - 1)) / items.length
      : layoutStyle.width - layoutStyle.padding * 2;
    const itemHeight = layoutStyle.itemHeight;

    // 아이템 뷰 생성
    const itemViews = items.map((item, index) => {
      const view = createListItemView(itemWidth, itemHeight, item.label, layoutStyle);
      view.on('pointerdown', (e) => {
        e.stopPropagation();
        handleItemClick(index);
      });
      return view;
    });

    // @pixi/ui List 생성
    const list = new List({
      elementsMargin: layoutStyle.gap,
      type: isHorizontal ? 'horizontal' : 'vertical',
      children: itemViews,
    });

    // 위치 설정
    list.x = layoutStyle.padding;
    list.y = layoutStyle.padding;

    // 컨테이너에 추가
    container.addChild(list);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    listRef.current = list;

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      // 이벤트 연결 해제
      try {
        container.off('pointerdown', handleClick);
      } catch {
        // ignore
      }

      // itemViews 이벤트 해제 및 내부 Graphics destroy
      try {
        itemViews.forEach((view) => {
          view.off('pointerdown');
          view.off('pointerover');
          view.off('pointerout');
          // view 내부 children (bg Graphics, Text) destroy
          view.children.forEach((child) => {
            if ('destroy' in child && typeof child.destroy === 'function') {
              child.destroy(true);
            }
          });
        });
      } catch {
        // CanvasTextSystem race condition - 무시
      }

      // Stage에서 제거
      try {
        app.stage.removeChild(container);
      } catch {
        // ignore
      }

      // Graphics 객체 명시적 destroy (GPU 리소스 해제)
      try {
        bg.destroy(true);
      } catch {
        // ignore
      }

      // List 및 Container destroy
      try {
        if (!list.destroyed) {
          list.destroy({ children: true });
        }
        if (!container.destroyed) {
          container.destroy({ children: true });
        }
      } catch {
        // ignore
      }

      containerRef.current = null;
      listRef.current = null;
    };
  }, [app, layoutStyle, items, isHorizontal, handleClick, handleItemClick]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiList;
