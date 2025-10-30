import { useState } from "react";
import { GridList, GridListItem, Button, useDragAndDrop } from "react-aria-components";
import type { EventAction } from "../../types";
import { ActionCard } from "./ActionCard";
import { InlineActionEditor } from "./InlineActionEditor";

export interface ActionListProps {
  actions: EventAction[];
  onReorder: (reorderedActions: EventAction[]) => void;
  onUpdateAction: (actionId: string, updatedAction: EventAction) => void;
  onDeleteAction: (actionId: string) => void;
  onDuplicateAction: (action: EventAction) => void;
  onAddAction?: () => void;
}

/**
 * ActionList - Drag-and-drop reorderable list of actions
 */
export function ActionList({
  actions,
  onReorder,
  onUpdateAction,
  onDeleteAction,
  onDuplicateAction,
  onAddAction
}: ActionListProps) {
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // React Aria DnD
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => {
      return [...keys].map((key) => {
        const action = actions.find((a) => a.id === key);
        return {
          "text/plain": action?.type || "",
          "action/json": JSON.stringify(action)
        };
      });
    },
    onReorder: (e) => {
      const { target, keys } = e;

      if (target.dropPosition === "before" || target.dropPosition === "after") {
        const reorderedActions = [...actions];
        const draggedItems = [...keys].map((key) =>
          actions.find((a) => a.id === key)
        ).filter(Boolean) as EventAction[];

        // Remove dragged items from original positions
        draggedItems.forEach((item) => {
          const index = reorderedActions.findIndex((a) => a.id === item.id);
          if (index >= 0) {
            reorderedActions.splice(index, 1);
          }
        });

        // Find target index
        const targetAction = actions.find((a) => a.id === target.key);
        let targetIndex = reorderedActions.findIndex((a) => a.id === targetAction?.id);

        if (target.dropPosition === "after") {
          targetIndex++;
        }

        // Insert dragged items at target position
        reorderedActions.splice(targetIndex, 0, ...draggedItems);

        onReorder(reorderedActions);
      }
    },
    acceptedDragTypes: ["action/json"]
  });

  const handleEdit = (action: EventAction) => {
    setEditingActionId(action.id);
  };

  const handleSave = (updatedAction: EventAction) => {
    onUpdateAction(updatedAction.id, updatedAction);
    setEditingActionId(null);
  };

  const handleCancel = () => {
    setEditingActionId(null);
  };

  const handleDuplicate = (action: EventAction) => {
    const duplicatedAction: EventAction = {
      ...action,
      id: `${action.id}-copy-${Date.now()}`
    };
    onDuplicateAction(duplicatedAction);
  };

  return (
    <div className="action-list">
      {actions.length === 0 ? (
        <div className="empty-actions">
          <span className="empty-icon">📝</span>
          <p className="empty-message">No actions added yet</p>
          {onAddAction && (
            <Button
              className="react-aria-Button add-action-button"
              onPress={onAddAction}
            >
              Add First Action
            </Button>
          )}
        </div>
      ) : (
        <>
          <GridList
            className="react-aria-GridList action-grid-list"
            aria-label="Actions list"
            items={actions}
            dragAndDropHooks={dragAndDropHooks}
            selectionMode="multiple"
          >
            {(action) => (
              <GridListItem
                key={action.id}
                id={action.id}
                textValue={action.type}
                className="action-grid-item"
              >
                {editingActionId === action.id ? (
                  <InlineActionEditor
                    action={action}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <ActionCard
                    action={action}
                    index={actions.indexOf(action)}
                    onEdit={handleEdit}
                    onDelete={onDeleteAction}
                    onDuplicate={handleDuplicate}
                  />
                )}
              </GridListItem>
            )}
          </GridList>

          {onAddAction && (
            <Button
              className="react-aria-Button add-action-button"
              onPress={onAddAction}
            >
              + Add Action
            </Button>
          )}
        </>
      )}
    </div>
  );
}
