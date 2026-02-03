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
  Text as PixiText,
  Container as PixiContainer,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex } from "../sprites/styleConverter";
import {
  getBadgeSizePreset,
  getBadgeColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";
import { measureTextWidth as measureTextWidthCanvas } from "../layout/engines/utils";

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

function measureTextSize(text: string, style: TextStyle): { width: number; height: number } {
  const textView = new PixiText({ text, style });
  const bounds = textView.getLocalBounds();
  textView.destroy({ children: true });
  return { width: bounds.width, height: bounds.height };
}

/**
 * CSS 크기 값을 숫자로 파싱
 * 명시적 width/height가 있으면 해당 값 사용
 */
function parseStyleSize(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return undefined;
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
  }, [style, colorPreset]);

  const textColor = useMemo(() => {
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.text);
    }
    return colorPreset.text;
  }, [style, colorPreset]);

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

  // 🚀 텍스트 너비 측정 - Canvas 2D measureText 사용 (BlockEngine과 동일)
  // PixiButton과 동일한 방식으로 display:block에서도 정확한 레이아웃 보장
  const textWidth = useMemo(() => {
    if (isDot || !badgeText) return 0;
    const fontFamily = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif";
    return measureTextWidthCanvas(badgeText, sizePreset.fontSize, fontFamily);
  }, [isDot, badgeText, sizePreset.fontSize]);

  // PixiJS 텍스트 메트릭 (렌더링 배치용 - 높이 필요)
  const textMetrics = useMemo(() => {
    if (isDot || !badgeText) return null;
    return measureTextSize(badgeText, textStyle);
  }, [isDot, badgeText, textStyle]);

  // 배지 크기 계산
  // 🚀 Button과 동일한 방식: padding + textWidth + padding (border 없음)
  // BlockEngine calculateContentWidth와 동일한 계산 결과 보장
  const badgeSize = useMemo(() => {
    if (isDot) {
      return {
        width: sizePreset.dotSize,
        height: sizePreset.dotSize,
      };
    }

    // 명시적 width/height 파싱
    const explicitWidth = parseStyleSize(style?.width);
    const explicitHeight = parseStyleSize(style?.height);

    // 🚀 자동 계산 크기: paddingLeft + textWidth + paddingRight
    // Badge는 border 없음, minWidth 적용
    const paddingLeft = sizePreset.paddingX;
    const paddingRight = sizePreset.paddingX;
    const minRequiredWidth = paddingLeft + textWidth + paddingRight;
    const autoWidth = Math.max(sizePreset.minWidth, minRequiredWidth);

    return {
      width: explicitWidth ?? autoWidth,
      height: explicitHeight ?? sizePreset.height,
    };
  }, [isDot, sizePreset, textWidth, style?.width, style?.height]);

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

  // 텍스트 위치 (중앙 정렬)
  // 🚀 너비는 Canvas 2D textWidth 사용, 높이는 PixiJS textMetrics 사용
  const textPosition = useMemo(() => {
    if (isDot || !badgeText || !textMetrics) return { x: 0, y: 0 };
    return {
      x: (badgeSize.width - textWidth) / 2,
      y: (badgeSize.height - textMetrics.height) / 2,
    };
  }, [isDot, badgeText, badgeSize.width, badgeSize.height, textWidth, textMetrics]);

  // 🚀 Phase 19: 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, badgeSize.width, badgeSize.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [badgeSize.width, badgeSize.height]
  );

  // @pixi/layout에 크기 전달 - Yoga 레이아웃 계산용
  const badgeLayout = useMemo(() => ({
    width: badgeSize.width,
    height: badgeSize.height,
  }), [badgeSize.width, badgeSize.height]);

  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
      layout={badgeLayout}
    >
      {/* 배지 배경 */}
      <pixiGraphics draw={drawBadge} />

      {/* 배지 텍스트 (dot이 아닐 때만) */}
      {!isDot && badgeText && (
        <pixiText
          text={badgeText}
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
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiBadge;
