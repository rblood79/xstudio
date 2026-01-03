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
import { memo, useCallback, useMemo, useState } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getCardSizePreset,
  getVariantColors,
} from "../utils/cssVariableReader";
import { useThemeColors } from "../hooks/useThemeColors";
import { drawBox } from "../utils";

// ============================================
// Types
// ============================================

export interface PixiCardProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
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
  onClick,
}: PixiCardProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as CardElementProps | undefined;

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

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    hoverBgColor: 0xf9fafb,
    textColor: variantColors.text,
    borderColor: 0xe5e7eb,
    focusRingColor: variantColors.bg,
  }), [variantColors]);

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
  const cardWidth = parseCSSSize(style?.width, undefined, 200);

  // 🚀 카드 높이 계산 (CSS box-sizing: border-box 반영)
  // padding(top) + title(20px) + description(18px per line) + padding(bottom)
  const calculatedHeight = useMemo(() => {
    const titleHeight = cardTitle ? 20 : 0; // fontSize(16) + gap(4)
    // description 줄 수 계산 (대략적)
    const descLineHeight = 18; // fontSize(14) + lineHeight
    const maxCharsPerLine = Math.floor((cardWidth - sizePreset.padding * 2) / 8); // 대략 글자당 8px
    const descLines = cardDescription ? Math.ceil(cardDescription.length / Math.max(maxCharsPerLine, 1)) : 0;
    const descHeight = descLines * descLineHeight;

    return sizePreset.padding * 2 + titleHeight + descHeight;
  }, [cardTitle, cardDescription, cardWidth, sizePreset.padding]);

  const cardHeight = parseCSSSize(style?.height, undefined, Math.max(calculatedHeight, 60));

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

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

  // 제목 높이 (description 위치 계산용)
  const titleHeight = cardTitle ? 20 : 0; // fontSize(16) + lineGap(4)

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

  // 🚀 Phase 19: 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, cardWidth, cardHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [cardWidth, cardHeight]
  );

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 카드 배경 */}
      <pixiGraphics draw={drawCard} />

      {/* 카드 제목 */}
      {cardTitle && (
        <pixiText
          text={cardTitle}
          style={titleStyle}
          x={sizePreset.padding}
          y={sizePreset.padding}
        />
      )}

      {/* 카드 설명 */}
      {cardDescription && (
        <pixiText
          text={cardDescription}
          style={descriptionStyle}
          x={sizePreset.padding}
          y={sizePreset.padding + titleHeight}
        />
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
