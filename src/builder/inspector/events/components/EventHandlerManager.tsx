import { useState } from "react";
import type { EventHandler } from "../types";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { ActionList } from "./listMode/ActionList";
import { SimpleFlowView } from "./visualMode/SimpleFlowView";

export interface EventHandlerManagerProps {
  eventHandler: EventHandler;
  onUpdateHandler: (handler: EventHandler) => void;
  onAddAction?: () => void;
}

/**
 * EventHandlerManager - Unified component for managing event handlers
 * Supports both List and Visual modes
 */
export function EventHandlerManager({
  eventHandler,
  onUpdateHandler,
  onAddAction
}: EventHandlerManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // Handle action reordering
  const handleReorder = (reorderedActions: typeof eventHandler.actions) => {
    onUpdateHandler({
      ...eventHandler,
      actions: reorderedActions
    });
  };

  // Handle action update
  const handleUpdateAction = (actionId: string, updatedAction: typeof eventHandler.actions[0]) => {
    const updatedActions = eventHandler.actions.map((action) =>
      action.id === actionId ? updatedAction : action
    );

    onUpdateHandler({
      ...eventHandler,
      actions: updatedActions
    });
  };

  // Handle action deletion
  const handleDeleteAction = (actionId: string) => {
    const updatedActions = eventHandler.actions.filter(
      (action) => action.id !== actionId
    );

    onUpdateHandler({
      ...eventHandler,
      actions: updatedActions
    });
  };

  // Handle action duplication
  const handleDuplicateAction = (action: typeof eventHandler.actions[0]) => {
    const duplicatedAction = {
      ...action,
      id: `${action.id}-copy-${Date.now()}`
    };

    onUpdateHandler({
      ...eventHandler,
      actions: [...eventHandler.actions, duplicatedAction]
    });
  };

  // Handle action selection from visual mode
  const handleSelectAction = (actionId: string) => {
    setSelectedActionId(actionId);
    // Optionally switch to list mode for editing
    // setViewMode("list");
  };

  return (
    <div className="event-handler-manager">
      {/* View Mode Toggle */}
      <div className="manager-header">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Content based on view mode */}
      <div className="manager-content">
        {viewMode === "list" ? (
          <ActionList
            actions={eventHandler.actions}
            onReorder={handleReorder}
            onUpdateAction={handleUpdateAction}
            onDeleteAction={handleDeleteAction}
            onDuplicateAction={handleDuplicateAction}
            onAddAction={onAddAction}
          />
        ) : (
          <SimpleFlowView
            eventHandler={eventHandler}
            onSelectAction={handleSelectAction}
          />
        )}
      </div>
    </div>
  );
}
