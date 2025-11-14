import { Button } from "react-aria-components";
import type { SelectedElement, EventHandler } from "./types/eventTypes";
import { useInspectorState } from "../inspector/hooks/useInspectorState";
import { useComponentMeta } from "../inspector/hooks/useComponentMeta";

export interface EventListProps {
  element: SelectedElement;
  onSelectEvent: (event: EventHandler) => void;
}

export function EventList({ element, onSelectEvent }: EventListProps) {
  const meta = useComponentMeta(element.type);
  const { addEvent, removeEvent } = useInspectorState();

  const supportedEvents = meta?.inspector?.supportedEvents || [];
  const registeredEvents = element.events || [];

  const handleAddEvent = (eventName: string) => {
    // eslint-disable-next-line react-hooks/purity
    const timestamp = Date.now();
    const newEvent: EventHandler = {
      id: `${eventName}-${timestamp}`,
      event: eventName,
      actions: [],
    };
    addEvent(newEvent);
  };

  const handleRemoveEvent = (eventId: string) => {
    removeEvent(eventId);
  };

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h5 className="section-title">Registered Events</h5>
      </div>

      {registeredEvents.length === 0 ? (
        <p className="empty-message">이벤트가 등록되지 않았습니다.</p>
      ) : (
        <div className="registered-events">
          {registeredEvents.map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-info" onClick={() => onSelectEvent(event)}>
                <span className="event-name">{event.event}</span>
                <span className="action-count">
                  {event.actions.length} action
                  {event.actions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Button
                className="remove-event-button"
                onPress={() => handleRemoveEvent(event.id)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="available-events">
        <h6 className="available-events-title">Add Event</h6>
        <div className="event-buttons">
          {supportedEvents.map((eventName) => (
            <Button
              key={eventName}
              className="add-event-button"
              onPress={() => handleAddEvent(eventName)}
              isDisabled={registeredEvents.some((e) => e.event === eventName)}
            >
              + {eventName}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
