/**
 * Builder Canvas
 *
 * 🚀 Phase 10 B1.1: WebGL 기반 메인 캔버스
 * 🚀 Phase 10 B1.2: ElementSprite 렌더링 시스템 통합
 *
 * 기능:
 * - PixiJS Application 초기화
 * - Element 렌더링 (ElementSprite)
 * - Selection Overlay (B1.3에서 완성)
 * - Zoom/Pan (B1.4에서 완성)
 *
 * @since 2025-12-11 Phase 10 B1.1
 * @updated 2025-12-11 Phase 10 B1.2 - ElementSprite 통합
 */

import { useCallback, useEffect, useRef, useMemo, useState, memo } from "react";
import { Application, useApplication } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useStore } from "../../stores";

// P4: useExtend 훅으로 메모이제이션된 컴포넌트 등록
import { useExtend, PIXI_COMPONENTS } from "./pixiSetup";
import { useCanvasSyncStore } from "./canvasSync";
import { useWebGLCanvas } from "../../../utils/featureFlags";
import { ElementSprite } from "./sprites";
import {
  SelectionLayer,
  useDragInteraction,
  findElementsInLasso,
  type HandlePosition,
  type BoundingBox,
  type CursorStyle,
} from "./selection";
import { GridLayer } from "./grid";
import { ViewportControlBridge } from "./viewport";
import { BodyLayer } from "./layers";
import { TextEditOverlay, useTextEdit } from "../overlay";
import { initYoga, calculateLayout, type LayoutResult } from "./layout";
import { getOutlineVariantColor } from "./utils/cssVariableReader";
import { useThemeColors } from "./hooks/useThemeColors";

// ============================================
// Types
// ============================================

export interface BuilderCanvasProps {
  /** 페이지 영역 너비 (breakpoint 크기) */
  pageWidth?: number;
  /** 페이지 영역 높이 (breakpoint 크기) */
  pageHeight?: number;
  /** 배경색 */
  backgroundColor?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_BACKGROUND = 0xf8fafc; // slate-50

// ============================================
// Sub-Components
// ============================================

// GridLayer는 ./grid/GridLayer.tsx로 이동됨 (B1.4)
// CanvasResizeHandler 삭제됨 - resizeTo 옵션으로 대체 (Phase 12 B3.2)

/**
 * P4: PixiJS 컴포넌트 등록 브릿지
 *
 * useExtend 훅을 사용하여 메모이제이션된 컴포넌트 등록을 수행합니다.
 * Application 내부 첫 번째 자식으로 배치해야 합니다.
 */
function PixiExtendBridge() {
  useExtend(PIXI_COMPONENTS);
  return null;
}

/**
 * 캔버스 경계 표시
 */
function CanvasBounds({ width, height, zoom = 1 }: { width: number; height: number; zoom?: number }) {
  useExtend(PIXI_COMPONENTS);
  // 테마 변경 감지 (MutationObserver 기반)
  useThemeColors();

  // 서브픽셀 렌더링 방지
  const w = Math.round(width);
  const h = Math.round(height);

  // 줌에 독립적인 선 두께 (화면상 항상 1px)
  const strokeWidth = 1 / zoom;

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const outlineColor = getOutlineVariantColor();
      // 줌에 관계없이 화면상 1px 유지
      g.setStrokeStyle({ width: strokeWidth, color: outlineColor });
      g.rect(0, 0, w, h);
      g.stroke();
    },
    [w, h, strokeWidth]
  );

  return <pixiGraphics draw={draw} />;
}

/**
 * 클릭 가능한 백그라운드 (빈 영역 클릭 감지용 + 라쏘 선택)
 * renderer.screen에서 크기를 자동으로 획득 (resizeTo 연동)
 */
interface ClickableBackgroundProps {
  onClick?: () => void;
  onLassoStart?: (position: { x: number; y: number }) => void;
  onLassoDrag?: (position: { x: number; y: number }) => void;
  onLassoEnd?: () => void;
  /** Zoom level for coordinate transformation */
  zoom: number;
  /** Pan offset for coordinate transformation */
  panOffset: { x: number; y: number };
}

