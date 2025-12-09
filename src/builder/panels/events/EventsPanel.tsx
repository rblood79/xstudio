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
import { useComponentMeta } from "../../inspector/hooks/useComponentMeta";
import "./EventsPanel.css";

// 우선 선택 이벤트 우선순위 (press → action → selection → change → open)
const EVENT_PRIORITY: EventType[] = [
  "onPress",
  "onAction",
  "onRowAction",
  "onSelectionChange",
  "onChange",
  "onInputChange",
  "onOpenChange",
  "onChangeEnd",
  "onSubmit",
  "onInput",
  "onFocusChange",
  "onFocus",
  "onBlur",
];

function pickPreferredEvent(events: EventType[]): EventType | undefined {
  for (const type of EVENT_PRIORITY) {
    if (events.includes(type)) return type;
  }
  return events[0];
}

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
 * condition 문자열 → ConditionGroup 파싱
 *
 * handleConditionsChange에서 생성한 형식을 역변환:
 * "left operator right && left2 operator2 right2" → ConditionGroup
 */
function parseConditionString(condition: string | undefined): ConditionGroup | undefined {
  if (!condition || condition.trim() === '') return undefined;

  // AND/OR 연산자 감지
  const hasOr = condition.includes(' || ');
  const hasAnd = condition.includes(' && ');
  const operator: 'AND' | 'OR' = hasOr && !hasAnd ? 'OR' : 'AND';
  const separator = operator === 'OR' ? ' || ' : ' && ';

  // 조건 문자열 파싱
  const conditionStrings = condition.split(separator);
  const conditions = conditionStrings.map((str, index) => {
    const trimmed = str.trim();
    // 간단한 파싱: "left operator right" 또는 전체를 left로 사용
    const parts = trimmed.split(/\s+/);

    return {
      id: `cond-parsed-${index}-${Date.now()}`,
      left: {
        type: 'literal' as const,
        value: parts[0] || trimmed
      },
      operator: (parts[1] as 'equals' | 'is_not_empty') || 'is_not_empty',
      right: parts[2] ? {
        type: 'literal' as const,
        value: parts[2]
      } : undefined,
    };
  });

  return {
    operator,
    conditions,
  };
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
  const componentMeta = useComponentMeta(selectedElement?.type);
  const supportedEvents = (componentMeta?.inspector.supportedEvents ||
    []) as EventType[];

  // ⭐ showAddAction을 컴포넌트 내부로 이동
  // key={selectedElement.id}로 인해 요소 변경 시 자동으로 false로 리셋됨
  const [showAddAction, setShowAddAction] = useState<'then' | 'else' | false>(false);

  // 선택된 액션 (편집 모드)
  const [selectedAction, setSelectedAction] = useState<BlockEventAction | null>(
    null
  );
  // THEN vs ELSE 액션 구분 (편집 모드에서 사용)
  const [selectedActionBranch, setSelectedActionBranch] = useState<'then' | 'else'>('then');
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

  // Actions 관리 (선택된 핸들러의 THEN 액션)
  const { actions, addAction } = useActions(selectedHandler?.actions || []);

  // ELSE Actions 관리 (선택된 핸들러의 ELSE 액션)
  const { actions: elseActions, addAction: addElseAction } = useActions(selectedHandler?.elseActions || []);

  // 등록된 이벤트 타입 목록 (중복 방지용)
  const registeredEventTypes: EventType[] = handlers
    .map((h) => h.event)
    .filter((event): event is EventType => isImplementedEventType(event));

  // 등록되지 않은 지원 이벤트 목록 (빠른 추가용)
  const availableSupportedEvents = supportedEvents.filter(
    (event) => !registeredEventTypes.includes(event)
  );

  // THEN Actions 변경 시 Handler 업데이트 (초기 마운트 감지 적용)
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

  // ELSE Actions 변경 시 Handler 업데이트 (초기 마운트 감지 적용)
  useInitialMountDetection({
    data: elseActions,
    onUpdate: (updatedElseActions) => {
      if (selectedHandler) {
        const updatedHandler = { ...selectedHandler, elseActions: updatedElseActions };
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
    if (registeredEventTypes.includes(eventType)) {
      return;
    }
    const newHandler = addHandler(eventType);
    selectHandler(newHandler.id);
  };

  // 이벤트 핸들러 삭제
  const handleRemoveHandler = (handlerId: string) => {
    removeHandler(handlerId);
    selectAfterDelete(handlerId);
  };

  // 액션 추가 (THEN/ELSE 구분)
  const handleAddAction = (actionType: ActionType, branch: 'then' | 'else' = 'then') => {
    // ⭐ 중앙화된 정규화 유틸 사용 (snake_case → camelCase)
    const normalizedActionType = normalizeToInspectorAction(actionType);
    if (branch === 'else') {
      addElseAction(normalizedActionType, {});
    } else {
      addAction(normalizedActionType, {});
    }
    setShowAddAction(false);
  };

  // 액션 삭제 (THEN)
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

  // 액션 삭제 (ELSE)
  const handleRemoveElseAction = useCallback(
    (actionId: string) => {
      const updatedElseActions = elseActions.filter((a) => a.id !== actionId);
      const updatedHandler = {
        ...selectedHandler!,
        elseActions: updatedElseActions,
      };
      updateHandler(selectedHandler!.id, updatedHandler);
    },
    [elseActions, selectedHandler, updateHandler]
  );

  // 액션 업데이트 (THEN)
  const handleUpdateAction = useCallback(
    (actionId: string, updates: Partial<BlockEventAction>) => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        // ⚠️ enabled가 undefined면 true로 기본값 설정
        const updatedAction = {
          ...action,
          ...updates,
          enabled: updates.enabled !== undefined ? updates.enabled : (action.enabled ?? true)
        };

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

  // 액션 업데이트 (ELSE)
  const handleUpdateElseAction = useCallback(
    (actionId: string, updates: Partial<BlockEventAction>) => {
      const action = elseActions.find((a) => a.id === actionId);
      if (action) {
        const updatedAction = {
          ...action,
          ...updates,
          enabled: updates.enabled !== undefined ? updates.enabled : (action.enabled ?? true)
        };

        const updatedElseActions = elseActions.map((a) =>
          a.id === actionId ? updatedAction : a
        );
        const updatedHandler = {
          ...selectedHandler!,
          elseActions: updatedElseActions,
        };
        updateHandler(selectedHandler!.id, updatedHandler);
      }
    },
    [elseActions, selectedHandler, updateHandler]
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
  const blockElseActions = actionsToBlockActions(selectedHandler?.elseActions || []);

  // condition 문자열 → ConditionGroup 파싱
  const parsedConditions = parseConditionString(selectedHandler?.condition);

  // 조건이 있는지 여부 (ELSE 블록 표시 조건)
  const hasCondition = Boolean(selectedHandler?.condition);

  return (
    <div className="events-panel">
      <PanelHeader
        icon={<SquareMousePointer size={16} />}
        title="Events"
        actions={
          availableSupportedEvents.length === 1 ? (
            <Button
              className="iconButton"
              onPress={() => handleAddEvent(availableSupportedEvents[0])}
              aria-label={`Add ${availableSupportedEvents[0]}`}
            >
              <Zap
                size={iconProps.size}
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          ) : (
            <div className="panel-action-group">
              {availableSupportedEvents.length > 0 && (
                <Button
                  className="iconButton"
                  onPress={() => {
                    const preferred = pickPreferredEvent(availableSupportedEvents);
                    if (preferred) handleAddEvent(preferred);
                  }}
                  aria-label="Add preferred event"
                >
                  <Zap
                    size={iconProps.size}
                    color={iconProps.color}
                    strokeWidth={iconProps.stroke}
                  />
                </Button>
              )}
              <EventTypePicker
                onSelect={handleAddEvent}
                registeredTypes={registeredEventTypes}
                allowedTypes={supportedEvents}
                isDisabled={availableSupportedEvents.length === 0 && supportedEvents.length === 0}
              />
            </div>
          )
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
                allowedEventTypes={supportedEvents}
                showConnector={true}
              />

              {/* IF 블록 - 조건 (선택적) */}
              <IfBlock
                conditions={parsedConditions}
                onChange={handleConditionsChange}
                onRemove={handleRemoveConditions}
                showSplitConnector={hasCondition}
              />

              {/* THEN 블록 - 조건 만족 시 액션 목록 */}
              <ThenElseBlock
                type="then"
                actions={blockActions}
                onAddAction={() => setShowAddAction('then')}
                onActionClick={(action) => {
                  setSelectedAction(action);
                  setSelectedActionBranch('then');
                }}
                onRemoveAction={handleRemoveAction}
                onUpdateAction={handleUpdateAction}
                showConnector={true}
              />

              {/* ELSE 블록 - 조건 불만족 시 액션 목록 (조건이 있을 때만 표시) */}
              {hasCondition && (
                <ThenElseBlock
                  type="else"
                  actions={blockElseActions}
                  onAddAction={() => setShowAddAction('else')}
                  onActionClick={(action) => {
                    setSelectedAction(action);
                    setSelectedActionBranch('else');
                  }}
                  onRemoveAction={handleRemoveElseAction}
                  onUpdateAction={handleUpdateElseAction}
                  showConnector={true}
                />
              )}

              {/* 액션 추가 피커 */}
              {showAddAction && (
                <div className="action-picker-overlay">
                  <div className="action-picker-header">
                    <span>Add Action to {showAddAction.toUpperCase()}</span>
                  </div>
                  <ActionTypePicker
                    onSelect={(actionType) =>
                      handleAddAction(actionType as ActionType, showAddAction)
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
                      {selectedAction.type} ({selectedActionBranch.toUpperCase()})
                    </span>
                  </div>
                  <BlockActionEditor
                    action={selectedAction}
                    onChange={(updates) => {
                      if (selectedActionBranch === 'else') {
                        handleUpdateElseAction(selectedAction.id, updates);
                      } else {
                        handleUpdateAction(selectedAction.id, updates);
                      }
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
