/**
 * EventsPanel - 이벤트 관리 패널
 *
 * Phase 5: 블록 기반 UI로 리팩토링
 * - WHEN → IF → THEN/ELSE 패턴
 * - 시각적 블록 컴포넌트 사용
 * - DOM 구조: .events-panel > PanelHeader > .panel-contents > blocks
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "react-aria-components";
import { Search, X } from "lucide-react";
import type { PanelProps } from "../core/types";
import type { SelectedElement } from "../../inspector/types";
import type { ActionType, EventType as RegistryEventType } from "@/types/events/events.types";
import { ACTION_TYPE_LABELS, REGISTRY_ACTION_CATEGORIES } from "@/types/events/events.types";
import { getRecommendedActions } from "./data/actionMetadata";
import type { EventHandler } from "./types/eventTypes";
import type { EventType } from "@/types/events/events.types";
import type {
  BlockEventAction,
  ConditionGroup,
  EventTrigger,
} from "./types/eventBlockTypes";
import { normalizeToInspectorAction } from "./utils/normalizeEventTypes";
import { isImplementedEventType } from "@/types/events/events.types";
import { useDebouncedSelectedElementData, useStore } from "../../stores";
import { EventTypePicker } from "./pickers/EventTypePicker";
import { useEventHandlers } from "./state/useEventHandlers";
import { useActions } from "./state/useActions";
import { useEventSelection } from "./state/useEventSelection";
import { DebounceThrottleEditor } from "./components/DebounceThrottleEditor";
import { RecommendedEventsSection } from "./components/RecommendedEventsSection";
import { TemplateSuggestionSection } from "./components/TemplateSuggestionSection";
import { generateEventHandlerIds } from "./hooks/useApplyTemplate";
import type { EventTemplate } from "./data/eventTemplates";
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
import { iconProps, iconEditProps, iconLarge } from "../../../utils/ui/uiConstants";
import { PanelHeader, PropertySection, EmptyState } from "../../components";
import { useInitialMountDetection } from "@/builder/hooks";
import { useComponentMeta } from "../../hooks";
import "./EventsPanel.css";

// 우선 선택 이벤트 우선순위 (click → change → submit → keyboard → mouse → focus)
// ⚠️ 순서 중요: 사용자 상호작용 → 값 변경 → 포커스 순
// Note: onPress, onAction 등 React Aria 전용 이벤트는 아직 IMPLEMENTED_EVENT_TYPES에 없음
// EVENT_PRIORITY and pickPreferredEvent are reserved for future auto-select feature
// const EVENT_PRIORITY: EventType[] = [
//   "onClick", "onChange", "onSubmit", "onKeyDown", "onKeyUp",
//   "onMouseEnter", "onMouseLeave", "onFocus", "onBlur"
// ];
// function pickPreferredEvent(events: EventType[]): EventType | undefined {
//   for (const type of EVENT_PRIORITY) {
//     if (events.includes(type)) return type;
//   }
//   return events[0];
// }

// ============================================================================
// Helper Functions: EventHandler ↔ Block Types Conversion
// ============================================================================

/**
 * EventHandler → EventTrigger 변환
 * Note: 타입 어서션 사용 - eventTypes의 EventType과 registry의 EventType 간 호환
 */
