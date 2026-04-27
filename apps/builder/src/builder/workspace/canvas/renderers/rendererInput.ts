import type { Element, Page } from "../../../../types/core/store.types";
import type { PageElementIndex } from "../../../stores/utils/elementIndexer";
import type { ScenePageSnapshot, SceneStructureSnapshot } from "../scene";
import type { FrameAreaGroup } from "../skia/workflowEdges";

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

export interface SkiaRendererInput {
  childrenMap: Map<string, Element[]>;
  elements: Element[];
  elementsMap: Map<string, Element>;
  dirtyElementIds: Set<string>;
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
  return {
    childrenMap: input.childrenMap,
    elements: input.elements,
    elementsMap: input.elementsMap,
    dirtyElementIds: input.dirtyElementIds,
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
