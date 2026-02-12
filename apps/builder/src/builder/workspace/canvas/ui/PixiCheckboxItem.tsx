/**
 * Pixi Checkbox Item
 *
 * 🚀 Phase 11 B2.4: Checkbox 개별 아이템 (투명 hit area)
 *
 * CheckboxGroup에서 시각적 렌더링을 담당하고,
 * 이 컴포넌트는 selection을 위한 투명 hit area만 제공합니다.
 *
 * @since 2025-12-15
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
// 🚀 Phase 8: parseCSSSize 제거

// 🚀 Spec Migration
import { CHECKBOX_BOX_SIZES } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiCheckboxItemProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Constants (PixiCheckboxGroup.tsx와 동기화)
// ============================================

const DEFAULT_CHECKBOX_SIZE = 20;
const LABEL_GAP = 8;

// ============================================
// Component
// ============================================

export const PixiCheckboxItem = memo(function PixiCheckboxItem({
  element,
  onClick,
}: PixiCheckboxItemProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 라벨 텍스트
  const labelText = useMemo(() => {
    return String(props?.children || props?.label || props?.text || '');
  }, [props]);

  // 스타일
  // 🚀 Spec Migration: CHECKBOX_BOX_SIZES 사용
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const checkboxSize = CHECKBOX_BOX_SIZES[size] ?? CHECKBOX_BOX_SIZES.md;
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : 14;

  // 크기 (LayoutEngine에서 계산된 크기 우선 사용)
  const layoutWidth = typeof style?.width === 'number' ? style.width : 0;
  const layoutHeight = typeof style?.height === 'number' ? style.height : 0;

  // 크기 계산 (layoutPosition 없으면 fallback)
  const estimatedTextWidth = labelText ? Math.max(labelText.length * fontSize * 0.6, 50) : 0;
  const hitAreaWidth = layoutWidth > 0 ? layoutWidth : checkboxSize + (labelText ? LABEL_GAP + estimatedTextWidth : 0);
  const hitAreaHeight = layoutHeight > 0 ? layoutHeight : Math.max(checkboxSize, fontSize + 4);

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, hitAreaWidth, hitAreaHeight);
      g.fill({ color: 0xffffff, alpha: 0 }); // 완전 투명
    },
    [hitAreaWidth, hitAreaHeight]
  );

  return (
    <pixiContainer>
      {/* 투명 히트 영역 (selection용) */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />
    </pixiContainer>
  );
});

export default PixiCheckboxItem;
