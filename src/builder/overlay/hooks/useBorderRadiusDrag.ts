/**
 * useBorderRadiusDrag - border-radius 드래그 인터랙션 훅
 *
 * Adobe XD 스타일의 코너 포인트 드래그로 border-radius 조절
 */

import { useCallback, useRef, useEffect } from 'react';
import { useInspectorState } from '../../inspector/hooks/useInspectorState';

export type CornerPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface DragState {
  isDragging: boolean;
  corner: CornerPosition | null;
  initialRadius: number;
  initialMouseX: number;
  initialMouseY: number;
  maxRadius: number;
}

interface UseBorderRadiusDragOptions {
  /**
   * 드래그 시작 콜백
   */
  onDragStart?: () => void;
  /**
   * 드래그 중 콜백
   */
  onDrag?: (radius: number, corner: CornerPosition) => void;
  /**
   * 드래그 종료 콜백
   */
  onDragEnd?: (radius: number, corner: CornerPosition) => void;
}

/**
 * 현재 borderRadius 값을 파싱 (px, %, rem 등 → 숫자)
 */
function parseBorderRadius(value: string | undefined): number {
  if (!value || value === 'reset' || value === 'inherit' || value === 'initial') {
    return 0;
  }

  // 여러 값이 있는 경우 (e.g., "10px 20px 10px 20px") 첫 번째 값 사용
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
 * 양수 = 안쪽으로 드래그 (radius 증가)
 * 음수 = 바깥으로 드래그 (radius 감소)
 */
function calculateDiagonalDistance(
  corner: CornerPosition,
  deltaX: number,
  deltaY: number
): number {
  // 각 코너별 대각선 방향
  // topLeft: 오른쪽 아래로 드래그 = radius 증가
  // topRight: 왼쪽 아래로 드래그 = radius 증가
  // bottomLeft: 오른쪽 위로 드래그 = radius 증가
  // bottomRight: 왼쪽 위로 드래그 = radius 증가

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
  });

  // 옵션을 ref로 저장하여 최신 값 참조
  const optionsRef = useRef({ onDrag, onDragEnd });
  optionsRef.current = { onDrag, onDragEnd };

  // 이벤트 핸들러를 ref로 저장
  const handlersRef = useRef<{
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: (e: MouseEvent) => void;
  } | null>(null);

  // 핸들러 초기화 (컴포넌트 마운트 시 한 번)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      const deltaX = e.clientX - state.initialMouseX;
      const deltaY = e.clientY - state.initialMouseY;

      // 대각선 거리 계산
      const diagonalDistance = calculateDiagonalDistance(state.corner, deltaX, deltaY);

      // 새 radius 계산 (0 ~ maxRadius 범위)
      let newRadius = Math.round(state.initialRadius + diagonalDistance);
      newRadius = Math.max(0, Math.min(state.maxRadius, newRadius));

      // 스타일 업데이트
      const updateInlineStyle = useInspectorState.getState().updateInlineStyle;
      const updateInlineStyles = useInspectorState.getState().updateInlineStyles;

      if (e.shiftKey) {
        // Shift+드래그: 모든 코너 동시 조절
        updateInlineStyles({
          borderTopLeftRadius: `${newRadius}px`,
          borderTopRightRadius: `${newRadius}px`,
          borderBottomLeftRadius: `${newRadius}px`,
          borderBottomRightRadius: `${newRadius}px`,
          borderRadius: `${newRadius}px`,
        });
      } else {
        // 기본: 개별 코너 조절
        const property = cornerPropertyMap[state.corner];
        updateInlineStyle(property, `${newRadius}px`);
      }

      optionsRef.current.onDrag?.(newRadius, state.corner);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      // 최종 radius 계산
      const deltaX = e.clientX - state.initialMouseX;
      const deltaY = e.clientY - state.initialMouseY;
      const diagonalDistance = calculateDiagonalDistance(state.corner, deltaX, deltaY);
      let finalRadius = Math.round(state.initialRadius + diagonalDistance);
      finalRadius = Math.max(0, Math.min(state.maxRadius, finalRadius));

      const corner = state.corner;

      // 상태 초기화
      dragStateRef.current = {
        isDragging: false,
        corner: null,
        initialRadius: 0,
        initialMouseX: 0,
        initialMouseY: 0,
        maxRadius: 0,
      };

      // Global listeners 제거
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 콜백 호출 (상태 초기화 후)
      optionsRef.current.onDragEnd?.(finalRadius, corner);
    };

    handlersRef.current = { handleMouseMove, handleMouseUp };
  }, []);

  /**
   * 드래그 시작
   */
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
      };

      onDragStart?.();

      // Global mouse event listeners
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
