import { useState } from "react";
import { Button } from "react-aria-components";
import { Trash, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import type { EventAction } from "../types/eventTypes";
import { ACTION_METADATA } from "../data/actionMetadata";
import { ActionEditor } from "../actions/ActionEditor";
import { iconProps } from "../../../utils/ui/uiConstants";

export interface ActionListViewProps {
  actions: EventAction[];
  onUpdateAction: (id: string, updates: Partial<EventAction>) => void;
  onRemoveAction: (id: string) => void;
  selectedActionId?: string;
  onSelectAction?: (actionId: string | null) => void;
}

/**
 * ActionListView - 액션 목록 및 편집 UI
 *
 * Simple/ReactFlow 모드에서 액션을 클릭하면 이 뷰로 전환되어
 * 선택된 액션을 편집할 수 있습니다.
 */
export function ActionListView({
  actions,
  onUpdateAction,
  onRemoveAction,
  selectedActionId,
  onSelectAction,
}: ActionListViewProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(
    selectedActionId || null
  );

  const handleToggleExpand = (actionId: string) => {
    if (expandedActionId === actionId) {
      setExpandedActionId(null);
      onSelectAction?.(null);
    } else {
      setExpandedActionId(actionId);
      onSelectAction?.(actionId);
    }
  };

  const handleActionChange = (actionId: string, updatedAction: EventAction) => {
    onUpdateAction(actionId, updatedAction);
  };

  if (actions.length === 0) {
    return (
      <div className="action-list-empty">
        <p className="empty-message">
          No actions added yet. Add an action using the + button above.
        </p>
      </div>
    );
  }

  return (
    <div className="action-list-view">
      {actions.map((action, index) => {
        const metadata = ACTION_METADATA[action.type];
        const isExpanded = expandedActionId === action.id;

        return (
          <div
            key={action.id}
            className={`action-list-item ${isExpanded ? "expanded" : ""}`}
          >
            <div className="action-list-item-header">
              <div className="action-list-item-drag">
                <GripVertical
                  size={iconProps.size}
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                />
              </div>

              <div
                className="action-list-item-info"
                onClick={() => handleToggleExpand(action.id)}
                role="button"
                tabIndex={0}
              >
                <span className="action-index">#{index + 1}</span>
                <span className="action-label">
                  {metadata?.label || action.type}
                </span>
              </div>

              <div className="action-list-item-actions">
                <Button
                  className="iconButton"
                  onPress={() => handleToggleExpand(action.id)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown
                      size={iconProps.size}
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                    />
                  ) : (
                    <ChevronRight
                      size={iconProps.size}
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                    />
                  )}
                </Button>
                <Button
                  className="iconButton"
                  onPress={() => onRemoveAction(action.id)}
                  aria-label="Delete Action"
                >
                  <Trash
                    size={iconProps.size}
                    color={iconProps.color}
                    strokeWidth={iconProps.stroke}
                  />
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="action-list-item-editor">
                <ActionEditor
                  action={action}
                  onChange={(updatedAction) =>
                    handleActionChange(action.id, updatedAction)
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
