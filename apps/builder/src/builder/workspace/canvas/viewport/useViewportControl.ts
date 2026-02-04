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
import { type ViewportState, type ViewportController, getViewportController } from './ViewportController';
import { useCanvasSyncStore } from '../canvasSync';
import { useKeyboardShortcutsRegistry } from '@/builder/hooks';

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
  // 🚀 Phase 6.1: 인터랙션 콜백 (동적 해상도 연동용)
  /** 팬/줌 인터랙션 시작 시 호출 */
  onInteractionStart?: () => void;
  /** 팬/줌 인터랙션 종료 시 호출 */
  onInteractionEnd?: () => void;
  /** 초기 Pan Offset X (비교 모드 등에서 사용) */
  initialPanOffsetX?: number;
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
    // 🚀 Phase 6.1: 인터랙션 콜백
    onInteractionStart,
    onInteractionEnd,
    initialPanOffsetX,
  } = options;

  const { app } = useApplication();
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  // 🚀 Phase 6.1: 줌 종료 디바운스 타이머
  const zoomEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isZoomingRef = useRef(false);

  // Fix 6: wheel 팬 시 setPanOffset을 RAF로 배칭하여 React 리렌더 최소화.
  // 트랙패드는 120Hz+로 wheel 이벤트를 발생시키지만, React 리렌더는 프레임당 1회로 충분.
  // controller.setPosition()은 즉시 호출하여 PixiJS/Skia 시각 렌더링은 지연 없이 유지.
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const rafPanRef = useRef<number | null>(null);

  // 🚀 Phase 6.1: 콜백 ref (의존성 배열에서 제외하여 useEffect 재실행 방지)
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef = useRef(onInteractionEnd);
  useEffect(() => {
    onInteractionStartRef.current = onInteractionStart;
    onInteractionEndRef.current = onInteractionEnd;
  });

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
    return getViewportController({ minZoom, maxZoom });
  }, [app, minZoom, maxZoom]);

  // onStateSync 콜백을 싱글톤에 설정 (싱글톤 생성 후 지연 바인딩)
  useEffect(() => {
    if (controller) {
      controller.setOnStateSync(handleStateSync);
    }
  }, [controller, handleStateSync]);

  const containerElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    containerElRef.current = containerEl ?? null;
  }, [containerEl]);

  // 팬 모드 커서 스타일 (자식 요소 포함 !important)
  const panCursorStyleRef = useRef<HTMLStyleElement | null>(null);

  const applyPanCursor = useCallback((cursor: 'grab' | 'grabbing' | null) => {
    // 기존 스타일 제거
    if (panCursorStyleRef.current) {
      panCursorStyleRef.current.remove();
      panCursorStyleRef.current = null;
    }

    if (cursor && containerElRef.current) {
      // 동적 스타일 태그 생성 (자식 요소 포함 !important)
      const style = document.createElement('style');
      const containerId = containerElRef.current.id || 'viewport-container';
      if (!containerElRef.current.id) {
        containerElRef.current.id = containerId;
      }
      style.textContent = `#${containerId}, #${containerId} * { cursor: ${cursor} !important; }`;
      document.head.appendChild(style);
      panCursorStyleRef.current = style;
    }
  }, []);

  // applyPanCursor를 ref로 저장 (마우스 핸들러에서 사용)
  const applyPanCursorRef = useRef(applyPanCursor);
  useEffect(() => {
    applyPanCursorRef.current = applyPanCursor;
  }, [applyPanCursor]);

  // cleanup 시 스타일 제거
  useEffect(() => {
    return () => {
      if (panCursorStyleRef.current) {
        panCursorStyleRef.current.remove();
        panCursorStyleRef.current = null;
      }
    };
  }, []);

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
    const { zoom, panOffset, setPanOffset } = useCanvasSyncStore.getState();
    // initialPanOffsetX가 있으면 적용 (비교 모드 등)
    const finalX = initialPanOffsetX !== undefined ? panOffset.x + initialPanOffsetX : panOffset.x;
    controller.setPosition(finalX, panOffset.y, zoom);
    // Store도 동기화 (다른 컴포넌트에서 panOffset을 읽을 때 반영되도록)
    if (initialPanOffsetX !== undefined) {
      setPanOffset({ x: finalX, y: panOffset.y });
    }
    console.log('[useViewportControl] Initial position applied:', { x: finalX, y: panOffset.y, scale: zoom, initialPanOffsetX });

    return () => {
      controller.detach();
    };
  }, [app, cameraLabel, controller, initialPanOffsetX]);

  // 마우스 이벤트 핸들러 (팬)
  useEffect(() => {
    if (!containerEl || !controller) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Space + 클릭 또는 중간 버튼 = 팬 시작
      if ((isSpacePressedRef.current && e.button === 0) || e.button === 1) {
        e.preventDefault();
        // 🚀 Phase 6.1: 인터랙션 시작 알림 (ref 사용)
        onInteractionStartRef.current?.();
        controller.startPan(e.clientX, e.clientY);
        isPanningRef.current = true;
        applyPanCursorRef.current('grabbing');
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
        // Space가 여전히 눌려있으면 grab, 아니면 null
        applyPanCursorRef.current(isSpacePressedRef.current ? 'grab' : null);
        // 🚀 Phase 6.1: 인터랙션 종료 알림 (ref 사용)
        onInteractionEndRef.current?.();
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

  // 휠 이벤트 핸들러 (줌/팬) - Figma/Photoshop 스타일
  useEffect(() => {
    if (!containerEl || !controller) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl/Cmd + wheel = Zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        // 🚀 Phase 6.1: 줌 시작 알림 (최초 1회만, ref 사용)
        if (!isZoomingRef.current) {
          isZoomingRef.current = true;
          onInteractionStartRef.current?.();
        }

        // 기존 종료 타임아웃 취소
        if (zoomEndTimeoutRef.current) {
          clearTimeout(zoomEndTimeoutRef.current);
        }

        // 150ms 동안 휠 이벤트 없으면 종료로 간주
        zoomEndTimeoutRef.current = setTimeout(() => {
          isZoomingRef.current = false;
          onInteractionEndRef.current?.();
          zoomEndTimeoutRef.current = null;
        }, 150);

        const rect = containerEl.getBoundingClientRect();

        // Pencil 방식: deltaY 클램핑 + 0.012 계수
        // ctrlKey(마우스 휠) → ±30 클램핑, metaKey(트랙패드 핀치) → ±15 클램핑
        // 마우스 휠 1클릭(deltaY=120) → clamp=30 → 36% 줌 변화
        // 트랙패드 핀치(deltaY=3) → clamp=3 → 3.6% 줌 변화
        const clampRange = e.metaKey ? 15 : 30;
        const clamped = Math.max(-clampRange, Math.min(clampRange, e.deltaY));
        const delta = clamped * -0.012;

        controller.zoomAtPoint(e.clientX, e.clientY, rect, delta, true);
      } else {
        // 일반 휠 = 팬 (Figma/Photoshop 스타일)
        e.preventDefault();
        e.stopPropagation();

        // Shift + wheel = 좌우 팬, 일반 wheel = 상하 팬
        const rawDeltaX = e.shiftKey ? e.deltaY : e.deltaX;
        const rawDeltaY = e.shiftKey ? 0 : e.deltaY;

        // Fix 6: 동일 프레임 내 다중 wheel 이벤트 누적 처리.
        // pendingPanRef가 있으면 이전 누적값 기준, 없으면 Zustand 현재값 기준.
        const current = pendingPanRef.current ?? useCanvasSyncStore.getState().panOffset;
        const { zoom } = useCanvasSyncStore.getState();
        const newX = current.x - rawDeltaX;
        const newY = current.y - rawDeltaY;

        // PixiJS Container 즉시 업데이트 (Skia 시각 렌더링 지연 없음)
        controller.setPosition(newX, newY, zoom);

        // Zustand 업데이트를 RAF로 배칭 (React 리렌더 프레임당 1회 제한)
        pendingPanRef.current = { x: newX, y: newY };
        if (rafPanRef.current === null) {
          rafPanRef.current = requestAnimationFrame(() => {
            if (pendingPanRef.current) {
              setPanOffset(pendingPanRef.current);
              pendingPanRef.current = null;
            }
            rafPanRef.current = null;
          });
        }
      }
    };

    containerEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      containerEl.removeEventListener('wheel', handleWheel, { capture: true });
      // cleanup 시 타임아웃 정리
      if (zoomEndTimeoutRef.current) {
        clearTimeout(zoomEndTimeoutRef.current);
        zoomEndTimeoutRef.current = null;
      }
      // Fix 6: 배칭 RAF 정리
      if (rafPanRef.current !== null) {
        cancelAnimationFrame(rafPanRef.current);
        // 마지막 누적값 반영 (언마운트 전 최종 상태 동기화)
        if (pendingPanRef.current) {
          setPanOffset(pendingPanRef.current);
          pendingPanRef.current = null;
        }
        rafPanRef.current = null;
      }
    };
  }, [containerEl, controller, setPanOffset]);

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


  // 스페이스바 팬 모드 (cursor만 변경)
  useKeyboardShortcutsRegistry(
    [
      {
        key: 'Space',
        code: 'Space',
        modifier: 'none',
        preventDefault: false,
        disabled: !containerEl,
        handler: () => {
          if (isSpacePressedRef.current) return;
          isSpacePressedRef.current = true;
          applyPanCursor('grab');
        },
      },
    ],
    [containerEl, applyPanCursor]
  );

  useKeyboardShortcutsRegistry(
    [
      {
        key: 'Space',
        code: 'Space',
        modifier: 'none',
        preventDefault: false,
        disabled: !containerEl,
        handler: () => {
          isSpacePressedRef.current = false;
          if (!isPanningRef.current) {
            applyPanCursor(null);
          }
        },
      },
    ],
    [containerEl, applyPanCursor],
    { eventType: 'keyup' }
  );

  return {
    controller,
    isPanningRef,
  };
}

export default useViewportControl;
