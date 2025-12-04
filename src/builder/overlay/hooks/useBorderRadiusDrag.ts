/**
 * useBorderRadiusDrag - border-radius 드래그 인터랙션 훅
 *
 * Adobe XD 스타일의 코너 포인트 드래그로 border-radius 조절
 *
 * 성능 최적화:
 * - 드래그 중: Canvas에 직접 postMessage (즉시 렌더링)
 * - 드래그 종료: Inspector state 업데이트 (store 저장)
 */

import { useCallback, useRef, useEffect, useState } from "react";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { MessageService } from "../../../utils/messaging";
import { useStore } from "../../stores";

export type CornerPosition =
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

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
  if (
    !value ||
    value === "reset" ||
    value === "inherit" ||
    value === "initial"
  ) {
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
  topLeft: "borderTopLeftRadius",
  topRight: "borderTopRightRadius",
  bottomLeft: "borderBottomLeftRadius",
  bottomRight: "borderBottomRightRadius",
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
    case "topLeft":
      return (deltaX + deltaY) / Math.SQRT2;
    case "topRight":
      return (-deltaX + deltaY) / Math.SQRT2;
    case "bottomLeft":
      return (deltaX - deltaY) / Math.SQRT2;
    case "bottomRight":
      return (-deltaX - deltaY) / Math.SQRT2;
    default:
      return 0;
  }
}

/**
 * Canvas에 직접 스타일 업데이트 전송 (빠른 프리뷰용)
 */
function sendStyleToCanvas(
  elementId: string,
  styleProps: Record<string, string>
) {
  const iframe = MessageService.getIframe();
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      {
        type: "UPDATE_ELEMENT_PROPS",
        elementId,
        props: { style: styleProps },
        merge: true,
      },
      window.location.origin
    );
  }
}

export function useBorderRadiusDrag(
  rect: { width: number; height: number } | null,
  currentBorderRadius: string | undefined,
  options: UseBorderRadiusDragOptions = {}
) {
  const { onDragStart, onDrag, onDragEnd } = options;

  // 렌더링에 사용되는 상태는 useState로 관리 (ref는 render 중 접근 불가)
  const [isDragging, setIsDragging] = useState(false);
  const [activeCorner, setActiveCorner] = useState<CornerPosition | null>(null);

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    corner: null,
    initialRadius: 0,
    initialMouseX: 0,
    initialMouseY: 0,
    maxRadius: 0,
    lastRadius: -1,
  });

  const optionsRef = useRef({ onDrag, onDragEnd });

  // ref 업데이트는 useEffect에서 수행 (render 중 접근 방지)
  useEffect(() => {
    optionsRef.current = { onDrag, onDragEnd };
  });

  const handlersRef = useRef<{
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: (e: MouseEvent) => void;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      const deltaX = e.clientX - state.initialMouseX;
      const deltaY = e.clientY - state.initialMouseY;
      const diagonalDistance = calculateDiagonalDistance(
        state.corner,
        deltaX,
        deltaY
      );

      let newRadius = Math.round(state.initialRadius + diagonalDistance);
      newRadius = Math.max(0, Math.min(state.maxRadius, newRadius));

      // 같은 값이면 스킵 (성능 최적화)
      if (newRadius === state.lastRadius) return;
      state.lastRadius = newRadius;

      // 선택된 요소 ID 가져오기
      const selectedElementId = useStore.getState().selectedElementId;
      if (!selectedElementId) return;

      // 스타일 객체 생성
      let styleProps: Record<string, string>;

      if (e.shiftKey) {
        // Shift+드래그: 모든 코너 동시 조절
        styleProps = {
          borderTopLeftRadius: `${newRadius}px`,
          borderTopRightRadius: `${newRadius}px`,
          borderBottomLeftRadius: `${newRadius}px`,
          borderBottomRightRadius: `${newRadius}px`,
          borderRadius: `${newRadius}px`,
        };
      } else {
        // 기본: 개별 코너 조절
        const property = cornerPropertyMap[state.corner];
        styleProps = { [property]: `${newRadius}px` };
      }

      // ⚡ Canvas에 직접 전송 (즉시 렌더링)
      sendStyleToCanvas(selectedElementId, styleProps);

      optionsRef.current.onDrag?.(newRadius, state.corner);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.corner) return;

      const deltaX = e.clientX - state.initialMouseX;
      const deltaY = e.clientY - state.initialMouseY;
      const diagonalDistance = calculateDiagonalDistance(
        state.corner,
        deltaX,
        deltaY
      );
      let finalRadius = Math.round(state.initialRadius + diagonalDistance);
      finalRadius = Math.max(0, Math.min(state.maxRadius, finalRadius));

      const corner = state.corner;
      const shiftKey = e.shiftKey;

      // 상태 초기화 (ref + state 모두 업데이트)
      dragStateRef.current = {
        isDragging: false,
        corner: null,
        initialRadius: 0,
        initialMouseX: 0,
        initialMouseY: 0,
        maxRadius: 0,
        lastRadius: -1,
      };
      setIsDragging(false);
      setActiveCorner(null);

      const currentHandlers = handlersRef.current;
      if (currentHandlers) {
        document.removeEventListener(
          "mousemove",
          currentHandlers.handleMouseMove
        );
        document.removeEventListener("mouseup", currentHandlers.handleMouseUp);
      }

      // ⚡ 드래그 종료 시에만 Inspector state 업데이트 (store 저장)
      const updateInlineStyle = useInspectorState.getState().updateInlineStyle;
      const updateInlineStyles =
        useInspectorState.getState().updateInlineStyles;

      if (shiftKey) {
        updateInlineStyles({
          borderTopLeftRadius: `${finalRadius}px`,
          borderTopRightRadius: `${finalRadius}px`,
          borderBottomLeftRadius: `${finalRadius}px`,
          borderBottomRightRadius: `${finalRadius}px`,
          borderRadius: `${finalRadius}px`,
        });
      } else {
        const property = cornerPropertyMap[corner];
        updateInlineStyle(property, `${finalRadius}px`);
      }

      optionsRef.current.onDragEnd?.(finalRadius, corner);
    };

    handlersRef.current = { handleMouseMove, handleMouseUp };

    return () => {
      const currentHandlers = handlersRef.current;
      if (currentHandlers) {
        document.removeEventListener(
          "mousemove",
          currentHandlers.handleMouseMove
        );
        document.removeEventListener("mouseup", currentHandlers.handleMouseUp);
      }
    };
  }, []);

  const handleDragStart = useCallback(
    (corner: CornerPosition, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!rect || !handlersRef.current) return;

      const initialRadius = parseBorderRadius(currentBorderRadius);
      const maxRadius = Math.min(rect.width, rect.height) / 2;

      // ref + state 모두 업데이트
      dragStateRef.current = {
        isDragging: true,
        corner,
        initialRadius,
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        maxRadius,
        lastRadius: initialRadius,
      };
      setIsDragging(true);
      setActiveCorner(corner);

      onDragStart?.();

      document.addEventListener(
        "mousemove",
        handlersRef.current.handleMouseMove
      );
      document.addEventListener("mouseup", handlersRef.current.handleMouseUp);
    },
    [rect, currentBorderRadius, onDragStart]
  );

  return {
    handleDragStart,
    isDragging,
    activeCorner,
  };
}
