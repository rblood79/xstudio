import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges
} from "reactflow";
import "reactflow/dist/style.css";
import type { EventHandler } from "../../types";
import { useEventFlow } from "../../hooks/useEventFlow";
import { TriggerNode } from "./TriggerNode";
import { ActionNode } from "./ActionNode";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode
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
    (_event: React.MouseEvent, node: any) => {
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
