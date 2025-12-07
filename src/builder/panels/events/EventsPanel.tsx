/**
 * EventsPanel - 이벤트 관리 패널
 *
 * Phase 5: 블록 기반 UI로 리팩토링
 * - WHEN → IF → THEN/ELSE 패턴
 * - 시각적 블록 컴포넌트 사용
 * - DOM 구조: .events-panel > PanelHeader > .panel-contents > blocks
 */

import { useState, useCallback } from "react";
import { Button } from "react-aria-components";
import type { PanelProps } from "../core/types";
import type { SelectedElement } from "../../inspector/types";
import type { EventType, ActionType } from "@/types/events/events.types";
import type { EventHandler } from "../../events/types/eventTypes";
import type {
  BlockEventAction,
  ConditionGroup,
  EventTrigger,
} from "../../events/types/eventBlockTypes";
import { normalizeToInspectorAction } from "../../events/utils/normalizeEventTypes";
import { isImplementedEventType } from "@/types/events/events.types";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { EventTypePicker } from "../../events/pickers/EventTypePicker";
import { ActionTypePicker } from "../../events/pickers/ActionTypePicker";
import { useEventHandlers } from "../../events/state/useEventHandlers";
import { useActions } from "../../events/state/useActions";
import { useEventSelection } from "../../events/state/useEventSelection";
import { DebounceThrottleEditor } from "../../events/components/DebounceThrottleEditor";
// Block-based UI components
import { WhenBlock } from "./blocks/WhenBlock";
import { IfBlock } from "./blocks/IfBlock";
import { ThenElseBlock } from "./blocks/ThenElseBlock";
import { BlockActionEditor } from "./editors/BlockActionEditor";
import {
  ChevronLeft,
  Trash,
  Zap,
  SquareMousePointer,
} from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { PanelHeader, PropertySection, EmptyState } from "../common";
import { useInitialMountDetection } from "../../hooks/useInitialMountDetection";
import "./EventsPanel.css";

// ============================================================================
// Helper Functions: EventHandler ↔ Block Types Conversion
// ============================================================================

/**
 * EventHandler → EventTrigger 변환
 */
function handlerToTrigger(handler: EventHandler): EventTrigger {
  return {
    event: handler.event,
    target: "self",
  };
}

/**
 * EventHandler.actions → BlockEventAction[] 변환
 */
function actionsToBlockActions(
  actions: EventHandler["actions"]
): BlockEventAction[] {
  if (!actions) return [];
  return actions.map((action) => ({
    id: action.id,
    type: action.type,
    config: action.config || {},
    delay: action.delay,
    condition: action.condition,
    enabled: action.enabled !== false,
    label: action.label,
  }));
}

/**
 * BlockEventAction[] → EventHandler.actions 변환
 */
function blockActionsToActions(
  blockActions: BlockEventAction[]
): EventHandler["actions"] {
  return blockActions.map((action) => ({
    id: action.id,
    type: action.type,
    config: action.config,
    delay: action.delay,
    condition: action.condition,
    enabled: action.enabled,
    label: action.label,
  }));
}

export function EventsPanel({ isActive }: PanelProps) {
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
  // showAddAction도 컴포넌트 내부로 이동하여 요소 변경 시 자동 리셋
  return (
    <EventsPanelContent
      key={selectedElement.id}
      selectedElement={selectedElement}
      updateEvents={updateEvents}
    />
  );
}

interface EventsPanelContentProps {
  selectedElement: SelectedElement;
  updateEvents: (handlers: EventHandler[]) => void;
}

