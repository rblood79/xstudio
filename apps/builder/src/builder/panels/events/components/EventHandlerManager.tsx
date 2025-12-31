import { useState } from "react";
import type { EventHandler, EventAction } from "../types/eventTypes";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { SimpleFlowView } from "./visualMode/SimpleFlowView";
import { ReactFlowCanvas } from "./visualMode/ReactFlowCanvas";
import { ActionListView } from "./ActionListView";

export interface EventHandlerManagerProps {
  eventHandler: EventHandler;
  onUpdateAction: (actionId: string, updates: Partial<EventAction>) => void;
  onRemoveAction: (actionId: string) => void;
}

/**
 * EventHandlerManager - 이벤트 핸들러 관리 (List/Simple/ReactFlow)
 *
 * - list: 액션 목록 및 편집
 * - simple: 간단한 플로우 다이어그램
 * - reactflow: ReactFlow 기반 고급 다이어그램
 */
export function EventHandlerManager({
  eventHandler,
  onUpdateAction,
  onRemoveAction,
}: EventHandlerManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Handle action selection from visual modes
  const handleSelectAction = (actionId: string) => {
    setSelectedActionId(actionId);
    setViewMode("list");
  };

  return (
    <div className="event-handler-manager">
      {/* View Mode Toggle */}
      <div className="manager-header">
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Content based on view mode */}
      <div className="manager-content">
        {viewMode === "list" && (
          <ActionListView
            actions={eventHandler.actions}
            onUpdateAction={onUpdateAction}
            onRemoveAction={onRemoveAction}
            selectedActionId={selectedActionId || undefined}
            onSelectAction={setSelectedActionId}
          />
        )}

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
