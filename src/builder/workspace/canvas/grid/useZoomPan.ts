/**
 * useZoomPan Hook
 *
 * 🚀 Phase 10 B1.4: 줌/팬 인터랙션 관리
 *
 * 기능:
 * - 휠 줌 (Ctrl + wheel)
 * - 팬 (Alt + drag, Middle mouse drag, Space + drag)
 * - 줌 to cursor (커서 위치 중심 줌)
 * - 좌표 변환 (화면 ↔ 캔버스)
 *
 * @since 2025-12-11 Phase 10 B1.4
 */

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasSyncStore } from '../canvasSync';

// ============================================
// Types
// ============================================

export interface UseZoomPanOptions {
  /** 최소 줌 레벨 */
  minZoom?: number;
  /** 최대 줌 레벨 */
  maxZoom?: number;
  /** 줌 스텝 (휠 1틱당 줌 변화량) */
  zoomStep?: number;
  /** 팬 속도 배율 */
  panSpeed?: number;
  /** 컨테이너 요소 (상태로 관리되는 DOM 요소) */
  containerEl?: HTMLElement | null;
}

export interface UseZoomPanReturn {
  /** 화면 좌표를 캔버스 좌표로 변환 */
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  /** 캔버스 좌표를 화면 좌표로 변환 */
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
  /** 특정 위치로 줌 */
  zoomToPoint: (screenX: number, screenY: number, newZoom: number) => void;
  /** 줌 리셋 (1:1) */
  resetZoom: () => void;
  /** 화면에 맞추기 */
  fitToScreen: (canvasWidth: number, canvasHeight: number) => void;
  /** 줌 인 */
  zoomIn: () => void;
  /** 줌 아웃 */
  zoomOut: () => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 5;
const DEFAULT_ZOOM_STEP = 0.1;
const DEFAULT_PAN_SPEED = 1;

// ============================================
// Hook
// ============================================

export function useZoomPan(options: UseZoomPanOptions): UseZoomPanReturn {
  const {
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    zoomStep = DEFAULT_ZOOM_STEP,
    panSpeed = DEFAULT_PAN_SPEED,
    containerEl,
  } = options;

  // Store actions (상태는 getState()로 직접 읽어 stale closure 방지)
  const setZoom = useCanvasSyncStore((state) => state.setZoom);
  const setPanOffset = useCanvasSyncStore((state) => state.setPanOffset);

  // 팬 드래그 상태
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);

