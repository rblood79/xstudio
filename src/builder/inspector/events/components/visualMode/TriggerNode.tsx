import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { EventType } from "../../types";
import { EVENT_METADATA } from "../../data/eventCategories";

export interface TriggerNodeData {
  eventType: EventType;
}

/**
 * ReactFlow Custom Node: Event Trigger
 */
export const TriggerNode = memo(({ data }: NodeProps<TriggerNodeData>) => {
  const metadata = EVENT_METADATA[data.eventType];

  return (
    <div className="reactflow-trigger-node">
      <div className="node-header">
        <span className="node-icon">⚡</span>
        <span className="node-title">Trigger</span>
      </div>
      <div className="node-content">
        <div className="trigger-event-type">{metadata.label}</div>
        <div className="trigger-description">{metadata.description}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="trigger-out" />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
