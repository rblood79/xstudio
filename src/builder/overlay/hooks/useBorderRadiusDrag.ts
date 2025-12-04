/**
 * useBorderRadiusDrag - border-radius 드래그 인터랙션 훅
 *
 * Adobe XD 스타일의 코너 포인트 드래그로 border-radius 조절
 *
 * 성능 최적화:
 * - 드래그 중: Canvas에 직접 postMessage (즉시 렌더링)
 * - 드래그 종료: Inspector state 업데이트 (store 저장)
 */

import { useCallback, useRef, useEffect } from 'react';
import { useInspectorState } from '../../inspector/hooks/useInspectorState';
import { MessageService } from '../../../utils/messaging';
import { useStore } from '../../stores';

export type CornerPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface DragState {
  isDragging: boolean;
  corner: CornerPosition | null;
  initialRadius: number;
  initialMouseX: number;
  initialMouseY: number;
  maxRadius: number;
  lastRadius: number; // 마지막으로 적용된 radius (중복 업데이트 방지)
}

interface UseBorderRadiusDragOptions {
  onDragStart?: () => void;
  onDrag?: (radius: number, corner: CornerPosition) => void;
  onDragEnd?: (radius: number, corner: CornerPosition) => void;
}

/**
 * 현재 borderRadius 값을 파싱 (px, %, rem 등 → 숫자)
 */
function parseBorderRadius(value: string | undefined): number {
  if (!value || value === 'reset' || value === 'inherit' || value === 'initial') {
    return 0;
  }
  const firstValue = value.split(/\s+/)[0];
  const parsed = parseFloat(firstValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 개별 코너 속성 이름 매핑
 */
const cornerPropertyMap: Record<CornerPosition, string> = {
  topLeft: 'borderTopLeftRadius',
  topRight: 'borderTopRightRadius',
  bottomLeft: 'borderBottomLeftRadius',
  bottomRight: 'borderBottomRightRadius',
};

/**
 * 대각선 방향 계산 (코너별)
 */
function calculateDiagonalDistance(
  corner: CornerPosition,
  deltaX: number,
  deltaY: number
): number {
  switch (corner) {
    case 'topLeft':
      return (deltaX + deltaY) / Math.SQRT2;
    case 'topRight':
      return (-deltaX + deltaY) / Math.SQRT2;
    case 'bottomLeft':
      return (deltaX - deltaY) / Math.SQRT2;
    case 'bottomRight':
      return (-deltaX - deltaY) / Math.SQRT2;
    default:
      return 0;
  }
}

/**
 * Canvas에 직접 스타일 업데이트 전송 (빠른 프리뷰용)
 */
function sendStyleToCanvas(elementId: string, styleProps: Record<string, string>) {
  const iframe = MessageService.getIframe();
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'UPDATE_ELEMENT_PROPS',
      elementId,
      props: { style: styleProps },
      merge: true,
    }, window.location.origin);
  }
}

