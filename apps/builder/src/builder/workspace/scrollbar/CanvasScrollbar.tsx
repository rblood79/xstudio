/**
 * CanvasScrollbar
 *
 * Figma 스타일 캔버스 스크롤바.
 * React 리렌더 0회 설계 — mount 후 DOM 직접 조작만 수행.
 *
 * 변경 감지 소스:
 *  1. ViewportController.addUpdateListener() — pan/zoom/setPosition
 *  2. useCanvasSyncStore.subscribe() — 외부 zoom/pan 변경 (버튼, fit-to-screen)
 *  3. ResizeObserver(track) — 창 리사이즈, 패널 애니메이션
 *
 * @since 2026-01-30
 */

import { useRef, useEffect } from 'react';
import { getViewportController } from '../canvas/viewport/ViewportController';
import { useCanvasSyncStore } from '../canvas/canvasSync';
import { useStore } from '../../stores';
import { calculateWorldBounds } from './calculateWorldBounds';
import './CanvasScrollbar.css';

// ============================================
// Types
// ============================================

interface CanvasScrollbarProps {
  direction: 'horizontal' | 'vertical';
}

// ============================================
// Component
// ============================================

export function CanvasScrollbar({ direction }: CanvasScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isDraggingRef = useRef(false);
  // 패널 inset 캐시 (viewport 계산에서 재사용)
  const panelInsetRef = useRef({ left: 0, right: 0 });

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const isHorizontal = direction === 'horizontal';

    // ========================================
    // 패널 오프셋 측정
    // ========================================

    const measurePanelInsets = () => {
      const { panelLayout } = useStore.getState();
      const leftWidth = panelLayout.showLeft
        ? (document.querySelector('aside.sidebar') as HTMLElement)?.offsetWidth ?? 0
        : 0;
      const rightWidth = panelLayout.showRight
        ? (document.querySelector('aside.inspector') as HTMLElement)?.offsetWidth ?? 0
        : 0;
      panelInsetRef.current = { left: leftWidth, right: rightWidth };
      return { left: leftWidth, right: rightWidth };
    };

    const updatePanelOffset = () => {
      const { left, right } = measurePanelInsets();
      if (isHorizontal) {
        track.style.left = `${left}px`;
        track.style.right = `${right}px`;
      } else {
        track.style.right = `${right}px`;
      }
    };

    // ========================================
    // DOM 직접 업데이트
    // ========================================

    const updateThumb = () => {
      const vc = getViewportController();
      const state = vc.getState();
      const { canvasSize, containerSize } = useCanvasSyncStore.getState();

      if (containerSize.width === 0 || containerSize.height === 0) return;

      const scale = state.scale;
      const { left: leftInset, right: rightInset } = panelInsetRef.current;

      // Visible Viewport → World 좌표 변환
      const visibleWidth = containerSize.width - leftInset - rightInset;
      const visibleHeight = containerSize.height;

      const vpX = (leftInset - state.x) / scale;
      const vpY = -state.y / scale;
      const vpW = visibleWidth / scale;
      const vpH = visibleHeight / scale;

      const world = calculateWorldBounds(
        canvasSize,
        { x: vpX, y: vpY, width: vpW, height: vpH },
        state,
      );

      const trackLength = isHorizontal ? track.clientWidth : track.clientHeight;
      if (trackLength <= 0) return;

      const worldSize = isHorizontal ? world.width : world.height;
      const vpStart = isHorizontal ? vpX - world.minX : vpY - world.minY;
      const vpSize = isHorizontal ? vpW : vpH;

      // Thumb 크기 (최소 30px)
      const thumbSize = Math.max(30, (vpSize / worldSize) * trackLength);
      // Thumb 위치
      const scrollableWorld = worldSize - vpSize;
      const ratio = scrollableWorld > 0 ? vpStart / scrollableWorld : 0;
      const thumbPos = ratio * (trackLength - thumbSize);

      if (isHorizontal) {
        thumb.style.width = `${thumbSize}px`;
        thumb.style.transform = `translateX(${thumbPos}px)`;
      } else {
        thumb.style.height = `${thumbSize}px`;
        thumb.style.transform = `translateY(${thumbPos}px)`;
      }
    };

    // ========================================
    // Fade 제어
    // ========================================

    const showScrollbar = () => {
      track.classList.add('canvas-scrollbar--visible');
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          track.classList.remove('canvas-scrollbar--visible');
        }
      }, 1000);
    };

    // ========================================
    // RAF throttle wrapper
    // ========================================

    const scheduleUpdate = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0;
        updateThumb();
        showScrollbar();
      });
    };

    // ========================================
    // 리스너 연결
    // ========================================

    // 소스 1: ViewportController (pan/zoom/setPosition)
    const removeVCListener = getViewportController().addUpdateListener(scheduleUpdate);

    // 소스 2: Zustand store (외부 zoom/pan 변경)
    const unsubSync = useCanvasSyncStore.subscribe(
      (state) => ({ zoom: state.zoom, panOffset: state.panOffset }),
      () => scheduleUpdate(),
      { equalityFn: (a, b) => a.zoom === b.zoom && a.panOffset === b.panOffset },
    );

    // 소스 3: ResizeObserver (track 크기 변경)
    const trackResizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });
    trackResizeObserver.observe(track);

    // 패널 상태 구독 (showLeft/Right + activeLeftPanels/activeRightPanels)
    let prevShowLeft = useStore.getState().panelLayout.showLeft;
    let prevShowRight = useStore.getState().panelLayout.showRight;
    let prevActiveLeftCount = useStore.getState().panelLayout.activeLeftPanels?.length ?? 0;
    let prevActiveRightCount = useStore.getState().panelLayout.activeRightPanels?.length ?? 0;
    const unsubPanel = useStore.subscribe((state) => {
      const { showLeft, showRight, activeLeftPanels, activeRightPanels } = state.panelLayout;
      const activeLeftCount = activeLeftPanels?.length ?? 0;
      const activeRightCount = activeRightPanels?.length ?? 0;
      if (
        showLeft !== prevShowLeft ||
        showRight !== prevShowRight ||
        activeLeftCount !== prevActiveLeftCount ||
        activeRightCount !== prevActiveRightCount
      ) {
        prevShowLeft = showLeft;
        prevShowRight = showRight;
        prevActiveLeftCount = activeLeftCount;
        prevActiveRightCount = activeRightCount;
        // 패널 애니메이션(0.3s) 이후 재측정
        setTimeout(updatePanelOffset, 350);
      }
    });

    // ========================================
    // Thumb 드래그 (Pointer Capture)
    // ========================================

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      thumb.classList.add('canvas-scrollbar__thumb--dragging');
      track.classList.add('canvas-scrollbar--visible');

      const startPos = isHorizontal ? e.clientX : e.clientY;
      const vc = getViewportController();
      const startState = vc.getState();
      const { left: leftInset, right: rightInset } = panelInsetRef.current;

      const onMove = (me: PointerEvent) => {
        const delta = (isHorizontal ? me.clientX : me.clientY) - startPos;
        const trackLength = isHorizontal ? track.clientWidth : track.clientHeight;
        const { canvasSize, containerSize } = useCanvasSyncStore.getState();
        const scale = startState.scale;

        const visibleWidth = containerSize.width - leftInset - rightInset;
        const visibleHeight = containerSize.height;
        const vpW = visibleWidth / scale;
        const vpH = visibleHeight / scale;
        const vpX = (leftInset - startState.x) / scale;
        const vpY = -startState.y / scale;

        const world = calculateWorldBounds(
          canvasSize,
          { x: vpX, y: vpY, width: vpW, height: vpH },
          startState,
        );
        const worldSize = isHorizontal ? world.width : world.height;
        const vpSize = isHorizontal ? vpW : vpH;
        const thumbSize = Math.max(30, (vpSize / worldSize) * trackLength);
        const scrollableTrack = trackLength - thumbSize;
        const scrollableWorld = worldSize - vpSize;

        if (scrollableTrack <= 0) return;

        const worldDelta = (delta / scrollableTrack) * scrollableWorld;

        let newX: number;
        let newY: number;
        if (isHorizontal) {
          newX = leftInset - (vpX + worldDelta) * scale;
          newY = startState.y;
        } else {
          newX = startState.x;
          newY = -(vpY + worldDelta) * scale;
        }

        vc.setPosition(newX, newY, scale);
        useCanvasSyncStore.getState().setPanOffset({ x: newX, y: newY });
      };

      const onUp = () => {
        isDraggingRef.current = false;
        thumb.classList.remove('canvas-scrollbar__thumb--dragging');
        thumb.removeEventListener('pointermove', onMove);
        thumb.removeEventListener('pointerup', onUp);
        thumb.removeEventListener('lostpointercapture', onUp);
        showScrollbar();
      };

      thumb.addEventListener('pointermove', onMove);
      thumb.addEventListener('pointerup', onUp);
      thumb.addEventListener('lostpointercapture', onUp);
    };

    thumb.addEventListener('pointerdown', handlePointerDown);

    // ========================================
    // Track 클릭
    // ========================================

    const handleTrackClick = (e: MouseEvent) => {
      if (e.target === thumb) return;
      if (isDraggingRef.current) return;

      const trackRect = track.getBoundingClientRect();
      const clickPos = isHorizontal
        ? e.clientX - trackRect.left
        : e.clientY - trackRect.top;
      const trackLength = isHorizontal ? track.clientWidth : track.clientHeight;

      const vc = getViewportController();
      const state = vc.getState();
      const { canvasSize, containerSize } = useCanvasSyncStore.getState();
      const scale = state.scale;
      const { left: leftInset, right: rightInset } = panelInsetRef.current;

      const visibleWidth = containerSize.width - leftInset - rightInset;
      const visibleHeight = containerSize.height;
      const vpW = visibleWidth / scale;
      const vpH = visibleHeight / scale;
      const vpX = (leftInset - state.x) / scale;
      const vpY = -state.y / scale;

      const world = calculateWorldBounds(
        canvasSize,
        { x: vpX, y: vpY, width: vpW, height: vpH },
        state,
      );
      const worldSize = isHorizontal ? world.width : world.height;
      const vpSize = isHorizontal ? vpW : vpH;
      const thumbSize = Math.max(30, (vpSize / worldSize) * trackLength);
      const scrollableTrack = trackLength - thumbSize;
      const scrollableWorld = worldSize - vpSize;

      if (scrollableTrack <= 0) return;

      // 클릭 위치를 thumb 중앙으로
      const targetThumbStart = clickPos - thumbSize / 2;
      const ratio = Math.max(0, Math.min(1, targetThumbStart / scrollableTrack));
      const targetWorldStart =
        (isHorizontal ? world.minX : world.minY) + ratio * scrollableWorld;

      let newX: number;
      let newY: number;
      if (isHorizontal) {
        newX = leftInset - targetWorldStart * scale;
        newY = state.y;
      } else {
        newX = state.x;
        newY = -targetWorldStart * scale;
      }

      vc.setPosition(newX, newY, scale);
      useCanvasSyncStore.getState().setPanOffset({ x: newX, y: newY });
    };

    track.addEventListener('click', handleTrackClick);

    // ========================================
    // 초기화
    // ========================================

    updatePanelOffset();
    updateThumb();

    // ========================================
    // Cleanup
    // ========================================

    return () => {
      removeVCListener();
      unsubSync();
      unsubPanel();
      trackResizeObserver.disconnect();
      thumb.removeEventListener('pointerdown', handlePointerDown);
      track.removeEventListener('click', handleTrackClick);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [direction]);

  return (
    <div
      ref={trackRef}
      className={`canvas-scrollbar canvas-scrollbar--${direction}`}
    >
      <div ref={thumbRef} className="canvas-scrollbar__thumb" />
    </div>
  );
}
