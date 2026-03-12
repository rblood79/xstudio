/**
 * Skia Frame Build Pipeline (ADR-035 Phase 4)
 *
 * SkiaOverlay의 renderFrame() 내부에서 매 프레임 실행되는
 * content build 로직을 독립 모듈로 추출.
 *
 * 두 가지 빌드 경로:
 * 1. Command Stream 경로: elementsMap + layoutMap → RenderCommand[]
 * 2. Tree 경로: PixiJS 씬 그래프 DFS → 계층적 Skia 트리
 *
 * 공용 산출물(treeBoundsMap)을 1회 생성하여
 * selection/workflow/AI overlay가 재사용한다.
 */

import type { CanvasKit, FontMgr } from "canvaskit-wasm";
import type { Container } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type {
  RendererAIInvalidation,
  SkiaRendererInput,
} from "../renderers";
import type { BoundingBox } from "../selection/types";
import type {
  AIEffectNodeBounds,
  SkiaRenderable,
  ContentBuildResult,
  SharedSceneDerivedData,
} from "./types";
import type { ElementBounds } from "./workflowRenderer";
import {
  getSharedLayoutMap,
  getSharedLayoutVersion,
  getSharedFilteredChildrenMap,
} from "../layout/engines/fullTreeLayout";
import {
  getCachedCommandStream,
  executeRenderCommands,
  buildAIBoundsFromStream,
} from "./renderCommands";
import {
  buildSkiaTreeHierarchical,
  getCachedTreeBoundsMap,
} from "./skiaTreeBuilder";
import { buildNodeBoundsMap } from "./aiEffects";
import { renderNode } from "./nodeRenderers";
import { buildElementBoundsMapFromTreeBounds } from "./skiaFrameHelpers";
import { recordWasmMetric } from "../utils/gpuProfilerCore";

// ============================================
// Content Build — 입력/출력 타입
// ============================================

export interface ContentBuildInput {
  aiState: RendererAIInvalidation;
  registryVersion: number;
  pagePosVersion: number;
  cameraContainer: Container | null;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  ck: CanvasKit;
  fontMgr: FontMgr | undefined;
  rendererInput: SkiaRendererInput;
}

// ============================================
// Content Build — 메인 함수
// ============================================

/**
 * 프레임 content를 빌드한다.
 *
 * Command Stream 또는 Tree 경로 중 하나를 선택하여
 * treeBoundsMap, AI bounds, content node를 생성한다.
 *
 * @returns null — 빈 씬인 경우 (caller가 clearFrame 처리)
 */
export function buildSkiaFrameContent(
  input: ContentBuildInput,
): ContentBuildResult | null {
  const {
    aiState,
    registryVersion,
    pagePosVersion,
    cameraContainer,
    cameraX,
    cameraY,
    cameraZoom,
    ck,
    fontMgr,
    rendererInput,
  } = input;

  const sharedLayoutMap = getSharedLayoutMap();
  const useCommandStream = sharedLayoutMap !== null;

  const hasAIEffects =
    aiState.generatingNodes.size > 0 || aiState.flashAnimations.size > 0;

  let treeBoundsMap: Map<string, BoundingBox>;
  let nodeBoundsMap: Map<string, AIEffectNodeBounds> | null;
  let contentNode: SkiaRenderable;

  if (useCommandStream) {
    const result = buildViaCommandStream(
      sharedLayoutMap,
      registryVersion,
      pagePosVersion,
      hasAIEffects,
      aiState,
      rendererInput,
      ck,
      fontMgr,
    );
    if (!result) return null;
    treeBoundsMap = result.treeBoundsMap;
    nodeBoundsMap = result.nodeBoundsMap;
    contentNode = result.contentNode;
  } else {
    const result = buildViaTree(
      cameraContainer,
      registryVersion,
      cameraX,
      cameraY,
      cameraZoom,
      pagePosVersion,
      hasAIEffects,
      aiState,
      ck,
      fontMgr,
    );
    if (!result) return null;
    treeBoundsMap = result.treeBoundsMap;
    nodeBoundsMap = result.nodeBoundsMap;
    contentNode = result.contentNode;
  }

  return {
    sharedScene: buildSharedSceneDerivedData(
      treeBoundsMap,
      cameraX,
      cameraY,
      cameraZoom,
    ),
    nodeBoundsMap,
    workflowElementBoundsMap: null, // workflow 단계에서 필요 시 빌드
    contentNode,
    hasAIEffects,
    empty: false,
  };
}

// 하위 호환성 유지
export const buildFrameContent = buildSkiaFrameContent;

export function buildSharedSceneDerivedData(
  treeBoundsMap: Map<string, BoundingBox>,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
): SharedSceneDerivedData {
  return {
    treeBoundsMap,
    cameraX,
    cameraY,
    cameraZoom,
  };
}

// ============================================
// Workflow Data Build
// ============================================

/**
 * 워크플로우 오버레이에 필요한 요소 바운드 맵을 빌드한다.
 * content build의 treeBoundsMap을 재사용하여 중복 순회를 방지한다.
 */
export function buildWorkflowElementBounds(
  treeBoundsMap: Map<string, BoundingBox>,
): Map<string, ElementBounds> {
  return buildElementBoundsMapFromTreeBounds(treeBoundsMap);
}

// ============================================
// Internal — Command Stream 경로
// ============================================

interface InternalBuildResult {
  treeBoundsMap: Map<string, BoundingBox>;
  nodeBoundsMap: Map<string, AIEffectNodeBounds> | null;
  contentNode: SkiaRenderable;
}

