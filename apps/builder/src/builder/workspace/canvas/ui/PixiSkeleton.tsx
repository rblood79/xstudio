/**
 * Pixi Skeleton
 *
 * 비인터랙티브 Skeleton 로딩 컴포넌트
 * - Skia가 시각적 렌더링을 담당, PixiJS는 히트 영역 없음 (eventMode="none")
 * - 히트 영역 크기는 LayoutComputedSizeContext(엔진 계산 결과) 사용
 *
 * @since Phase 7
 * @updated 2026-02-20 A등급 패턴 재작성 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useContext, useRef } from 'react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
} from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { LayoutComputedSizeContext } from '../layoutContext';

// ============================================
// Types
// ============================================

export interface PixiSkeletonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiSkeleton
 *
 * 비인터랙티브 Skeleton (Skia 렌더링)
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 * - eventMode: "none" — 비인터랙티브, 이벤트 무시
 */
export const PixiSkeleton = memo(function PixiSkeleton({
  element,
  //isSelected,
  //onClick,
  //onChange,
}: PixiSkeletonProps) {
  useExtend(PIXI_COMPONENTS);

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);

  // 투명 히트 영역 (이벤트 없음, 크기 참조용)
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, hitWidth, hitHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [hitWidth, hitHeight]
  );

  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 비인터랙티브 영역 - Skia가 시각적 렌더링 담당 / eventMode="none"으로 이벤트 무시 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="none"
      />
    </pixiContainer>
  );
});

export default PixiSkeleton;
