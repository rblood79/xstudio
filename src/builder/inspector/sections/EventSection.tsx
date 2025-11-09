/**
 * EventSection - React Stately 기반 이벤트 관리
 *
 * Phase 1: Inspector Events React Stately 전환
 * - useEventHandlers (useListData 기반)
 * - useActions (useListData 기반)
 * - useEventSelection (useState 기반)
 * - EventTypePicker (간단한 Select)
 * - ActionTypePicker (간단한 Select)
 */

import { useState, useEffect } from "react";
import { Button } from "react-aria-components";
import type { SelectedElement } from "../types";
import type { ElementEvent, EventType, ActionType } from "@/types/events";
import { useInspectorState } from "../hooks/useInspectorState";
import { EventHandlerManager } from "../events/components/EventHandlerManager";
import { EventTypePicker } from "../events/pickers/EventTypePicker";
import { ActionTypePicker } from "../events/pickers/ActionTypePicker";
import { useEventHandlers } from "../events/state/useEventHandlers";
import { useActions } from "../events/state/useActions";
import { useEventSelection } from "../events/state/useEventSelection";

export interface EventSectionProps {
  element: SelectedElement;
}

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
  } = useEventHandlers(selectedElement?.events || []);

  // 이벤트 선택 관리
  const {
    selectedHandlerId,
    selectedHandler,
    selectHandler,
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

  // Actions 변경 시 Handler 업데이트
  useEffect(() => {
    if (selectedHandler) {
      updateHandler(selectedHandler.id, { actions });
    }
  }, [actions, selectedHandler?.id]);

  // Handlers 변경 시 Inspector 동기화
  useEffect(() => {
    updateEvents(handlers);
  }, [handlers]);

  // 새 이벤트 추가
  const handleAddEvent = (eventType: EventType) => {
    const newHandler = addHandler(eventType);
    // 자동으로 새 핸들러 선택
    selectHandler(newHandler.id);
  };

  // 이벤트 핸들러 삭제
  const handleRemoveHandler = (handlerId: string) => {
    removeHandler(handlerId);
    // 다음 핸들러 자동 선택
    selectAfterDelete(handlerId);
  };

  // 액션 추가
  const handleAddAction = (actionType: ActionType) => {
    addAction(actionType, {});
    setShowAddAction(false);
  };

  return (
    <div className="event-section">
      <div className="section-header">
        <div className="section-title">Events</div>
      </div>

      <div className="section-content">
        {/* EventTypePicker - 간단한 Select로 대체 */}
        <div className="add-event-container">
          <EventTypePicker
            onSelect={handleAddEvent}
            registeredTypes={registeredEventTypes}
          />
        </div>

        {/* 등록된 이벤트 핸들러 목록 */}
        {handlers.length === 0 ? (
          <p className="empty-message">
            No event handlers registered. Use the selector above to add one.
          </p>
        ) : (
          <div className="event-handlers-list">
            {selectedHandler ? (
              // 선택된 핸들러의 상세 화면
              <div className="selected-handler-container">
                <div className="selected-handler-header">
                  <Button
                    className="react-aria-Button"
                    onPress={() => selectHandler(null)}
                  >
                    ← Back
                  </Button>
                  <span className="selected-handler-type">
                    {selectedHandler.event_type}
                  </span>
                  <Button
                    className="react-aria-Button"
                    onPress={() => handleRemoveHandler(selectedHandler.id)}
                  >
                    🗑️
                  </Button>
                </div>

                {/* ActionTypePicker - 간단한 Select로 대체 */}
                {showAddAction ? (
                  <div className="add-action-container">
                    <ActionTypePicker
                      onSelect={handleAddAction}
                      showCategories={true}
                    />
                    <Button
                      onPress={() => setShowAddAction(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <EventHandlerManager
                    eventHandler={selectedHandler}
                    onUpdateHandler={(updated) =>
                      updateHandler(selectedHandler.id, updated)
                    }
                    onAddAction={() => setShowAddAction(true)}
                  />
                )}
              </div>
            ) : (
              // 핸들러 목록 화면
              <div className="handlers-list">
                {handlers.map((handler) => (
                  <div
                    key={handler.id}
                    className="handler-item"
                    onClick={() => selectHandler(handler.id)}
                  >
                    <div className="handler-info">
                      <span className="handler-type">{handler.event_type}</span>
                      <span className="handler-action-count">
                        {handler.actions?.length || 0} action
                        {(handler.actions?.length || 0) !== 1 ? "s" : ""}
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