function buildViaCommandStream(
  sharedLayoutMap: Map<string, unknown>,
  registryVersion: number,
  pagePosVersion: number,
  hasAIEffects: boolean,
  aiState: RendererAIInvalidation,
  rendererInput: SkiaRendererInput,
  ck: CanvasKit,
  fontMgr: FontMgr | undefined,
): InternalBuildResult | null {
  const treeBuildStart =
    process.env.NODE_ENV === "development" ? performance.now() : 0;

  const pagePositions = rendererInput.pagePositions;
  const layoutVersion = getSharedLayoutVersion();

  // rootElementIds: 각 페이지의 body element ID
  // bodyPagePositions: bodyId → pagePosition
  const rootElementIds: string[] = [];
  const bodyPagePositions: Record<string, { x: number; y: number }> = {};
  for (const page of rendererInput.pages) {
    const pageElementIds = rendererInput.pageIndex.elementsByPage.get(page.id);
    if (!pageElementIds) {
      continue;
    }
    for (const elementId of pageElementIds) {
      const el = rendererInput.elementsMap.get(elementId);
      if (el?.tag.toLowerCase() === "body") {
        rootElementIds.push(el.id);
        const pos = pagePositions[page.id];
        if (pos) bodyPagePositions[el.id] = pos;
        break;
      }
    }
  }

  // Fix 1: filteredChildrenMap 사용 (layoutMap과 동일 트리 소스)
  const filteredChildIds = getSharedFilteredChildrenMap();
  let commandChildrenMap: Map<string, Element[]>;
  if (filteredChildIds) {
    commandChildrenMap = new Map();
    for (const [parentId, childIds] of filteredChildIds) {
      const children: Element[] = [];
      for (const cid of childIds) {
        const el = rendererInput.elementsMap.get(cid);
        if (el) children.push(el);
      }
      commandChildrenMap.set(parentId, children);
    }
  } else {
    commandChildrenMap = rendererInput.childrenMap;
  }

  const stream = getCachedCommandStream(
    rootElementIds,
    commandChildrenMap,
    sharedLayoutMap,
    bodyPagePositions,
    registryVersion,
    pagePosVersion,
    layoutVersion,
  );

  if (process.env.NODE_ENV === "development") {
    recordWasmMetric("skiaTreeBuildTime", performance.now() - treeBuildStart);
  }

  const treeBoundsMap = stream.boundsMap;
  if (treeBoundsMap.size === 0) return null;

  // Selection build (boundsMap에서 0ms — 공용 산출물 재사용)
  const selectionBuildStart =
    process.env.NODE_ENV === "development" ? performance.now() : 0;
  if (process.env.NODE_ENV === "development") {
    recordWasmMetric(
      "selectionBuildTime",
      performance.now() - selectionBuildStart,
    );
  }

  // AI 이펙트 바운드 (stream.boundsMap에서 필터링)
  let nodeBoundsMap: Map<string, AIEffectNodeBounds> | null = null;
  if (hasAIEffects) {
    const aiBuildStart =
      process.env.NODE_ENV === "development" ? performance.now() : 0;
    const targetIds = new Set<string>();
    for (const id of aiState.generatingNodes.keys()) targetIds.add(id);
    for (const id of aiState.flashAnimations.keys()) targetIds.add(id);
    nodeBoundsMap = buildAIBoundsFromStream(stream.boundsMap, targetIds);
    if (process.env.NODE_ENV === "development") {
      recordWasmMetric("aiBoundsBuildTime", performance.now() - aiBuildStart);
    }
  }

  const contentNode: SkiaRenderable = {
    renderSkia(canvas, bounds) {
      executeRenderCommands(ck, canvas, stream.commands, bounds, fontMgr);
    },
  };

  return { treeBoundsMap, nodeBoundsMap, contentNode };
}

// ============================================
// Internal — Tree 경로
// ============================================

function buildViaTree(
  cameraContainer: Container | null,
  registryVersion: number,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  pagePosVersion: number,
  hasAIEffects: boolean,
  aiState: RendererAIInvalidation,
  ck: CanvasKit,
  fontMgr: FontMgr | undefined,
): InternalBuildResult | null {
  const treeBuildStart =
    process.env.NODE_ENV === "development" ? performance.now() : 0;
  const tree = cameraContainer
    ? buildSkiaTreeHierarchical(
        cameraContainer,
        registryVersion,
        cameraX,
        cameraY,
        cameraZoom,
        pagePosVersion,
      )
    : null;
  if (process.env.NODE_ENV === "development") {
    recordWasmMetric("skiaTreeBuildTime", performance.now() - treeBuildStart);
  }
  if (!tree) return null;

  const selectionBuildStart =
    process.env.NODE_ENV === "development" ? performance.now() : 0;
  const treeBoundsMap = getCachedTreeBoundsMap(
    tree,
    registryVersion,
    pagePosVersion,
  );
  if (process.env.NODE_ENV === "development") {
    recordWasmMetric(
      "selectionBuildTime",
      performance.now() - selectionBuildStart,
    );
  }

  let nodeBoundsMap: Map<string, AIEffectNodeBounds> | null = null;
  if (hasAIEffects) {
    const aiBuildStart =
      process.env.NODE_ENV === "development" ? performance.now() : 0;
    nodeBoundsMap = buildNodeBoundsMap(tree, aiState);
    if (process.env.NODE_ENV === "development") {
      recordWasmMetric("aiBoundsBuildTime", performance.now() - aiBuildStart);
    }
  }

  const contentNode: SkiaRenderable = {
    renderSkia(canvas, bounds) {
      renderNode(ck, canvas, tree, bounds, fontMgr);
    },
  };

  return { treeBoundsMap, nodeBoundsMap, contentNode };
}
