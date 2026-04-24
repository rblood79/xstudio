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
  pageId: string;
}

/**
 * 페이지 타이틀의 scene 좌표 히트 영역.
 *
 * page title 은 `canvas.translate(frame.x, frame.y)` 후 `canvas.scale(invZoom, invZoom)`
 * 안에서 screen-px 기준으로 그려지므로, scene 좌표 bounds 는 아래와 같이 변환한다:
 *
 *   sceneX = frame.x
 *   sceneY = frame.y + (textY - PAGE_TITLE_FONT_SIZE * 0.85) * invZoom
 *   sceneWidth = (titleWidth + badgeGap + badgeWidth) * invZoom
 *   sceneHeight = PAGE_TITLE_FONT_SIZE * invZoom + small padding
 *
 * drag 히트 테스트는 scene 좌표에서 수행하므로 (screenToViewportPoint 결과와 직접 비교)
 * renderer 가 매 프레임 이 맵을 clear + populate 한다.
 */
export interface PageTitleBounds {
  pageId: string;
  sceneX: number;
  sceneY: number;
  sceneWidth: number;
  sceneHeight: number;
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
    .filter((frame): frame is PageFrame & { title: string } =>
      Boolean(frame.title),
    )
    .map((frame) => ({
      pageId: frame.id,
      title: frame.title,
      x: frame.x,
      y: frame.y,
      elementCount: frame.elementCount ?? 0,
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
