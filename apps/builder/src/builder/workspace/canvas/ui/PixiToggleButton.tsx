/**
 * Pixi ToggleButton
 *
 * 투명 히트 영역(pixiGraphics) 기반 ToggleButton
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - 히트 영역 크기는 LayoutComputedSizeContext(엔진 계산 결과) 사용
 * - selected/unselected 상태 토글 이벤트 전달
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 * @updated 2026-02-18 Skia 렌더링 전환 (히트 영역 전용으로 단순화)
 * @updated 2026-02-19 Wave 3: 엔진 계산 크기로 히트 영역 통합 (getToggleButtonLayout 제거)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useContext } from "react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
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

export interface PixiToggleButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onToggle?: (elementId: string, isSelected: boolean) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiToggleButton
 *
 * 투명 히트 영역 기반 ToggleButton (Skia 렌더링)
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 * - 토글: isSelected 상태에 따라 onToggle 콜백 전달
 *
 * @example
 * <PixiToggleButton
 *   element={toggleButtonElement}
 *   onClick={handleClick}
 *   onToggle={handleToggle}
 * />
 */
export const PixiToggleButton = memo(function PixiToggleButton({
  element,
  onClick,
  onToggle,
}: PixiToggleButtonProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as Record<string, unknown> | undefined;

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  // State (클릭 무시 / 토글 판단용)
  const isToggleSelected = Boolean(props?.isSelected);
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

  // 클릭 핸들러
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
      onToggle?.(element.id, !isToggleSelected);
    },
    [element.id, onClick, onToggle, isDisabled, isToggleSelected]
  );

  // 🚀 Wave 3: x/y 제거 - 위치는 DirectContainer에서 처리
  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 투명 히트 영역 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiToggleButton;
