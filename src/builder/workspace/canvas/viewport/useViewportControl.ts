/**
 * useViewportControl Hook
 *
 * 🚀 Phase 12 B3.2: ViewportController를 @pixi/react와 통합
 *
 * 기능:
 * - PixiJS Camera Container에 ViewportController 연결
 * - 드래그/줌 이벤트 처리
 * - React state 동기화 (인터랙션 종료 시)
 *
 * @since 2025-12-12 Phase 12 B3.2
 */

import { useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import { useApplication } from '@pixi/react';
import type { Container } from 'pixi.js';
import { ViewportController, type ViewportState } from './ViewportController';
import { useCanvasSyncStore } from '../canvasSync';

// ============================================
// Types
// ============================================

export interface UseViewportControlOptions {
  /** Camera Container의 label (기본값: "Camera") */
  cameraLabel?: string;
  /** 최소 줌 */
  minZoom?: number;
  /** 최대 줌 */
  maxZoom?: number;
  /** HTML 컨테이너 요소 (이벤트 바인딩용) */
  containerEl?: HTMLElement | null;
}

export interface UseViewportControlReturn {
  /** 현재 ViewportController 인스턴스 */
  controller: ViewportController | null;
  /** 팬 중인지 여부 (render 중 access 금지) */
  isPanningRef: RefObject<boolean>;
}

// ============================================
// Hook
// ============================================

export function useViewportControl(options: UseViewportControlOptions): UseViewportControlReturn {
  const {
    cameraLabel = 'Camera',
    minZoom = 0.1,
    maxZoom = 5,
    containerEl,
  } = options;

  const { app } = useApplication();
  const isPanningRef = useRef(false);

  // Zustand store actions
  const setZoom = useCanvasSyncStore((state) => state.setZoom);
  const setPanOffset = useCanvasSyncStore((state) => state.setPanOffset);

  // React state로 동기화하는 콜백
  const handleStateSync = useCallback(
    (state: ViewportState) => {
      setZoom(state.scale);
      setPanOffset({ x: state.x, y: state.y });
    },
    [setZoom, setPanOffset]
  );

  const controller = useMemo(() => {
    if (!app?.stage) return null;
    return new ViewportController({
      minZoom,
      maxZoom,
      onStateSync: handleStateSync,
    });
  }, [app, minZoom, maxZoom, handleStateSync]);

  // Controller 생성 및 Container 연결
  useEffect(() => {
    if (!app?.stage || !controller) return;

    // Camera Container 찾기
    const cameraContainer = app.stage.children.find(
      (child) => (child as Container).label === cameraLabel
    ) as Container | undefined;

    if (!cameraContainer) {
      console.warn(`[useViewportControl] Camera container with label "${cameraLabel}" not found`);
      return;
    }

    controller.attach(cameraContainer);

    // 초기 상태 적용 (Zustand에서 읽어서 Container에 적용)
    const { zoom, panOffset } = useCanvasSyncStore.getState();
    controller.setPosition(panOffset.x, panOffset.y, zoom);
    console.log('[useViewportControl] Initial position applied:', { x: panOffset.x, y: panOffset.y, scale: zoom });

    return () => {
      controller.detach();
    };
  }, [app, cameraLabel, controller]);

  // 마우스 이벤트 핸들러
  useEffect(() => {
    if (!containerEl || !controller) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Alt + 클릭 또는 중간 버튼 = 팬 시작
      if ((e.altKey && e.button === 0) || e.button === 1) {
        e.preventDefault();
        controller.startPan(e.clientX, e.clientY);
        isPanningRef.current = true;
        containerEl.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!controller.isPanningActive()) return;
      controller.updatePan(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (controller.isPanningActive()) {
        controller.endPan();
        isPanningRef.current = false;
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
  }, [containerEl, controller]);

  // 휠 이벤트 핸들러 (줌)
  useEffect(() => {
    if (!containerEl || !controller) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl + wheel = Zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const rect = containerEl.getBoundingClientRect();
        const delta = -e.deltaY * 0.001;

        controller.zoomAtPoint(e.clientX, e.clientY, rect, delta, true);
      }
    };

    containerEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      containerEl.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [containerEl, controller]);

  // 외부 React state 변경 시 Controller에 반영
  useEffect(() => {
    if (!controller || controller.isPanningActive()) return;

    const { zoom, panOffset } = useCanvasSyncStore.getState();
    controller.setPosition(panOffset.x, panOffset.y, zoom);
  }, [controller]);

  // Zustand store 변경 구독 (외부에서 줌/팬 변경 시)
  useEffect(() => {
    if (!controller) return;

    const unsubscribe = useCanvasSyncStore.subscribe((state, prevState) => {
      if (!controller || controller.isPanningActive()) return;

      // 외부에서 상태가 변경된 경우에만 동기화
      if (state.zoom !== prevState.zoom ||
          state.panOffset.x !== prevState.panOffset.x ||
          state.panOffset.y !== prevState.panOffset.y) {
        controller.setPosition(state.panOffset.x, state.panOffset.y, state.zoom);
      }
    });

    return unsubscribe;
  }, [controller]);

  // 스페이스바 팬 모드
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
    controller,
    isPanningRef,
  };
}

export default useViewportControl;
