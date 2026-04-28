import type { Element, Page } from "../../../../types/core/store.types";
import type { PageElementIndex } from "../../../stores/utils/elementIndexer";
import type { ScenePageSnapshot, SceneStructureSnapshot } from "../scene";
import type { FrameAreaGroup } from "../skia/workflowEdges";
import { resolveCanonicalRefTree } from "../../../utils/canonicalRefResolution";

export interface PixiPageRendererInput {
  bodyElement: Element | null;
  depthMap: Map<string, number>;
  dirtyElementIds: Set<string>;
  elementById: Map<string, Element>;
  layoutVersion: number;
  pageElements: Element[];
  pageHeight: number;
  pageId: string;
  pagePositionVersion: number;
  pageSnapshot: ScenePageSnapshot;
  pageWidth: number;
  panOffset: { x: number; y: number };
  wasmLayoutReady: boolean;
  zoom: number;
}

interface BuildPixiPageRendererInputOptions {
  elementById: Map<string, Element>;
  dirtyElementIds: Set<string>;
  pageHeight: number;
  pageId: string;
  pagePositionVersion: number;
  pageWidth: number;
  panOffset: { x: number; y: number };
  sceneSnapshot: SceneStructureSnapshot;
  wasmLayoutReady: boolean;
  zoom: number;
}

export function buildPixiPageRendererInput({
  elementById,
  dirtyElementIds,
  pageHeight,
  pageId,
  pagePositionVersion,
  pageWidth,
  panOffset,
  sceneSnapshot,
  wasmLayoutReady,
  zoom,
}: BuildPixiPageRendererInputOptions): PixiPageRendererInput | null {
  const pageSnapshot = sceneSnapshot.pageSnapshots.get(pageId);
  if (!pageSnapshot?.bodyElement) {
    return null;
  }

  return {
    bodyElement: pageSnapshot.bodyElement,
    depthMap: sceneSnapshot.depthMap,
    dirtyElementIds,
    elementById,
    layoutVersion: sceneSnapshot.layoutVersion,
    pageElements: pageSnapshot.pageElements,
    pageHeight,
    pageId,
    pagePositionVersion,
    pageSnapshot,
    pageWidth,
    panOffset,
    wasmLayoutReady,
    zoom,
  };
}

interface BuildFrameRendererInputOptions {
  dirtyElementIds: Set<string>;
  elementById: Map<string, Element>;
  /** ADR-911 P3-α framePositions[frameId] (또는 frameAreas fallback) */
  frameHeight: number;
  /** legacy layoutId — canonical reusable frame.id 도 동일 (metadata.layoutId 보존) */
  frameId: string;
  frameWidth: number;
  frameX: number;
  frameY: number;
  pagePositionVersion: number;
  panOffset: { x: number; y: number };
  sceneSnapshot: SceneStructureSnapshot;
  wasmLayoutReady: boolean;
  zoom: number;
}

/**
 * ADR-911 P3-δ fix #3 (D4=A, 2026-04-28) — frame body 의 PixiPageRendererInput
 * shape 빌드. page-centric 함수와 분리 (rendererInput.ts 의 page 함수와 frame
 * 함수 분리 명확).
 *
 * Body element 식별: `el.type === "body"` && `el.layout_id === frameId`.
 * pageElements: composition-pre-1.0 legacy layout_id propagation 으로 모든
 * descendant 가 frameId 를 layout_id 로 보유 → `el.layout_id === frameId`
 * 필터로 subtree 전체 수집. ADR-911 P3-δ fix #1 의 type 체크 패턴과 동일 원칙
 * (Slot 가 layout_id propagation 을 받지만 type='body' 가 아님 → frame body
 * 후보에서 자동 제외, descendant 로는 정상 포함).
 *
 * **pageElements 에서 bodyElement 자신은 제외** — page 경로 (`buildSceneIndex`
 * 의 `nonBodyElements`) 와 일치. `buildPageChildrenMap` 의 `parent_id ?? bodyId`
 * fallback 으로 body 가 자기 자신의 child 가 되어 DFS 무한 재귀 발생 방지
 * (P3-δ fix #3 RangeError 회귀 fix).
 *
 * pageSnapshot 은 frame 용 synthetic 으로 빌드 (sceneSnapshot.pageSnapshots
 * 는 page 만 보유). `useLayoutPublisher` 는 pageSnapshot 미사용이므로 다른
 * consumer 영향 없음.
 */
