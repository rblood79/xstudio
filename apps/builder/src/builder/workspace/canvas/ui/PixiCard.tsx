/**
 * Pixi Card
 *
 * 🚀 Phase 2: Card WebGL 컴포넌트 (Pattern A)
 *
 * 콘텐츠 컨테이너 카드 컴포넌트
 * - variant (default, primary, secondary, surface, elevated, outlined) 지원
 * - size (sm, md, lg) 지원
 * - hover 효과 지원
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex } from "../sprites/styleConverter";
import {
  getCardSizePreset,
  getVariantColors,
} from "../utils/cssVariableReader";
import { useThemeColors } from "../hooks/useThemeColors";
import { drawBox } from "../utils";
import { useStore } from "../../../stores";

// ============================================
// Types
// ============================================

export interface PixiCardProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  /** 🚀 Phase 10: Container children 요소들 */
  childElements?: Element[];
  /** 🚀 Phase 10: children 요소 렌더링 함수 */
  renderChildElement?: (element: Element) => React.ReactNode;
}

interface CardElementProps {
  children?: string;
  title?: string;
  heading?: string;
  subheading?: string;
  description?: string;
  variant?: "default" | "primary" | "secondary" | "surface" | "elevated" | "outlined";
  size?: "sm" | "md" | "lg";
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiCard = memo(function PixiCard({
  element,
  isSelected,
  onClick,
  childElements,
  renderChildElement,
}: PixiCardProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as CardElementProps | undefined;

  // 🚀 Store 액션 (선택된 요소의 layout 동기화용)
  const updateSelectedElementLayout = useStore((s) => s.updateSelectedElementLayout);

  // 상태
  const [isHovered, setIsHovered] = useState(false);

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getCardSizePreset(size), [size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (CSS 변수에서 읽어온 테마 색상 적용)
  // 🚀 Phase 8+: .react-aria-Card CSS와 동기화
  const colorPreset = useMemo(() => ({
    backgroundColor: themeColors.cardBg,        // CSS: var(--surface-container)
    hoverBgColor: themeColors.cardBgHover,      // CSS: color-mix(--surface-container, black)
    textColor: variantColors.text,              // CSS: var(--on-surface)
    borderColor: themeColors.cardBorder,        // CSS: var(--outline-variant)
    focusRingColor: variantColors.bg,
  }), [themeColors, variantColors]);

  // 현재 배경색 계산
  const currentBgColor = useMemo(() => {
    if (style?.backgroundColor) {
      return cssColorToHex(style.backgroundColor, colorPreset.backgroundColor);
    }
    return isHovered ? colorPreset.hoverBgColor : colorPreset.backgroundColor;
  }, [style, isHovered, colorPreset]);

  // 텍스트 색상
  const textColor = useMemo(() => {
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.textColor);
    }
    return colorPreset.textColor;
  }, [style, colorPreset]);

  // 테두리 색상
  const borderColor = useMemo(() => {
    if (style?.borderColor) {
      return cssColorToHex(style.borderColor, colorPreset.borderColor);
    }
    return colorPreset.borderColor;
  }, [style, colorPreset]);

  // 카드 제목 (heading 또는 title)
  const cardTitle = useMemo(() => {
    return String(props?.heading || props?.title || "");
  }, [props?.heading, props?.title]);

  // 카드 설명 (description 또는 children)
  const cardDescription = useMemo(() => {
    return String(props?.description || props?.children || "");
  }, [props?.description, props?.children]);

  // 카드 크기
  // 🚀 Phase 8+: CSS 기본값 width: 100% 동기화
  // 🚀 Phase 9: layout에서 계산된 크기 사용 (문자열 '300px' 등 지원)
  const fallbackWidth = 200;
  const fallbackHeight = 60;

  // Layout 시스템에서 계산된 크기 (onLayout 콜백으로 업데이트)
  const layoutWidthRef = useRef<number | null>(null);
  const layoutHeightRef = useRef<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);

