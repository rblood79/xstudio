/**
 * Pixi FancyButton
 *
 * 투명 히트 영역(pixiGraphics) 기반 FancyButton
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 *
 * @since 2025-12-13 Phase 6.5
 * @updated 2026-02-18 @pixi/ui FancyButton 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphicsClass } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { adjustColor } from '../utils/colorMath';

// 🚀 Spec Migration
import { FancyButtonSpec, getVariantColors as getSpecVariantColors, getSizePreset as getSpecSizePreset } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiFancyButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface FancyButtonLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  hoverColor: number;
  pressedColor: number;
  disabledColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  borderRadius: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

function convertToFancyButtonStyle(style: CSSStyle | undefined, themeDefaultColor: number): FancyButtonLayoutStyle {
  // Extract RGB from backgroundColor
  const bgColor = (() => {
    const bg = style?.backgroundColor;
    if (!bg) return themeDefaultColor;
    if (typeof bg === 'number') return bg;
    if (typeof bg === 'string') {
      if (bg.startsWith('#')) {
        return parseInt(bg.slice(1), 16);
      }
    }
    return themeDefaultColor;
  })();

  // Extract RGB from color
  const textColor = (() => {
    const col = style?.color;
    if (!col) return 0xffffff;
    if (typeof col === 'number') return col;
    if (typeof col === 'string') {
      if (col.startsWith('#')) {
        return parseInt(col.slice(1), 16);
      }
    }
    return 0xffffff;
  })();

  // 🚀 Phase 8: parseCSSSize 제거 - fallback 값 직접 사용
  return {
    x: typeof style?.left === 'number' ? style.left : 0,
    y: typeof style?.top === 'number' ? style.top : 0,
    width: typeof style?.width === 'number' ? style.width : 120,
    height: typeof style?.height === 'number' ? style.height : 40,
    backgroundColor: bgColor,
    hoverColor: adjustColor(bgColor, 0.9), // 약간 어둡게
    pressedColor: adjustColor(bgColor, 0.8), // 더 어둡게
    disabledColor: 0xcccccc,
    textColor: textColor,
    fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 14,
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : 8,
    paddingLeft: typeof (style?.paddingLeft || style?.padding) === 'number' ? (style?.paddingLeft || style?.padding) as number : 16,
    paddingRight: typeof (style?.paddingRight || style?.padding) === 'number' ? (style?.paddingRight || style?.padding) as number : 16,
    paddingTop: typeof (style?.paddingTop || style?.padding) === 'number' ? (style?.paddingTop || style?.padding) as number : 8,
    paddingBottom: typeof (style?.paddingBottom || style?.padding) === 'number' ? (style?.paddingBottom || style?.padding) as number : 8,
  };
}

// ============================================
// Component
// ============================================

/**
 * PixiFancyButton
 *
 * 투명 히트 영역 기반 FancyButton
 * Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 *
 * @example
 * <PixiFancyButton
 *   element={fancyButtonElement}
 *   onClick={(id) => handleClick(id)}
 * />
 */
export const PixiFancyButton = memo(function PixiFancyButton({
  element,
  onClick,
}: PixiFancyButtonProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = FancyButtonSpec.variants[variant] || FancyButtonSpec.variants[FancyButtonSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // FancyButton 스타일 (테마 색상 적용 - 크기 계산에 필요)
  const layoutStyle = useMemo(() => convertToFancyButtonStyle(style, variantColors.bg), [style, variantColors.bg]);

  // disabled 상태
  const isDisabled = useMemo(() => Boolean(props?.disabled), [props?.disabled]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick?.(element.id);
    }
  }, [element.id, onClick, isDisabled]);

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, layoutStyle.width, layoutStyle.height);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [layoutStyle.width, layoutStyle.height]
  );

  return (
    <pixiContainer>
      {/* 투명 히트 영역 - Skia가 시각적 렌더링 담당 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiFancyButton;
