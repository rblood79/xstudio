import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { EventType } from "../../types/eventTypes";
import { EVENT_METADATA } from "../../data/eventCategories";

export interface TriggerNodeData {
  eventType: EventType;
  [key: string]: unknown;
}

interface TriggerNodeProps {
  data: TriggerNodeData;
}

/**
 * ReactFlow Custom Node: Event Trigger
 */
export const TriggerNode = memo(({ data }: TriggerNodeProps) => {
  const metadata = EVENT_METADATA[data.eventType];

  // Fallback for missing metadata
  if (!metadata) {
    console.warn(`⚠️ Missing EVENT_METADATA for event type: ${data.eventType}`);
    return (
      <div className="reactflow-trigger-node">
        <div className="node-header">
          <span className="node-icon">⚡</span>
          <span className="node-title">Trigger</span>
        </div>
        <div className="node-content">
          <div className="trigger-event-type">{data.eventType}</div>
        </div>
        <Handle type="source" position={Position.Bottom} id="trigger-out" />
      </div>
    );
  }

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
