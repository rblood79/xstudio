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
import { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { measureWrappedTextHeight } from "../utils/textMeasure";
import { useStore } from "../../../stores";
import { LayoutComputedSizeContext } from "../layoutContext";

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

  // 🚀 LayoutComputedSizeContext로 Yoga 계산값 즉시 반영 (ToggleButtonGroup 패턴)
  // onLayout + useState 방식은 1프레임 이상 지연되어 크기 불일치 발생
  const computedSize = useContext(LayoutComputedSizeContext);
  const fallbackWidth = 200;
  const fallbackHeight = 60;

  // Graphics 그리기용 픽셀 값 (Yoga 계산값 우선, fallback 사용)
  const cardWidth = (computedSize?.width && computedSize.width > 0)
    ? computedSize.width : fallbackWidth;

  // 🚀 콘텐츠 기반 높이 계산 (Yoga가 텍스트 leaf를 정확히 측정하지 못하는 경우 대비)
  // Canvas 2D API로 word-wrap 줄 수를 정확히 측정하여 명시적 height 설정
  const calculatedContentHeight = useMemo(() => {
    const pad = sizePreset.padding;
    const wrapWidth = cardWidth - pad * 2;
    const fontFamily = 'Pretendard';
    let h = pad; // top padding

    if (cardTitle) {
      h += measureWrappedTextHeight(cardTitle, 16, 600, fontFamily, wrapWidth);
    }
    if (props?.subheading) {
      if (cardTitle) h += 2; // header gap
      h += measureWrappedTextHeight(String(props.subheading), 14, 400, fontFamily, wrapWidth);
    }
    if (cardTitle || props?.subheading) {
      h += 8; // marginBottom
    }
    if (cardDescription) {
      h += measureWrappedTextHeight(cardDescription, 14, 400, fontFamily, wrapWidth);
    }

    h += pad; // bottom padding
    return Math.max(h, 60); // minHeight 60
  }, [cardTitle, props?.subheading, cardDescription, cardWidth, sizePreset.padding]);

  // 🚀 높이는 콘텐츠 기반 계산값과 Yoga 값 중 큰 값 사용
  const yogaHeight = (computedSize?.height && computedSize.height > 0)
    ? computedSize.height : fallbackHeight;
  const cardHeight = Math.max(yogaHeight, calculatedContentHeight);

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

  // 🚀 Phase 9: 외부 LayoutContainer가 width를 제어
  // height: 'auto' → Yoga가 children(Button 등) 포함 자동 높이 계산
  // minHeight: calculatedContentHeight → 텍스트만 있는 경우 최소 높이 보장
  //   (Yoga가 텍스트 leaf를 정확히 측정하지 못하는 경우의 안전장치)
  // width: 설정하지 않음 — 부모 방향에 따라 Yoga가 결정:
  //   - column 부모: alignSelf: 'stretch' → 전체 너비 차지
  //   - row 부모: 콘텐츠 기반 너비 사용 (형제 요소와 공간 분배)
  const cardLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    height: 'auto' as unknown as number,
    minHeight: calculatedContentHeight,
    padding: sizePreset.padding,
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'stretch' as const,
  }), [sizePreset.padding, calculatedContentHeight]);

  // card-header 레이아웃 (제목, 부제목)
  const headerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: '100%' as unknown as number,
    gap: 2,
    marginBottom: (cardTitle || props?.subheading) ? 8 : 0,
  }), [cardTitle, props?.subheading]);

  // card-content 레이아웃 (description + children)
  // @pixi/layout에서 display: 'block'은 CSS와 다르게 동작
  // flex column으로 description과 children-row를 수직 배치
  // alignItems: 'flex-start'로 왼쪽 정렬
  // gap: 8 — description과 children-row 사이 간격 (headerLayout.marginBottom과 동일)
  const contentLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    width: '100%' as unknown as number,
    gap: 8,
  }), []);

  // card-description 레이아웃 (display: block, width: 100%)
  // iframe: .card-description { display: block }
  // 전체 너비를 차지하여 다음 요소가 아래로 배치됨
  // alignItems: 'flex-start'로 텍스트 왼쪽 정렬
  const descriptionLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    width: '100%' as unknown as number,
  }), []);

  // children-row 레이아웃 (가로 배치 + 줄바꿈)
  // iframe에서 Card 내부 children은 inline-block으로 가로 배치
  // @pixi/layout에서는 flex row wrap으로 동일한 효과 구현
  // gap 없음 (iframe CSS와 동일)
  const childrenRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    width: '100%' as unknown as number,
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

  // 🚀 Phase 20: 선택된 요소의 computed layout을 store에 동기화
  // LayoutComputedSizeContext가 변경되면 store 동기화
  useEffect(() => {
    if (isSelected && computedSize?.width && computedSize?.height) {
      updateSelectedElementLayout(element.id, {
        width: computedSize.width,
        height: computedSize.height,
      });
    }
  }, [isSelected, element.id, computedSize, updateSelectedElementLayout]);

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
    <pixiContainer layout={cardLayout}>
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
