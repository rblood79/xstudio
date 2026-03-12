/**
 * Skia Overlay Build Pipeline (ADR-035 Phase 4)
 *
 * SkiaOverlay의 renderFrame() 내부에서 overlay node를 빌드하는
 * 로직을 독립 모듈로 추출.
 *
 * - buildWorkflowOverlayData(): 워크플로우 관련 데이터 사전 준비
 * - buildFrameCaches(): 엣지 지오메트리 캐시 관리
 * - buildOverlayNode(): overlay SkiaRenderable 생성
 */

import type { CanvasKit, Canvas, FontMgr } from "canvaskit-wasm";
import type { BoundingBox } from "../selection/types";
import type { AIEffectNodeBounds, SkiaRenderable } from "./types";
import type {
  WorkflowEdge,
  DataSourceEdge,
  LayoutGroup,
} from "./workflowEdges";
import type { PageFrame, ElementBounds } from "./workflowRenderer";
import type { CachedEdgeGeometry } from "./workflowHitTest";
import type { SelectionRenderResult } from "./skiaWorkflowSelection";
import type { ElementHoverState } from "../hooks/useElementHoverInteraction";
import { useStore } from "../../../stores";
import { useAIVisualFeedbackStore } from "../../../stores/aiVisualFeedback";
import { renderGeneratingEffects, renderFlashes } from "./aiEffects";
import {
  renderSelectionBox,
  renderTransformHandles,
  renderDimensionLabels,
  renderLasso,
  renderPageTitle,
} from "./selectionRenderer";
import {
  renderWorkflowEdges,
  renderDataSourceEdges,
  renderLayoutGroups,
  renderPageFrameHighlight,
} from "./workflowRenderer";
import {
  renderHoverHighlight,
  renderEditingContextBorder,
} from "./hoverRenderer";
import { renderWorkflowMinimap, type MinimapConfig } from "./workflowMinimap";
import { buildPageFrameMap } from "./skiaFrameHelpers";
import { buildEdgeGeometryCache } from "./workflowHitTest";
import { buildWorkflowElementBounds } from "./skiaFramePipeline";
import {
  buildHoverHighlightTargets,
  buildMinimapConfig,
  buildMinimapRenderData,
  buildMinimapViewportBounds,
  buildPageTitleRenderItems,
  shouldRenderWorkflowMinimap,
} from "./skiaOverlayHelpers";
import {
  buildWorkflowHighlightState,
  collectHighlightedWorkflowPageIds,
  filterRenderableWorkflowEdges,
} from "./skiaWorkflowSelection";

// ============================================
// Workflow Overlay Data
// ============================================

export interface WorkflowOverlayData {
  pageFrameMap: Map<string, PageFrame>;
  workflowElementBoundsMap: Map<string, ElementBounds> | null;
}

/**
 * 워크플로우 오버레이에 필요한 데이터를 사전 빌드한다.
 * renderSkia 콜백 이전에 호출하여 히트테스트 캐시 등을 준비한다.
 */
export function buildWorkflowOverlayData(
  treeBoundsMap: Map<string, BoundingBox>,
  pageFrames: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
): WorkflowOverlayData {
  const pfMap = buildPageFrameMap(pageFrames);
  const workflowElementBoundsMap = buildWorkflowElementBounds(treeBoundsMap);
  return { pageFrameMap: pfMap, workflowElementBoundsMap };
}

// ============================================
// Frame Caches
// ============================================

export interface FrameCacheState {
  edgeGeometryCache: CachedEdgeGeometry[];
  edgeGeometryCacheKey: string;
}

/**
 * 엣지 지오메트리 캐시를 버전 기반으로 갱신한다.
 * 변경이 없으면 이전 캐시를 그대로 반환한다.
 */
