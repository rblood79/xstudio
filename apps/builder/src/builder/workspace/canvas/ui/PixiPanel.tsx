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
import { TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
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
  /** 🚀 Phase 10: Container children 요소들 */
  childElements?: Element[];
  /** 🚀 Phase 10: children 요소 렌더링 함수 */
  renderChildElement?: (element: Element) => React.ReactNode;
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
  childElements,
  renderChildElement,
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

  // 🚀 @pixi/layout: style 값을 그대로 전달 (% 문자열 지원)
  const styleWidth = style?.width;
  const styleHeight = style?.height;
  // Graphics 그리기 등 픽셀 값이 필요한 경우의 fallback
  const fallbackWidth = containerWidth || 280;

  // 타이틀 높이 계산
  // CSS: .panel-title { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--text-sm); }
  const titleHeight = title ? sizePreset.titleFontSize + sizePreset.titlePaddingY * 2 : 0;

  // 🚀 패널 높이 계산
  // CSS: .panel-content { min-height: 64px; padding: var(--spacing-md); }
  // 명시적 height가 없으면 title + content min-height로 자동 계산
  const fallbackHeight = titleHeight + sizePreset.minHeight;

  // 패널 콘텐츠 텍스트 (children)
  const contentText = useMemo(() => {
    return String(props?.children || '');
  }, [props?.children]);

  // 🚀 @pixi/layout: layout prop에 style 값 직접 전달 (% 지원)
  const panelLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: styleWidth ?? fallbackWidth,
    height: styleHeight ?? fallbackHeight,
  }), [styleWidth, styleHeight, fallbackWidth, fallbackHeight]);

  const titleLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    width: '100%',
    paddingBlock: sizePreset.titlePaddingY,
    paddingInline: sizePreset.titlePaddingX,
  }), [sizePreset.titlePaddingY, sizePreset.titlePaddingX]);

  const contentLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: '100%',
    flexGrow: 1,
    padding: sizePreset.contentPadding,
    minHeight: sizePreset.minHeight,
  }), [sizePreset.contentPadding, sizePreset.minHeight]);

  // 🚀 @pixi/layout: Graphics는 컨테이너 크기에 맞춰 자동으로 그려짐
  // backgroundColor, borderColor 등은 layout prop으로 처리
  const backgroundLayout = useMemo(() => ({
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    backgroundColor: colorPreset.backgroundColor,
    borderWidth: 1,
    borderColor: colorPreset.borderColor,
    borderRadius: sizePreset.borderRadius,
  }), [colorPreset.backgroundColor, colorPreset.borderColor, sizePreset.borderRadius]);

  // 선택 표시 레이아웃
  const selectionLayout = useMemo(() => ({
    position: 'absolute' as const,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: variantColors.bg,
    borderRadius: sizePreset.borderRadius + 2,
  }), [variantColors.bg, sizePreset.borderRadius]);

  // 타이틀 구분선 레이아웃
  const titleDividerLayout = useMemo(() => ({
    position: 'absolute' as const,
    top: titleHeight,
    left: 0,
    width: '100%',
    height: 1,
    backgroundColor: colorPreset.borderColor,
  }), [titleHeight, colorPreset.borderColor]);

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
  // 🚀 @pixi/layout: wordWrapWidth는 fallback 사용 (텍스트는 컨테이너에 맞춰짐)
  const contentStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: sizePreset.contentFontSize,
        fill: colorPreset.textColor,
        fontWeight: '400',
        wordWrap: true,
        wordWrapWidth: fallbackWidth - sizePreset.contentPadding * 2,
      }),
    [sizePreset.contentFontSize, sizePreset.contentPadding, colorPreset.textColor, fallbackWidth]
  );

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 🚀 @pixi/layout: 히트 영역을 layout으로 처리
  const hitAreaLayout = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }), []);

  return (
    <pixiContainer layout={panelLayout}>
      {/* 🚀 @pixi/layout: 배경을 layout으로 처리 */}
      <pixiContainer layout={backgroundLayout} />

      {/* 선택 표시 */}
      {isSelected && <pixiContainer layout={selectionLayout} />}

      {/* 타이틀 구분선 */}
      {title && <pixiContainer layout={titleDividerLayout} />}

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

      {/* 🚀 Phase 10: Container children 렌더링 */}
      {childElements && renderChildElement && childElements.map((childEl) => renderChildElement(childEl))}

      {/* 🚀 @pixi/layout: 히트 영역을 layout으로 처리 */}
      <pixiContainer
        layout={hitAreaLayout}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiPanel;
