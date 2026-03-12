/**
 * Skia Frame Plan Builder (ADR-035 Phase 4)
 *
 * SkiaOverlay renderFrame()에서 사용하는 프레임 입력/오버레이 조립을
 * 별도 모듈로 추출한다. 동작 변경 없이 orchestration 책임만 이동한다.
 */

import type { RefObject } from "react";
import type { CanvasKit, FontMgr, Canvas } from "canvaskit-wasm";
import type { BoundingBox, DragState } from "../selection/types";
import type {
  AIEffectNodeBounds,
  SharedSceneDerivedData,
  FrameInputSnapshot,
  FrameRenderPlan,
  SelectionOverlayBuildResult,
  WorkflowOverlayBuildResult,
  SkiaRenderable,
} from "./types";
import type {
  WorkflowEdge,
  DataSourceEdge,
  LayoutGroup,
} from "./workflowEdges";
import type {
  PageFrame,
  ElementBounds,
} from "./workflowRenderer";
import type { CachedEdgeGeometry } from "./workflowHitTest";
import type { WorkflowHoverState } from "../hooks/useWorkflowInteraction";
import type { ElementHoverState } from "../hooks/useElementHoverInteraction";
import { useStore } from "../../../stores";
import { renderGrid } from "./gridRenderer";
import { buildGridRenderInput } from "./skiaOverlayHelpers";
import { buildSelectionRenderData } from "./skiaWorkflowSelection";
import {
  buildWorkflowOverlayData,
  buildFrameCaches,
  buildOverlayNode,
} from "./skiaOverlayBuilder";

export interface CreateFrameInputOptions {
  registryVersion: number;
  pagePosVersion: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  overlayVersion: number;
}

export function createFrameInputSnapshot(
  input: CreateFrameInputOptions,
): FrameInputSnapshot {
  return {
    registryVersion: input.registryVersion,
    pagePosVersion: input.pagePosVersion,
    cameraX: input.cameraX,
    cameraY: input.cameraY,
    cameraZoom: input.cameraZoom,
    overlayVersion: input.overlayVersion,
  };
}

export interface BuildFrameRenderPlanInput {
  ck: CanvasKit;
  fontMgr: FontMgr | undefined;
  snapshot: FrameInputSnapshot;
  sharedScene: SharedSceneDerivedData;
  nodeBoundsMap: Map<string, AIEffectNodeBounds> | null;
  hasAIEffects: boolean;
  contentNode: SkiaRenderable;
  dragStateRef?: RefObject<DragState | null>;
  pageFrames?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount: number;
  }>;
  showWorkflowOverlay: boolean;
  workflowEdges: WorkflowEdge[];
  workflowEdgesVersion: number;
  dataSourceEdges: DataSourceEdge[];
  layoutGroups: LayoutGroup[];
  workflowHoverState: WorkflowHoverState;
  elementHoverState: ElementHoverState;
  minimapVisible: boolean;
  minimapConfig: import("./workflowMinimap").MinimapConfig;
  skiaCanvasWidth: number;
  skiaCanvasHeight: number;
  dpr: number;
  prevEdgeGeometryCache: CachedEdgeGeometry[];
  prevEdgeGeometryCacheKey: string;
}

