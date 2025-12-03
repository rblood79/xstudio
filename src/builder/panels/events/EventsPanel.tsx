/**
 * EventsPanel - 이벤트 관리 패널
 *
 * Phase 2: 표준 Panel 구조로 리팩토링
 * - PropertySection 컴포넌트 사용
 * - common/index.css 패턴 준수
 * - DOM 구조: .events-panel > PanelHeader > .panel-contents > PropertySection
 */

import React, { useState } from "react";
import { Button } from "react-aria-components";
import type { PanelProps } from "../core/types";
import type { SelectedElement } from "../../inspector/types";
import type { EventType, ActionType } from "@/types/events/events.types";
import type {
  EventHandler,
  ActionType as EventHandlerActionType,
} from "../../events/types/eventTypes";
import { isImplementedEventType } from "@/types/events/events.types";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { EventHandlerManager } from "../../events/components/EventHandlerManager";
import { EventTypePicker } from "../../events/pickers/EventTypePicker";
import { ActionTypePicker } from "../../events/pickers/ActionTypePicker";
import { useEventHandlers } from "../../events/state/useEventHandlers";
import { useActions } from "../../events/state/useActions";
import { useEventSelection } from "../../events/state/useEventSelection";
import { ConditionEditor } from "../../events/components/ConditionEditor";
import { DebounceThrottleEditor } from "../../events/components/DebounceThrottleEditor";
import { ChevronLeft, Trash, CirclePlus, Zap, SquareMousePointer } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { PanelHeader, PropertySection, EmptyState } from "../common";
import { useInitialMountDetection } from "../../hooks/useInitialMountDetection";
import "../common/index.css";

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
      <div className="events-panel">
        <PanelHeader icon={<SquareMousePointer size={16} />} title="Events" />
        <div className="panel-contents">
          <EmptyState message="요소를 선택하세요" />
        </div>
      </div>
    );
  }

  // ⭐ key prop으로 요소 변경 시 컴포넌트 리마운트 강제
  // useEventHandlers 훅이 새 요소의 이벤트로 초기화됨
  return (
    <EventsPanelContent
      key={selectedElement.id}
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
  // ⭐ selectedElement.events에 이미 매핑된 이벤트 사용
  // elementMapper.ts에서 element.props.events → selectedElement.events로 매핑됨
  const eventsFromElement = selectedElement?.events || [];

  // React Stately로 이벤트 핸들러 관리
  const { handlers: rawHandlers, addHandler, updateHandler, removeHandler } =
    useEventHandlers(eventsFromElement as EventHandler[]);

  // ⭐ Memoize handlers to prevent infinite loop
  const handlersJson = React.useMemo(
    () => JSON.stringify(rawHandlers),
    [rawHandlers]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlers = React.useMemo(() => rawHandlers, [handlersJson]);

  // 이벤트 선택 관리
  const { selectedHandler, selectHandler, selectAfterDelete } =
    useEventSelection(handlers);

  // Actions 관리 (선택된 핸들러의 액션만)
  const { actions, addAction } = useActions(selectedHandler?.actions || []);

  // 등록된 이벤트 타입 목록 (중복 방지용)
  const registeredEventTypes: EventType[] = handlers
    .map((h) => h.event)
    .filter((event): event is EventType => isImplementedEventType(event));

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
    selectHandler(newHandler.id);
  };

  // 이벤트 핸들러 삭제
  const handleRemoveHandler = (handlerId: string) => {
    removeHandler(handlerId);
    selectAfterDelete(handlerId);
  };

  // 액션 추가
  const handleAddAction = (actionType: ActionType) => {
    const normalizedActionType = normalizeActionType(actionType);
    addAction(normalizedActionType, {});
    setShowAddAction(false);
  };

  // Helper function to normalize action types (snake_case -> camelCase)
  const normalizeActionType = (
    actionType: ActionType
  ): EventHandlerActionType => {
    const mapping: Record<string, EventHandlerActionType> = {
      scroll_to: "scrollTo",
      toggle_visibility: "toggleVisibility",
      update_state: "updateState",
      show_modal: "showModal",
      hide_modal: "hideModal",
      copy_to_clipboard: "copyToClipboard",
      validate_form: "validateForm",
      reset_form: "resetForm",
      custom_function: "customFunction",
    };
    return mapping[actionType] || (actionType as EventHandlerActionType);
  };

  return (
    <div className="events-panel">
      <PanelHeader
        icon={<SquareMousePointer size={16} />}
        title="Events"
        actions={
          <EventTypePicker
            onSelect={handleAddEvent}
            registeredTypes={registeredEventTypes}
          />
        }
      />

      <div className="panel-contents">
        {handlers.length === 0 ? (
          /* 이벤트 핸들러 없음 */
          <EmptyState
            icon={<Zap size={32} color={iconProps.color} strokeWidth={iconProps.stroke} />}
            message="이벤트 핸들러가 없습니다"
            description="상단의 + 버튼을 눌러 이벤트를 추가하세요"
          />
        ) : selectedHandler ? (
          /* 선택된 핸들러 상세 뷰 */
          <div className="section" data-section-id="handler-detail">
            {/* Handler Header with Back/Delete */}
            <div className="section-header">
              <Button
                className="iconButton"
                onPress={() => selectHandler(null)}
                aria-label="Back to list"
              >
                <ChevronLeft
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              </Button>
              <span className="section-title">{selectedHandler.event}</span>
              <div className="section-actions">
                <Button
                  className="iconButton"
                  onPress={() => handleRemoveHandler(selectedHandler.id)}
                  aria-label="Delete handler"
                >
                  <Trash
                    color={iconProps.color}
                    strokeWidth={iconProps.stroke}
                    size={iconProps.size}
                  />
                </Button>
              </div>
            </div>

            <div className="section-content">
              {/* Handler Advanced Settings */}
              <PropertySection id="handler-settings" title="Settings">
                <ConditionEditor
                  condition={selectedHandler.condition}
                  onChange={(condition) => {
                    const updated = { ...selectedHandler, condition };
                    updateHandler(selectedHandler.id, updated);
                  }}
                  label="Execute when"
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
              </PropertySection>

              {/* Actions Section */}
              <PropertySection
                id="actions"
                title="Actions"
              >
                <div className="actions-header">
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
                      <span className="button-label">Add Action</span>
                    </Button>
                  )}
                </div>

                {showAddAction ? (
                  <div className="action-picker-container">
                    <ActionTypePicker
                      onSelect={(actionType) =>
                        handleAddAction(actionType as ActionType)
                      }
                      showCategories={true}
                    />
                    <Button
                      className="react-aria-Button secondary"
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
              </PropertySection>
            </div>
          </div>
        ) : (
          /* 핸들러 목록 뷰 */
          <PropertySection id="handlers-list" title="Event Handlers">
            <div className="handlers-list">
              {handlers.map((handler) => (
                <button
                  key={handler.id}
                  type="button"
                  className="handler-item"
                  onClick={() => selectHandler(handler.id)}
                >
                  <div className="handler-info">
                    <Zap
                      size={14}
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                    />
                    <span className="handler-type">{handler.event}</span>
                  </div>
                  <span className="handler-action-count">
                    {handler.actions?.length || 0} action
                    {(handler.actions?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          </PropertySection>
        )}
      </div>
    </div>
  );
}