function ClickableBackground({ onClick, onLassoStart, onLassoDrag, onLassoEnd, zoom, panOffset }: ClickableBackgroundProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Shift 키 상태 추적 (Lasso 모드) - canvas cursor 직접 변경
  useEffect(() => {
    if (!app?.canvas) return;

    const canvas = app.canvas as HTMLCanvasElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        canvas.style.cursor = 'crosshair';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        canvas.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [app]);

  useEffect(() => {
    if (!app) return;

    let rafId = 0;
    let detach: (() => void) | null = null;
    let canceled = false;

    const attach = () => {
      if (canceled) return;

      const renderer = app.renderer;
      if (!renderer) {
        rafId = window.requestAnimationFrame(attach);
        return;
      }

      const update = () => {
        setScreenSize({
          width: renderer.screen.width,
          height: renderer.screen.height,
        });
      };

      update();
      renderer.on("resize", update);
      detach = () => renderer.off("resize", update);
    };

    attach();

    return () => {
      canceled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      detach?.();
    };
  }, [app]);

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!screenSize) return;
      // 투명한 영역 (클릭 감지용)
      g.rect(0, 0, screenSize.width, screenSize.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [screenSize]
  );

  // 라쏘 드래그 상태
  const isDragging = useRef(false);

  // 화면 좌표를 캔버스 좌표로 변환
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const handlePointerDown = useCallback((e: { global: { x: number; y: number } }) => {
    isDragging.current = true;
    const canvasPos = screenToCanvas(e.global.x, e.global.y);
    onLassoStart?.(canvasPos);
  }, [onLassoStart, screenToCanvas]);

  const handlePointerMove = useCallback((e: { global: { x: number; y: number } }) => {
    if (isDragging.current) {
      const canvasPos = screenToCanvas(e.global.x, e.global.y);
      onLassoDrag?.(canvasPos);
    }
  }, [onLassoDrag, screenToCanvas]);

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      onLassoEnd?.();
    } else {
      // 드래그 없이 클릭만 했으면 clearSelection
      onClick?.();
    }
  }, [onClick, onLassoEnd]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={handlePointerDown}
      onGlobalPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}

/**
 * 패널 애니메이션 중에는 캔버스를 CSS 사이즈로만 부드럽게 따라가게 하고,
 * 크기 변화가 멈춘 뒤에만 renderer.resize를 1회 수행해 선명도를 복구합니다.
 */
// 리사이즈 타이밍 상수 (panel-container.css transition: 0.3s와 동기화)
const RESIZE_THROTTLE_MS = 80;
const RESIZE_SETTLE_MS = 350; // CSS transition(300ms) + 여유 50ms

function CanvasSmoothResizeBridge({ containerEl }: { containerEl: HTMLElement }) {
  const { app } = useApplication();
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);
  const settleTimeoutIdRef = useRef<number>(0);
  const throttleTimeoutIdRef = useRef<number>(0);
  const lastQueuedAtRef = useRef(0);

  useEffect(() => {
    if (!app) return;

    let canceled = false;
    let observer: ResizeObserver | null = null;

    const attach = () => {
      if (canceled) return;

      const renderer = app.renderer;
      if (!renderer) {
        window.requestAnimationFrame(attach);
        return;
      }

      const queueResizeThrottled = () => {
        if (typeof window === "undefined") return;

        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = now - lastQueuedAtRef.current;

        if (elapsed >= RESIZE_THROTTLE_MS) {
          lastQueuedAtRef.current = now;
          app.queueResize();
          return;
        }

        if (throttleTimeoutIdRef.current) return;
        throttleTimeoutIdRef.current = window.setTimeout(() => {
          throttleTimeoutIdRef.current = 0;
          lastQueuedAtRef.current =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          app.queueResize();
        }, Math.max(0, RESIZE_THROTTLE_MS - elapsed));
      };

      const scheduleSettleResize = () => {
        if (settleTimeoutIdRef.current) {
          window.clearTimeout(settleTimeoutIdRef.current);
        }
        settleTimeoutIdRef.current = window.setTimeout(() => {
          settleTimeoutIdRef.current = 0;
          app.resize();
        }, RESIZE_SETTLE_MS);
      };

      const updateFromRect = (rect: DOMRectReadOnly | DOMRect) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const next = { width: rect.width, height: rect.height };
        const prev = lastSizeRef.current;
        lastSizeRef.current = next;

        // 애니메이션 중에는 과도한 리사이즈를 피하면서도 계속 따라가도록 스로틀
        if (!prev || prev.width !== next.width || prev.height !== next.height) {
          queueResizeThrottled();
        }
        scheduleSettleResize();
      };

      // 초기 동기화: 첫 렌더는 resizeTo 기준으로 선명하게 맞춤
      app.resize();

      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        updateFromRect(entry.contentRect);
      });
      observer.observe(containerEl);
    };

    attach();

    return () => {
      canceled = true;
      if (settleTimeoutIdRef.current) window.clearTimeout(settleTimeoutIdRef.current);
      if (throttleTimeoutIdRef.current) window.clearTimeout(throttleTimeoutIdRef.current);
      observer?.disconnect();
    };
  }, [app, containerEl]);

  return null;
}

