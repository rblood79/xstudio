import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { EventAction } from "../../types/eventTypes";
import { ACTION_METADATA } from "../../data/actionMetadata";

export interface ActionNodeData {
  action: EventAction;
  index: number;
}

/**
 * ReactFlow Custom Node: Action Execution
 */
export const ActionNode = memo(({ data }: NodeProps<ActionNodeData>) => {
  const metadata = ACTION_METADATA[data.action.type];

  // Fallback for missing metadata
  if (!metadata) {
    console.warn(`⚠️ Missing ACTION_METADATA for action type: ${data.action.type}`);
    return (
      <div className="reactflow-action-node">
        <Handle type="target" position={Position.Top} id="action-in" />
        <div className="node-header">
          <span className="node-icon">⚙️</span>
          <span className="node-title">{data.action.type}</span>
          <span className="node-index">#{data.index + 1}</span>
        </div>
        <Handle type="source" position={Position.Bottom} id="action-out" />
      </div>
    );
  }

  // Generate config summary
  const configSummary = generateActionSummary(data.action);

  return (
    <div className="reactflow-action-node">
      <Handle type="target" position={Position.Top} id="action-in" />
      <div className="node-header">
        <span className="node-icon">{metadata.icon}</span>
        <span className="node-title">{metadata.label}</span>
        <span className="node-index">#{data.index + 1}</span>
      </div>
      {configSummary && (
        <div className="node-content">
          <div className="action-config-summary">{configSummary}</div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="action-out" />
    </div>
  );
});

ActionNode.displayName = "ActionNode";

/**
 * Generate action config summary
 */
function generateActionSummary(action: EventAction): string {
  const { type, config } = action;

  if (!config) return "";

  switch (type) {
    case "navigate":
      return `→ ${config.path}`;
    case "scrollTo":
      return `→ ${config.target}`;
    case "setState":
      return `${config.key} = ${String(config.value)}`;
    case "apiCall":
      return `${config.method} ${config.endpoint}`;
    case "showModal":
      return config.modalId;
    case "showToast":
      return config.message;
    case "toggleVisibility":
      return config.targetId;
    case "customFunction":
      return config.functionName;
    default:
      return "";
  }
}
