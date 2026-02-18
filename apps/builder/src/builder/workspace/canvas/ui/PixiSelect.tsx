/**
 * Pixi Select
 *
 * 투명 히트 영역(pixiGraphics) 기반 Select
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - convertToSelectStyle()로 크기 계산 (Skia 렌더링에 필요)
 *
 * @since 2025-12-13 Phase 6.3
 * @updated 2026-02-18 @pixi/ui Select 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

// Spec Migration
import {
  SelectSpec,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiSelectProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface SelectLayoutStyle {
  width: number;
  height: number;
}

/**
 * CSS 스타일을 Select 레이아웃 스타일로 변환
 */
function convertToSelectStyle(style: CSSStyle | undefined, size: string): SelectLayoutStyle {
  const sizeSpec = SelectSpec.sizes[size] || SelectSpec.sizes[SelectSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');

  // 높이 계산: fontSize + paddingY * 2 + border (대략적 추정)
  const defaultHeight = specPreset.fontSize + specPreset.paddingY * 2 + 8;

  return {
    width: typeof style?.width === 'number' ? style.width : 200,
    height: typeof style?.height === 'number' ? style.height : defaultHeight,
  };
}

// ============================================
// Component
// ============================================

/**
 * PixiSelect
 *
 * 투명 히트 영역만 제공 (Skia가 시각적 렌더링 담당)
 *
 * @example
 * <PixiSelect
 *   element={selectElement}
 *   onChange={(id, value) => handleValueChange(id, value)}
 * />
 */
export const PixiSelect = memo(function PixiSelect({
  element,
  onClick,
}: PixiSelectProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // Select 스타일 계산 (Skia 렌더링에 필요)
  const layoutStyle = useMemo(() => convertToSelectStyle(style, size), [style, size]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, layoutStyle.width, layoutStyle.height);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [layoutStyle.width, layoutStyle.height]
  );

  return (
    <pixiContainer>
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiSelect;
