/**
 * Builder Canvas
 *
 * Phase 11: DirectContainer 기반 캔버스
 *
 * 기능:
 * - PixiJS Application 초기화
 * - Element 렌더링 (ElementSprite)
 * - Selection Overlay
 * - Zoom/Pan
 *
 * @since 2025-12-11 Phase 10 B1.1
 * @updated 2026-02-18 Phase 11 - @pixi/layout 완전 제거, DirectContainer 전환
 */
import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  lazy,
  Suspense,
  type RefObject,
} from "react";
import { Application } from "@pixi/react";
import { useStore } from "../../stores";

// P4: useExtend 훅으로 메모이제이션된 컴포넌트 등록
// 🚀 Phase 5: 동적 해상도 및 저사양 기기 감지
import {
  useExtend,
  PIXI_COMPONENTS,
  isLowEndDevice,
  getDynamicResolution,
} from "./pixiSetup";
import { useCanvasSyncStore } from "./canvasSync";
import { isWebGLCanvas } from "../../../utils/featureFlags";
import { ClickableBackground } from "./components/ClickableBackground";
import { ElementsLayer } from "./components/ElementsLayer";
import { PageContainer } from "./components/PageContainer";
import {
  SelectionLayer,
  useDragInteraction,
  type HandlePosition,
  type BoundingBox,
  type SelectionBoxHandle,
  type DragState,
  calculateCombinedBounds,
} from "./selection";
// GridLayer는 Skia gridRenderer로 대체됨
import { ViewportControlBridge } from "./viewport";
import {
  screenToViewportPoint,
  screenToViewportSize,
} from "./viewport/viewportTransforms";
import { TextEditOverlay, useTextEdit } from "../overlay";
import { getElementBoundsSimple } from "./elementRegistry";
import { GPUDebugOverlay } from "./utils/GPUDebugOverlay";
import { useCanvasElementSelectionHandlers } from "./hooks/useCanvasElementSelectionHandlers";
import { useCanvasBackgroundInteraction } from "./hooks/useCanvasBackgroundInteraction";
import { useCanvasDragDropHelpers } from "./hooks/useCanvasDragDropHelpers";
import { useCentralCanvasPointerHandlers } from "./hooks/useCentralCanvasPointerHandlers";
import { useMultiPageCanvasData } from "./hooks/useMultiPageCanvasData";
import { useCanvasRuntimeBootstrap } from "./hooks/useCanvasRuntimeBootstrap";
import { useCanvasSurfaceLifecycle } from "./hooks/useCanvasSurfaceLifecycle";
import { usePageDrag } from "./hooks/usePageDrag";

import { useGPUProfiler } from "./utils/gpuProfilerCore";

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
  /** 초기 Pan Offset X (비교 모드 등에서 사용) */
  initialPanOffsetX?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_BACKGROUND = 0xf3f4f6; // gray-100 (PixiJS용, Skia는 opaque + MutationObserver로 --bg 동기화)
const DRAG_DISTANCE_THRESHOLD = 4;
const PAGE_STACK_GAP = 80;

// ============================================
// Sub-Components
// ============================================

// GridLayer는 ./grid/GridLayer.tsx로 이동됨 (B1.4)
// CanvasResizeHandler 삭제됨 - resizeTo 옵션으로 대체 (Phase 12 B3.2)

/**
 * Phase 5: CanvasKit 오버레이 (Lazy Import)
 */
const skiaOverlayImport = () =>
  import("./skia/SkiaOverlay").then((mod) => ({ default: mod.SkiaOverlay }));
const SkiaOverlayComponent = lazy(skiaOverlayImport);
skiaOverlayImport(); // 모듈 프리로드: lazy 해제 없이 초기 번들 크기 유지하면서 청크 로딩 선행

function SkiaOverlayLazy(props: {
  containerEl: HTMLDivElement;
  backgroundColor?: number;
  app: PixiApplication;
  dragStateRef?: RefObject<DragState | null>;
  pageWidth?: number;
  pageHeight?: number;
  pageFrames?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount: number;
  }>;
  currentPageId?: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <SkiaOverlayComponent {...props} />
    </Suspense>
  );
}

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

// SelectionOverlay는 SelectionLayer로 대체됨 (B1.3)
// CanvasSmoothResizeBridge 제거됨 - resizeTo={containerEl}로 대체 (Panel Toggle 성능 최적화)

// ============================================
// Main Component
// ============================================

