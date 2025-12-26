import type { EventType, EventAction, ActionConfig } from "../../types/eventTypes";
import { EVENT_METADATA } from "../../data/eventCategories";
import { ACTION_METADATA } from "../../data/actionMetadata";

/**
 * Helper function to safely get a config value
 */
function getConfigValue(config: ActionConfig | undefined, key: string): string {
  if (!config) return '';
  const value: unknown = (config as Record<string, unknown>)[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  return String(value);
}

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

  // Fallback for missing metadata
  if (!metadata) {
    console.warn(`⚠️ Missing EVENT_METADATA for event type: ${eventType}`);
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
          <div className="trigger-event-type">{eventType}</div>
        </div>
      </div>
    );
  }

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

  // Fallback for missing metadata
  if (!metadata) {
    console.warn(`⚠️ Missing ACTION_METADATA for action type: ${action.type}`);
    return (
      <div
        className={`flow-node flow-action-node ${isSelected ? "selected" : ""}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        <div className="flow-node-header action-header">
          <span className="flow-node-icon">⚙️</span>
          <span className="flow-node-title">{action.type}</span>
          <span className="flow-node-index">#{index + 1}</span>
        </div>
      </div>
    );
  }

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
      return `→ ${getConfigValue(config, 'path')}`;

    case "scrollTo":
      return `→ ${getConfigValue(config, 'target')}`;

    case "setState":
      return `${getConfigValue(config, 'key')} = ${getConfigValue(config, 'value')}`;

    case "apiCall":
      return `${getConfigValue(config, 'method')} ${getConfigValue(config, 'endpoint')}`;

    case "showModal":
      return getConfigValue(config, 'modalId');

    case "showToast":
      return getConfigValue(config, 'message');

    case "toggleVisibility":
      return getConfigValue(config, 'targetId');

    case "customFunction":
      return getConfigValue(config, 'functionName');

    // Phase 3-4 new action types
    case "setComponentState":
      return `${getConfigValue(config, 'targetId')} → ${getConfigValue(config, 'statePath')}`;

    case "triggerComponentAction":
      return `${getConfigValue(config, 'targetId')}.${getConfigValue(config, 'action')}()`;

    case "updateFormField":
      return `Form: ${getConfigValue(config, 'fieldName')}`;

    case "filterCollection":
      return `Filter: ${getConfigValue(config, 'targetId')} (${getConfigValue(config, 'filterMode')})`;

    case "selectItem":
      return `Select: ${getConfigValue(config, 'targetId')} (${getConfigValue(config, 'behavior')})`;

    case "clearSelection":
      return `Clear: ${getConfigValue(config, 'targetId')}`;

    default:
      return "";
  }
}
