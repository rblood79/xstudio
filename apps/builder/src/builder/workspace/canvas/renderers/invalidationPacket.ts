import type { Layout } from "../../../../types/builder/layout.types";
import type {
  FlashAnimationState,
  GeneratingEffectState,
} from "../skia/types";
import type {
  DataSourceEdge,
  LayoutGroup,
  WorkflowEdge,
} from "../skia/workflowEdges";

export interface RendererSelectionInvalidationInput {
  currentPageId: string | null;
  editingContextId: string | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
}

export interface RendererSelectionInvalidation
  extends RendererSelectionInvalidationInput {
  editingSignature: string;
  selectionSignature: string;
}

export interface RendererGridInvalidationInput {
  gridSize: number;
  showGrid: boolean;
}

export interface RendererGridInvalidation extends RendererGridInvalidationInput {
  signature: string;
}

export interface RendererWorkflowInvalidationInput {
  dataSourceEdges: DataSourceEdge[];
  focusedPageId: string | null;
  layoutGroups: LayoutGroup[];
  layouts: Layout[];
  showDataSources: boolean;
  showEvents: boolean;
  showLayoutGroups: boolean;
  showNavigation: boolean;
  showOverlay: boolean;
  straightEdges: boolean;
  workflowEdges: WorkflowEdge[];
}

export interface RendererWorkflowInvalidation
  extends RendererWorkflowInvalidationInput {
  graphSignature: string;
  overlaySignature: string;
  subToggleSignature: string;
}

export interface RendererAIInvalidation {
  cleanupExpiredFlashes: (currentTime: number) => void;
  flashAnimations: Map<string, FlashAnimationState>;
  generatingNodes: Map<string, GeneratingEffectState>;
}

export interface RendererInvalidationPacketInput {
  ai: RendererAIInvalidation;
  dragActive: boolean;
  grid: RendererGridInvalidationInput;
  selection: RendererSelectionInvalidationInput;
  workflow: RendererWorkflowInvalidationInput;
}

export interface RendererInvalidationPacket {
  ai: RendererAIInvalidation;
  dragActive: boolean;
  grid: RendererGridInvalidation;
  selection: RendererSelectionInvalidation;
  workflow: RendererWorkflowInvalidation;
}

function hashSignature(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function buildSelectionSignature(
  selection: RendererSelectionInvalidationInput,
): string {
  return hashSignature(
    [
      selection.currentPageId ?? "",
      selection.selectedElementId ?? "",
      selection.selectedElementIds.join(","),
    ].join("|"),
  );
}

function buildGridSignature(grid: RendererGridInvalidationInput): string {
  return `${grid.showGrid ? 1 : 0}:${grid.gridSize}`;
}

function buildWorkflowEdgeSignature(edges: WorkflowEdge[]): string {
  return edges
    .map((edge) =>
      [
        edge.id,
        edge.type,
        edge.sourcePageId,
        edge.targetPageId,
        edge.sourceElementId ?? "",
        edge.label ?? "",
      ].join(":"),
    )
    .join("|");
}

function buildDataSourceEdgeSignature(edges: DataSourceEdge[]): string {
  return edges
    .map((edge) =>
      [
        edge.id,
        edge.sourceType,
        edge.name,
        edge.boundElements
          .map((binding) =>
            [binding.pageId, binding.elementId, binding.elementTag].join(":"),
          )
          .join(","),
      ].join(":"),
    )
    .join("|");
}

function buildLayoutGroupSignature(groups: LayoutGroup[]): string {
  return groups
    .map((group) =>
      [group.layoutId, group.layoutName, group.pageIds.join(",")].join(":"),
    )
    .join("|");
}

function buildLayoutSignature(layouts: Layout[]): string {
  return layouts
    .map((layout) =>
      [
        layout.id,
        layout.name,
        layout.slug ?? "",
        layout.order_num ?? "",
        layout.notFoundPageId ?? "",
        layout.inheritNotFound === false ? 0 : 1,
      ].join(":"),
    )
    .join("|");
}

function buildWorkflowGraphSignature(
  workflow: RendererWorkflowInvalidationInput,
): string {
  return hashSignature(
    [
      buildWorkflowEdgeSignature(workflow.workflowEdges),
      buildDataSourceEdgeSignature(workflow.dataSourceEdges),
      buildLayoutGroupSignature(workflow.layoutGroups),
      buildLayoutSignature(workflow.layouts),
    ].join("||"),
  );
}

export function createRendererInvalidationPacket(
  packet: RendererInvalidationPacketInput,
): RendererInvalidationPacket {
  return {
    ai: packet.ai,
    dragActive: packet.dragActive,
    grid: {
      ...packet.grid,
      signature: buildGridSignature(packet.grid),
    },
    selection: {
      ...packet.selection,
      editingSignature: packet.selection.editingContextId ?? "",
      selectionSignature: buildSelectionSignature(packet.selection),
    },
    workflow: {
      ...packet.workflow,
      graphSignature: buildWorkflowGraphSignature(packet.workflow),
      overlaySignature: packet.workflow.showOverlay ? "1" : "0",
      subToggleSignature: [
        packet.workflow.showNavigation ? 1 : 0,
        packet.workflow.showEvents ? 1 : 0,
        packet.workflow.showDataSources ? 1 : 0,
        packet.workflow.showLayoutGroups ? 1 : 0,
        packet.workflow.straightEdges ? 1 : 0,
      ].join(":"),
    },
  };
}
