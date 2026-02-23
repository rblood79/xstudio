/**
 * Pixi List
 *
 * 투명 히트 영역 전용 컴포넌트
 * Skia가 모든 시각적 렌더링을 담당하므로 @pixi/ui List는 불필요.
 * 이벤트 히트 영역만 제공합니다.
 *
 * @since 2025-12-13 Phase 6.8
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
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
// Helper Functions
// ============================================

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
// Component
// ============================================

/**
 * PixiList
 *
 * 투명 히트 영역만 제공하는 리스트 컴포넌트
 * 시각적 렌더링은 Skia가 담당
 */
export const PixiList = memo(function PixiList({
  element,
  onClick,
  onItemClick,
}: PixiListProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 크기 계산
  const width = typeof style?.width === 'number' ? style.width : 200;
  const height = typeof style?.height === 'number' ? style.height : 250;

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

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, width, height);
    g.fill({ color: 0xffffff, alpha: 0.001 });
  }, [width, height]);

  // 아이템 크기
  const padding = typeof style?.padding === 'number' ? style.padding : 8;
  const gap = typeof style?.gap === 'number' ? style.gap : 4;
  const itemHeight = 40;

  const itemWidth = isHorizontal
    ? (width - padding * 2 - gap * (items.length - 1)) / items.length
    : width - padding * 2;

  const drawItemHitArea = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, itemWidth, itemHeight);
    g.fill({ color: 0xffffff, alpha: 0.001 });
  }, [itemWidth]);

  return (
    <pixiContainer>
      {/* 컨테이너 히트 영역 */}
      <pixiGraphics
        draw={drawHitArea}
        x={0}
        y={0}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />

      {/* 아이템별 히트 영역 */}
      {items.map((item, index) => (
        <pixiGraphics
          key={item.value ?? index}
          draw={drawItemHitArea}
          eventMode="static"
          cursor="pointer"
          onPointerDown={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            handleItemClick(index);
          }}
        />
      ))}
    </pixiContainer>
  );
});

export default PixiList;
