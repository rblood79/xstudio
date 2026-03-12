import type { RefObject } from "react";
import type { Element } from "../../../../types/core/store.types";
import { getElementBoundsSimple } from "../elementRegistry";
import type { RendererSelectionInvalidation } from "../renderers";
import { calculateCombinedBounds } from "../selection/types";
import type { BoundingBox, DragState } from "../selection/types";
import type { LassoRenderData } from "./selectionRenderer";
import { computeConnectedEdges } from "./workflowGraphUtils";
import type { WorkflowEdge } from "./workflowEdges";
import type { WorkflowHighlightState } from "./workflowRenderer";

export interface SelectionRenderResult {
  bounds: BoundingBox | null;
  lasso: LassoRenderData | null;
  showHandles: boolean;
}

export interface PageFrameLike {
  height: number;
  id: string;
  width: number;
  x: number;
  y: number;
}

export function buildWorkflowHighlightState(
  hoveredEdgeId: string | null,
  focusedPageId: string | null,
  workflowEdges: WorkflowEdge[],
): WorkflowHighlightState | undefined {
  if (!hoveredEdgeId && !focusedPageId) {
    return undefined;
  }

  const connected = focusedPageId
    ? computeConnectedEdges(focusedPageId, workflowEdges)
    : {
        directEdgeIds: new Set<string>(),
        secondaryEdgeIds: new Set<string>(),
      };

  return {
    hoveredEdgeId,
    focusedPageId,
    directEdgeIds: connected.directEdgeIds,
    secondaryEdgeIds: connected.secondaryEdgeIds,
  };
}

export function collectHighlightedWorkflowPageIds(
  focusedPageId: string,
  highlightState: WorkflowHighlightState,
  workflowEdges: WorkflowEdge[],
): Set<string> {
  const connectedPageIds = new Set<string>();
  connectedPageIds.add(focusedPageId);

  for (const edge of workflowEdges) {
    if (highlightState.directEdgeIds.has(edge.id)) {
      connectedPageIds.add(edge.sourcePageId);
      connectedPageIds.add(edge.targetPageId);
    }
  }

  return connectedPageIds;
}

export function filterRenderableWorkflowEdges(
  workflowEdges: WorkflowEdge[],
  showNavigation: boolean,
  showEvents: boolean,
): WorkflowEdge[] {
  return workflowEdges.filter((edge) => {
    if (edge.type === "navigation") {
      return showNavigation;
    }
    if (edge.type === "event-navigation") {
      return showEvents;
    }
    return false;
  });
}

export function buildSelectionRenderData(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  treeBoundsMap: Map<string, BoundingBox>,
  selection: RendererSelectionInvalidation,
  elementsMap: Map<string, Element>,
  dragStateRef?: RefObject<DragState | null>,
  pageFrames?: PageFrameLike[],
): SelectionRenderResult {
  const selectedIds = selection.selectedElementIds;

  let selectionBounds: BoundingBox | null = null;
  let showHandles = false;

  if (selectedIds.length > 0) {
    const currentPageId = selection.currentPageId;
    const boxes: BoundingBox[] = [];

    for (const id of selectedIds) {
      const element = elementsMap.get(id);
      if (!element || element.page_id !== currentPageId) {
        continue;
      }

      const treeBounds = treeBoundsMap.get(id);
      if (treeBounds) {
        boxes.push({
          x: treeBounds.x,
          y: treeBounds.y,
          width: treeBounds.width,
          height: treeBounds.height,
        });
        continue;
      }

      const globalBounds = getElementBoundsSimple(id);
      if (globalBounds) {
        boxes.push({
          x: (globalBounds.x - cameraX) / cameraZoom,
          y: (globalBounds.y - cameraY) / cameraZoom,
          width: globalBounds.width / cameraZoom,
          height: globalBounds.height / cameraZoom,
        });
        continue;
      }

      if (element.tag.toLowerCase() === "body" && pageFrames) {
        const pageFrame = pageFrames.find((frame) => frame.id === element.page_id);
        if (pageFrame) {
          boxes.push({
            x: pageFrame.x,
            y: pageFrame.y,
            width: pageFrame.width,
            height: pageFrame.height,
          });
        }
      }
    }

    selectionBounds = calculateCombinedBounds(boxes);
    showHandles = selectedIds.length === 1;
  }

  let lasso: LassoRenderData | null = null;
  const dragState = dragStateRef?.current;
  if (
    dragState?.isDragging &&
    dragState.operation === "lasso" &&
    dragState.startPosition &&
    dragState.currentPosition
  ) {
    const sx = dragState.startPosition.x;
    const sy = dragState.startPosition.y;
    const cx = dragState.currentPosition.x;
    const cy = dragState.currentPosition.y;
    lasso = {
      x: Math.min(sx, cx),
      y: Math.min(sy, cy),
      width: Math.abs(cx - sx),
      height: Math.abs(cy - sy),
    };
  }

  return { bounds: selectionBounds, showHandles, lasso };
}