function handlerToTrigger(handler: EventHandler): EventTrigger {
  return {
    event: handler.event as EventTrigger['event'],
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
  return actions.map((action, index) => ({
    id: action.id || `action-${index}-${Date.now()}`,
    type: action.type,
    config: action.config || {},
    delay: action.delay,
    condition: action.condition,
    enabled: action.enabled !== false,
  }));
}

/**
 * BlockEventAction[] → EventHandler.actions 변환 (역변환)
 * Note: 타입 어서션 사용 - BlockEventAction.type (registry)과 EventAction.type (eventTypes) 간 호환
 * @todo 향후 이벤트 편집 기능에서 사용 예정
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function blockActionsToEventActions(
  blockActions: BlockEventAction[]
): EventHandler["actions"] {
  return blockActions.map((action) => ({
    id: action.id,
    type: action.type as EventHandler["actions"][number]["type"],
    config: action.config,
    delay: action.delay,
    condition: action.condition,
    enabled: action.enabled,
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

/**
 * ActionPickerOverlay - 액션 타입 선택 오버레이
 *
 * 버튼 목록으로 액션을 직접 표시 (ListBox 대신 버튼 사용)
 */
interface ActionPickerOverlayProps {
  branch: 'then' | 'else';
  onSelect: (actionType: ActionType) => void;
  onClose: () => void;
  /** 현재 이벤트 타입 (추천 배지용) */
  eventType?: string;
  /** 컴포넌트 타입 (추천 배지용) */
  componentType?: string;
}

function ActionPickerOverlay({ branch, onSelect, onClose, eventType, componentType }: ActionPickerOverlayProps) {
  const [searchValue, setSearchValue] = useState('');

  // 사용 가능한 액션 타입 목록
  const availableActionTypes = useMemo(() => {
    return Object.keys(ACTION_TYPE_LABELS) as ActionType[];
  }, []);

  // 추천 액션 Set (배지 표시용)
  const recommendedActionSet = useMemo(() => {
    const recommended = getRecommendedActions({ eventType, componentType });
    return new Set(recommended);
  }, [eventType, componentType]);

  // 검색 필터링된 목록
  const filteredActionTypes = useMemo(() => {
    if (!searchValue) return availableActionTypes;

    const searchLower = searchValue.toLowerCase();
    return availableActionTypes.filter((type) => {
      const label = ACTION_TYPE_LABELS[type]?.toLowerCase() || '';
      return type.toLowerCase().includes(searchLower) || label.includes(searchLower);
    });
  }, [availableActionTypes, searchValue]);

  // 카테고리별 그룹화
  const groupedActionTypes = useMemo(() => {
    const groups: { category: string; actions: ActionType[] }[] = [];

    Object.entries(REGISTRY_ACTION_CATEGORIES).forEach(([, categoryData]) => {
      const categoryInfo = categoryData as { label: string; actions: readonly string[] };
      const filtered = (categoryInfo.actions as unknown as ActionType[]).filter((a) =>
        filteredActionTypes.includes(a)
      );
      if (filtered.length > 0) {
        groups.push({ category: categoryInfo.label, actions: filtered });
      }
    });

    return groups;
  }, [filteredActionTypes]);

  return (
    <div className="action-picker-overlay">
      <div className="action-picker-header">
        <span>Add Action to {branch.toUpperCase()}</span>
        <Button
          className="iconButton"
          onPress={onClose}
          aria-label="Close"
        >
          <X
            color={iconProps.color}
            strokeWidth={iconProps.strokeWidth}
            size={iconProps.size}
          />
        </Button>
      </div>

      <div className="action-picker-search">
        <Search size={iconEditProps.size} color={iconProps.color} />
        <input
          className="action-picker-search-input"
          placeholder="Search actions..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          autoFocus
        />
      </div>

      <div className="action-picker-list" role="listbox" aria-label="액션 타입 목록">
        {filteredActionTypes.length === 0 ? (
          <div className="action-picker-empty">
            <Search size={iconProps.size} color={iconProps.color} />
            <span>No actions found</span>
          </div>
        ) : (
          groupedActionTypes.map((group) => (
            <div key={group.category} className="action-group">
              <div className="action-group-label">{group.category}</div>
              {group.actions.map((actionType) => (
                <button
                  key={actionType}
                  type="button"
                  className="action-item"
                  onClick={() => onSelect(actionType)}
                >
                  <span className="action-name">
                    {ACTION_TYPE_LABELS[actionType] || actionType}
                  </span>
                  <span className="action-type-code">{actionType}</span>
                  {recommendedActionSet.has(actionType) && (
                    <span className="action-recommended-badge">추천</span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function EventsPanel({ isActive }: PanelProps) {
  // Builder Store에서 선택된 요소와 이벤트 업데이트 함수 가져오기
  // 🚀 Phase 3: 디바운스된 선택 데이터 사용
  const selectedElement = useDebouncedSelectedElementData();
  const updateEvents = useStore((state) => state.updateSelectedEvents);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return (
      <div className="events-panel">
        <PanelHeader icon={<SquareMousePointer size={iconProps.size} />} title="Events" />
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
  // 컴포넌트가 지원하는 이벤트 타입 (내부용: 넓은 EventType)
  const supportedEventsRaw = (componentMeta?.inspector.supportedEvents ||
    []) as EventType[];
  // Registry에 구현된 이벤트만 필터링 (UI 컴포넌트용: RegistryEventType)
  const supportedEvents = supportedEventsRaw.filter(
    (event): event is RegistryEventType => isImplementedEventType(event)
  );

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
  // Registry 타입으로 필터링된 등록된 이벤트 목록
  const registeredEventTypes = handlers
    .map((h) => h.event)
    .filter((event): event is RegistryEventType => isImplementedEventType(event));

  // 등록되지 않은 지원 이벤트 목록 (빠른 추가용)
  // string[]로 캐스팅하여 EventType과 RegistryEventType 간의 includes 비교 허용
  const availableSupportedEvents = supportedEvents.filter(
    (event) => !(registeredEventTypes as string[]).includes(event)
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

  // Handlers → Inspector 동기화 콜백 (안정화)
  const handleHandlersUpdate = useCallback((updatedHandlers: EventHandler[]) => {
    updateEvents(updatedHandlers);
  }, [updateEvents]);

  // Handlers 변경 시 Inspector 동기화 (초기 마운트 감지 적용)
  useInitialMountDetection({
    data: handlers,
    onUpdate: handleHandlersUpdate,
    resetKey: selectedElement?.id,
  });

  // 새 이벤트 추가
  const handleAddEvent = (eventType: EventType) => {
    // string[]로 캐스팅하여 EventType과 RegistryEventType 간의 includes 비교 허용
    if ((registeredEventTypes as string[]).includes(eventType)) {
      return;
    }
    const newHandler = addHandler(eventType);
    selectHandler(newHandler.id);
  };

  // 템플릿 적용 (이벤트 + 액션 일괄 생성)
  const handleApplyTemplate = useCallback((template: EventTemplate) => {
    const templateEvents = generateEventHandlerIds(template.events, 'tpl');
    let firstNewHandlerId: string | null = null;

    for (const templateEvent of templateEvents) {
      const existingHandler = handlers.find(
        (h) => h.event === templateEvent.event
      );

      if (existingHandler) {
        // 기존 핸들러에 액션 병합
        const mergedActions = [
          ...existingHandler.actions,
          ...templateEvent.actions,
        ];
        updateHandler(existingHandler.id, {
          ...existingHandler,
          actions: mergedActions,
        });
        if (!firstNewHandlerId) firstNewHandlerId = existingHandler.id;
      } else {
        // 새 핸들러 생성
        const newHandler = addHandler(templateEvent.event);
        updateHandler(newHandler.id, {
          ...newHandler,
          actions: templateEvent.actions,
        });
        if (!firstNewHandlerId) firstNewHandlerId = newHandler.id;
      }
    }

    // 첫 번째 핸들러 자동 선택 (결과 즉시 확인)
    if (firstNewHandlerId) {
      selectHandler(firstNewHandlerId);
    }
  }, [handlers, addHandler, updateHandler, selectHandler]);

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
  // Note: actions는 EventAction[] 타입 (from useActions)
  const handleUpdateAction = useCallback(
    (actionId: string, updates: Partial<BlockEventAction>) => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        // ⚠️ enabled가 undefined면 true로 기본값 설정
        // BlockEventAction의 업데이트를 EventAction에 맞게 변환
        const updatedAction: typeof action = {
          ...action,
          type: (updates.type ?? action.type) as typeof action.type,
          config: updates.config ?? action.config,
          delay: updates.delay ?? action.delay,
          condition: updates.condition ?? action.condition,
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
  // Note: elseActions는 EventAction[] 타입 (from useActions)
  const handleUpdateElseAction = useCallback(
    (actionId: string, updates: Partial<BlockEventAction>) => {
      const action = elseActions.find((a) => a.id === actionId);
      if (action) {
        // BlockEventAction의 업데이트를 EventAction에 맞게 변환
        const updatedAction: typeof action = {
          ...action,
          type: (updates.type ?? action.type) as typeof action.type,
          config: updates.config ?? action.config,
          delay: updates.delay ?? action.delay,
          condition: updates.condition ?? action.condition,
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
        icon={<SquareMousePointer size={iconProps.size} />}
        title="Events"
        actions={
          availableSupportedEvents.length === 1 ? (
            // 지원 이벤트가 1개뿐일 때: 단일 버튼으로 바로 추가
            <Button
              className="iconButton"
              onPress={() => handleAddEvent(availableSupportedEvents[0])}
              aria-label={`Add ${availableSupportedEvents[0]}`}
            >
              <Zap
                size={iconProps.size}
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          ) : (
            // 지원 이벤트가 여러 개일 때: 추천 버튼 + 전체 선택 피커
            <EventTypePicker
              onSelect={handleAddEvent}
              registeredTypes={registeredEventTypes}
              allowedTypes={supportedEvents}
              isDisabled={availableSupportedEvents.length === 0 && supportedEvents.length === 0}
            />
          )
        }
      />

      <div className="panel-contents">
        {handlers.length === 0 ? (
          /* 이벤트 핸들러 없음 → 추천 chips + 템플릿 + EmptyState */
          <>
            <RecommendedEventsSection
              componentType={selectedElement.type}
              registeredEvents={registeredEventTypes}
              onAddEvent={handleAddEvent}
            />
            <TemplateSuggestionSection
              componentType={selectedElement.type}
              currentHandlers={handlers}
              onApplyTemplate={handleApplyTemplate}
            />
            <EmptyState
              icon={
                <Zap
                  size={iconLarge.size}
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                />
              }
              message="이벤트 핸들러가 없습니다"
              description="위의 추천 이벤트나 템플릿을 선택하세요"
            />
          </>
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
                  strokeWidth={iconProps.strokeWidth}
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
                    strokeWidth={iconProps.strokeWidth}
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
                eventType={selectedHandler.event}
                componentType={selectedElement.type}
                onQuickAddAction={(actionType) => handleAddAction(actionType, 'then')}
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
                  eventType={selectedHandler.event}
                  componentType={selectedElement.type}
                  onQuickAddAction={(actionType) => handleAddAction(actionType, 'else')}
                />
              )}

              {/* 액션 추가 피커 - 직접 ListBox 렌더링 */}
              {showAddAction && (
                <ActionPickerOverlay
                  branch={showAddAction}
                  onSelect={(actionType) => handleAddAction(actionType, showAddAction)}
                  onClose={() => setShowAddAction(false)}
                  eventType={selectedHandler.event}
                  componentType={selectedElement.type}
                />
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
                        strokeWidth={iconProps.strokeWidth}
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
          /* 핸들러 목록 뷰 → 추천 chips + 핸들러 목록 */
          <>
            <RecommendedEventsSection
              componentType={selectedElement.type}
              registeredEvents={registeredEventTypes}
              onAddEvent={handleAddEvent}
            />
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
                        size={iconEditProps.size}
                        color={iconProps.color}
                        strokeWidth={iconProps.strokeWidth}
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
          </>
        )}
      </div>
    </div>
  );
}
