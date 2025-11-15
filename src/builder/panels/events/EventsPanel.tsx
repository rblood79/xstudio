/**
 * EventsPanel - 이벤트 관리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * React Stately 기반 이벤트 관리 로직을 직접 포함 (이전 EventSection 통합)
 */

import { useState } from "react";
import { Button } from "react-aria-components";
import type { PanelProps } from "../core/types";
import type { SelectedElement } from "../../inspector/types";
import type { EventType, ActionType } from "@/types/events/events.types";
import type { EventHandler } from "../../events/types/eventTypes";
import type { ComponentElementProps } from "../../../types/builder/unified.types";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { EventHandlerManager } from "../../events/components/EventHandlerManager";
import { EventTypePicker } from "../../events/pickers/EventTypePicker";
import { ActionTypePicker } from "../../events/pickers/ActionTypePicker";
import { useEventHandlers } from "../../events/state/useEventHandlers";
import { useActions } from "../../events/state/useActions";
import { useEventSelection } from "../../events/state/useEventSelection";
import { ConditionEditor } from "../../events/components/ConditionEditor";
import { DebounceThrottleEditor } from "../../events/components/DebounceThrottleEditor";
import { ChevronLeft, Trash, CirclePlus } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useStore } from "../../stores";
import { PanelHeader } from "../common";
import { useInitialMountDetection } from "../../hooks/useInitialMountDetection";
import "../../panels/common/index.css";

export function EventsPanel({ isActive }: PanelProps) {
  const [showAddAction, setShowAddAction] = useState(false);

  // Inspector 상태에서 이벤트 가져오기
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const updateEvents = useInspectorState((state) => state.updateEvents);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return (
      <div className="inspector empty">
        <div className="empty-state">
          <p className="empty-message">요소를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <EventsPanelContent
      selectedElement={selectedElement}
      updateEvents={updateEvents}
      showAddAction={showAddAction}
      setShowAddAction={setShowAddAction}
    />
  );
}

interface EventsPanelContentProps {
  selectedElement: SelectedElement;
  updateEvents: (handlers: EventHandler[]) => void;
  showAddAction: boolean;
  setShowAddAction: (show: boolean) => void;
}

function EventsPanelContent({
  selectedElement,
  updateEvents,
  showAddAction,
  setShowAddAction,
}: EventsPanelContentProps) {
  // Builder store에서 실제 element 가져오기 (DB 데이터 보존을 위해)
  const builderElement = useStore((state) =>
    state.elements.find((el) => el.id === selectedElement?.id)
  );

  // events는 props 안에 저장됨 (DB 스키마)
  const eventsFromProps = (builderElement?.props as ComponentElementProps)
    ?.events;

  // React Stately로 이벤트 핸들러 관리 - props.events 사용
  const { handlers, addHandler, updateHandler, removeHandler } =
    useEventHandlers((eventsFromProps || []) as unknown as EventHandler[]);

  // 이벤트 선택 관리
  const { selectedHandler, selectHandler, selectAfterDelete } =
    useEventSelection(handlers);

  // Actions 관리 (선택된 핸들러의 액션만)
  const { actions, addAction } = useActions(selectedHandler?.actions || []);

  // 등록된 이벤트 타입 목록 (중복 방지용)
  const registeredEventTypes: EventType[] = handlers.map((h) => h.event);

  // Actions 변경 시 Handler 업데이트 (초기 마운트 감지 적용)
  useInitialMountDetection({
    data: actions,
    onUpdate: (updatedActions) => {
      if (selectedHandler) {
        const updatedHandler = { ...selectedHandler, actions: updatedActions };
        updateHandler(selectedHandler.id, updatedHandler);
      }
    },
    resetKey: selectedHandler?.id,
  });

  // Handlers 변경 시 Inspector 동기화 (초기 마운트 감지 적용)
  useInitialMountDetection({
    data: handlers,
    onUpdate: updateEvents,
    resetKey: selectedElement?.id,
  });

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
    <div className="inspector events-panel">
      <div className="event-section">
        <PanelHeader
          title="Events"
          actions={
            <EventTypePicker
              onSelect={handleAddEvent}
              registeredTypes={registeredEventTypes}
            />
          }
        />

        <div className="section-content">
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
                      <ChevronLeft
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                      />
                    </Button>
                    <span className="selected-handler-type">
                      {selectedHandler.event}
                    </span>
                    <Button
                      className="react-aria-Button"
                      onPress={() => handleRemoveHandler(selectedHandler.id)}
                    >
                      <Trash
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                      />
                    </Button>
                  </div>

                  {/* Handler-level Advanced Settings */}
                  <div className="handler-advanced-settings">
                    <ConditionEditor
                      condition={selectedHandler.condition}
                      onChange={(condition) => {
                        const updated = { ...selectedHandler, condition };
                        updateHandler(selectedHandler.id, updated);
                      }}
                      label="Execute handler when"
                      placeholder="state.isEnabled === true"
                    />

                    <DebounceThrottleEditor
                      debounce={selectedHandler.debounce}
                      throttle={selectedHandler.throttle}
                      onChange={({ debounce, throttle }) => {
                        const updated = {
                          ...selectedHandler,
                          debounce,
                          throttle,
                        };
                        updateHandler(selectedHandler.id, updated);
                      }}
                    />
                  </div>

                  {/* Actions Section */}
                  <div className="actions-section">
                    <div className="actions-header">
                      <h4 className="actions-title">Actions</h4>
                      {!showAddAction && (
                        <Button
                          className="iconButton"
                          onPress={() => setShowAddAction(true)}
                          aria-label="Add Action"
                        >
                          <CirclePlus
                            color={iconProps.color}
                            strokeWidth={iconProps.stroke}
                            size={iconProps.size}
                          />
                        </Button>
                      )}
                    </div>

                    {/* ActionTypePicker - 간단한 Select로 대체 */}
                    {showAddAction ? (
                      <div className="add-action-container">
                        <ActionTypePicker
                          onSelect={(actionType) => handleAddAction(actionType as ActionType)}
                          showCategories={true}
                        />
                        <Button
                          className="react-aria-Button"
                          onPress={() => setShowAddAction(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <EventHandlerManager
                        eventHandler={selectedHandler}
                        onUpdateAction={(actionId, updates) => {
                          const action = actions.find((a) => a.id === actionId);
                          if (action) {
                            const updatedAction = { ...action, ...updates };
                            const updatedActions = actions.map((a) =>
                              a.id === actionId ? updatedAction : a
                            );
                            const updatedHandler = {
                              ...selectedHandler,
                              actions: updatedActions,
                            };
                            updateHandler(selectedHandler.id, updatedHandler);
                          }
                        }}
                        onRemoveAction={(actionId) => {
                          const updatedActions = actions.filter(
                            (a) => a.id !== actionId
                          );
                          const updatedHandler = {
                            ...selectedHandler,
                            actions: updatedActions,
                          };
                          updateHandler(selectedHandler.id, updatedHandler);
                        }}
                      />
                    )}
                  </div>
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
                        <span className="handler-type">{handler.event}</span>
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
    </div>
  );
}
