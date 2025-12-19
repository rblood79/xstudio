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
  getCardColorPreset,
} from "../utils/cssVariableReader";
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
  const colorPreset = useMemo(() => getCardColorPreset(variant), [variant]);

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

  // 카드 크기
  const cardWidth = parseCSSSize(style?.width, undefined, 200);
  const cardHeight = parseCSSSize(style?.height, undefined, 120);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 카드 텍스트 (children 또는 title)
  const cardText = useMemo(() => {
    return String(props?.children || props?.title || "");
  }, [props?.children, props?.title]);

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
            ? { width: borderWidth, color: borderColor }
            : undefined,
      });
    },
    [variant, cardWidth, cardHeight, sizePreset.borderRadius, currentBgColor, borderColor]
  );

  // 텍스트 스타일
  const textStyle = useMemo(
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

  // 텍스트 위치 계산
  const textPosition = useMemo(() => {
    if (!cardText) return { x: 0, y: 0 };
    return {
      x: sizePreset.padding,
      y: sizePreset.padding,
    };
  }, [cardText, sizePreset.padding]);

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

      {/* 카드 텍스트 */}
      {cardText && (
        <pixiText
          text={cardText}
          style={textStyle}
          x={textPosition.x}
          y={textPosition.y}
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
