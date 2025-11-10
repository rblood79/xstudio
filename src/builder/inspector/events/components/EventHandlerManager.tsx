import { useState } from "react";
import type { ElementEvent } from "@/types/events";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { SimpleFlowView } from "./visualMode/SimpleFlowView";
import { ReactFlowCanvas } from "./visualMode/ReactFlowCanvas";

export interface EventHandlerManagerProps {
  eventHandler: ElementEvent;
}

/**
 * EventHandlerManager - ReactFlow 중심 이벤트 핸들러 관리
 * Phase 1: listMode 제거, visualMode만 지원
 */
export function EventHandlerManager({
  eventHandler,
}: EventHandlerManagerProps) {
  // listMode 제거, ReactFlow 기본값으로 변경
  const [viewMode, setViewMode] = useState<ViewMode>("reactflow");

  const handleViewModeChange = (mode: ViewMode) => {
    console.log("🔄 ViewMode changed:", mode);
    setViewMode(mode);
  };

  // Handle action selection from visual modes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectAction = (actionId: string) => {
    // TODO: Implement action selection in future
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
