import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EventHandler } from "../../types/eventTypes";
import { useEventFlow } from "../../hooks/useEventFlow";
import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  trigger: TriggerNode as any,
  action: ActionNode as any
};

export interface ReactFlowCanvasProps {
  eventHandler: EventHandler;
  onSelectAction?: (actionId: string) => void;
}

/**
 * ReactFlowCanvas - Advanced flow visualization with ReactFlow
 */
export function ReactFlowCanvas({
  eventHandler,
  onSelectAction
}: ReactFlowCanvasProps) {
  const { nodes: initialNodes, edges } = useEventFlow(eventHandler);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      if (node.id.startsWith("action-")) {
        const actionId = node.id.replace("action-", "");
        onSelectAction?.(actionId);
      }
    },
    [onSelectAction]
  );

  return (
    <div className="reactflow-canvas" style={{ height: "600px", width: "100%" }}>
      <ReactFlow
        nodes={initialNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
