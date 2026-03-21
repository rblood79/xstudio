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
import { useLayoutsStore } from "../../stores/layouts";
import { useAIVisualFeedbackStore } from "../../stores/aiVisualFeedback";

// P4: useExtend 훅으로 메모이제이션된 컴포넌트 등록
// 🚀 Phase 5: 동적 해상도 및 저사양 기기 감지
import {
  useExtend,
  PIXI_COMPONENTS,
  isLowEndDevice,
  getDynamicResolution,
} from "./pixiSetup";
import { useCanvasLifecycleStore, useViewportSyncStore } from "./stores";
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
} from "./selection";
// GridLayer는 Skia gridRenderer로 대체됨
import { ViewportControlBridge } from "./viewport";
import { screenToViewportPoint } from "./viewport/viewportTransforms";
import { TextEditOverlay, useTextEdit } from "../overlay";
import {
  computeSelectionBounds,
  resolveSelectedElementsForPage,
} from "./interaction";
import {
  buildPixiPageRendererInput,
  createRendererInvalidationPacket,
  createSkiaRendererInput,
  type RendererInvalidationPacket,
  type SkiaRendererInput,
} from "./renderers";
import { getElementBoundsSimple, getElementContainer } from "./elementRegistry";
import { GPUDebugOverlay } from "./utils/GPUDebugOverlay";
import { useCanvasElementSelectionHandlers } from "./hooks/useCanvasElementSelectionHandlers";
import { useCanvasBackgroundInteraction } from "./hooks/useCanvasBackgroundInteraction";
import { useCanvasDragDropHelpers } from "./hooks/useCanvasDragDropHelpers";
import { useCentralCanvasPointerHandlers } from "./hooks/useCentralCanvasPointerHandlers";
import { useCanvasRuntimeBootstrap } from "./hooks/useCanvasRuntimeBootstrap";
import { useCanvasSurfaceLifecycle } from "./hooks/useCanvasSurfaceLifecycle";
import { usePageDrag } from "./hooks/usePageDrag";
import { buildSceneSnapshot } from "./scene";
import {
  computeWorkflowEdges,
  computeDataSourceEdges,
  computeLayoutGroups,
} from "./skia/workflowEdges";

