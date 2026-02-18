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
 * - .react-aria-Panel: width: 100%, display: flex, flex-direction: column
 * - .panel-title: padding, font-weight, font-size, color, border-bottom
 * - .panel-content: padding, flex: 1, min-height: 64px
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';

import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { drawBox } from '../utils';

// 🚀 Spec Migration
import {
  PanelSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

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
  onClick,
  childElements,
  renderChildElement,
}: PixiPanelProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as PanelElementProps | undefined;

  // variant, size
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const title = useMemo(() => String(props?.title || ''), [props?.title]);

  // 🚀 CSS에서 프리셋 읽기 (Spec Migration)
  const sizePreset = useMemo(() => {
    const sizeSpec = PanelSpec.sizes[size] || PanelSpec.sizes[PanelSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const colorPreset = useMemo(() => {
    const variantSpec = PanelSpec.variants[variant] || PanelSpec.variants[PanelSpec.defaultVariant];
    const specColors = getSpecVariantColors(variantSpec, 'light');
    return {
      backgroundColor: specColors.bg,
      borderColor: specColors.border ?? specColors.bg,
      titleColor: specColors.text,
      textColor: specColors.text,
    };
  }, [variant]);

  // 타이틀 높이 계산
  // CSS: .panel-title { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--text-sm); }
  const titleHeight = title ? sizePreset.titleFontSize + sizePreset.titlePaddingY * 2 : 0;

  // 패널 콘텐츠 텍스트 (children)
  const contentText = useMemo(() => {
    return String(props?.children || '');
  }, [props?.children]);

  // Graphics 그리기용 픽셀 값 (fallback 사용)
  const panelWidth = 200;
  const panelHeight = 60;


  // 패널 배경 그리기
  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width: panelWidth,
        height: panelHeight,
        backgroundColor: colorPreset.backgroundColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
        border: {
          width: 1,
          color: colorPreset.borderColor,
          alpha: 1,
          style: 'solid' as const,
          radius: sizePreset.borderRadius,
        },
      });

      // 타이틀 구분선
      if (title && titleHeight > 0) {
        g.moveTo(0, titleHeight);
        g.lineTo(panelWidth, titleHeight);
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }
    },
    [panelWidth, panelHeight, colorPreset, sizePreset.borderRadius, title, titleHeight]
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

  // 🚀 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, panelWidth, panelHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [panelWidth, panelHeight]
  );

  const hasChildren = childElements && childElements.length > 0;

  return (
    <pixiContainer>
      {/* 패널 배경 */}
      <pixiGraphics draw={drawPanel} />

      {/* 타이틀 */}
      {title && (
        <pixiContainer>
          <pixiText
            text={title}
            style={titleStyle}
          />
        </pixiContainer>
      )}

      {/* 콘텐츠 - CSS .panel-content는 항상 존재하므로 항상 렌더링 */}
      <pixiContainer>
        {/* description */}
        {contentText && (
          <pixiText
            text={contentText}
            style={contentStyle}
          />
        )}
        {/* children-row: 가로 배치 */}
        {hasChildren && renderChildElement && (
          <pixiContainer>
            {childElements.map((childEl) => renderChildElement(childEl))}
          </pixiContainer>
        )}
      </pixiContainer>

      {/* 투명 히트 영역 (클릭 감지용) */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiPanel;