function EventsPanelContent({
  selectedElement,
  updateEvents,
}: EventsPanelContentProps) {
  // ⭐ showAddAction을 컴포넌트 내부로 이동
  // key={selectedElement.id}로 인해 요소 변경 시 자동으로 false로 리셋됨
  const [showAddAction, setShowAddAction] = useState(false);

  // 선택된 액션 (편집 모드)
  const [selectedAction, setSelectedAction] = useState<BlockEventAction | null>(
    null
  );
  // ⭐ selectedElement.events에 이미 매핑된 이벤트 사용
  // elementMapper.ts에서 element.props.events → selectedElement.events로 매핑됨
  const eventsFromElement = selectedElement?.events || [];

  // React Stately로 이벤트 핸들러 관리
  const {
    handlers,
    addHandler,
    updateHandler,
    removeHandler,
  } = useEventHandlers(eventsFromElement as EventHandler[]);

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
    // ⭐ 중앙화된 정규화 유틸 사용 (snake_case → camelCase)
    const normalizedActionType = normalizeToInspectorAction(actionType);
    addAction(normalizedActionType, {});
    setShowAddAction(false);
  };

  // 액션 삭제
  const handleRemoveAction = useCallback(
    (actionId: string) => {
      const updatedActions = actions.filter((a) => a.id !== actionId);
      const updatedHandler = {
        ...selectedHandler!,
        actions: updatedActions,
      };
      updateHandler(selectedHandler!.id, updatedHandler);
    },
    [actions, selectedHandler, updateHandler]
  );

  // 액션 업데이트
  const handleUpdateAction = useCallback(
    (actionId: string, updates: Partial<BlockEventAction>) => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        // ⚠️ enabled가 undefined면 true로 기본값 설정
        const updatedAction = {
          ...action,
          ...updates,
          // updates에 enabled가 명시적으로 있으면 사용, 아니면 action의 값 또는 true
          enabled: updates.enabled !== undefined ? updates.enabled : (action.enabled ?? true)
        };

        // Debug: enabled 값 추적
        if (import.meta.env.DEV) {
          console.log('[EventsPanel] handleUpdateAction:', {
            actionId,
            actionEnabled: action.enabled,
            updatesEnabled: updates.enabled,
            resultEnabled: updatedAction.enabled
          });
        }

        const updatedActions = actions.map((a) =>
          a.id === actionId ? updatedAction : a
        );
        const updatedHandler = {
          ...selectedHandler!,
          actions: updatedActions,
        };
        updateHandler(selectedHandler!.id, updatedHandler);
      }
    },
    [actions, selectedHandler, updateHandler]
  );

  // 트리거 변경
  const handleTriggerChange = useCallback(
    (trigger: EventTrigger) => {
      if (!selectedHandler) return;
      const updated = { ...selectedHandler, event: trigger.event };
      updateHandler(selectedHandler.id, updated);
    },
    [selectedHandler, updateHandler]
  );

  // 조건 변경
  const handleConditionsChange = useCallback(
    (conditions?: ConditionGroup) => {
      if (!selectedHandler) return;
      // ConditionGroup을 condition 문자열로 변환 (임시)
      // TODO: 향후 EventHandler 타입에 conditions 필드 추가
      const conditionString = conditions
        ? conditions.conditions
            .map((c) => `${c.left.value} ${c.operator} ${c.right?.value || ""}`)
            .join(conditions.operator === "AND" ? " && " : " || ")
        : undefined;
      const updated = { ...selectedHandler, condition: conditionString };
      updateHandler(selectedHandler.id, updated);
    },
    [selectedHandler, updateHandler]
  );

  // 조건 블록 제거
  const handleRemoveConditions = useCallback(() => {
    if (!selectedHandler) return;
    const updated = { ...selectedHandler, condition: undefined };
    updateHandler(selectedHandler.id, updated);
  }, [selectedHandler, updateHandler]);

  // 블록 액션 데이터 변환
  const blockActions = actionsToBlockActions(selectedHandler?.actions || []);

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
            icon={
              <Zap
                size={32}
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
              />
            }
            message="이벤트 핸들러가 없습니다"
            description="상단의 + 버튼을 눌러 이벤트를 추가하세요"
          />
        ) : selectedHandler ? (
          /* 선택된 핸들러 상세 뷰 - 블록 기반 UI */
          <div className="section block-view" data-section-id="handler-detail">
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

            {/* 블록 기반 이벤트 에디터 */}
            <div className="block-editor">
              {/* WHEN 블록 - 이벤트 트리거 */}
              <WhenBlock
                trigger={handlerToTrigger(selectedHandler)}
                onChange={handleTriggerChange}
                registeredEventTypes={registeredEventTypes.filter(
                  (t) => t !== selectedHandler.event
                )}
                showConnector={true}
              />

              {/* IF 블록 - 조건 (선택적) */}
              <IfBlock
                conditions={undefined} // TODO: condition 문자열 → ConditionGroup 파싱
                onChange={handleConditionsChange}
                onRemove={handleRemoveConditions}
                showSplitConnector={false}
              />

              {/* THEN 블록 - 액션 목록 */}
              <ThenElseBlock
                type="then"
                actions={blockActions}
                onAddAction={() => setShowAddAction(true)}
                onActionClick={(action) => setSelectedAction(action)}
                onRemoveAction={handleRemoveAction}
                onUpdateAction={handleUpdateAction}
                showConnector={true}
              />

              {/* 액션 추가 피커 */}
              {showAddAction && (
                <div className="action-picker-overlay">
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
              )}

              {/* 선택된 액션 에디터 */}
              {selectedAction && (
                <div className="action-editor-overlay">
                  <div className="action-editor-header">
                    <Button
                      className="iconButton"
                      onPress={() => setSelectedAction(null)}
                      aria-label="Close editor"
                    >
                      <ChevronLeft
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                      />
                    </Button>
                    <span className="action-editor-title">
                      {selectedAction.type}
                    </span>
                  </div>
                  <BlockActionEditor
                    action={selectedAction}
                    onChange={(updates) => {
                      handleUpdateAction(selectedAction.id, updates);
                      setSelectedAction({ ...selectedAction, ...updates });
                    }}
                  />
                </div>
              )}
            </div>

            {/* 설정 섹션 - 디바운스/쓰로틀 */}
            <PropertySection id="handler-settings" title="Settings">
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
