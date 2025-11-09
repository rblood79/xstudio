import { useState, useEffect } from "react";
import { Button } from "react-aria-components";
import { Plus, X } from "lucide-react";
import type { SelectedElement } from "../types";
import type { ElementEvent, EventType, ActionType } from "@/types/events";
import { useInspectorState } from "../hooks/useInspectorState";
import { EventHandlerManager } from "../events/components/EventHandlerManager";
import { EventTypePicker } from "../events/pickers/EventTypePicker";
import { ActionTypePicker } from "../events/pickers/ActionTypePicker";
import { useEventHandlers } from "../events/state/useEventHandlers";
import { useActions } from "../events/state/useActions";
import { useEventSelection } from "../events/state/useEventSelection";
import { createDefaultActionConfig, generateActionId } from "../events/utils/actionHelpers";

const iconProps = {
  strokeWidth: 1.5,
  size: 16,
};

export interface EventSectionProps {
  element: SelectedElement;
}

/**
 * EventSection - React Stately 기반 이벤트 관리
 * Phase 1: Inspector Events React Stately 전환
 */
export function EventSection({ element }: EventSectionProps) {
  const [showAddAction, setShowAddAction] = useState(false);

  // Inspector 상태에서 이벤트 가져오기
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const updateEvents = useInspectorState((state) => state.updateEvents);

  // React Stately로 이벤트 핸들러 관리
  const {
    handlers,
    addHandler,
    updateHandler,
    removeHandler,
    duplicateHandler,
  } = useEventHandlers(selectedElement?.events || []);

  // 이벤트 선택 관리
  const {
    selectedHandlerId,
    selectedHandler,
    selectHandler,
    clearSelection,
    selectAfterDelete,
  } = useEventSelection(handlers);

  // Actions 관리 (선택된 핸들러의 액션만)
  const {
    actions,
    addAction,
    updateAction,
    removeAction,
    moveAction,
  } = useActions(selectedHandler?.actions || []);

  // 등록된 이벤트 타입 목록 (중복 방지용)
  const registeredEventTypes: EventType[] = handlers.map((h) => h.event_type);

  // Handle adding new event
  const handleAddEvent = (eventType: EventType) => {
    const newHandler: EventHandler = {
      id: `event-${eventType}-${Date.now()}`,
      event: eventType,
      actions: []
    };

    // Update Inspector state - useSyncWithBuilder will sync to Builder store
    addEventToInspector(newHandler);

    // Automatically select the new handler
    setSelectedHandlerId(newHandler.id);
    setShowAddEvent(false);
  };

  // Handle updating event handler
  const handleUpdateHandler = (handlerId: string, updated: EventHandler) => {
    // Update Inspector state - useSyncWithBuilder will sync to Builder store
    updateEventInInspector(handlerId, updated);
  };

  // Handle removing event handler
  const handleRemoveHandler = (handlerId: string) => {
    // Update Inspector state - useSyncWithBuilder will sync to Builder store
    removeEventFromInspector(handlerId);

    // Clear selection if removed handler was selected
    if (selectedHandlerId === handlerId) {
      setSelectedHandlerId(null);
    }
  };

  // Handle adding action to selected handler
  const handleAddActionType = (actionType: ActionType) => {
    if (!selectedHandler) {
      return;
    }

    // Create action with default config for the selected type
    const newAction = {
      id: generateActionId(actionType),
      type: actionType,
      config: createDefaultActionConfig(actionType)
    };

    const updatedHandler: EventHandler = {
      ...selectedHandler,
      actions: [...selectedHandler.actions, newAction]
    };

    handleUpdateHandler(selectedHandler.id, updatedHandler);
    setShowAddAction(false); // Hide ActionPalette after adding
  };

  // Show ActionPalette
  const handleShowAddAction = () => {
    setShowAddAction(true);
  };

  return (
    <div className="event-section">
      <div className="section-header">
        <div className="section-title">Events</div>
        <div className="header-actions">
          <button
            className="iconButton"
            aria-label={showAddEvent ? "Cancel" : "Add Event"}
            onClick={() => setShowAddEvent(!showAddEvent)}
          >
            {showAddEvent ? <X {...iconProps} /> : <Plus {...iconProps} />}
          </button>
        </div>
      </div>

      <div className="section-content">
        {/* Add Event Palette */}
        {showAddEvent && (
          <div className="add-event-container">
            <EventPalette
              componentType={element.type}
              registeredEvents={registeredEventTypes}
              onAddEvent={handleAddEvent}
            />
          </div>
        )}

        {/* Registered Event Handlers */}
        {eventHandlers.length === 0 ? (
          <p className="empty-message">
            No event handlers registered. Click the + icon to add one.
          </p>
        ) : (
        <div className="event-handlers-list">
          {selectedHandler ? (
            // Show EventHandlerManager for selected handler
            <div className="selected-handler-container">
              <div className="selected-handler-header">
                <Button
                  className="react-aria-Button"
                  onPress={() => setSelectedHandlerId(null)}
                >
                  ← Back
                </Button>
                <span className="selected-handler-type">{selectedHandler.event}</span>
                <Button
                  className="react-aria-Button"
                  onPress={() => handleRemoveHandler(selectedHandler.id)}
                >
                  🗑️ 
                </Button>
              </div>
              {/* ActionPalette for selecting action type */}
              {showAddAction ? (
                <ActionPalette
                  eventType={selectedHandler.event}
                  componentType={element.type}
                  previousAction={
                    selectedHandler.actions.length > 0
                      ? selectedHandler.actions[selectedHandler.actions.length - 1].type
                      : undefined
                  }
                  onAddAction={handleAddActionType}
                  onCancel={() => setShowAddAction(false)}
                />
              ) : (
                <EventHandlerManager
                  eventHandler={selectedHandler}
                  onUpdateHandler={(updated) =>
                    handleUpdateHandler(selectedHandler.id, updated)
                  }
                  onAddAction={handleShowAddAction}
                />
              )}
            </div>
          ) : (
            // Show list of handlers
            <div className="handlers-list">
              {eventHandlers.map((handler) => (
                <div
                  key={handler.id}
                  className="handler-item"
                  onClick={() => setSelectedHandlerId(handler.id)}
                >
                  <div className="handler-info">
                    <span className="handler-type">{handler.event}</span>
                    <span className="handler-action-count">
                      {handler.actions.length} action
                      {handler.actions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="handler-arrow">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