export function buildFrameRenderPlan(
  input: BuildFrameRenderPlanInput,
): FrameRenderPlan {
  const {
    ck,
    fontMgr,
    snapshot,
    sharedScene,
    nodeBoundsMap,
    hasAIEffects,
    contentNode,
    dragStateRef,
    pageFrames,
    showWorkflowOverlay,
    workflowEdges,
    workflowEdgesVersion,
    dataSourceEdges,
    layoutGroups,
    workflowHoverState,
    elementHoverState,
    minimapVisible,
    minimapConfig,
    skiaCanvasWidth,
    skiaCanvasHeight,
    dpr,
    prevEdgeGeometryCache,
    prevEdgeGeometryCacheKey,
  } = input;

  const selection = buildSelectionOverlayData(
    snapshot,
    sharedScene,
    dragStateRef,
    pageFrames,
  );

  const workflow = showWorkflowOverlay
    ? buildWorkflowOverlayBuildResult({
        treeBoundsMap: sharedScene.treeBoundsMap,
        pageFrames: pageFrames ?? [],
        workflowEdges,
        workflowEdgesVersion,
        pagePosVersion: snapshot.pagePosVersion,
        prevEdgeGeometryCache,
        prevEdgeGeometryCacheKey,
      })
    : null;

  const overlayNode = buildOverlayNode({
    ck,
    fontMgr,
    treeBoundsMap: sharedScene.treeBoundsMap,
    cameraX: snapshot.cameraX,
    cameraY: snapshot.cameraY,
    cameraZoom: snapshot.cameraZoom,
    hasAIEffects,
    nodeBoundsMap,
    selectionData: selection,
    showWorkflowOverlay,
    workflowEdges,
    dataSourceEdges,
    layoutGroups,
    pageFrameMap: workflow?.pageFrameMap ?? new Map<string, PageFrame>(),
    workflowElementBoundsMap: workflow?.workflowElementBoundsMap ?? null,
    workflowHoveredEdgeId: workflowHoverState.hoveredEdgeId,
    elementHoverState,
    pageFrames,
    minimapVisible,
    minimapConfig,
    skiaCanvasWidth,
    skiaCanvasHeight,
    dpr,
  });

  const screenOverlayNode = buildGridScreenOverlayNode(
    ck,
    snapshot.cameraZoom,
  );

  return {
    sharedScene,
    contentNode,
    overlayNode,
    screenOverlayNode,
    cullingBounds: createCullingBounds(
      snapshot.cameraX,
      snapshot.cameraY,
      snapshot.cameraZoom,
      skiaCanvasWidth,
      skiaCanvasHeight,
      dpr,
    ),
    selection,
    workflow,
  };
}

export function buildSelectionOverlayData(
  snapshot: FrameInputSnapshot,
  sharedScene: SharedSceneDerivedData,
  dragStateRef?: RefObject<DragState | null>,
  pageFrames?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount: number;
  }>,
): SelectionOverlayBuildResult {
  return buildSelectionRenderData(
    sharedScene.cameraX,
    sharedScene.cameraY,
    sharedScene.cameraZoom,
    sharedScene.treeBoundsMap,
    dragStateRef,
    pageFrames,
  );
}

interface BuildWorkflowOverlayBuildResultInput {
  treeBoundsMap: Map<string, BoundingBox>;
  pageFrames: Array<{
    id: string;
    title?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount?: number;
  }>;
  workflowEdges: WorkflowEdge[];
  workflowEdgesVersion: number;
  pagePosVersion: number;
  prevEdgeGeometryCache: CachedEdgeGeometry[];
  prevEdgeGeometryCacheKey: string;
}

function buildWorkflowOverlayBuildResult(
  input: BuildWorkflowOverlayBuildResultInput,
): WorkflowOverlayBuildResult {
  const wfData = buildWorkflowOverlayData(input.treeBoundsMap, input.pageFrames);
  const { workflowStraightEdges } = useStore.getState();
  const cacheResult = buildFrameCaches(
    input.workflowEdges,
    wfData.pageFrameMap,
    wfData.workflowElementBoundsMap,
    input.workflowEdgesVersion,
    input.pagePosVersion,
    workflowStraightEdges,
    input.prevEdgeGeometryCacheKey,
    input.prevEdgeGeometryCache,
  );

  return {
    pageFrameMap: wfData.pageFrameMap,
    workflowElementBoundsMap: wfData.workflowElementBoundsMap,
    edgeGeometryCache: cacheResult.edgeGeometryCache,
    edgeGeometryCacheKey: cacheResult.edgeGeometryCacheKey,
  };
}

function buildGridScreenOverlayNode(
  ck: CanvasKit,
  cameraZoom: number,
): SkiaRenderable | null {
  const { showGrid, gridSize } = useStore.getState();
  if (!showGrid) {
    return null;
  }

  return {
    renderSkia(canvas: Canvas, cullingBounds: DOMRect) {
      renderGrid(ck, canvas, buildGridRenderInput(cullingBounds, gridSize, cameraZoom));
    },
  };
}

function createCullingBounds(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  skiaCanvasWidth: number,
  skiaCanvasHeight: number,
  dpr: number,
): DOMRect {
  const screenW = skiaCanvasWidth / dpr;
  const screenH = skiaCanvasHeight / dpr;
  return new DOMRect(
    -cameraX / cameraZoom,
    -cameraY / cameraZoom,
    screenW / cameraZoom,
    screenH / cameraZoom,
  );
}
