/**
 * Pixi Switcher
 *
 * 투명 히트 영역 전용 컴포넌트
 * Skia가 모든 시각적 렌더링을 담당하므로 @pixi/ui Switcher는 불필요.
 * 이벤트 히트 영역만 제공합니다.
 *
 * @since 2025-12-13 Phase 6.6
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

export interface PixiSwitcherProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, activeIndex: number) => void;
}

interface SwitcherItem {
  label: string;
  value?: string;
}

// ============================================
// Helper Functions
// ============================================

function parseSwitcherItems(props: Record<string, unknown> | undefined): SwitcherItem[] {
  if (!props) return [{ label: 'Tab 1' }, { label: 'Tab 2' }];

  if (Array.isArray(props.items)) {
    return props.items.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { label: item, value: item };
      }
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        return {
          label: String(itemObj.label || itemObj.name || `Tab ${index + 1}`),
          value: String(itemObj.value || itemObj.id || index),
        };
      }
      return { label: `Tab ${index + 1}`, value: String(index) };
    });
  }

  // children 배열 처리
  if (Array.isArray(props.children)) {
    return props.children.map((child: unknown, index: number) => {
      if (typeof child === 'string') {
        return { label: child, value: child };
      }
      return { label: `Tab ${index + 1}`, value: String(index) };
    });
  }

  return [{ label: 'Tab 1' }, { label: 'Tab 2' }];
}

// ============================================
// Component
// ============================================

/**
 * PixiSwitcher
 *
 * 투명 히트 영역만 제공하는 탭/세그먼트 컨트롤
 * 시각적 렌더링은 Skia가 담당
 */
export const PixiSwitcher = memo(function PixiSwitcher({
  element,
  onClick,
  onChange,
}: PixiSwitcherProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 아이템들
  const items = useMemo(() => parseSwitcherItems(props), [props]);

  // 크기 계산
  const width = typeof style?.width === 'number' ? style.width : 240;
  const height = typeof style?.height === 'number' ? style.height : 40;

  // 활성 인덱스
  const activeIndex = useMemo(() => {
    const idx = Number(props?.activeIndex ?? props?.value ?? 0);
    return Math.max(0, Math.min(items.length - 1, idx));
  }, [props?.activeIndex, props?.value, items.length]);

  // 이벤트 핸들러
  const handleChange = useCallback(
    (newIndex: number) => {
      onChange?.(element.id, newIndex);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 아이템별 폭
  const itemWidth = items.length > 0 ? width / items.length : width;

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, width, height);
    g.fill({ color: 0xffffff, alpha: 0.001 });
  }, [width, height]);

  const drawItemHitArea = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, itemWidth, height);
    g.fill({ color: 0xffffff, alpha: 0.001 });
  }, [itemWidth, height]);

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
            handleChange(index);
          }}
        />
      ))}
    </pixiContainer>
  );
});

export default PixiSwitcher;
