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
import { SelectionLayer, type BoundingBox } from "./selection";
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

  // 🚀 Phase 5 + 6.1: 동적 해상도 (줌/팬 중에는 낮춤)
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

  // 🚀 Phase 5: 줌/팬 시작/종료 시 해상도 조정
  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  const rendererInvalidationPacket = useMemo(() => {
    return createRendererInvalidationPacket({
      ai: {
        cleanupExpiredFlashes,
        flashAnimations: aiFlashAnimations,
        generatingNodes: aiGeneratingNodes,
      },
      dragActive: false,
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

  // ADR-043 Phase 1: drag 콜백 refs (SelectionLayer → useCentralCanvasPointerHandlers 연결)
  const onStartMoveRef = useRef<
    (
      elementId: string,
      bounds: BoundingBox,
      position: { x: number; y: number },
    ) => void
  >(() => {});
  const onUpdateDragRef = useRef<(position: { x: number; y: number }) => void>(
    () => {},
  );
  const onEndDragRef = useRef<() => void>(() => {});
  const onCancelDragRef = useRef<() => void>(() => {});

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
    editingElementIdRef,
    handleElementClickRef,
    handleElementDoubleClickRef,
    isEditingRef,
    lastClickTargetRef,
    lastClickTimeRef,
    onCancelDrag: onCancelDragRef,
    onStartMove: onStartMoveRef,
    onUpdateDrag: onUpdateDragRef,
    onEndDrag: onEndDragRef,
    pageHeight,
    pageWidth,
    screenToCanvasPoint,
    selectionBoundsRef,
    setCurrentPageId,
    setCursor,
    setSelectedElement,
    setSelectedElements,
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
            onInteractionStart={handleInteractionStart}
            onInteractionEnd={handleInteractionEnd}
            initialPanOffsetX={initialPanOffsetX}
          />

          {/* 전체 Canvas 영역 클릭 → editingContext 복귀 또는 body 선택 */}
          <ClickableBackground
            onClick={handleCanvasBackgroundClick}
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
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
              panOffset={panOffset}
              pagePositions={pagePositions}
              pagePositionsVersion={pagePositionsVersion}
              onStartMoveRef={onStartMoveRef}
              onUpdateDragRef={onUpdateDragRef}
              onEndDragRef={onEndDragRef}
              onCancelDragRef={onCancelDragRef}
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