  // 화면 좌표 → 캔버스 좌표
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerEl) return { x: screenX, y: screenY };

      // Store에서 현재 값 직접 읽기 (stale closure 방지)
      const { zoom: currentZoom, panOffset: currentPanOffset } = useCanvasSyncStore.getState();

      const rect = containerEl.getBoundingClientRect();
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // 줌과 팬 오프셋 적용
      const canvasX = (relativeX - currentPanOffset.x) / currentZoom;
      const canvasY = (relativeY - currentPanOffset.y) / currentZoom;

      return { x: canvasX, y: canvasY };
    },
    [containerEl]
  );

  // 캔버스 좌표 → 화면 좌표
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!containerEl) return { x: canvasX, y: canvasY };

      // Store에서 현재 값 직접 읽기 (stale closure 방지)
      const { zoom: currentZoom, panOffset: currentPanOffset } = useCanvasSyncStore.getState();

      const rect = containerEl.getBoundingClientRect();

      // 줌과 팬 오프셋 적용
      const screenX = canvasX * currentZoom + currentPanOffset.x + rect.left;
      const screenY = canvasY * currentZoom + currentPanOffset.y + rect.top;

      return { x: screenX, y: screenY };
    },
    [containerEl]
  );

  // 특정 위치 중심으로 줌
  const zoomToPoint = useCallback(
    (screenX: number, screenY: number, newZoom: number) => {
      if (!containerEl) return;

      // Store에서 현재 값 직접 읽기 (stale closure 방지)
      const { zoom: currentZoom, panOffset: currentPanOffset } = useCanvasSyncStore.getState();

      const rect = containerEl.getBoundingClientRect();
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // 줌 범위 제한
      const clampedZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);

      // 줌 변화 비율
      const zoomRatio = clampedZoom / currentZoom;

      // 새 팬 오프셋 계산 (커서 위치 유지)
      const newPanX = relativeX - (relativeX - currentPanOffset.x) * zoomRatio;
      const newPanY = relativeY - (relativeY - currentPanOffset.y) * zoomRatio;

      setZoom(clampedZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    },
    [minZoom, maxZoom, setZoom, setPanOffset, containerEl]
  );

  // 줌 리셋
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoom, setPanOffset]);

  // 화면에 맞추기
  const fitToScreen = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      if (!containerEl) return;

      const rect = containerEl.getBoundingClientRect();
      const padding = 50; // 여백

      const scaleX = (rect.width - padding * 2) / canvasWidth;
      const scaleY = (rect.height - padding * 2) / canvasHeight;
      const newZoom = Math.min(scaleX, scaleY, 1); // 최대 1배

      const newPanX = (rect.width - canvasWidth * newZoom) / 2;
      const newPanY = (rect.height - canvasHeight * newZoom) / 2;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    },
    [setZoom, setPanOffset, containerEl]
  );

  // 줌 인
  const zoomIn = useCallback(() => {
    if (!containerEl) return;

    // Store에서 현재 zoom 직접 읽기
    const { zoom: currentZoom } = useCanvasSyncStore.getState();

    const rect = containerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, currentZoom + zoomStep);
  }, [zoomStep, zoomToPoint, containerEl]);

  // 줌 아웃
  const zoomOut = useCallback(() => {
    if (!containerEl) return;

    // Store에서 현재 zoom 직접 읽기
    const { zoom: currentZoom } = useCanvasSyncStore.getState();

    const rect = containerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, currentZoom - zoomStep);
  }, [zoomStep, zoomToPoint, containerEl]);

  // 휠 이벤트 핸들러
  useEffect(() => {
    if (!containerEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl + wheel = Zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        // Store에서 현재 값 직접 읽기
        const { zoom: currentZoom, panOffset: currentPanOffset } = useCanvasSyncStore.getState();

        const rect = containerEl.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;

        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(currentZoom * (1 + delta), minZoom), maxZoom);

        // 줌 변화 비율
        const zoomRatio = newZoom / currentZoom;

        // 커서 위치 기준 팬 오프셋 계산
        const newPanX = relativeX - (relativeX - currentPanOffset.x) * zoomRatio;
        const newPanY = relativeY - (relativeY - currentPanOffset.y) * zoomRatio;

        console.log('[ZoomPan] wheel zoom:', {
          cursor: { x: relativeX, y: relativeY },
          zoom: { from: currentZoom, to: newZoom, ratio: zoomRatio },
          pan: { from: currentPanOffset, to: { x: newPanX, y: newPanY } },
        });

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    // capture: true로 이벤트를 먼저 가로챔
    containerEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      containerEl.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [containerEl, minZoom, maxZoom, setZoom, setPanOffset]);

  // 마우스 이벤트 핸들러 (팬)
  useEffect(() => {
    if (!containerEl) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Alt + 클릭 또는 중간 버튼 = 팬 시작
      if ((e.altKey && e.button === 0) || e.button === 1) {
        e.preventDefault();
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        containerEl.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastPanPointRef.current) return;

      // Store에서 현재 panOffset 직접 읽기 (stale closure 방지)
      const { panOffset: currentPanOffset } = useCanvasSyncStore.getState();

      const deltaX = (e.clientX - lastPanPointRef.current.x) * panSpeed;
      const deltaY = (e.clientY - lastPanPointRef.current.y) * panSpeed;

      setPanOffset({
        x: currentPanOffset.x + deltaX,
        y: currentPanOffset.y + deltaY,
      });

      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPointRef.current = null;
        containerEl.style.cursor = '';
      }
    };

    containerEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      containerEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panSpeed, setPanOffset, containerEl]);

  // 키보드 이벤트 핸들러 (스페이스바 팬)
  useEffect(() => {
    if (!containerEl) return;

    let isSpacePressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        isSpacePressed = true;
        containerEl.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed = false;
        if (!isPanningRef.current) {
          containerEl.style.cursor = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [containerEl]);

  return {
    screenToCanvas,
    canvasToScreen,
    zoomToPoint,
    resetZoom,
    fitToScreen,
    zoomIn,
    zoomOut,
  };
}

export default useZoomPan;
