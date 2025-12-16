/**
 * Pixi Link
 *
 * 🚀 Phase 2: Link WebGL 컴포넌트 (Pattern A)
 *
 * 클릭 가능한 텍스트 링크 컴포넌트
 * - variant (default, primary, secondary) 지원
 * - size (sm, md, lg) 지원
 * - hover 시 밑줄 표시
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 */

import { memo, useCallback, useMemo, useState } from "react";
import { TextStyle, CanvasTextMetrics, Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getLinkSizePreset,
  getLinkColorPreset,
} from "../utils/cssVariableReader";

// ============================================
// Types
// ============================================

export interface PixiLinkProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface LinkElementProps {
  children?: string;
  text?: string;
  href?: string;
  variant?: "default" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiLink = memo(function PixiLink({
  element,
  onClick,
}: PixiLinkProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as LinkElementProps | undefined;

  // 상태
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // 링크 텍스트
  const linkText = useMemo(() => {
    return String(props?.children || props?.text || "Link");
  }, [props?.children, props?.text]);

  // variant, size
  const variant = useMemo(() => String(props?.variant || "primary"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const isDisabled = Boolean(props?.isDisabled);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getLinkSizePreset(size), [size]);
  const colorPreset = useMemo(() => getLinkColorPreset(variant), [variant]);

  // 현재 색상 계산
  const currentColor = useMemo(() => {
    if (isDisabled) return 0x9ca3af;
    if (isPressed) return colorPreset.pressedColor;
    if (isHovered) return colorPreset.hoverColor;
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.color);
    }
    return colorPreset.color;
  }, [isDisabled, isPressed, isHovered, style?.color, colorPreset]);

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: currentColor,
        fontWeight: "500",
      }),
    [sizePreset.fontSize, currentColor]
  );

  // 텍스트 크기 계산
  const textSize = useMemo(() => {
    const metrics = CanvasTextMetrics.measureText(linkText, textStyle);
    return {
      width: metrics.width,
      height: metrics.height,
    };
  }, [linkText, textStyle]);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 밑줄 그리기
  const drawUnderline = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (isHovered && !isDisabled) {
        g.setStrokeStyle({
          width: 2,
          color: currentColor,
        });
        g.moveTo(0, textSize.height + 2);
        g.lineTo(textSize.width, textSize.height + 2);
        g.stroke();
      }
    },
    [isHovered, isDisabled, currentColor, textSize.width, textSize.height]
  );

  // 이벤트 핸들러
  const handlePointerEnter = useCallback(() => {
    if (!isDisabled) setIsHovered(true);
  }, [isDisabled]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handlePointerDown = useCallback(() => {
    if (!isDisabled) setIsPressed(true);
  }, [isDisabled]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    if (!isDisabled) {
      onClick?.(element.id);
    }
  }, [isDisabled, element.id, onClick]);

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 링크 텍스트 */}
      <pixiText
        text={linkText}
        style={textStyle}
        eventMode="static"
        cursor={isDisabled ? "not-allowed" : "pointer"}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      {/* hover 시 밑줄 */}
      <pixiGraphics draw={drawUnderline} />
    </pixiContainer>
  );
});

export default PixiLink;