export function useBorderRadiusDrag(
  rect: { width: number; height: number } | null,
  currentBorderRadius: string | undefined,
  options: UseBorderRadiusDragOptions = {}
) {
  const { onDragStart, onDrag, onDragEnd } = options;

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    corner: null,
    initialRadius: 0,
    initialMouseX: 0,
    initialMouseY: 0,
    maxRadius: 0,
    lastRadius: -1,
  });

  // RAF throttling을 위한 ref
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ radius: number; shiftKey: boolean } | null>(null);

  const optionsRef = useRef({ onDrag, onDragEnd });
  optionsRef.current = { onDrag, onDragEnd };

  const handlersRef = useRef<{
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: (e: MouseEvent) => void;
  } | null>(null);

  useEffect(() => {
    // ⚡ RAF로 throttle된 Canvas 업데이트
    const flushPendingUpdate = () => {
      const pending = pendingUpdateRef.current;
      const state = dragStateRef.current;

      if (!pending || !state.corner) {
        rafIdRef.current = null;
        return;
      }

      const selectedElementId = useStore.getState().selectedElementId;
      if (!selectedElementId) {
        rafIdRef.current = null;
        pendingUpdateRef.current = null;
        return;
      }

      // 스타일 객체 생성
      let styleProps: Record<string, string>;
      if (pending.shiftKey) {
        styleProps = {
          borderTopLeftRadius: `${pending.radius}px`,
          borderTopRightRadius: `${pending.radius}px`,
          borderBottomLeftRadius: `${pending.radius}px`,
          borderBottomRightRadius: `${pending.radius}px`,
          borderRadius: `${pending.radius}px`,
        };
      } else {
        const property = cornerPropertyMap[state.corner];
        styleProps = { [property]: `${pending.radius}px` };
      }

      // Canvas에 전송
      sendStyleToCanvas(selectedElementId, styleProps);
      optionsRef.current.onDrag?.(pending.radius, state.corner);

      pendingUpdateRef.current = null;
      rafIdRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      const deltaX = e.clientX - state.initialMouseX;
      const deltaY = e.clientY - state.initialMouseY;
      const diagonalDistance = calculateDiagonalDistance(state.corner, deltaX, deltaY);

      let newRadius = Math.round(state.initialRadius + diagonalDistance);
      newRadius = Math.max(0, Math.min(state.maxRadius, newRadius));

      // 같은 값이면 스킵
      if (newRadius === state.lastRadius) return;
      state.lastRadius = newRadius;

      // ⚡ pending 업데이트 저장 (RAF가 처리)
      pendingUpdateRef.current = { radius: newRadius, shiftKey: e.shiftKey };

      // ⚡ RAF 스케줄 (이미 대기 중이면 스킵)
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushPendingUpdate);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      // ⚡ 상태 먼저 초기화 (추가 업데이트 방지)
      const corner = state.corner;
      const initialMouseX = state.initialMouseX;
      const initialMouseY = state.initialMouseY;
      const initialRadius = state.initialRadius;
      const maxRadius = state.maxRadius;

      dragStateRef.current = {
        isDragging: false,
        corner: null,
        initialRadius: 0,
        initialMouseX: 0,
        initialMouseY: 0,
        maxRadius: 0,
        lastRadius: -1,
      };

      // ⚡ RAF 취소
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingUpdateRef.current = null;

      // ⚡ 이벤트 리스너 제거 (handlersRef 사용)
      if (handlersRef.current) {
        document.removeEventListener('mousemove', handlersRef.current.handleMouseMove);
        document.removeEventListener('mouseup', handlersRef.current.handleMouseUp);
      }

      const deltaX = e.clientX - initialMouseX;
      const deltaY = e.clientY - initialMouseY;
      const diagonalDistance = calculateDiagonalDistance(corner, deltaX, deltaY);
      let finalRadius = Math.round(initialRadius + diagonalDistance);
      finalRadius = Math.max(0, Math.min(maxRadius, finalRadius));

      const shiftKey = e.shiftKey;

      // 선택된 요소 ID 가져오기
      const selectedElementId = useStore.getState().selectedElementId;
      if (!selectedElementId) return;

      // 스타일 객체 생성
      let styleProps: Record<string, string>;
      if (shiftKey) {
        styleProps = {
          borderTopLeftRadius: `${finalRadius}px`,
          borderTopRightRadius: `${finalRadius}px`,
          borderBottomLeftRadius: `${finalRadius}px`,
          borderBottomRightRadius: `${finalRadius}px`,
          borderRadius: `${finalRadius}px`,
        };
      } else {
        const property = cornerPropertyMap[corner];
        styleProps = { [property]: `${finalRadius}px` };
      }

      // ⚡ Canvas에 최종 값 직접 전송 (즉시 반영)
      sendStyleToCanvas(selectedElementId, styleProps);

      // ⚡ Inspector state 업데이트 (store 저장)
      const updateInlineStyle = useInspectorState.getState().updateInlineStyle;
      const updateInlineStyles = useInspectorState.getState().updateInlineStyles;

      if (shiftKey) {
        updateInlineStyles(styleProps);
      } else {
        const property = cornerPropertyMap[corner];
        updateInlineStyle(property, `${finalRadius}px`);
      }

      optionsRef.current.onDragEnd?.(finalRadius, corner);
    };

    handlersRef.current = { handleMouseMove, handleMouseUp };
  }, []);

  const handleDragStart = useCallback(
    (corner: CornerPosition, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!rect || !handlersRef.current) return;

      const initialRadius = parseBorderRadius(currentBorderRadius);
      const maxRadius = Math.min(rect.width, rect.height) / 2;

      dragStateRef.current = {
        isDragging: true,
        corner,
        initialRadius,
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        maxRadius,
        lastRadius: initialRadius,
      };

      onDragStart?.();

      document.addEventListener('mousemove', handlersRef.current.handleMouseMove);
      document.addEventListener('mouseup', handlersRef.current.handleMouseUp);
    },
    [rect, currentBorderRadius, onDragStart]
  );

  return {
    handleDragStart,
    isDragging: dragStateRef.current.isDragging,
    activeCorner: dragStateRef.current.corner,
  };
}
