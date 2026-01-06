/**
 * PixiPanel - WebGL Panel Component
 *
 * Panel WebGL 컴포넌트 (Pattern A)
 *
 * 콘텐츠 컨테이너 패널 컴포넌트
 * - variant (default, tab, sidebar, card, modal) 지원
 * - size (sm, md, lg) 지원
 * - title 지원
 *
 * CSS 동기화:
 * - .react-aria-Panel: border-radius, background-color, border
 * - .panel-title: padding, font-weight, font-size, color, border-bottom
 * - .panel-content: padding, min-height
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { parseCSSSize } from '../sprites/styleConverter';
import {
  getPanelSizePreset,
  getPanelColorPreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

// ============================================
// Types
// ============================================

export interface PixiPanelProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  /** 부모 컨테이너 너비 (TabPanel 등에서 전달) */
  containerWidth?: number;
}

interface PanelElementProps {
  children?: string;
  title?: string;
  variant?: 'default' | 'tab' | 'sidebar' | 'card' | 'modal';
  size?: 'sm' | 'md' | 'lg';
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiPanel = memo(function PixiPanel({
  element,
  isSelected = false,
  onClick,
  containerWidth,
}: PixiPanelProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as PanelElementProps | undefined;

  // variant, size
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const title = useMemo(() => String(props?.title || ''), [props?.title]);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getPanelSizePreset(size), [size]);
  const colorPreset = useMemo(() => getPanelColorPreset(variant), [variant]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 패널 크기 (containerWidth가 있으면 사용, 없으면 style 또는 기본값)
  const panelWidth = parseCSSSize(style?.width, undefined, containerWidth || 280);

  // 타이틀 높이 계산
  // CSS: .panel-title { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--text-sm); }
  const titleHeight = title ? sizePreset.titleFontSize + sizePreset.titlePaddingY * 2 : 0;

  // 🚀 패널 높이 계산
  // CSS: .panel-content { min-height: 64px; padding: var(--spacing-md); }
  // CSS box-sizing: border-box로 min-height에 padding이 포함됨
  // 명시적 height가 없으면 title + content min-height로 자동 계산
  const calculatedHeight = titleHeight + sizePreset.minHeight;
  const panelHeight = parseCSSSize(style?.height, undefined, calculatedHeight);

  // 패널 콘텐츠 텍스트 (children)
  const contentText = useMemo(() => {
    return String(props?.children || '');
  }, [props?.children]);

  const panelLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: panelWidth,
    height: panelHeight,
  }), [panelWidth, panelHeight]);

  const titleLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'row',
    width: panelWidth,
    paddingBlock: sizePreset.titlePaddingY,
    paddingInline: sizePreset.titlePaddingX,
  }), [panelWidth, sizePreset.titlePaddingY, sizePreset.titlePaddingX]);

  const contentLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: panelWidth,
    padding: sizePreset.contentPadding,
    minHeight: sizePreset.minHeight,
  }), [panelWidth, sizePreset.contentPadding, sizePreset.minHeight]);

  // 패널 배경 그리기
  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // variant별 스타일 적용
      // CSS 동기화: .react-aria-Panel { border-radius: 8px; border: 1px solid #d4d4d4 }
      const hasBorder = true; // 모든 variant에서 border 적용
      const hasShadow = variant === 'card';
      const borderRadius = sizePreset.borderRadius; // 모든 variant에서 borderRadius 적용

      // 그림자 효과 (card variant)
      if (hasShadow) {
        for (let i = 3; i >= 1; i--) {
          const shadowAlpha = 0.05 * (4 - i);
          g.roundRect(i * 2, i * 2, panelWidth, panelHeight, borderRadius);
          g.fill({ color: 0x000000, alpha: shadowAlpha });
        }
      }

      // 패널 본체
      g.roundRect(0, 0, panelWidth, panelHeight, borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // 테두리
      if (hasBorder) {
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }

      // 타이틀 영역 구분선
      if (title) {
        g.moveTo(0, titleHeight);
        g.lineTo(panelWidth, titleHeight);
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, panelWidth + 4, panelHeight + 4, borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [variant, panelWidth, panelHeight, sizePreset.borderRadius, colorPreset, title, titleHeight, isSelected, variantColors.bg]
  );

  // 타이틀 텍스트 스타일
  const titleStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: sizePreset.titleFontSize,
        fill: colorPreset.titleColor,
        fontWeight: '600',
      }),
    [sizePreset.titleFontSize, colorPreset.titleColor]
  );

  // 콘텐츠 텍스트 스타일
  const contentStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: sizePreset.contentFontSize,
        fill: colorPreset.textColor,
        fontWeight: '400',
        wordWrap: true,
        wordWrapWidth: panelWidth - sizePreset.contentPadding * 2,
      }),
    [sizePreset.contentFontSize, sizePreset.contentPadding, colorPreset.textColor, panelWidth]
  );

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, panelWidth, panelHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [panelWidth, panelHeight]
  );

  return (
    <pixiContainer layout={panelLayout}>
      {/* 패널 배경 */}
      <pixiGraphics draw={drawPanel} />

      {/* 타이틀 */}
      {title && (
        <pixiContainer layout={titleLayout}>
          <pixiText
            text={title}
            style={titleStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>
      )}

      {/* 콘텐츠 */}
      {contentText && (
        <pixiContainer layout={contentLayout}>
          <pixiText
            text={contentText}
            style={contentStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>
      )}

      {/* 투명 히트 영역 (클릭 감지용) */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiPanel;
