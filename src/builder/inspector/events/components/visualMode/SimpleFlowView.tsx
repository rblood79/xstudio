import { useState } from "react";
import type { ElementEvent } from "@/types/events";
import { FlowNode, type FlowNodeData } from "./FlowNode";
import { FlowConnector } from "./FlowConnector";

export interface SimpleFlowViewProps {
  eventHandler: ElementEvent;
  onSelectAction?: (actionId: string) => void;
}

/**
 * SimpleFlowView - HTML/CSS-based flow visualization
 */
export function SimpleFlowView({
  eventHandler,
  onSelectAction
}: SimpleFlowViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);

    // If it's an action node, notify parent
    if (nodeId.startsWith("action-")) {
      const actionId = nodeId.replace("action-", "");
      onSelectAction?.(actionId);
    }
  };

  // Build node data
  const nodes: Array<{ id: string; data: FlowNodeData }> = [];

  // Add trigger node
  nodes.push({
    id: `trigger-${eventHandler.event_type}`,
    data: {
      type: "trigger",
      eventType: eventHandler.event_type
    }
  });

  // Add action nodes
  eventHandler.actions.forEach((action, index) => {
    nodes.push({
      id: `action-${action.id}`,
      data: {
        type: "action",
        action,
        index
      }
    });
  });

  return (
    <div className="simple-flow-view">
      <div className="flow-container">
        {nodes.map((node, index) => (
          <div key={node.id} className="flow-item">
            <FlowNode
              data={node.data}
              onClick={() => handleNodeClick(node.id)}
              isSelected={selectedNodeId === node.id}
            />
            {index < nodes.length - 1 && <FlowConnector />}
          </div>
        ))}

        {eventHandler.actions.length === 0 && (
          <div className="flow-empty-state">
            <span className="empty-icon">➕</span>
            <p className="empty-message">No actions added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
