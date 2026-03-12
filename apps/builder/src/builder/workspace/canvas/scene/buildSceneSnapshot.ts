import { buildAllPageData, buildDepthMap, buildPageFrames } from "./buildSceneIndex";
import { buildSelectionSnapshot } from "./buildSelectionSnapshot";
import { buildVisiblePageSet } from "./buildVisiblePageSet";
import type {
  BuildSceneSnapshotInput,
  SceneSnapshot,
} from "./sceneSnapshotTypes";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function buildSceneSnapshot(
  input: BuildSceneSnapshotInput,
): SceneSnapshot {
  const depthMap = buildDepthMap(input.elements, input.elementsMap);
  const allPageData = buildAllPageData(
    input.pages,
    input.pageIndex,
    input.elementsMap,
  );
  const pageFrames = buildPageFrames(
    input.pages,
    input.pageIndex,
    input.elementsMap,
    input.pagePositions,
    input.pageWidth,
    input.pageHeight,
  );
  const visiblePageIds = buildVisiblePageSet({
    containerSize: input.containerSize,
    pageFrames,
    panOffset: input.panOffset,
    zoom: input.zoom,
  });
  const selection = buildSelectionSnapshot({
    currentPageId: input.currentPageId,
    elementsMap: input.elementsMap,
    selectedElementIds: input.selectedElementIds,
  });

  return {
    allPageData,
    currentPageData: input.currentPageId
      ? allPageData.get(input.currentPageId) ?? null
      : null,
    currentPageId: input.currentPageId,
    depthMap,
    layoutVersion: input.layoutVersion,
    pageFrames,
    selection,
    selectionVersion: hashString(selection.selectedIds.join("|")),
    sceneVersion: hashString(
      [
        input.layoutVersion,
        input.pagePositionsVersion,
        input.elements.length,
        input.pages.length,
      ].join(":"),
    ),
    viewportVersion: hashString(
      [
        input.zoom,
        input.panOffset.x,
        input.panOffset.y,
        input.containerSize?.width ?? 0,
        input.containerSize?.height ?? 0,
      ].join(":"),
    ),
    visiblePageIds,
  };
}
