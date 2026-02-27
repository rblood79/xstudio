/**
 * PixiTooltip
 *
 * 투명 히트 영역 기반 Tooltip (Skia 렌더링)
 * - Tooltip은 비인터랙티브: eventMode="none"
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 *
 * @updated 2026-02-20 A등급 패턴으로 재작성 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useContext } from 'react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
} from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { LayoutComputedSizeContext } from '../layoutContext';

// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface PixiTooltipProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiTooltip
 *
 * 비인터랙티브 투명 히트 영역 기반 Tooltip (Skia 렌더링)
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 * - Tooltip은 hover로 표시되므로 이벤트 전달 안 함 (eventMode="none")
 */
export const PixiTooltip = memo(function PixiTooltip({
  element: _element,
  //isSelected,
  //onClick,
}: PixiTooltipProps) {
  useExtend(PIXI_COMPONENTS);

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  // 투명 히트 영역 (비인터랙티브 — 이벤트 통과)
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, hitWidth, hitHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [hitWidth, hitHeight]
  );

  // Tooltip은 비인터랙티브이므로 eventMode="none" 사용
  return (
    <pixiContainer
      ref={(_c: PixiContainer | null) => {
        // DirectContainer가 위치 처리
      }}
    >
      {/* 비인터랙티브 히트 영역 — Skia가 시각적 렌더링 담당 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="none"
      />
    </pixiContainer>
  );
});

export default PixiTooltip;
