import { useState } from "react";
import { Button } from "react-aria-components";
import type { SelectedElement } from "../types";
import type { EventHandler, EventType } from "../events/types";
import { useInspectorState } from "../hooks/useInspectorState";
import { EventHandlerManager } from "../events/components/EventHandlerManager";
import { EventPalette } from "../events/components/listMode/EventPalette";

export interface EventSectionProps {
  element: SelectedElement;
}

/**
 * EventSection - Integrated with new EventHandlerManager
 */
export function EventSection({ element }: EventSectionProps) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedHandlerId, setSelectedHandlerId] = useState<string | null>(null);

  // Use Inspector state methods for event management
  const addEventToInspector = useInspectorState((state) => state.addEvent);
  const updateEventInInspector = useInspectorState((state) => state.updateEvent);
  const removeEventFromInspector = useInspectorState((state) => state.removeEvent);

  // IMPORTANT: Get events from Inspector state, not from element prop
  // Inspector state is the source of truth for real-time updates
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const eventHandlers: EventHandler[] = selectedElement?.events || [];
  const registeredEventTypes: EventType[] = eventHandlers.map((h) => h.event);

  // Get selected handler
  const selectedHandler = selectedHandlerId
    ? eventHandlers.find((h) => h.id === selectedHandlerId)
    : null;

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
  const handleAddAction = () => {
    if (!selectedHandler) {
      return;
    }

    // Create a simple default action (navigate)
    const newAction = {
      id: `action-${Date.now()}`,
      type: "navigate" as const,
      config: {
        path: "/",
        openInNewTab: false,
        replace: false
      }
    };

    const updatedHandler: EventHandler = {
      ...selectedHandler,
      actions: [...selectedHandler.actions, newAction]
    };

    handleUpdateHandler(selectedHandler.id, updatedHandler);
  };

  return (
    <div className="event-section">
      <div className="event-section-header">
        <h5 className="section-subtitle">Event Handlers</h5>
        <Button
          className="react-aria-Button add-event-button-header"
          onPress={() => setShowAddEvent(!showAddEvent)}
        >
          {showAddEvent ? "✕ Cancel" : "+ Add Event"}
        </Button>
      </div>

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
        <div className="empty-state">
          <span className="empty-icon">⚡</span>
          <p className="empty-message">No event handlers registered</p>
          <p className="empty-hint">Click "+ Add Event" to get started</p>
        </div>
      ) : (
        <div className="event-handlers-list">
          {selectedHandler ? (
            // Show EventHandlerManager for selected handler
            <div className="selected-handler-container">
              <div className="selected-handler-header">
                <Button
                  className="react-aria-Button back-button"
                  onPress={() => setSelectedHandlerId(null)}
                >
                  ← Back to List
                </Button>
                <span className="selected-handler-type">{selectedHandler.event}</span>
                <Button
                  className="react-aria-Button remove-handler-button"
                  onPress={() => handleRemoveHandler(selectedHandler.id)}
                >
                  🗑️ Remove
                </Button>
              </div>
              <EventHandlerManager
                eventHandler={selectedHandler}
                onUpdateHandler={(updated) =>
                  handleUpdateHandler(selectedHandler.id, updated)
                }
                onAddAction={handleAddAction}
              />
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
  );
}
