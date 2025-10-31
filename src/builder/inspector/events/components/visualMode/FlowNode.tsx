import type { EventType, EventAction } from "../../types";
import { EVENT_METADATA } from "../../data/eventCategories";
import { ACTION_METADATA } from "../../data/actionMetadata";

export type FlowNodeType = "trigger" | "action";

export interface FlowNodeData {
  type: FlowNodeType;
  eventType?: EventType;
  action?: EventAction;
  index?: number;
}

export interface FlowNodeProps {
  data: FlowNodeData;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * FlowNode - Visual node in the flow diagram
 */
export function FlowNode({ data, onClick, isSelected = false }: FlowNodeProps) {
  if (data.type === "trigger") {
    return (
      <TriggerNode
        eventType={data.eventType!}
        onClick={onClick}
        isSelected={isSelected}
      />
    );
  }

  if (data.type === "action") {
    return (
      <ActionNode
        action={data.action!}
        index={data.index || 0}
        onClick={onClick}
        isSelected={isSelected}
      />
    );
  }

  return null;
}

/**
 * TriggerNode - Event trigger node
 */
function TriggerNode({
  eventType,
  onClick,
  isSelected
}: {
  eventType: EventType;
  onClick?: () => void;
  isSelected: boolean;
}) {
  const metadata = EVENT_METADATA[eventType];

  return (
    <div
      className={`flow-node flow-trigger-node ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flow-node-header trigger-header">
        <span className="flow-node-icon">⚡</span>
        <span className="flow-node-title">Trigger</span>
      </div>
      <div className="flow-node-content">
        <div className="trigger-event-type">{metadata.label}</div>
        <div className="trigger-description">{metadata.description}</div>
      </div>
    </div>
  );
}

/**
 * ActionNode - Action execution node
 */
function ActionNode({
  action,
  index,
  onClick,
  isSelected
}: {
  action: EventAction;
  index: number;
  onClick?: () => void;
  isSelected: boolean;
}) {
  const metadata = ACTION_METADATA[action.type];

  // Generate config summary
  const configSummary = generateActionSummary(action);

  return (
    <div
      className={`flow-node flow-action-node ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flow-node-header action-header">
        <span className="flow-node-icon">{metadata.icon}</span>
        <span className="flow-node-title">{metadata.label}</span>
        <span className="flow-node-index">#{index + 1}</span>
      </div>
      {configSummary && (
        <div className="flow-node-content">
          <div className="action-config-summary">{configSummary}</div>
        </div>
      )}
    </div>
  );
}

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
