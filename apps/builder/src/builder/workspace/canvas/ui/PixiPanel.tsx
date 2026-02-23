/**
 * Pixi Panel
 *
 * 투명 히트 영역(pixiGraphics) 기반 Panel 컨테이너
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - 히트 영역 크기는 LayoutComputedSizeContext(엔진 계산 결과) 사용
 * - 컨테이너 컴포넌트: eventMode="passive"
 *
 * @since Phase 2 WebGL Migration
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

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface PixiPanelProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  /** 부모 컨테이너 너비 (TabPanel 등에서 전달) */
  containerWidth?: number;
  /** Container children 요소들 */
  childElements?: Element[];
  /** children 요소 렌더링 함수 */
  renderChildElement?: (element: Element) => React.ReactNode;
}

// ============================================
// Component
// ============================================

/**
 * PixiPanel
 *
 * 투명 히트 영역 기반 Panel 컨테이너 (Skia 렌더링)
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 * - eventMode: "passive" — 컨테이너이므로 자식 이벤트 통과
 */
export const PixiPanel = memo(function PixiPanel({
  element,
  //isSelected,
  onClick,
  //containerWidth,
  //childElements,
  //renderChildElement,
}: PixiPanelProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as Record<string, unknown> | undefined;

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  // State (클릭 무시 판단용)
  const isDisabled = Boolean(props?.isDisabled);

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, hitWidth, hitHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [hitWidth, hitHeight]
  );

  // 클릭 핸들러 (modifier 키 전달)
  const handleClick = useCallback(
    (e: unknown) => {
      if (isDisabled) return;

      const pixiEvent = e as {
        metaKey?: boolean;
        shiftKey?: boolean;
        ctrlKey?: boolean;
        nativeEvent?: MouseEvent | PointerEvent;
      };

      const metaKey =
        pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
      const shiftKey =
        pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
      const ctrlKey =
        pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

      onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
    },
    [element.id, onClick, isDisabled]
  );

  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 투명 히트 영역 - Skia가 시각적 렌더링 담당 / passive: 컨테이너 자식 이벤트 통과 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="passive"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiPanel;