export function BuilderCanvas({
  pageWidth = DEFAULT_WIDTH,
  pageHeight = DEFAULT_HEIGHT,
  backgroundColor = DEFAULT_BACKGROUND,
  initialPanOffsetX,
}: BuilderCanvasProps) {
  // Dev-only: rAF 기반 FPS/프레임타임 측정(렌더 idle 여부와는 별개)
  useGPUProfiler(import.meta.env.DEV);

  const containerRef = useRef<HTMLDivElement>(null);
  // 🚀 Phase 19: SelectionBox imperative handle ref (드래그 중 React 리렌더링 없이 위치 업데이트)
  const selectionBoxRef = useRef<SelectionBoxHandle>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const {
    appReady,
    handlePixiAppInit,
    pixiApp,
    wasmLayoutFailed,
    wasmLayoutReady,
  } = useCanvasRuntimeBootstrap();

  // 🚀 Phase 5 + 6.2: 저사양 기기 감지 (모듈 레벨 캐싱으로 useMemo 불필요)
  const isLowEnd = isLowEndDevice();

  const containerSize = useCanvasSyncStore((state) => state.containerSize);

  // 🚀 Phase 5 + 6.1: 동적 해상도 (드래그/줌/팬 중에는 낮춤)
  // dragState가 active일 때 해상도 낮춤
  const [isInteracting, setIsInteracting] = useState(false);
  const resolution = useMemo(
    () => getDynamicResolution(isInteracting, containerSize),
    [isInteracting, containerSize],
  );

  // 컨테이너 ref 콜백: 마운트 시점에 DOM 노드를 안전하게 확보
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  // Canvas는 컨테이너 크기에 맞춰 자동 동기화 (CSS → 종료 시 renderer.resize)

  // Store state
  const elements = useStore((state) => state.elements);
  const pages = useStore((state) => state.pages);
  // 🚀 selectedElementIds는 ElementsLayer 내부에서 직접 구독 (부모 리렌더링 방지)
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const clearSelection = useStore((state) => state.clearSelection);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const batchUpdateElements = useStore((state) => state.batchUpdateElements);
  const currentPageId = useStore((state) => state.currentPageId);
  const setCurrentPageId = useStore((state) => state.setCurrentPageId);

  // Settings state (SettingsPanel 연동)
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);

  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore(
    (state) => state.panOffset,
    (a, b) => a.x === b.x && a.y === b.y,
  );

  // 🆕 Multi-page: 페이지 타이틀 드래그
  const { startDrag: startPageDrag } = usePageDrag(zoom);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // elementsMap을 직접 사용 (elements로부터 중복 Map 생성 제거)
  const elementsMap = useStore((state) => state.elementsMap);
  const elementById = elementsMap;

  // ADR-006 P3-1: dirtyElementIds 소비 후 초기화
  // layoutVersion이 변경되면 render cycle에서 useMemo가 레이아웃을 재계산한 뒤,
  // useEffect에서 이전 프레임의 dirty ID를 정리하여 메모리 누적을 방지한다.
  const layoutVersion = useStore((state) => state.layoutVersion);
  const clearDirtyElementIds = useStore((state) => state.clearDirtyElementIds);
  useEffect(() => {
    if (layoutVersion > 0) {
      clearDirtyElementIds();
    }
  }, [layoutVersion, clearDirtyElementIds]);

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

      // display:contents 요소는 레이아웃 트리에서 투명 — 깊이 증가 없이 부모를 따라감
      const parentStyle = el.props?.style as
        | Record<string, unknown>
        | undefined;
      if (parentStyle?.display === "contents") {
        const depth = computeDepth(el.parent_id as string | null);
        cache.set(id, depth);
        return depth;
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

  // Zoom/Pan은 ViewportControlBridge에서 처리 (Application 내부에서 Container 직접 조작)

  // 현재 페이지 요소 필터링 (Body 제외)
  const pageElements = useMemo(() => {
    return elements.filter(
      (el) => el.page_id === currentPageId && el.tag.toLowerCase() !== "body",
    );
  }, [elements, currentPageId]);

  // 🆕 Multi-page: 모든 페이지의 데이터 (body + elements) 사전 계산
  const pagePositions = useStore((state) => state.pagePositions);
  const pagePositionsVersion = useStore((state) => state.pagePositionsVersion);
  const initializePagePositions = useStore(
    (state) => state.initializePagePositions,
  );
  const pageLayoutDirection = useStore((state) => state.pageLayoutDirection);

  // 🆕 Multi-page: pageWidth/pageHeight/pageLayoutDirection 변경 시 페이지 위치 재계산
  // 🚀 O(1) pageIndex 기반 조회 (elements.find/filter O(N*M) 제거)
  const pageIndex = useStore((state) => state.pageIndex);
  const { allPageData, pageFrames, visiblePageIds } = useMultiPageCanvasData({
    containerSize,
    elementsMap,
    initializePagePositions,
    pageHeight,
    pageIndex,
    pageLayoutDirection,
    pagePositions,
    pageStackGap: PAGE_STACK_GAP,
    pageWidth,
    pages,
    panOffset,
    zoom,
  });

  const screenToCanvasPoint = useCallback(
    (position: { x: number; y: number }) => {
      return screenToViewportPoint(position, zoom, panOffset);
    },
    [panOffset, zoom],
  );

  const {
    buildReorderUpdates,
    findDropTarget,
    findElementsInLassoArea,
  } = useCanvasDragDropHelpers({
    depthMap,
    elementById,
    elements,
    pageElements,
    pageHeight,
    pageWidth,
    panOffset,
    zoom,
  });

  // 🚀 Phase 5: 드래그 시작/종료 시 해상도 조정
  const handleDragStart = useCallback(() => {
    setIsInteracting(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  // 드래그 인터랙션 - Lasso 선택 포함
  const { dragState, startMove, startResize, startLasso, updateDrag, endDrag } =
    useDragInteraction({
      // 🚀 Phase 5: 드래그 시작 시 해상도 낮춤
      onDragStart: handleDragStart,
      onMoveEnd: useCallback(
        (elementId: string, delta: { x: number; y: number }) => {
          // 🚀 Phase 5: 드래그 종료 시 해상도 복원
          handleDragEnd();

          const element = elementById.get(elementId);
          if (!element) return;

          const dragDistance = Math.hypot(delta.x, delta.y);
          if (dragDistance < DRAG_DISTANCE_THRESHOLD) {
            selectionBoxRef.current?.resetPosition();
            dragPointerRef.current = null;
            return;
          }

          if (element.tag.toLowerCase() === "body") {
            selectionBoxRef.current?.resetPosition();
            dragPointerRef.current = null;
            return;
          }

          const style = element.props?.style as
            | Record<string, unknown>
            | undefined;
          const position = style?.position;
          const shouldReorder = position !== "absolute" && position !== "fixed";

          if (shouldReorder && dragPointerRef.current) {
            const drop = findDropTarget(dragPointerRef.current, elementId);
            if (drop) {
              const updates = buildReorderUpdates(
                elementId,
                drop.targetId,
                drop.dropPosition,
              );
              if (updates.length > 0) {
                batchUpdateElements(updates);
              }
            }
            selectionBoxRef.current?.resetPosition();
            dragPointerRef.current = null;
            return;
          }

          const currentX = Number(style?.left) || 0;
          const currentY = Number(style?.top) || 0;

          let newX = currentX + delta.x;
          let newY = currentY + delta.y;
          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          updateElementProps(elementId, {
            style: {
              ...style,
              left: newX,
              top: newY,
            },
          });
          dragPointerRef.current = null;
        },
        [
          batchUpdateElements,
          buildReorderUpdates,
          elementById,
          findDropTarget,
          handleDragEnd,
          updateElementProps,
          snapToGrid,
          gridSize,
        ],
      ),
      onResizeEnd: useCallback(
        (
          elementId: string,
          _handle: HandlePosition,
          newBounds: BoundingBox,
        ) => {
          // 🚀 Phase 5: 드래그 종료 시 해상도 복원
          handleDragEnd();

          // O(1) elementsMap 기반 조회 (elements.find O(N) 제거)
          const element = elementById.get(elementId);
          if (!element) return;

          const style = element.props?.style as
            | Record<string, unknown>
            | undefined;

          let { x, y, width, height } = newBounds;
          if (snapToGrid) {
            // 엣지를 그리드에 정렬하여 위치와 크기 모두 그리드에 맞춤
            const right = Math.round((x + width) / gridSize) * gridSize;
            const bottom = Math.round((y + height) / gridSize) * gridSize;
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
            width = Math.max(gridSize, right - x);
            height = Math.max(gridSize, bottom - y);
          }

          updateElementProps(elementId, {
            style: {
              ...style,
              left: x,
              top: y,
              width,
              height,
            },
          });
          dragPointerRef.current = null;
        },
        [elementById, updateElementProps, handleDragEnd, snapToGrid, gridSize],
      ),
      onLassoEnd: useCallback(
        (selectedIds: string[]) => {
          // 🚀 Phase 5: 드래그 종료 시 해상도 복원
          handleDragEnd();

          // setSelectedElements([])는 selectedElementId, selectedElementProps까지
          // 모두 초기화 (clearSelection은 selection slice만 초기화하여 불충분)
          setSelectedElements(selectedIds);
        },
        [setSelectedElements, handleDragEnd],
      ),
      findElementsInLasso: findElementsInLassoArea,
      // 🚀 Phase 19: 드래그 중 React 리렌더링 없이 PixiJS 직접 조작
      onDragUpdate: useCallback(
        (
          operation: "move" | "resize" | "lasso",
          data: {
            delta?: { x: number; y: number };
            newBounds?: BoundingBox;
          },
        ) => {
          if (!selectionBoxRef.current) return;

          switch (operation) {
            case "move":
              if (data.delta) {
                const d = snapToGrid
                  ? {
                      x: Math.round(data.delta.x / gridSize) * gridSize,
                      y: Math.round(data.delta.y / gridSize) * gridSize,
                    }
                  : data.delta;
                selectionBoxRef.current.updatePosition(d);
              }
              break;
            case "resize":
              if (data.newBounds) {
                if (snapToGrid) {
                  const { x, y, width, height } = data.newBounds;
                  const r = Math.round((x + width) / gridSize) * gridSize;
                  const b = Math.round((y + height) / gridSize) * gridSize;
                  const sx = Math.round(x / gridSize) * gridSize;
                  const sy = Math.round(y / gridSize) * gridSize;
                  selectionBoxRef.current.updateBounds({
                    x: sx,
                    y: sy,
                    width: Math.max(gridSize, r - sx),
                    height: Math.max(gridSize, b - sy),
                  });
                } else {
                  selectionBoxRef.current.updateBounds(data.newBounds);
                }
              }
              break;
            // lasso는 기존 방식 유지 (LassoSelection 컴포넌트 사용)
          }
        },
        [snapToGrid, gridSize],
      ),
    });

  // dragState를 ref로 노출 (Skia Selection 렌더링에서 라쏘 상태 접근용)
  const dragStateRef = useRef<DragState>(dragState);
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // ============================================
  // Pencil-style 중앙 pointerdown 핸들러
  // ============================================
  const lastClickTimeRef = useRef(0);
  const lastClickTargetRef = useRef<string | null>(null);

  // SelectionLayer의 selectionBounds를 ref로 저장 (중앙 핸들러에서 접근)
  const selectionBoundsRef = useRef<BoundingBox | null>(null);

  // selectionBounds 동기화: SelectionLayer가 bounds를 계산하면 ref에 저장
  // SelectionLayer 내부의 computeSelectionBounds와 동일 로직이지만,
  // BuilderCanvas에서 직접 접근 가능하도록 별도 계산
  const computeSelectionBoundsForHitTest = useCallback(() => {
    const state = useStore.getState();
    const selectedIds = state.selectedElementIds;
    if (selectedIds.length === 0) return null;

    const boxes: BoundingBox[] = [];

    for (const id of selectedIds) {
      const el = state.elementsMap.get(id);
      if (!el || el.page_id !== state.currentPageId) continue;

      if (el.tag.toLowerCase() === "body") {
        const pos = el.page_id ? pagePositions?.[el.page_id] : undefined;
        boxes.push({
          x: pos?.x ?? 0,
          y: pos?.y ?? 0,
          width: pageWidth,
          height: pageHeight,
        });
        continue;
      }

      const bounds = getElementBoundsSimple(id);
      if (bounds) {
        // screen 좌표를 canvas 좌표로 변환
        const localPosition = screenToViewportPoint(
          { x: bounds.x, y: bounds.y },
          zoom,
          panOffset,
        );
        const localSize = screenToViewportSize(
          { width: bounds.width, height: bounds.height },
          zoom,
        );
        boxes.push({
          x: localPosition.x,
          y: localPosition.y,
          width: localSize.width,
          height: localSize.height,
        });
      }
    }
    return calculateCombinedBounds(boxes);
  }, [pageWidth, pageHeight, zoom, panOffset, pagePositions]);

  // selectionBounds를 프레임마다 갱신하지 않고, pointerdown 시점에 계산
  // (RAF 지연 없이 즉시)

  useEffect(() => {
    if (!containerEl) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.isDragging || dragState.operation === "lasso") return;
      const rect = containerEl.getBoundingClientRect();
      const screenPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const canvasPosition = screenToCanvasPoint(screenPosition);
      dragPointerRef.current = canvasPosition;
      updateDrag(canvasPosition);
    };

    const handlePointerUp = () => {
      if (!dragState.isDragging || dragState.operation === "lasso") return;
      endDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    containerEl,
    dragState.isDragging,
    dragState.operation,
    endDrag,
    screenToCanvasPoint,
    updateDrag,
  ]);

  // Pencil-style: 커서 변경 유틸
  const setCursor = useCallback((cursor: string) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }
  }, []);

  // ============================================
  // Pencil-style 중앙 DOM 이벤트 핸들러
  // ============================================

  // Ref로 최신 핸들러 유지 (TDZ 방지 + deps 배열에서 제거 → 리스너 재등록 최소화)
  const handleElementClickRef = useRef<
    (
      elementId: string,
      modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean },
    ) => void
  >(() => {});
  const handleElementDoubleClickRef = useRef<(elementId: string) => void>(
    () => {},
  );
  // 텍스트 편집 상태를 handleCentralPointerDown에서 참조하기 위한 ref
  // (useTextEdit()보다 앞에 정의되므로 closure로 접근 불가 → ref 필요)
  const isEditingRef = useRef(false);
  const completeEditRef = useRef<(elementId: string) => void>(() => {});
  const editingElementIdRef = useRef<string | null>(null);

  useCentralCanvasPointerHandlers({
    completeEditRef,
    computeSelectionBoundsForHitTest,
    containerRef,
    dragPointerRef,
    dragStateIsDragging: dragState.isDragging,
    editingElementIdRef,
    handleElementClickRef,
    handleElementDoubleClickRef,
    isEditingRef,
    lastClickTargetRef,
    lastClickTimeRef,
    pageHeight,
    pageWidth,
    screenToCanvasPoint,
    selectionBoundsRef,
    setCurrentPageId,
    setCursor,
    setSelectedElement,
    setSelectedElements,
    startMove,
    startResize,
    zoom,
  });

  // 텍스트 편집 (B1.5)
  const {
    editState,
    startEdit,
    updateText,
    completeEdit,
    cancelEdit,
    isEditing,
  } = useTextEdit();

  // 편집 상태 ref 동기화 (handleCentralPointerDown에서 참조)
  useEffect(() => {
    isEditingRef.current = isEditing;
    completeEditRef.current = completeEdit;
    editingElementIdRef.current = editState?.elementId ?? null;
  }, [completeEdit, editState?.elementId, isEditing]);

  // Element click handler with multi-select support
  // 🚀 최적화: selectedElementIds를 deps에서 제거하고 getState()로 읽어서
  // 선택 변경 시 handleElementClick 재생성 방지 → 모든 ElementSprite 리렌더링 방지
  // 🚀 Phase 18: startTransition으로 선택 업데이트 → INP 개선 (245ms → ~50ms)
  const {
    handleElementClick,
    handleElementDoubleClick,
  } = useCanvasElementSelectionHandlers({
    clearSelection,
    isEditing,
    setCurrentPageId,
    setSelectedElement,
    setSelectedElements,
    startEdit,
  });

  // Ref 동기화: 최신 핸들러를 ref에 할당 (중앙 DOM 이벤트 핸들러에서 사용)
  useEffect(() => {
    handleElementClickRef.current = handleElementClick;
    handleElementDoubleClickRef.current = handleElementDoubleClick;
  }, [handleElementClick, handleElementDoubleClick]);

  useCanvasSurfaceLifecycle({
    appReady,
    containerRef,
    renderVersion,
    setCanvasReady,
    setContextLost,
    syncPixiVersion,
  });

  const handleCanvasBackgroundClick = useCanvasBackgroundInteraction({
    clearSelection,
    setSelectedElement,
  });

  return (
    <div
      ref={setContainerNode}
      className="canvas-container"
      tabIndex={-1}
      onPointerDown={(e) => {
        // 캔버스 영역 클릭 시 컨테이너에 포커스 → activeScope가 'canvas-focused'로 전환
        // Backspace/Delete 등 캔버스 스코프 단축키 활성화
        const target = e.target as HTMLElement;
        if (!target.closest('input, textarea, [contenteditable="true"]')) {
          containerRef.current?.focus();
        }
      }}
    >
      {/* ADR-006 P1-2: WASM 로드 실패 배너 */}
      {wasmLayoutFailed && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "12px 16px",
            backgroundColor: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            color: "#991B1B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 9999,
            fontSize: "14px",
          }}
        >
          <span>레이아웃 엔진 로드에 실패했습니다.</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "4px 12px",
              backgroundColor: "#DC2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            새로고침
          </button>
        </div>
      )}
      {/* 🚀 Phase 7: Application 즉시 렌더링, Yoga는 LayoutSystem.init()에서 로드 */}
      {containerEl && (
        <Application
          resizeTo={containerEl}
          background={backgroundColor}
          backgroundAlpha={0}
          // 🚀 Phase 5: 저사양 기기에서 antialias 비활성화
          antialias={!isLowEnd}
          // 🚀 Phase 5: 동적 해상도 (인터랙션 중 낮춤)
          resolution={resolution}
          autoDensity={true}
          roundPixels={false}
          // 🚀 Phase 5: GPU 성능 최적화
          powerPreference="high-performance"
          // 🚀 Phase 8: Application + LayoutSystem 초기화 완료 콜백
          // LayoutSystem.init()이 Yoga WASM을 내부적으로 로드 (Phase 9에서 제거 예정)
          onInit={handlePixiAppInit}
        >
          {/* P4: 메모이제이션된 컴포넌트 등록 (첫 번째 자식) */}
          <PixiExtendBridge />

          {/* ViewportControlBridge: Camera Container 직접 조작 (React re-render 최소화) */}
          {/* 🚀 Phase 6.1: 줌/팬 인터랙션 시 동적 해상도 조정 */}
          <ViewportControlBridge
            containerEl={containerEl}
            cameraLabel="Camera"
            minZoom={0.1}
            maxZoom={5}
            onInteractionStart={handleDragStart}
            onInteractionEnd={handleDragEnd}
            initialPanOffsetX={initialPanOffsetX}
          />

          {/* 전체 Canvas 영역 클릭 → editingContext 복귀 또는 body 선택 */}
          <ClickableBackground
            onClick={handleCanvasBackgroundClick}
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
            {/* 🆕 Multi-page: 메모이제이션된 페이지 컨테이너 (뷰포트 컬링 적용) */}
            {pages.map((page) => {
              const pos = pagePositions[page.id];
              const data = allPageData.get(page.id);
              if (!pos || !data) return null;
              return (
                <PageContainer
                  key={page.id}
                  pageId={page.id}
                  posX={pos.x}
                  posY={pos.y}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  zoom={zoom}
                  isVisible={visiblePageIds.has(page.id)}
                  appReady={appReady}
                  wasmLayoutReady={wasmLayoutReady}
                  bodyElement={data.bodyElement}
                  onTitleDragStart={startPageDrag}
                >
                  <ElementsLayer
                    pageElements={data.pageElements}
                    bodyElement={data.bodyElement}
                    elementById={elementById}
                    depthMap={depthMap}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    zoom={zoom}
                    panOffset={panOffset}
                    wasmLayoutReady={wasmLayoutReady}
                    layoutVersion={layoutVersion}
                    pagePositionVersion={pagePositionsVersion}
                  />
                </PageContainer>
              );
            })}

            {/* Selection Layer (최상단 - 모든 페이지 위) */}
            <SelectionLayer
              dragState={dragState}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
              panOffset={panOffset}
              selectionBoxRef={selectionBoxRef}
              pagePositions={pagePositions}
              pagePositionsVersion={pagePositionsVersion}
            />
          </pixiContainer>
        </Application>
      )}

      {/* Phase 5: CanvasKit 오버레이 */}
      {containerEl && pixiApp && (
        <SkiaOverlayLazy
          containerEl={containerEl}
          backgroundColor={backgroundColor}
          app={pixiApp}
          dragStateRef={dragStateRef}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          pageFrames={pageFrames}
          currentPageId={currentPageId}
        />
      )}

      <GPUDebugOverlay />

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
  const useWebGL = isWebGLCanvas();

  if (!useWebGL) {
    // 기존 iframe Canvas (Fallback)
    return null; // BuilderCore에서 기존 iframe 렌더링
  }

  return <BuilderCanvas {...props} />;
}

export default BuilderCanvas;