export function buildFrameRendererInput({
  dirtyElementIds,
  elementById,
  frameHeight,
  frameId,
  frameWidth,
  frameX,
  frameY,
  pagePositionVersion,
  panOffset,
  sceneSnapshot,
  wasmLayoutReady,
  zoom,
}: BuildFrameRendererInputOptions): PixiPageRendererInput | null {
  let bodyElement: Element | null = null;
  const pageElements: Element[] = [];

  for (const el of elementById.values()) {
    if (el.deleted) continue;
    if (el.layout_id !== frameId) continue;
    if (el.page_id != null) continue;
    if (el.type === "body") {
      if (!bodyElement) bodyElement = el;
      // body element 는 pageElements 에 포함하지 않음 — page 경로의 nonBodyElements
      // 와 동일 정책. buildPageChildrenMap 의 self-child 회귀 방지.
      continue;
    }
    pageElements.push(el);
  }

  if (!bodyElement) return null;

  const frameSnapshot: ScenePageSnapshot = {
    bodyElement,
    contentVersion: 0,
    frame: {
      elementCount: pageElements.length,
      height: frameHeight,
      id: frameId,
      title: bodyElement.id,
      width: frameWidth,
      x: frameX,
      y: frameY,
    },
    isVisible: true,
    pageElements,
    pageId: frameId,
    positionVersion: pagePositionVersion,
  };

  return {
    bodyElement,
    depthMap: sceneSnapshot.depthMap,
    dirtyElementIds,
    elementById,
    layoutVersion: sceneSnapshot.layoutVersion,
    pageElements,
    pageHeight: frameHeight,
    pageId: frameId,
    pagePositionVersion,
    pageSnapshot: frameSnapshot,
    pageWidth: frameWidth,
    panOffset,
    wasmLayoutReady,
    zoom,
  };
}

export interface SkiaRendererInput {
  childrenMap: Map<string, Element[]>;
  elements: Element[];
  elementsMap: Map<string, Element>;
  dirtyElementIds: Set<string>;
  editMode: "page" | "layout";
  pageIndex: PageElementIndex;
  pagePositionsVersion: number;
  pagePositions: Record<string, { x: number; y: number } | undefined>;
  pageSnapshots: Map<string, ScenePageSnapshot>;
  pages: Page[];
  sceneSnapshot: SceneStructureSnapshot;

  // ADR-911 P3-δ: reusable frame canvas authoring 시각 path
  /** P3-α store: frame id (legacy layoutId) → 캔버스 영역 좌표/크기 */
  framePositions: Record<
    string,
    { x: number; y: number; width: number; height: number } | undefined
  >;
  /** P3-α store: framePositions 변경 카운터 (cache invalidation key) */
  framePositionsVersion: number;
  /** P3-β computeFrameAreas: canonical reusable frame 별 캔버스 영역 그룹 */
  frameAreas: FrameAreaGroup[];
}

interface CreateSkiaRendererInputOptions {
  childrenMap: Map<string, Element[]>;
  elements: Element[];
  elementsMap: Map<string, Element>;
  dirtyElementIds: Set<string>;
  editMode: "page" | "layout";
  pageIndex: PageElementIndex;
  pagePositionsVersion: number;
  pagePositions: Record<string, { x: number; y: number } | undefined>;
  pages: Page[];
  sceneSnapshot: SceneStructureSnapshot;
  framePositions: Record<
    string,
    { x: number; y: number; width: number; height: number } | undefined
  >;
  framePositionsVersion: number;
  frameAreas: FrameAreaGroup[];
}

export function createSkiaRendererInput(
  input: CreateSkiaRendererInputOptions,
): SkiaRendererInput {
  const resolvedTree = resolveCanonicalRefTree({
    childrenMap: input.childrenMap,
    elements: input.elements,
    elementsMap: input.elementsMap,
  });

  return {
    childrenMap: resolvedTree.childrenMap,
    elements: resolvedTree.elements,
    elementsMap: resolvedTree.elementsMap,
    dirtyElementIds: input.dirtyElementIds,
    editMode: input.editMode,
    pageIndex: input.pageIndex,
    pagePositionsVersion: input.pagePositionsVersion,
    pagePositions: input.pagePositions,
    pageSnapshots: input.sceneSnapshot.pageSnapshots,
    pages: input.pages,
    sceneSnapshot: input.sceneSnapshot,
    framePositions: input.framePositions,
    framePositionsVersion: input.framePositionsVersion,
    frameAreas: input.frameAreas,
  };
}