export function buildFrameCaches(
  workflowEdges: WorkflowEdge[],
  pageFrameMap: Map<string, PageFrame>,
  workflowElementBoundsMap: Map<string, ElementBounds> | null,
  workflowEdgesVersion: number,
  pagePosVersion: number,
  workflowStraightEdges: boolean,
  prevCacheKey: string,
  prevCache: CachedEdgeGeometry[],
): FrameCacheState {
  if (workflowEdges.length === 0) {
    return { edgeGeometryCache: [], edgeGeometryCacheKey: "" };
  }

  const cacheKey = `${workflowEdgesVersion}:${pagePosVersion}:${workflowStraightEdges}`;
  if (cacheKey === prevCacheKey) {
    return { edgeGeometryCache: prevCache, edgeGeometryCacheKey: prevCacheKey };
  }

  const cache = buildEdgeGeometryCache(
    workflowEdges,
    pageFrameMap,
    workflowElementBoundsMap ?? new Map(),
    workflowStraightEdges,
  );
  return { edgeGeometryCache: cache, edgeGeometryCacheKey: cacheKey };
}

// ============================================
// Overlay Node Builder
// ============================================

export interface OverlayBuildInput {
  ck: CanvasKit;
  fontMgr: FontMgr | undefined;
  treeBoundsMap: Map<string, BoundingBox>;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  // AI
  hasAIEffects: boolean;
  nodeBoundsMap: Map<string, AIEffectNodeBounds> | null;
  // Selection
  selectionData: SelectionRenderResult;
  // Workflow
  showWorkflowOverlay: boolean;
  workflowEdges: WorkflowEdge[];
  dataSourceEdges: DataSourceEdge[];
  layoutGroups: LayoutGroup[];
  pageFrameMap: Map<string, PageFrame>;
  workflowElementBoundsMap: Map<string, ElementBounds> | null;
  workflowHoveredEdgeId: string | null;
  // Hover
  elementHoverState: ElementHoverState;
  // Page frames
  pageFrames?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount: number;
  }>;
  // Minimap
  minimapVisible: boolean;
  minimapConfig: MinimapConfig;
  skiaCanvasWidth: number;
  skiaCanvasHeight: number;
  dpr: number;
}

/**
 * 오버레이 SkiaRenderable을 빌드한다.
 * AI 이펙트, 페이지 타이틀, 워크플로우, 호버, 선택, 미니맵을
 * 하나의 overlay node로 합성한다.
 */
