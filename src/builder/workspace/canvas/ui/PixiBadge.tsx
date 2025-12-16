/**
 * Pixi Badge
 *
 * 🚀 Phase 1: Badge WebGL 컴포넌트 (Pattern A)
 *
 * JSX + Graphics.draw() 패턴을 사용한 간단한 배지 컴포넌트
 * - variant (default, primary, secondary, tertiary, error, surface) 지원
 * - size (sm, md, lg) 지원
 * - dot 모드 지원 (텍스트 없는 인디케이터)
 * - pulsing 애니메이션 지원
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  CanvasTextMetrics,
  Container as PixiContainer,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getBadgeSizePreset,
  getBadgeColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";

// ============================================
// Types
// ============================================

export interface PixiBadgeProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface BadgeElementProps {
  children?: string;
  text?: string;
  label?: string;
  count?: number;
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "surface";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  pulsing?: boolean;
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiBadge = memo(function PixiBadge({
  element,
  onClick,
}: PixiBadgeProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as BadgeElementProps | undefined;

  // 배지 텍스트
  const badgeText = useMemo(() => {
    if (props?.dot) return "";
    if (props?.count !== undefined) return String(props.count);
    return String(props?.children || props?.text || props?.label || "");
  }, [props?.children, props?.text, props?.label, props?.count, props?.dot]);

  // variant와 size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const isDot = Boolean(props?.dot);
  const isPulsing = Boolean(props?.pulsing);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getBadgeSizePreset(size), [size]);
  const colorPreset = useMemo(() => getBadgeColorPreset(variant), [variant]);

  // 색상 (inline style 오버라이드 지원)
  const bgColor = useMemo(() => {
    if (style?.backgroundColor) {
      return cssColorToHex(style.backgroundColor, colorPreset.background);
    }
    return colorPreset.background;
  }, [style?.backgroundColor, colorPreset.background]);

  const textColor = useMemo(() => {
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.text);
    }
    return colorPreset.text;
  }, [style?.color, colorPreset.text]);

  // 배지 크기 계산
  const badgeSize = useMemo(() => {
    if (isDot) {
      return {
        width: sizePreset.dotSize,
        height: sizePreset.dotSize,
      };
    }

    // 텍스트 기반 크기 계산
    const textStyle = new TextStyle({
      fontFamily: "Pretendard, sans-serif",
      fontSize: sizePreset.fontSize,
      fontWeight: "600",
    });

    if (badgeText) {
      const metrics = CanvasTextMetrics.measureText(badgeText, textStyle);
      const width = Math.max(sizePreset.minWidth, metrics.width + sizePreset.paddingX * 2);
      return {
        width,
        height: sizePreset.height,
      };
    }

    return {
      width: sizePreset.minWidth,
      height: sizePreset.height,
    };
  }, [isDot, sizePreset, badgeText]);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 펄싱 애니메이션 ref
  const containerRef = useRef<PixiContainer | null>(null);
  const pulseAnimationRef = useRef<number | null>(null);

  // 펄싱 애니메이션
  useEffect(() => {
    if (!isPulsing || !containerRef.current) {
      // 애니메이션 정리
      if (pulseAnimationRef.current) {
        cancelAnimationFrame(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.alpha = 1;
      }
      return;
    }

    let startTime: number | null = null;
    const duration = 2000; // 2초 주기

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // cubic-bezier(0.4, 0, 0.6, 1) 유사한 이징
      // 0에서 1까지 올라갔다가 다시 0.5로 내려감
      let alpha: number;
      if (progress < 0.5) {
        alpha = 1 - progress * 1; // 1 -> 0.5
      } else {
        alpha = 0.5 + (progress - 0.5) * 1; // 0.5 -> 1
      }

      if (containerRef.current) {
        containerRef.current.alpha = alpha;
      }

      pulseAnimationRef.current = requestAnimationFrame(animate);
    };

    pulseAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (pulseAnimationRef.current) {
        cancelAnimationFrame(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
      }
    };
  }, [isPulsing]);

  // 배지 배경 그리기
  const drawBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (isDot) {
        // 원형 점
        g.circle(badgeSize.width / 2, badgeSize.height / 2, badgeSize.width / 2);
        g.fill({ color: bgColor });
      } else {
        // 둥근 모서리 사각형 (pill 형태)
        const borderRadius = badgeSize.height / 2;
        drawBox(g, {
          width: badgeSize.width,
          height: badgeSize.height,
          backgroundColor: bgColor,
          backgroundAlpha: 1,
          borderRadius,
        });
      }
    },
    [isDot, badgeSize.width, badgeSize.height, bgColor]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: textColor,
        fontWeight: "600",
        align: "center",
      }),
    [sizePreset.fontSize, textColor]
  );

  // 텍스트 위치 (중앙 정렬)
  const textPosition = useMemo(() => {
    if (isDot || !badgeText) return { x: 0, y: 0 };

    const metrics = CanvasTextMetrics.measureText(badgeText, textStyle);
    return {
      x: (badgeSize.width - metrics.width) / 2,
      y: (badgeSize.height - metrics.height) / 2,
    };
  }, [isDot, badgeText, badgeSize.width, badgeSize.height, textStyle]);

  return (
    <pixiContainer
      x={posX}
      y={posY}
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 배지 배경 */}
      <pixiGraphics
        draw={drawBadge}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />

      {/* 배지 텍스트 (dot이 아닐 때만) */}
      {!isDot && badgeText && (
        <pixiText
          text={badgeText}
          style={textStyle}
          x={textPosition.x}
          y={textPosition.y}
          eventMode="static"
          cursor="pointer"
          onPointerDown={handleClick}
        />
      )}
    </pixiContainer>
  );
});

export default PixiBadge;
