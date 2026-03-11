import { measureWorkspacePanelInsets } from "../../utils/panelLayoutRuntime";
import type { BoundingBox } from "../selection/types";
import {
  DEFAULT_MINIMAP_CONFIG,
  MINIMAP_CANVAS_RATIO,
  MINIMAP_MAX_HEIGHT,
  MINIMAP_MAX_WIDTH,
  MINIMAP_MIN_HEIGHT,
  MINIMAP_MIN_WIDTH,
  type MinimapConfig,
} from "./workflowMinimap";
import type { WorkflowEdge } from "./workflowEdges";
import type { PageFrame } from "./workflowRenderer";

export interface HoverHighlightTarget {
  dashed: boolean;
  bounds: BoundingBox;
}

export interface PageTitleRenderItem {
  elementCount: number;
  highlighted: boolean;
  title: string;
  x: number;
  y: number;
}

export function buildHoverHighlightTargets(
  treeBoundsMap: Map<string, BoundingBox>,
  hoveredContextId: string | null,
  hoveredLeafIds: string[],
  isGroupHover: boolean,
): HoverHighlightTarget[] {
  const targets: HoverHighlightTarget[] = [];

  if (hoveredContextId) {
    const contextBounds = treeBoundsMap.get(hoveredContextId);
    if (contextBounds) {
      targets.push({ bounds: contextBounds, dashed: false });
    }
  }

  if (isGroupHover && hoveredLeafIds.length > 0) {
    for (const leafId of hoveredLeafIds) {
      const leafBounds = treeBoundsMap.get(leafId);
      if (leafBounds) {
        targets.push({ bounds: leafBounds, dashed: true });
      }
    }
  }

  return targets;
}

export function shouldRenderWorkflowMinimap(
  showWorkflowOverlay: boolean,
  minimapVisible: boolean,
  pageFrameCount: number,
): boolean {
  return showWorkflowOverlay && minimapVisible && pageFrameCount > 0;
}

export function buildMinimapConfig(
  screenWidth: number,
  screenHeight: number,
): MinimapConfig {
  const width = Math.max(
    MINIMAP_MIN_WIDTH,
    Math.min(MINIMAP_MAX_WIDTH, Math.round(screenWidth * MINIMAP_CANVAS_RATIO)),
  );
  const height = Math.max(
    MINIMAP_MIN_HEIGHT,
    Math.min(
      MINIMAP_MAX_HEIGHT,
      Math.round(screenHeight * MINIMAP_CANVAS_RATIO),
    ),
  );
  const { right: inspectorWidth } = measureWorkspacePanelInsets();

  return {
    ...DEFAULT_MINIMAP_CONFIG,
    width,
    height,
    screenRight: inspectorWidth + DEFAULT_MINIMAP_CONFIG.screenRight,
  };
}

export function buildMinimapViewportBounds(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  screenWidth: number,
  screenHeight: number,
) {
  return {
    x: -cameraX / cameraZoom,
    y: -cameraY / cameraZoom,
    width: screenWidth / cameraZoom,
    height: screenHeight / cameraZoom,
  };
}

export function buildMinimapRenderData(
  pageFrames: Map<string, PageFrame>,
  edges: WorkflowEdge[],
  focusedPageId: string | null,
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
) {
  return {
    pageFrames,
    edges,
    focusedPageId,
    viewportBounds,
  };
}

export function buildPageTitleRenderItems(
  pageFrames: PageFrame[],
  activePageId: string | null,
  hasSelection: boolean,
): PageTitleRenderItem[] {
  return pageFrames
    .filter((frame) => Boolean(frame.title))
    .map((frame) => ({
      title: frame.title,
      x: frame.x,
      y: frame.y,
      elementCount: frame.elementCount,
      highlighted: hasSelection && frame.id === activePageId,
    }));
}

export function buildGridRenderInput(
  cullingBounds: DOMRect,
  gridSize: number,
  zoom: number,
) {
  return {
    cullingBounds,
    gridSize,
    zoom,
    showGrid: true as const,
  };
}
