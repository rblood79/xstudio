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

export interface SelectionSnapshot {
  selectedIds: string[];
  selectionBounds: BoundingBox | null;
}

export interface SceneSnapshot {
  allPageData: Map<string, ScenePageData>;
  currentPageData: ScenePageData | null;
  currentPageId: string | null;
  depthMap: Map<string, number>;
  layoutVersion: number;
  pageFrames: ScenePageFrame[];
  selection: SelectionSnapshot;
  selectionVersion: number;
  sceneVersion: number;
  viewportVersion: number;
  visiblePageIds: Set<string>;
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