// SelectionOverlay는 SelectionLayer로 대체됨 (B1.3)

/**
 * 요소 레이어 (ElementSprite 사용)
 *
 * 현재 페이지의 모든 요소를 ElementSprite로 렌더링합니다.
 * DOM 레이아웃 방식 (display: block, position: relative)을 재현합니다.
 *
 * 🚀 성능 최적화 (2025-12-17):
 * - selectedElementIds 구독 제거 → 선택 변경 시 ElementsLayer 리렌더 방지
 * - 각 ElementSprite가 자신의 선택 상태만 구독 → O(n) → O(2) 리렌더
 * - memo로 부모(BuilderCanvas) 리렌더링 시 불필요한 리렌더링 방지
 */
const ElementsLayer = memo(function ElementsLayer({
  layoutResult,
  onClick,
  onDoubleClick,
}: {
  layoutResult: LayoutResult;
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
}) {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  // 🚀 성능 최적화: selectedElementIds 구독 제거
  // 기존: ElementsLayer가 selectedElementIds 구독 → 선택 변경 시 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 상태만 구독 → 변경된 요소만 리렌더 O(2)
  // selectedElementIds, selectedIdSet 제거됨

  const elementById = useMemo(
    () => new Map(elements.map((el) => [el.id, el])),
    [elements]
  );

  // 깊이 맵을 한 번 계산하여 정렬 비용 감소
  const depthMap = useMemo(() => {
    const cache = new Map<string, number>();

    const computeDepth = (id: string | null): number => {
      if (!id) return 0;
      const cached = cache.get(id);
      if (cached !== undefined) return cached;

      const el = elementById.get(id);
      if (!el || el.tag.toLowerCase() === "body") {
        cache.set(id, 0);
        return 0;
      }

      const depth = 1 + computeDepth(el.parent_id as string | null);
      cache.set(id, depth);
      return depth;
    };

    elements.forEach((el) => {
      cache.set(el.id, computeDepth(el.id));
    });

    return cache;
  }, [elements, elementById]);

  // 현재 페이지의 요소만 필터링 (Body 제외, 실제 렌더링 대상만)
  // 선택 변경으로 인한 리렌더에서도 재계산/정렬 비용을 피하기 위해 memoize
  const pageElements = useMemo(() => {
    return elements.filter((el) => {
      if (el.page_id !== currentPageId) return false;
      // Body 태그는 캔버스 전체를 의미하므로 렌더링에서 제외 (대소문자 무시)
      if (el.tag.toLowerCase() === "body") return false;
      // CheckboxGroup의 자식 Checkbox는 투명 hit area로 렌더링 (필터하지 않음)
      return true;
    });
  }, [elements, currentPageId]);

  // 깊이 + order_num 기준으로 정렬 (부모 먼저 → 자식 나중에 렌더링)
  // DOM 방식: 자식이 부모 위에 표시됨
  const sortedElements = useMemo(() => {
    return [...pageElements].sort((a, b) => {
      const depthA = depthMap.get(a.id) ?? 0;
      const depthB = depthMap.get(b.id) ?? 0;

      // 깊이가 다르면 깊이 순서 (낮은 것 먼저 = 부모 먼저)
      if (depthA !== depthB) return depthA - depthB;

      // 같은 깊이면 order_num 순서
      return (a.order_num || 0) - (b.order_num || 0);
    });
  }, [pageElements, depthMap]);

  return (
    <pixiContainer
      label="ElementsLayer"
      eventMode="static"
      interactiveChildren={true}
    >
      {/* 🚀 성능 최적화: isSelected prop 제거 - 각 ElementSprite가 자체 구독 */}
      {sortedElements.map((element) => (
        <ElementSprite
          key={element.id}
          element={element}
          layoutPosition={layoutResult.positions.get(element.id)}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export function BuilderCanvas({
  pageWidth = DEFAULT_WIDTH,
  pageHeight = DEFAULT_HEIGHT,
  backgroundColor = DEFAULT_BACKGROUND,
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [yogaReady, setYogaReady] = useState(false);

  // P7.8: Yoga 엔진 초기화
  useEffect(() => {
    initYoga().then(() => {
      setYogaReady(true);
    });
  }, []);

  // 컨테이너 ref 콜백: 마운트 시점에 DOM 노드를 안전하게 확보
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  // Canvas는 컨테이너 크기에 맞춰 자동 동기화 (CSS → 종료 시 renderer.resize)

  // Store state
  const elements = useStore((state) => state.elements);
  // 🚀 selectedElementIds는 ElementsLayer 내부에서 직접 구독 (부모 리렌더링 방지)
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const clearSelection = useStore((state) => state.clearSelection);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const currentPageId = useStore((state) => state.currentPageId);

  // Settings state (SettingsPanel 연동)
  const showGrid = useStore((state) => state.showGrid);
  const gridSize = useStore((state) => state.gridSize);

  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // 페이지 단위 레이아웃 계산 (재사용)
  // P7.8: yogaReady 후에만 실제 레이아웃 계산 수행
  const layoutResult = useMemo(() => {
    if (!currentPageId || !yogaReady) return { positions: new Map() };
    return calculateLayout(elements, currentPageId, pageWidth, pageHeight);
  }, [elements, currentPageId, pageWidth, pageHeight, yogaReady]);

  // Zoom/Pan은 ViewportControlBridge에서 처리 (Application 내부에서 Container 직접 조작)

  // 현재 페이지 요소 필터링 (라쏘 선택용)
  const pageElements = useMemo(() => {
    return elements.filter(
      (el) => el.page_id === currentPageId && el.tag !== "Body"
    );
  }, [elements, currentPageId]);

  // 라쏘 선택 영역 내 요소 찾기
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      return findElementsInLasso(
        pageElements.map((el) => ({
          id: el.id,
          props: { style: el.props?.style as Record<string, unknown> },
        })),
        start,
        end
      );
    },
    [pageElements]
  );

  // 드래그 인터랙션 - Lasso 선택 포함
  const {
    dragState,
    startMove,
    startResize,
    startLasso,
    updateDrag,
    endDrag,
  } = useDragInteraction({
    onMoveEnd: useCallback(
      (elementId: string, delta: { x: number; y: number }) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        const style = element.props?.style as
          | Record<string, unknown>
          | undefined;
        const currentX = Number(style?.left) || 0;
        const currentY = Number(style?.top) || 0;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: currentX + delta.x,
            top: currentY + delta.y,
          },
        });
      },
      [elements, updateElementProps]
    ),
    onResizeEnd: useCallback(
      (elementId: string, _handle: HandlePosition, newBounds: BoundingBox) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        const style = element.props?.style as
          | Record<string, unknown>
          | undefined;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: newBounds.x,
            top: newBounds.y,
            width: newBounds.width,
            height: newBounds.height,
          },
        });
      },
      [elements, updateElementProps]
    ),
    onLassoEnd: useCallback(
      (selectedIds: string[]) => {
        if (selectedIds.length > 0) {
          setSelectedElements(selectedIds);
        }
      },
      [setSelectedElements]
    ),
    findElementsInLasso: findElementsInLassoArea,
  });

  // 리사이즈 시작 핸들러
  const handleResizeStart = useCallback(
    (elementId: string, handle: HandlePosition, bounds: BoundingBox) => {
      // TODO: 실제 마우스 위치를 캔버스 좌표로 변환 필요
      startResize(elementId, handle, bounds, { x: 0, y: 0 });
    },
    [startResize]
  );

  // 이동 시작 핸들러
  const handleMoveStart = useCallback(
    (elementId: string, bounds: BoundingBox) => {
      // TODO: 실제 마우스 위치를 캔버스 좌표로 변환 필요
      startMove(elementId, bounds, { x: 0, y: 0 });
    },
    [startMove]
  );

  // 커서 변경 핸들러
  const handleCursorChange = useCallback((cursor: CursorStyle) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }
  }, []);

  // 텍스트 편집 (B1.5)
  const {
    editState,
    startEdit,
    updateText,
    completeEdit,
    cancelEdit,
    isEditing,
  } = useTextEdit();

  // Element click handler with multi-select support
  // 🚀 최적화: selectedElementIds를 deps에서 제거하고 getState()로 읽어서
  // 선택 변경 시 handleElementClick 재생성 방지 → 모든 ElementSprite 리렌더링 방지
  const handleElementClick = useCallback(
    (elementId: string, modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean }) => {
      // 텍스트 편집 중이면 클릭 무시
      if (isEditing) return;

      // Cmd+Click (Mac) or Ctrl+Click (Windows) for multi-select
      const isMultiSelectKey = modifiers?.metaKey || modifiers?.ctrlKey;

      if (isMultiSelectKey) {
        // 🚀 getState()로 현재 selectedElementIds 읽기 (stale closure 방지)
        const currentSelectedIds = useStore.getState().selectedElementIds;

        // 다중 선택: 이미 선택된 요소면 제거, 아니면 추가
        const isAlreadySelected = currentSelectedIds.includes(elementId);
        if (isAlreadySelected) {
          // 선택 해제
          const newSelection = currentSelectedIds.filter((id) => id !== elementId);
          if (newSelection.length > 0) {
            setSelectedElements(newSelection);
          } else {
            clearSelection();
          }
        } else {
          // 선택에 추가
          setSelectedElements([...currentSelectedIds, elementId]);
        }
      } else {
        // 단일 선택
        setSelectedElement(elementId);
      }
    },
    [setSelectedElement, setSelectedElements, clearSelection, isEditing]
  );

  // Element double click handler (텍스트 편집 시작)
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      startEdit(elementId);
    },
    [startEdit]
  );

  // WebGL context recovery
  useEffect(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };

    const handleContextRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [setContextLost]);

  // Sync render version after each frame
  useEffect(() => {
    syncPixiVersion(renderVersion);
  }, [renderVersion, syncPixiVersion]);

  // Mark canvas as ready
  useEffect(() => {
    setCanvasReady(true);
    return () => setCanvasReady(false);
  }, [setCanvasReady]);

  return (
    <div ref={setContainerNode} className="canvas-container">
      {/* Wait for both container and yoga to be ready before rendering PixiJS */}
      {containerEl && yogaReady && (
        <Application
          resizeTo={containerEl}
          background={backgroundColor}
          antialias={true}
          resolution={Math.max(window.devicePixelRatio || 1, 2)}
          autoDensity={true}
          roundPixels={true}
        >
          {/* P4: 메모이제이션된 컴포넌트 등록 (첫 번째 자식) */}
          <PixiExtendBridge />

          <CanvasSmoothResizeBridge containerEl={containerEl} />

          {/* ViewportControlBridge: Camera Container 직접 조작 (React re-render 최소화) */}
          <ViewportControlBridge
            containerEl={containerEl}
            cameraLabel="Camera"
            minZoom={0.1}
            maxZoom={5}
          />

          {/* 전체 Canvas 영역 클릭 → 선택 해제 + 라쏘 선택 시작 */}
          <ClickableBackground
            onClick={clearSelection}
            onLassoStart={startLasso}
            onLassoDrag={updateDrag}
            onLassoEnd={endDrag}
            zoom={zoom}
            panOffset={panOffset}
          />

          {/* Camera/Viewport - x, y, scale은 ViewportController가 직접 조작 */}
          <pixiContainer
            label="Camera"
            eventMode="static"
            interactiveChildren={true}
          >
            {/* Body Layer (Body 요소의 배경색, 테두리 등) - 최하단 */}
            <BodyLayer
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              onClick={handleElementClick}
            />

            {/* Grid Layer - Body 위에 렌더링 */}
            <GridLayer
              width={pageWidth}
              height={pageHeight}
              zoom={zoom}
              showGrid={showGrid}
              gridSize={gridSize}
            />

            {/* Page Bounds (breakpoint 경계선) */}
            <CanvasBounds width={pageWidth} height={pageHeight} zoom={zoom} />

            {/* Elements Layer (ElementSprite 기반) */}
            <ElementsLayer
              layoutResult={layoutResult}
              onClick={handleElementClick}
              onDoubleClick={handleElementDoubleClick}
            />

            {/* Selection Layer (최상단) */}
            <SelectionLayer
              dragState={dragState}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              layoutResult={layoutResult}
              zoom={zoom}
              onResizeStart={handleResizeStart}
              onMoveStart={handleMoveStart}
              onCursorChange={handleCursorChange}
            />
          </pixiContainer>
        </Application>
      )}

      {/* 텍스트 편집 오버레이 (B1.5) */}
      {editState && editState.elementId && (
        <TextEditOverlay
          elementId={editState.elementId}
          initialValue={editState.value}
          position={editState.position}
          size={editState.size}
          zoom={zoom}
          panOffset={panOffset}
          style={editState.style}
          onChange={updateText}
          onComplete={completeEdit}
          onCancel={cancelEdit}
        />
      )}
    </div>
  );
}

// ============================================
// Feature Flag Wrapper
// ============================================

/**
 * Feature Flag에 따라 WebGL 또는 기존 iframe 캔버스 반환
 */
export function BuilderCanvasWithFlag(props: BuilderCanvasProps) {
  const useWebGL = useWebGLCanvas();

  if (!useWebGL) {
    // 기존 iframe Canvas (Fallback)
    return null; // BuilderCore에서 기존 iframe 렌더링
  }

  return <BuilderCanvas {...props} />;
}

export default BuilderCanvas;
