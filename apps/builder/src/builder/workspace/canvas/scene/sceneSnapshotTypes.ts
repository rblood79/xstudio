import type { PageElementIndex } from "../../../stores/utils/elementIndexer";
import type { Page, Element } from "../../../../types/core/store.types";
import type { BoundingBox } from "../selection/types";

export interface ScenePageFrame {
  elementCount: number;
  height: number;
  id: string;
  title: string;
  width: number;
  x: number;
  y: number;
}

export interface ScenePageData {
  bodyElement: Element | null;
  pageElements: Element[];
}

export interface ScenePageSnapshot extends ScenePageData {
  contentVersion: number;
  frame: ScenePageFrame;
  isVisible: boolean;
  pageId: string;
  positionVersion: number;
}

export interface SceneDocumentSnapshot {
  allPageFrames: ScenePageFrame[];
  allPageFrameVersion: number;
  currentPageId: string | null;
  currentPageSnapshot: ScenePageSnapshot | null;
  pageCount: number;
  visibleContentVersion: number;
  visiblePageFrames: ScenePageFrame[];
  visiblePageIds: Set<string>;
  visiblePagePositionVersion: number;
}

export interface SelectionSnapshot {
  selectedIds: string[];
  selectionBounds: BoundingBox | null;
}

export interface SceneSnapshot {
  depthMap: Map<string, number>;
  document: SceneDocumentSnapshot;
  layoutVersion: number;
  pageSnapshots: Map<string, ScenePageSnapshot>;
  selection: SelectionSnapshot;
  selectionVersion: number;
  sceneVersion: number;
  viewportVersion: number;
}

export interface BuildSceneSnapshotInput {
  containerSize?: { height: number; width: number };
  currentPageId: string | null;
  elements: Element[];
  elementsMap: Map<string, Element>;
  layoutVersion: number;
  pageHeight: number;
  pageIndex: PageElementIndex;
  pagePositions: Record<string, { x: number; y: number } | undefined>;
  pagePositionsVersion: number;
  pageWidth: number;
  pages: Page[];
  panOffset: { x: number; y: number };
  selectedElementIds: string[];
  zoom: number;
}
