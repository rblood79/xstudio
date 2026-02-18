/**
 * Pixi Badge
 *
 * 투명 히트 영역(pixiGraphics) 기반 Badge
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - 히트 영역 크기는 LayoutComputedSizeContext(엔진 계산 결과) 사용
 * - pulsing 애니메이션은 컨테이너 alpha로 유지
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 * @updated 2026-02-19 Wave 4: LayoutComputedSizeContext 전환 (수동 크기 계산 제거)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useRef, useContext } from "react";
import {
  Graphics as PixiGraphicsClass,
  Container as PixiContainer,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import { LayoutComputedSizeContext } from '../layoutContext';

// ============================================
// Types
// ============================================

export interface PixiBadgeProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiBadge
 *
 * 투명 히트 영역 기반 Badge (Skia 렌더링)
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 * - 애니메이션: pulsing prop에 따라 컨테이너 alpha 애니메이션 유지
 *
 * @example
 * <PixiBadge element={badgeElement} onClick={handleClick} />
 */
export const PixiBadge = memo(function PixiBadge({
  element,
  onClick,
}: PixiBadgeProps) {
  useExtend(PIXI_COMPONENTS);

  const props = element.props as Record<string, unknown> | undefined;
  const isPulsing = Boolean(props?.pulsing);

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  // 펄싱 애니메이션 ref
  const containerRef = useRef<PixiContainer | null>(null);
  const pulseAnimationRef = useRef<number | null>(null);

  // 펄싱 애니메이션
  useEffect(() => {
    if (!isPulsing || !containerRef.current) {
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

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, hitWidth, hitHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [hitWidth, hitHeight]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 투명 히트 영역 — Skia가 시각적 렌더링 담당 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiBadge;