export function buildOverlayNode(input: OverlayBuildInput): SkiaRenderable {
  const {
    ck,
    fontMgr,
    treeBoundsMap,
    cameraZoom,
    cameraX,
    cameraY,
    hasAIEffects,
    nodeBoundsMap,
    selectionData,
    showWorkflowOverlay,
    workflowEdges,
    dataSourceEdges,
    layoutGroups,
    pageFrameMap,
    workflowElementBoundsMap,
    workflowHoveredEdgeId,
    elementHoverState,
    pageFrames,
    minimapVisible,
    skiaCanvasWidth,
    skiaCanvasHeight,
    dpr,
  } = input;

  // AI 상태를 빌드 시점에 캡처
  const currentAiState = useAIVisualFeedbackStore.getState();

  return {
    renderSkia(canvas: Canvas) {
      // ── AI Effects ──
      if (hasAIEffects && nodeBoundsMap) {
        const now = performance.now();
        renderGeneratingEffects(
          ck,
          canvas,
          now,
          currentAiState.generatingNodes,
          nodeBoundsMap,
        );
        renderFlashes(
          ck,
          canvas,
          now,
          currentAiState.flashAnimations,
          nodeBoundsMap,
        );
        if (currentAiState.flashAnimations.size > 0) {
          currentAiState.cleanupExpiredFlashes(now);
        }
      }

      // ── Page Titles ──
      const frames = pageFrames ?? [];
      if (frames.length > 0) {
        const state = useStore.getState();
        const pageTitleItems = buildPageTitleRenderItems(
          frames,
          state.currentPageId,
          state.selectedElementIds.length > 0,
        );
        for (const item of pageTitleItems) {
          canvas.save();
          canvas.translate(item.x, item.y);
          renderPageTitle(
            ck,
            canvas,
            item.title,
            cameraZoom,
            fontMgr,
            item.highlighted,
            item.elementCount,
          );
          canvas.restore();
        }
      }

      // ── Workflow Overlay ──
      if (showWorkflowOverlay) {
        const elBoundsMap = workflowElementBoundsMap ?? new Map();
        const wfState = useStore.getState();
        const showNav = wfState.showWorkflowNavigation;
        const showEvents = wfState.showWorkflowEvents;
        const showDS = wfState.showWorkflowDataSources;
        const showLG = wfState.showWorkflowLayoutGroups;

        const focusedPageId = wfState.workflowFocusedPageId;
        const highlightState = buildWorkflowHighlightState(
          workflowHoveredEdgeId,
          focusedPageId,
          workflowEdges,
        );

        // Page frame highlight (엣지 아래에 렌더)
        if (highlightState && focusedPageId) {
          const connectedPageIds = collectHighlightedWorkflowPageIds(
            focusedPageId,
            highlightState,
            workflowEdges,
          );
          renderPageFrameHighlight(
            ck,
            canvas,
            connectedPageIds,
            pageFrameMap,
            cameraZoom,
            [0x3b / 255, 0x82 / 255, 0xf6 / 255],
            0.8,
          );
        }

        // Layout groups
        if (showLG && layoutGroups.length > 0) {
          renderLayoutGroups(
            ck,
            canvas,
            layoutGroups,
            pageFrameMap,
            cameraZoom,
            fontMgr,
          );
        }

        // Navigation/Event edges
        if (workflowEdges.length > 0 && (showNav || showEvents)) {
          const filteredEdges = filterRenderableWorkflowEdges(
            workflowEdges,
            showNav,
            showEvents,
          );
          if (filteredEdges.length > 0) {
            const straightEdges = useStore.getState().workflowStraightEdges;
            renderWorkflowEdges(
              ck,
              canvas,
              filteredEdges,
              pageFrameMap,
              cameraZoom,
              fontMgr,
              elBoundsMap,
              highlightState,
              straightEdges,
            );
          }
        }

        // Data source edges
        if (showDS && dataSourceEdges.length > 0) {
          renderDataSourceEdges(
            ck,
            canvas,
            dataSourceEdges,
            pageFrameMap,
            elBoundsMap,
            cameraZoom,
            fontMgr,
          );
        }
      }

      // ── Editing Context Border ──
      const editingContextId = useStore.getState().editingContextId;
      if (editingContextId && treeBoundsMap.has(editingContextId)) {
        const contextBounds = treeBoundsMap.get(editingContextId)!;
        renderEditingContextBorder(ck, canvas, contextBounds, cameraZoom);
      }

      // ── Hover Highlights ──
      const {
        hoveredElementId: hoveredCtxId,
        hoveredLeafIds,
        isGroupHover,
      } = elementHoverState;
      const hoverTargets = buildHoverHighlightTargets(
        treeBoundsMap,
        hoveredCtxId,
        hoveredLeafIds,
        isGroupHover,
      );
      for (const target of hoverTargets) {
        renderHoverHighlight(
          ck,
          canvas,
          target.bounds,
          cameraZoom,
          target.dashed,
        );
      }

      // ── Selection ──
      if (selectionData.bounds) {
        renderSelectionBox(ck, canvas, selectionData.bounds, cameraZoom);
        if (selectionData.showHandles) {
          renderTransformHandles(ck, canvas, selectionData.bounds, cameraZoom);
        }
        renderDimensionLabels(
          ck,
          canvas,
          selectionData.bounds,
          cameraZoom,
          fontMgr,
        );
      }
      if (selectionData.lasso) {
        renderLasso(ck, canvas, selectionData.lasso, cameraZoom);
      }

      // ── Minimap ──
      const mmScreenW = skiaCanvasWidth / dpr;
      const mmScreenH = skiaCanvasHeight / dpr;
      if (
        shouldRenderWorkflowMinimap(
          showWorkflowOverlay,
          minimapVisible,
          pageFrameMap.size,
        )
      ) {
        const mmConfig = buildMinimapConfig(mmScreenW, mmScreenH);
        renderWorkflowMinimap(
          ck,
          canvas,
          buildMinimapRenderData(
            pageFrameMap,
            workflowEdges,
            useStore.getState().workflowFocusedPageId,
            buildMinimapViewportBounds(
              cameraX,
              cameraY,
              cameraZoom,
              mmScreenW,
              mmScreenH,
            ),
          ),
          mmConfig,
          { zoom: cameraZoom, panX: cameraX, panY: cameraY },
          { width: mmScreenW, height: mmScreenH },
          cameraZoom,
        );
      }
    },
  };
}
