import { useState } from "react";
import type { ElementEvent } from "@/types/events";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { SimpleFlowView } from "./visualMode/SimpleFlowView";
import { ReactFlowCanvas } from "./visualMode/ReactFlowCanvas";

export interface EventHandlerManagerProps {
  eventHandler: ElementEvent;
  onUpdateHandler: (handler: ElementEvent) => void;
  onAddAction?: () => void;
}

/**
 * EventHandlerManager - ReactFlow 중심 이벤트 핸들러 관리
 * Phase 1: listMode 제거, visualMode만 지원
 */
export function EventHandlerManager({
  eventHandler,
  onUpdateHandler,
  onAddAction
}: EventHandlerManagerProps) {
  // listMode 제거, ReactFlow 기본값으로 변경
  const [viewMode, setViewMode] = useState<ViewMode>("reactflow");

  const handleViewModeChange = (mode: ViewMode) => {
    console.log("🔄 ViewMode changed:", mode);
    setViewMode(mode);
  };

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

  // Handle action selection from visual modes
  const handleSelectAction = (actionId: string) => {
    setSelectedActionId(actionId);
    // Optionally switch to list mode for editing
    // setViewMode("list");
  };

  console.log("📊 Current viewMode:", viewMode);

  return (
    <div className="event-handler-manager">
      {/* View Mode Toggle - listMode 제거 */}
      <div className="manager-header">
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Content based on view mode - listMode 제거됨 */}
      <div className="manager-content">
        {viewMode === "simple" && (
          <SimpleFlowView
            eventHandler={eventHandler}
            onSelectAction={handleSelectAction}
          />
        )}

        {viewMode === "reactflow" && (
          <ReactFlowCanvas
            eventHandler={eventHandler}
            onSelectAction={handleSelectAction}
          />
        )}
      </div>
    </div>
  );
}
