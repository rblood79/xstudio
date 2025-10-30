import { Button } from "react-aria-components";
import type { EventAction } from "../../types";
import { ACTION_METADATA } from "../../data/actionMetadata";

export interface ActionCardProps {
  action: EventAction;
  index: number;
  isDragging?: boolean;
  isEditing?: boolean;
  onEdit: (action: EventAction) => void;
  onDelete: (actionId: string) => void;
  onDuplicate: (action: EventAction) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * ActionCard - Individual action card with drag handle and controls
 */
export function ActionCard({
  action,
  index,
  isDragging = false,
  isEditing = false,
  onEdit,
  onDelete,
  onDuplicate,
  dragHandleProps
}: ActionCardProps) {
  const metadata = ACTION_METADATA[action.type];

  // Generate config summary
  const configSummary = generateConfigSummary(action);

  return (
    <div
      className={`action-card ${isDragging ? "dragging" : ""} ${isEditing ? "editing" : ""}`}
      data-action-id={action.id}
    >
      {/* Drag Handle */}
      <div className="action-drag-handle" {...dragHandleProps}>
        <span className="drag-icon">⋮⋮</span>
      </div>

      {/* Action Content */}
      <div className="action-content">
        <div className="action-header">
          <div className="action-title-section">
            <span className="action-icon">{metadata.icon}</span>
            <span className="action-label">{metadata.label}</span>
            <span className="action-index">#{index + 1}</span>
          </div>
        </div>

        {configSummary && (
          <div className="action-config-summary">{configSummary}</div>
        )}
      </div>

      {/* Action Controls */}
      <div className="action-controls">
        <Button
          className="react-aria-Button action-control-button"
          onPress={() => onEdit(action)}
          aria-label="Edit action"
        >
          ✏️
        </Button>
        <Button
          className="react-aria-Button action-control-button"
          onPress={() => onDuplicate(action)}
          aria-label="Duplicate action"
        >
          📋
        </Button>
        <Button
          className="react-aria-Button action-control-button action-delete-button"
          onPress={() => onDelete(action.id)}
          aria-label="Delete action"
        >
          🗑️
        </Button>
      </div>
    </div>
  );
}

/**
 * Generate a human-readable summary of action config
 */
function generateConfigSummary(action: EventAction): string {
  const { type, config } = action;

  if (!config) return "";

  switch (type) {
    case "navigate":
      return `→ ${config.path}${config.openInNewTab ? " (new tab)" : ""}`;

    case "scrollTo":
      return `→ ${config.target} (${config.behavior || "auto"})`;

    case "setState":
      return `${config.key} = ${JSON.stringify(config.value)}`;

    case "updateState":
      return `Update ${config.key}`;

    case "apiCall":
      return `${config.method} ${config.endpoint}`;

    case "showModal":
      return `Show modal: ${config.modalId}`;

    case "hideModal":
      return config.modalId ? `Hide modal: ${config.modalId}` : "Hide all modals";

    case "showToast":
      return `${config.variant || "info"}: ${config.message}`;

    case "toggleVisibility":
      return `Toggle: ${config.targetId}`;

    case "validateForm":
      return config.showErrors ? "Validate with errors" : "Validate";

    case "resetForm":
      return "Reset form";

    case "submitForm":
      return "Submit form";

    case "copyToClipboard":
      return `Copy: ${config.text}`;

    case "customFunction":
      return `${config.functionName}(${
        config.params ? JSON.stringify(config.params) : ""
      })`;

    default:
      return JSON.stringify(config);
  }
}