import { useGPUProfiler } from "./utils/gpuProfilerCore";
import type { DropIndicatorState } from "./skia/dropIndicatorRenderer";
import { setDragVisualOffset } from "./skia/nodeRendererTree";

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
  dropIndicatorStateRef?: RefObject<DropIndicatorState | null>;
  invalidateLayout: () => void;
  invalidationPacket: RendererInvalidationPacket;
  rendererInput: SkiaRendererInput;
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
  const dropIndicatorStateRef = useRef<DropIndicatorState | null>(null);
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

  const containerSize = useViewportSyncStore((state) => state.containerSize);

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
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const setCurrentPageId = useStore((state) => state.setCurrentPageId);
  const editingContextId = useStore((state) => state.editingContextId);
  const invalidateLayout = useStore((state) => state.invalidateLayout);

  // Settings state (SettingsPanel 연동)
  const snapToGrid = useStore((state) => state.snapToGrid);
  const showGrid = useStore((state) => state.showGrid);
  const gridSize = useStore((state) => state.gridSize);
  const showWorkflowOverlay = useStore((state) => state.showWorkflowOverlay);
  const showWorkflowNavigation = useStore(
    (state) => state.showWorkflowNavigation,
  );
  const showWorkflowEvents = useStore((state) => state.showWorkflowEvents);
  const showWorkflowDataSources = useStore(
    (state) => state.showWorkflowDataSources,
  );
  const showWorkflowLayoutGroups = useStore(
    (state) => state.showWorkflowLayoutGroups,
  );
  const workflowStraightEdges = useStore(
    (state) => state.workflowStraightEdges,
  );
  const workflowFocusedPageId = useStore(
    (state) => state.workflowFocusedPageId,
  );
  const childrenMap = useStore((state) => state.childrenMap);
  const dirtyElementIds = useStore((state) => state.dirtyElementIds);
  const layouts = useLayoutsStore((state) => state.layouts);
  const aiGeneratingNodes = useAIVisualFeedbackStore(
    (state) => state.generatingNodes,
  );
  const aiFlashAnimations = useAIVisualFeedbackStore(
    (state) => state.flashAnimations,
  );
  const cleanupExpiredFlashes = useAIVisualFeedbackStore(
    (state) => state.cleanupExpiredFlashes,
  );

  const zoom = useViewportSyncStore((state) => state.zoom);
  const panOffset = useViewportSyncStore(
    (state) => state.panOffset,
    (a, b) => a.x === b.x && a.y === b.y,
  );

  // 🆕 Multi-page: 페이지 타이틀 드래그
  const { startDrag: startPageDrag } = usePageDrag(zoom);

  // Canvas sync actions
  const setCanvasReady = useCanvasLifecycleStore(
    (state) => state.setCanvasReady,
  );
  const setContextLost = useCanvasLifecycleStore(
    (state) => state.setContextLost,
  );
  const syncPixiVersion = useCanvasLifecycleStore(
    (state) => state.syncPixiVersion,
  );
  const renderVersion = useCanvasLifecycleStore((state) => state.renderVersion);

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

  // Zoom/Pan은 ViewportControlBridge에서 처리 (Application 내부에서 Container 직접 조작)

  // 🆕 Multi-page: 모든 페이지의 데이터 (body + elements) 사전 계산
  const pagePositions = useStore((state) => state.pagePositions);
  const pagePositionsVersion = useStore((state) => state.pagePositionsVersion);
  const initializePagePositions = useStore(
    (state) => state.initializePagePositions,
  );
  const pageLayoutDirection = useStore((state) => state.pageLayoutDirection);
  const previousLayoutKeyRef = useRef(
    `${pageWidth}:${pageHeight}:${pageLayoutDirection}`,
  );

  const pageIndex = useStore((state) => state.pageIndex);

  useEffect(() => {
    const layoutKey = `${pageWidth}:${pageHeight}:${pageLayoutDirection}`;
    if (previousLayoutKeyRef.current === layoutKey || pages.length === 0) {
      return;
    }

    previousLayoutKeyRef.current = layoutKey;
    initializePagePositions(
      pages,
      pageWidth,
      pageHeight,
      PAGE_STACK_GAP,
      pageLayoutDirection,
    );
  }, [
    initializePagePositions,
    pageHeight,
    pageLayoutDirection,
    pageWidth,
    pages,
  ]);

  const sceneSnapshot = useMemo(() => {
    return buildSceneSnapshot({
      containerSize,
      currentPageId,
      elements,
      elementsMap,
      layoutVersion,
      pageHeight,
      pageIndex,
      pagePositions,
      pagePositionsVersion,
      pageWidth,
      pages,
      panOffset,
      selectedElementIds,
      zoom,
    });
  }, [
    containerSize,
    currentPageId,
    elements,
    elementsMap,
    layoutVersion,
    pageHeight,
    pageIndex,
    pagePositions,
    pagePositionsVersion,
    pageWidth,
    pages,
    panOffset,
    selectedElementIds,
    zoom,
  ]);

  const depthMap = sceneSnapshot.depthMap;
  const visiblePageIds = sceneSnapshot.document.visiblePageIds;
  const pageElements =
    sceneSnapshot.document.currentPageSnapshot?.pageElements ?? [];
  const visiblePages = useMemo(() => {
    return pages.filter((page) => visiblePageIds.has(page.id));
  }, [pages, visiblePageIds]);
  const workflowEdges = useMemo(() => {
    return computeWorkflowEdges(pages, elements);
  }, [pages, elements]);
  const dataSourceEdges = useMemo(() => {
    return computeDataSourceEdges(elements);
  }, [elements]);
  const layoutGroups = useMemo(() => {
    return computeLayoutGroups(pages, layouts);
  }, [pages, layouts]);
  const skiaRendererInput = useMemo(() => {
    return createSkiaRendererInput({
      childrenMap,
      dirtyElementIds,
      elements,
      elementsMap,
      pageIndex,
      pagePositions,
      pagePositionsVersion,
      pages,
      sceneSnapshot,
    });
  }, [
    childrenMap,
    dirtyElementIds,
    elements,
    elementsMap,
    pageIndex,
    pagePositions,
    pagePositionsVersion,
    pages,
    sceneSnapshot,
  ]);

  const screenToCanvasPoint = useCallback(
    (position: { x: number; y: number }) => {
      return screenToViewportPoint(position, zoom, panOffset);
    },
    [panOffset, zoom],
  );

  const {
    buildReorderUpdates,
    computeInsertionIndex,
    findDropTarget,
    findElementsInLassoArea,
    getElementBounds: getDragDropElementBounds,
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
  const {
    dragState,
    dragStateRef,
    startMove,
    startResize,
    startLasso,
    updateDrag,
    endDrag,
  } = useDragInteraction({
    // 🚀 Phase 5: 드래그 시작 시 해상도 낮춤
    onDragStart: handleDragStart,
    onMoveEnd: useCallback(
      (elementId: string, delta: { x: number; y: number }) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        const element = elementById.get(elementId);
        if (!element) {
          setDragVisualOffset(null);
          return;
        }

        const dragDistance = Math.hypot(delta.x, delta.y);
        if (dragDistance < DRAG_DISTANCE_THRESHOLD) {
          setDragVisualOffset(null);
          selectionBoxRef.current?.resetPosition();
          dragPointerRef.current = null;
          return;
        }

        if (element.tag.toLowerCase() === "body") {
          setDragVisualOffset(null);
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
          // store 갱신이 layoutVersion++를 트리거하여 content 재빌드
          // skipInvalidation=true: offset 초기화가 별도 registryVersion++를 트리거하지 않음
          setDragVisualOffset(null, 0, 0, true);
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
        setDragVisualOffset(null, 0, 0, true);
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
      (elementId: string, _handle: HandlePosition, newBounds: BoundingBox) => {
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

  const rendererInvalidationPacket = useMemo(() => {
    return createRendererInvalidationPacket({
      ai: {
        cleanupExpiredFlashes,
        flashAnimations: aiFlashAnimations,
        generatingNodes: aiGeneratingNodes,
      },
      dragActive: dragState.isDragging,
      grid: {
        gridSize,
        showGrid,
      },
      selection: {
        currentPageId,
        editingContextId,
        selectedElementId,
        selectedElementIds,
      },
      workflow: {
        dataSourceEdges,
        focusedPageId: workflowFocusedPageId,
        layoutGroups,
        layouts,
        showDataSources: showWorkflowDataSources,
        showEvents: showWorkflowEvents,
        showLayoutGroups: showWorkflowLayoutGroups,
        showNavigation: showWorkflowNavigation,
        showOverlay: showWorkflowOverlay,
        straightEdges: workflowStraightEdges,
        workflowEdges,
      },
    });
  }, [
    aiFlashAnimations,
    aiGeneratingNodes,
    cleanupExpiredFlashes,
    currentPageId,
    dataSourceEdges,
    dragState.isDragging,
    editingContextId,
    gridSize,
    layoutGroups,
    layouts,
    selectedElementId,
    selectedElementIds,
    showGrid,
    showWorkflowDataSources,
    showWorkflowEvents,
    showWorkflowLayoutGroups,
    showWorkflowNavigation,
    showWorkflowOverlay,
    workflowEdges,
    workflowFocusedPageId,
    workflowStraightEdges,
  ]);

  // ============================================
  // Pencil-style 중앙 pointerdown 핸들러
  // ============================================
  const lastClickTimeRef = useRef(0);
  const lastClickTargetRef = useRef<string | null>(null);

  // SelectionLayer의 selectionBounds를 ref로 저장 (중앙 핸들러에서 접근)
  const selectionBoundsRef = useRef<BoundingBox | null>(null);

  const computeSelectionBoundsForHitTest = useCallback(() => {
    const state = useStore.getState();
    const selectedElements = resolveSelectedElementsForPage({
      currentPageId: state.currentPageId,
      elementsMap: state.elementsMap,
      selectedElementIds: state.selectedElementIds,
    });

    return computeSelectionBounds({
      getBounds: getElementBoundsSimple,
      getContainer: getElementContainer,
      pageHeight,
      pagePositions,
      pageWidth,
      panOffset,
      selectedElements,
      zoom,
    });
  }, [pageWidth, pageHeight, zoom, panOffset, pagePositions]);

  // selectionBounds를 프레임마다 갱신하지 않고, pointerdown 시점에 계산
  // (RAF 지연 없이 즉시)

  // Stable refs for drag handlers — deps 변경 시 리스너 재등록 방지
  const screenToCanvasPointRef = useRef(screenToCanvasPoint);
  screenToCanvasPointRef.current = screenToCanvasPoint;
  const updateDragRef = useRef(updateDrag);
  updateDragRef.current = updateDrag;
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;
  const findDropTargetRef = useRef(findDropTarget);
  findDropTargetRef.current = findDropTarget;
  const computeInsertionIndexRef = useRef(computeInsertionIndex);
  computeInsertionIndexRef.current = computeInsertionIndex;
  const getDragDropElementBoundsRef = useRef(getDragDropElementBounds);
  getDragDropElementBoundsRef.current = getDragDropElementBounds;
  const elementByIdRef = useRef(elementById);
  elementByIdRef.current = elementById;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const currentDragState = dragStateRef.current;
      if (
        !currentDragState.isDragging ||
        currentDragState.operation === "lasso"
      )
        return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const screenPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const canvasPosition = screenToCanvasPointRef.current(screenPosition);
      // dragPointerRef는 스크린 좌표 — findDropTarget이 PixiJS 스크린 좌표 기반
      dragPointerRef.current = screenPosition;
      updateDragRef.current(canvasPosition);

      // 드래그 중 실시간 visual offset + drop indicator 갱신
      if (currentDragState.operation === "move") {
        const selectedIds = useStore.getState().selectedElementIds;
        const moveTargetId = selectedIds[0];

        // Pencil deferred-drop: 요소를 시각적으로 즉시 이동
        if (moveTargetId && dragStateRef.current.startPosition) {
          const dx = canvasPosition.x - dragStateRef.current.startPosition.x;
          const dy = canvasPosition.y - dragStateRef.current.startPosition.y;
          setDragVisualOffset(moveTargetId, dx, dy);
        }
        if (moveTargetId) {
          const currentElementById = elementByIdRef.current;
          const movedEl = currentElementById.get(moveTargetId);
          const movedStyle = movedEl?.props?.style as
            | Record<string, unknown>
            | undefined;
          const pos = movedStyle?.position;
          const shouldReorder = pos !== "absolute" && pos !== "fixed";

          if (shouldReorder) {
            // findDropTarget은 PixiJS 스크린 좌표 기반 — dragPointerRef(스크린) 사용
            const screenPoint = dragPointerRef.current;
            if (!screenPoint) return;
            const drop = findDropTargetRef.current(screenPoint, moveTargetId);
            if (drop && drop.parentId) {
              const childrenMap = useStore.getState().childrenMap;
              const siblings = (childrenMap.get(drop.parentId) ?? [])
                .filter((el) => el.id !== moveTargetId && !el.deleted)
                .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
              const getBounds = getDragDropElementBoundsRef.current;
              const childBounds = siblings
                .map((el) => getBounds(el))
                .filter((b): b is BoundingBox => b !== null);
              const insertIdx = computeInsertionIndexRef.current(
                drop.parentId,
                screenPoint,
                moveTargetId,
                drop.isHorizontal,
              );
              const parentEl = currentElementById.get(drop.parentId);
              const targetBounds = parentEl ? getBounds(parentEl) : null;

              dropIndicatorStateRef.current = targetBounds
                ? {
                    targetBounds,
                    insertIndex: insertIdx,
                    childBounds,
                    isHorizontal: drop.isHorizontal,
                  }
                : null;
            } else {
              dropIndicatorStateRef.current = null;
            }
          } else {
            dropIndicatorStateRef.current = null;
          }
        }
      }
    };

    const handlePointerUp = () => {
      const ds = dragStateRef.current;
      if (!ds.isDragging || ds.operation === "lasso") return;
      dropIndicatorStateRef.current = null;
      // visual offset 초기화는 endDrag → onMoveEnd → batchUpdateElements 이후
      // onMoveEnd에서 처리 (store 갱신 후 초기화해야 원위치 깜박임 방지)
      endDragRef.current();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회 등록 — 모든 값은 ref로 참조

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
  const { handleElementClick, handleElementDoubleClick } =
    useCanvasElementSelectionHandlers({
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
            {visiblePages.map((page) => {
              const pos = pagePositions[page.id];
              const rendererInput = buildPixiPageRendererInput({
                elementById,
                dirtyElementIds,
                pageHeight,
                pageId: page.id,
                pagePositionVersion: pagePositionsVersion,
                pageWidth,
                panOffset,
                sceneSnapshot,
                wasmLayoutReady,
                zoom,
              });
              if (!pos || !rendererInput) return null;
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
                  bodyElement={rendererInput.bodyElement}
                  onTitleDragStart={startPageDrag}
                >
                  <ElementsLayer rendererInput={rendererInput} />
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
          dropIndicatorStateRef={dropIndicatorStateRef}
          invalidateLayout={invalidateLayout}
          invalidationPacket={rendererInvalidationPacket}
          rendererInput={skiaRendererInput}
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
