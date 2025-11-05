import { Button } from "react-aria-components";
import type { EventHandler, EventAction } from "../types";
import { useInspectorState } from "../hooks/useInspectorState";
import { ActionEditor } from "./actions/ActionEditor";

export interface EventEditorProps {
  event: EventHandler;
  onBack: () => void;
}

export function EventEditor({ event, onBack }: EventEditorProps) {
  const { updateEvent } = useInspectorState();

  const handleAddAction = () => {
    const newAction: EventAction = {
      type: "navigate",
      config: { path: "/" },
    };

    const updatedEvent: EventHandler = {
      ...event,
      actions: [...event.actions, newAction],
    };

    updateEvent(event.id, updatedEvent);
  };

  const handleUpdateAction = (actionIndex: number, action: EventAction) => {
    const updatedActions = [...event.actions];
    updatedActions[actionIndex] = action;

    const updatedEvent: EventHandler = {
      ...event,
      actions: updatedActions,
    };

    updateEvent(event.id, updatedEvent);
  };

  const handleRemoveAction = (actionIndex: number) => {
    const updatedActions = event.actions.filter((_, i) => i !== actionIndex);

    const updatedEvent: EventHandler = {
      ...event,
      actions: updatedActions,
    };

    updateEvent(event.id, updatedEvent);
  };

  const handleMoveAction = (fromIndex: number, toIndex: number) => {
    const updatedActions = [...event.actions];
    const [movedAction] = updatedActions.splice(fromIndex, 1);
    updatedActions.splice(toIndex, 0, movedAction);

    const updatedEvent: EventHandler = {
      ...event,
      actions: updatedActions,
    };

    updateEvent(event.id, updatedEvent);
  };

  return (
    <div className="event-editor">
      <div className="event-editor-header">
        <Button className="back-button" onPress={onBack}>
          ← Back
        </Button>
        <h5 className="event-editor-title">{event.event}</h5>
      </div>

      <div className="actions-list">
        {event.actions.length === 0 ? (
          <p className="empty-message">액션이 등록되지 않았습니다.</p>
        ) : (
          event.actions.map((action, index) => (
            <div key={index} className="action-wrapper">
              <div className="action-controls">
                <span className="action-order">#{index + 1}</span>
                <div className="action-move-buttons">
                  <Button
                    className="move-action-button"
                    onPress={() => handleMoveAction(index, index - 1)}
                    isDisabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    className="move-action-button"
                    onPress={() => handleMoveAction(index, index + 1)}
                    isDisabled={index === event.actions.length - 1}
                  >
                    ↓
                  </Button>
                </div>
                <Button
                  className="remove-action-button"
                  onPress={() => handleRemoveAction(index)}
                >
                  ✕
                </Button>
              </div>

              <ActionEditor
                action={action}
                onChange={(updatedAction: EventAction) =>
                  handleUpdateAction(index, updatedAction)
                }
              />
            </div>
          ))
        )}
      </div>

      <Button className="add-action-button primary" onPress={handleAddAction}>
        + Add Action
      </Button>
    </div>
  );
}
