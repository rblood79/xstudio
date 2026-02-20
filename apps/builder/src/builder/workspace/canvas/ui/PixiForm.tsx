/**
 * Pixi Form
 *
 * 투명 히트 영역(pixiGraphics) 기반 Form 컨테이너
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - 컨테이너 역할 — eventMode="passive"
 *
 * @updated 2026-02-20 A등급 패턴 재작성 (시각 드로잉 제거, Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useContext } from 'react';
import { Graphics as PixiGraphicsClass } from 'pixi.js';
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

export interface PixiFormProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiForm
 *
 * 투명 히트 영역 기반 Form 컨테이너 (Skia 렌더링)
 * - 컨테이너 역할 (eventMode="passive") — 자식 이벤트 전파 허용
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
 */
export const PixiForm = memo(function PixiForm({
  element,
  //isSelected,
  onClick,
}: PixiFormProps) {
  useExtend(PIXI_COMPONENTS);

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? 0;
  const hitHeight = computedSize?.height ?? 0;

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
      const pixiEvent = e as {
        metaKey?: boolean;
        shiftKey?: boolean;
        ctrlKey?: boolean;
        nativeEvent?: MouseEvent | PointerEvent;
      };

      const metaKey = pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
      const shiftKey = pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
      const ctrlKey = pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

      onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
    },
    [element.id, onClick]
  );

  return (
    <pixiContainer>
      {/* Form 컨테이너 — 자식 이벤트 전파를 허용하는 passive 모드 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="passive"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiForm;