  // Graphics 그리기용 픽셀 값 (layout 계산값 우선, fallback 사용)
  const cardWidth = layoutWidth ?? fallbackWidth;
  const cardHeight = layoutHeight ?? fallbackHeight;

  // 카드 배경 그리기
  const drawCard = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const borderWidth = variant === "outlined" ? 2 : variant === "elevated" ? 0 : 1;
      const hasShadow = variant === "elevated";

      // 그림자 효과 (elevated variant)
      if (hasShadow) {
        // 간단한 그림자 시뮬레이션 (여러 레이어)
        for (let i = 3; i >= 1; i--) {
          const shadowAlpha = 0.05 * (4 - i);
          g.roundRect(
            i * 2,
            i * 2,
            cardWidth,
            cardHeight,
            sizePreset.borderRadius
          );
          g.fill({ color: 0x000000, alpha: shadowAlpha });
        }
      }

      // 카드 본체
      drawBox(g, {
        width: cardWidth,
        height: cardHeight,
        backgroundColor: currentBgColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
        border:
          borderWidth > 0
            ? { width: borderWidth, color: borderColor, alpha: 1, style: 'solid' as const, radius: sizePreset.borderRadius }
            : undefined,
      });
    },
    [variant, cardWidth, cardHeight, sizePreset.borderRadius, currentBgColor, borderColor]
  );

  // 제목 텍스트 스타일
  const titleStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: 16,
        fill: textColor,
        fontWeight: "600",
        wordWrap: true,
        wordWrapWidth: cardWidth - sizePreset.padding * 2,
      }),
    [textColor, cardWidth, sizePreset.padding]
  );

  // 설명 텍스트 스타일
  const descriptionStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: 14,
        fill: textColor,
        fontWeight: "400",
        wordWrap: true,
        wordWrapWidth: cardWidth - sizePreset.padding * 2,
      }),
    [textColor, cardWidth, sizePreset.padding]
  );

  // 🚀 Phase 9: 외부 LayoutContainer가 width/height를 제어
  // PixiCard는 CSS 기본값과 동기화:
  // - width: 100% (CSS 기본값 .react-aria-Card { width: 100% })
  // - height: 미지정 (콘텐츠에 맞춤, CSS에서도 height 미지정)
  // % 값 이중 적용 방지: style.width='50%' → LayoutContainer(50%) + PixiCard(100%) = 50%
  //
  // 🚀 Phase 10: iframe 구조와 동기화
  // iframe: Card > card-header > card-content(children) > card-footer
  // CSS: .react-aria-Card { display: block }, .card-content는 스타일 없음 (block 기본)
  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-Card { display: block; width: 100%; }
  const cardLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: sizePreset.padding,
    minHeight: 60,
    // 콘텐츠 높이에 맞춤 (세로 늘어남 방지)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
  }), [sizePreset.padding]);

  // card-header 레이아웃 (제목, 부제목)
  const headerLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 2,
    marginBottom: (cardTitle || props?.subheading) ? 8 : 0,
  }), [cardTitle, props?.subheading]);

  // card-content 레이아웃 (description + children)
  // @pixi/layout에서 display: 'block'은 CSS와 다르게 동작
  // flex column으로 description과 children-row를 수직 배치
  // alignItems: 'flex-start'로 왼쪽 정렬
  const contentLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  }), []);

  // card-description 레이아웃 (display: block, width: 100%)
  // iframe: .card-description { display: block }
  // 전체 너비를 차지하여 다음 요소가 아래로 배치됨
  // alignItems: 'flex-start'로 텍스트 왼쪽 정렬
  const descriptionLayout = useMemo(() => ({
    display: 'flex',
    alignItems: 'flex-start',
    width: '100%',
  }), []);

  // children-row 레이아웃 (가로 배치 + 줄바꿈)
  // iframe에서 Card 내부 children은 inline-block으로 가로 배치
  // @pixi/layout에서는 flex row wrap으로 동일한 효과 구현
  // gap 없음 (iframe CSS와 동일)
  const childrenRowLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  }), []);

  // 이벤트 핸들러
  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 🚀 Phase 9: width와 height 모두 layout에서 가져오기
  // 🚀 Phase 20: 선택된 요소의 computed layout을 store에 동기화
  const handleLayout = useCallback((layout: { computedLayout?: { width?: number; height?: number } }) => {
    const nextWidth = layout.computedLayout?.width;
    const nextHeight = layout.computedLayout?.height;

    let changed = false;

    // Width 업데이트 (변경 시에만)
    if (nextWidth && layoutWidthRef.current !== nextWidth) {
      layoutWidthRef.current = nextWidth;
      setLayoutWidth(nextWidth);
      changed = true;
    }

    // Height 업데이트 (변경 시에만)
    if (nextHeight && layoutHeightRef.current !== nextHeight) {
      layoutHeightRef.current = nextHeight;
      setLayoutHeight(nextHeight);
      changed = true;
    }

    // 🚀 선택된 요소일 때만 store에 computed layout 동기화
    if (changed && isSelected && nextWidth && nextHeight) {
      updateSelectedElementLayout(element.id, {
        width: nextWidth,
        height: nextHeight,
      });
    }
  }, [isSelected, element.id, updateSelectedElementLayout]);

  // 🚀 Phase 20: isSelected가 true로 변경될 때 현재 layout 값을 store에 동기화
  // (선택 전에 handleLayout이 이미 호출되어 layout이 계산되었을 수 있음)
  useEffect(() => {
    if (isSelected && layoutWidthRef.current && layoutHeightRef.current) {
      updateSelectedElementLayout(element.id, {
        width: layoutWidthRef.current,
        height: layoutHeightRef.current,
      });
    }
  }, [isSelected, element.id, updateSelectedElementLayout]);

  // 🚀 Phase 19: 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, cardWidth, cardHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [cardWidth, cardHeight]
  );

  // 🚀 Phase 10: children이 있으면 배경 크기를 자동으로 조절하기 위해 layout 수정
  const hasChildren = childElements && childElements.length > 0;

  // 🚀 Phase 10: card-header 표시 여부 (heading, subheading, title 중 하나라도 있으면)
  const hasHeader = cardTitle || props?.subheading;

  // 🚀 Phase 10: card-content 표시 여부 (description 또는 children이 있으면)
  const hasContent = cardDescription || hasChildren;

  return (
    <pixiContainer layout={cardLayout} onLayout={handleLayout}>
      {/* 카드 배경 */}
      <pixiGraphics draw={drawCard} />

      {/* 🚀 Phase 10: card-header (iframe 구조 동기화) */}
      {hasHeader && (
        <pixiContainer layout={headerLayout}>
          {/* heading (또는 title) */}
          {cardTitle && (
            <pixiText
              text={cardTitle}
              style={titleStyle}
              layout={{ isLeaf: true }}
            />
          )}
          {/* subheading */}
          {props?.subheading && (
            <pixiText
              text={String(props.subheading)}
              style={descriptionStyle}
              layout={{ isLeaf: true }}
            />
          )}
        </pixiContainer>
      )}

      {/* 🚀 Phase 10: card-content (iframe 구조 동기화) */}
      {/* description과 children이 card-content 안에 수직 배치됨 */}
      {hasContent && (
        <pixiContainer layout={contentLayout}>
          {/* card-description (width: 100%) - 전체 너비 차지 */}
          {cardDescription && (
            <pixiContainer layout={descriptionLayout}>
              <pixiText
                text={cardDescription}
                style={descriptionStyle}
                layout={{ isLeaf: true }}
              />
            </pixiContainer>
          )}
          {/* children-row: 가로 배치 (flex row wrap) - description 아래 */}
          {hasChildren && renderChildElement && (
            <pixiContainer layout={childrenRowLayout}>
              {childElements.map((childEl) => renderChildElement(childEl))}
            </pixiContainer>
          )}
        </pixiContainer>
      )}

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiCard;
