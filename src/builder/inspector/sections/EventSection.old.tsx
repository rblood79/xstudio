import { useState } from "react";
import type { SelectedElement, EventHandler } from "../types";
import { EventList } from "../events/EventList";
import { EventEditor } from "../events/EventEditor";

export interface EventSectionProps {
  element: SelectedElement;
}

export function EventSection({ element }: EventSectionProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventHandler | null>(null);

  return (
    <div className="event-section">
      {selectedEvent ? (
        <EventEditor
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
        />
      ) : (
        <EventList element={element} onSelectEvent={setSelectedEvent} />
      )}
    </div>
  );
}
