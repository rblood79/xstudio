/**
 * PixiComboBox
 *
 * 투명 히트 영역 기반 ComboBox (Skia 렌더링)
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 *
 * @updated 2026-02-20 A등급 패턴으로 재작성 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useContext } from 'react';
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

export interface PixiComboBoxProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onDoubleClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiComboBox
 *
 * 투명 히트 영역 기반 ComboBox (Skia 렌더링)
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 */
export const PixiComboBox = memo(function PixiComboBox({
  element,
  //isSelected,
  onClick,
  onDoubleClick,
  onChange,
}: PixiComboBoxProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as Record<string, unknown> | undefined;

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

  const isDisabled = Boolean(props?.isDisabled);

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);

  // 더블클릭 감지용 타임스탬프
  const lastPointerDownRef = useRef(0);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, hitWidth, hitHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [hitWidth, hitHeight]
  );

  // 클릭 핸들러 (modifier 키 + 더블클릭 감지)
  const handleClick = useCallback(
    (e: unknown) => {
      if (isDisabled) return;

      const now = Date.now();
      const isDouble = Boolean(onDoubleClick) && now - lastPointerDownRef.current < 300;
      lastPointerDownRef.current = now;

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
      const currentValue = String(props?.value ?? '');
      onChange?.(element.id, currentValue);

      if (isDouble) {
        onDoubleClick?.(element.id);
      }
    },
    [element.id, onClick, onDoubleClick, onChange, isDisabled, props?.value]
  );

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

export default PixiComboBox;
