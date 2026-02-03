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
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import {
  getPanelSizePreset,
  getPanelColorPreset,
} from '../utils/cssVariableReader';
import { drawBox } from '../utils';

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

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getPanelSizePreset(size), [size]);
  const colorPreset = useMemo(() => getPanelColorPreset(variant), [variant]);

  // 타이틀 높이 계산
  // CSS: .panel-title { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--text-sm); }
  const titleHeight = title ? sizePreset.titleFontSize + sizePreset.titlePaddingY * 2 : 0;

  // 패널 콘텐츠 텍스트 (children)
  const contentText = useMemo(() => {
    return String(props?.children || '');
  }, [props?.children]);

  // 🚀 Phase 8: Layout 시스템에서 계산된 크기 (onLayout 콜백으로 업데이트)
  const layoutWidthRef = useRef<number | null>(null);
  const layoutHeightRef = useRef<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);

  // Graphics 그리기용 픽셀 값 (layout 계산값 우선, fallback 사용)
  const fallbackWidth = 200;
  const fallbackHeight = 60;
  const panelWidth = layoutWidth ?? fallbackWidth;
  const panelHeight = layoutHeight ?? fallbackHeight;

  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-Panel { width: 100%; display: flex; flex-direction: column; }
  // 주의: padding 없음 - padding은 .panel-content에만 있음
  const panelLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: '100%' as unknown as number,
    // 콘텐츠 높이에 맞춤 (세로 늘어남 방지)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start' as const,
  }), []);

  // panel-title 레이아웃
  // CSS: .panel-title { padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border-color); }
  const titleLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    width: '100%' as unknown as number,
    padding: sizePreset.titlePaddingY,
    paddingLeft: sizePreset.titlePaddingX,
    paddingRight: sizePreset.titlePaddingX,
  }), [sizePreset.titlePaddingY, sizePreset.titlePaddingX]);

  // panel-content 레이아웃
  // CSS: .panel-content { padding: var(--spacing-md); flex: 1; min-height: 64px; }
  const contentLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    width: '100%' as unknown as number,
    padding: sizePreset.contentPadding,
    flexGrow: 1,
    minHeight: sizePreset.minHeight,
  }), [sizePreset.contentPadding, sizePreset.minHeight]);

  // children-row 레이아웃 (가로 배치 + 줄바꿈)
  const childrenRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    width: '100%' as unknown as number,
  }), []);

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

  // 🚀 Phase 8: onLayout 콜백으로 computed layout 받기
  const handleLayout = useCallback((layout: { computedLayout?: { width?: number; height?: number } }) => {
    const nextWidth = layout.computedLayout?.width;
    const nextHeight = layout.computedLayout?.height;

    if (nextWidth && layoutWidthRef.current !== nextWidth) {
      layoutWidthRef.current = nextWidth;
      setLayoutWidth(nextWidth);
    }

    if (nextHeight && layoutHeightRef.current !== nextHeight) {
      layoutHeightRef.current = nextHeight;
      setLayoutHeight(nextHeight);
    }
  }, []);

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
    // @ts-expect-error - onLayout is added by @pixi/layout at runtime
    <pixiContainer layout={panelLayout} onLayout={handleLayout}>
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

      {/* 콘텐츠 - CSS .panel-content는 항상 존재하므로 항상 렌더링 */}
      <pixiContainer layout={contentLayout}>
        {/* description */}
        {contentText && (
          <pixiText
            text={contentText}
            style={contentStyle}
            layout={{ isLeaf: true }}
          />
        )}
        {/* children-row: 가로 배치 */}
        {hasChildren && renderChildElement && (
          <pixiContainer layout={childrenRowLayout}>
            {childElements.map((childEl) => renderChildElement(childEl))}
          </pixiContainer>
        )}
      </pixiContainer>

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
