import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Settings,
  Play,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { iconProps, iconLarge } from "../../utils/ui/uiConstants";
import { Button } from "../../../shared/components/list";
import { PropertyInput, PropertySelect, PropertyCheckbox } from "../../../shared/components";
import { useStore } from "../../stores";
import {
  EventType,
  ActionType,
  ElementEvent,
  EventAction,
  EVENT_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  DEFAULT_DEBOUNCE_TIME,
  DEFAULT_THROTTLE_TIME,
} from "../types/eventTypes";
import { saveService } from "../../../services/save";
import { useActions } from "./state/useActions";

import "./index.css";

interface ActionValueEditorProps {
  action: EventAction;
  onUpdate: (action: EventAction) => void;
}

function ActionValueEditor({ action, onUpdate }: ActionValueEditorProps) {
  const [value, setValue] = useState<Record<string, unknown>>(
    (action.value as Record<string, unknown>) || {}
  );

  const updateValue = (newValue: Record<string, unknown>) => {
    setValue(newValue);
    onUpdate({ ...action, value: newValue });
  };

  switch (action.type) {
    case "navigate":
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="Path / URL"
            value={String(value.path || "")}
            onChange={(newPath) => {
              updateValue({
                ...(value as Record<string, unknown>),
                path: newPath,
              });
            }}
          />
          <PropertyCheckbox
            label="새 탭에서 열기"
            isSelected={Boolean(value.openInNewTab)}
            onChange={(isSelected) => {
              const updatedValue = { ...value, openInNewTab: isSelected };
              updateValue({ ...updatedValue, path: value.path || "" });
            }}
          />
        </div>
      );

    case "toggle_visibility":
      return (
        <div className="action-value-editor">
          <PropertySelect
            label="동작"
            value={
              value.show === undefined ? "toggle" : value.show ? "show" : "hide"
            }
            onChange={(key) => {
              const show = key === "toggle" ? undefined : key === "show";
              updateValue({ ...value, show });
            }}
            options={[
              { value: "toggle", label: "토글" },
              { value: "show", label: "표시" },
              { value: "hide", label: "숨김" }
            ]}
          />
          <PropertyInput
            label="애니메이션 지속시간 (ms)"
            type="number"
            value={String(value.duration || "")}
            onChange={(newValue) =>
              updateValue({
                ...value,
                duration: parseInt(newValue) || undefined,
              })
            }
          />
        </div>
      );

    case "update_state":
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="상태 키"
            value={String(value.key || "")}
            onChange={(newKey) => {
              updateValue({ ...value, key: newKey, value: value.value || "" });
            }}
          />
          <PropertyInput
            label="상태 값"
            value={String(value.value || "")}
            onChange={(newValue) => {
              updateValue({ ...value, value: newValue });
            }}
          />
          <PropertyCheckbox
            label="객체 병합"
            isSelected={Boolean(value.merge)}
            onChange={(isSelected) => {
              updateValue({
                ...value,
                merge: isSelected,
                key: value.key || "",
                value: value.value || "",
              });
            }}
          />
        </div>
      );

    case "show_modal":
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="모달 ID"
            value={String(value.modalId || "")}
            onChange={(newValue) =>
              updateValue({ ...value, modalId: newValue })
            }
          />
          <PropertyCheckbox
            label="배경 클릭으로 닫기"
            isSelected={Boolean(value.backdrop !== false)}
            onChange={(isSelected) =>
              updateValue({ ...value, backdrop: isSelected })
            }
          />
        </div>
      );

    case "custom_function":
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="JavaScript 코드"
            value={String(value.code || "")}
            onChange={(newCode) => {
              updateValue({
                ...value,
                code: newCode,
                async: Boolean(value.async),
              });
            }}
            multiline
          />
          <PropertyCheckbox
            label="비동기 실행"
            isSelected={Boolean(value.async)}
            onChange={(isSelected) => {
              updateValue({
                ...value,
                async: isSelected,
                code: value.code || "",
              });
            }}
          />
        </div>
      );

    case "update_props":
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="Props (JSON)"
            value={JSON.stringify(value.props || {}, null, 2)}
            onChange={(newProps) => {
              try {
                const parsedProps = JSON.parse(newProps);
                const updatedValue = { ...value, props: parsedProps };
                setValue(updatedValue);
                onUpdate({
                  ...action,
                  value: {
                    ...updatedValue,
                    elementId: String(value.elementId || ""),
                    props: parsedProps,
                  },
                });
              } catch {
                console.error("JSON 파싱 오류");
              }
            }}
            multiline
          />
          <PropertyCheckbox
            label="기존 속성과 병합"
            isSelected={Boolean(value.merge)}
            onChange={(isSelected) => {
              updateValue({
                ...value,
                merge: isSelected,
                props: value.props || {},
              });
            }}
          />
        </div>
      );

    default:
      return (
        <div className="action-value-editor">
          <PropertyInput
            label="Props (JSON)"
            value={JSON.stringify(value, null, 2)}
            onChange={(jsonValue) => {
              try {
                const props = JSON.parse(jsonValue);
                updateValue({ ...value, props });
              } catch {
                // JSON 파싱 실패 시 무시
              }
            }}
            multiline
          />
        </div>
      );
  }
}

interface ActionEditorProps {
  action: EventAction;
  onUpdate: (action: EventAction) => void;
  onDelete: () => void;
}

function ActionEditor({ action, onUpdate, onDelete }: ActionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="action-editor">
      <div className="action-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="action-info">
          <span className="action-type">{ACTION_TYPE_LABELS[action.type]}</span>
          {action.description && (
            <span className="action-description">{action.description}</span>
          )}
        </div>
        <div className="action-controls">
          <Button onPress={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronDown size={iconProps.size} />
            ) : (
              <ChevronRight size={iconProps.size} />
            )}
          </Button>
          <Button onPress={onDelete}>
            <Trash2 size={iconProps.size} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="action-content">
          <PropertySelect
            label="액션 타입"
            value={action.type}
            onChange={(selectedType) => {
              const actionType = selectedType as ActionType;
              console.log("액션 타입 변경:", actionType);

              // 액션 타입에 따른 기본값 설정
              let defaultValue = {};

              if (actionType === "custom_function") {
                defaultValue = {
                  code: 'console.log("이벤트 발생:", event);',
                };
              } else if (actionType === "navigate") {
                defaultValue = { url: "" };
              } else if (actionType === "update_state") {
                defaultValue = { key: "", value: "" };
              } else if (actionType === "toggle_visibility") {
                defaultValue = { show: undefined };
              } else if (actionType === "show_modal") {
                defaultValue = { modalId: "", backdrop: true };
              }

              const updatedAction = {
                ...action,
                type: actionType,
                value: defaultValue,
              };

              console.log("업데이트된 액션:", updatedAction);
              onUpdate(updatedAction);
            }}
            options={Object.entries(ACTION_TYPE_LABELS).map(([actionType, label]) => ({
              value: actionType,
              label: label
            }))}
          />

          <PropertyInput
            label="대상 요소 ID"
            value={action.target || ""}
            onChange={(value) => onUpdate({ ...action, target: value })}
          />

          <PropertyInput
            label="지연 시간 (ms)"
            type="number"
            value={String(action.delay || 0)}
            onChange={(newValue) =>
              onUpdate({ ...action, delay: parseInt(newValue) || undefined })
            }
          />

          <PropertyInput
            label="실행 조건"
            value={action.condition || ""}
            onChange={(value) => onUpdate({ ...action, condition: value })}
          />

          <PropertyCheckbox
            label="활성화"
            isSelected={action.enabled !== false}
            onChange={(isSelected) =>
              onUpdate({ ...action, enabled: isSelected })
            }
          />

          <PropertyInput
            label="설명"
            value={action.description || ""}
            onChange={(value) => onUpdate({ ...action, description: value })}
          />

          <ActionValueEditor
            key={action.type} // 타입이 변경될 때마다 컴포넌트 재생성
            action={action}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
}

interface EventEditorProps {
  event: ElementEvent;
  onUpdate: (event: ElementEvent) => void;
  onDelete: () => void;
}

function EventEditor({ event, onUpdate, onDelete }: EventEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ useActions 훅 사용 - 기존 수동 배열 조작 로직 제거
  const {
    actions,
    addAction: addActionToList,
    updateAction: updateActionInList,
    removeAction: removeActionFromList,
  } = useActions(event.actions);

  // actions 변경 시 event 업데이트
  useEffect(() => {
    onUpdate({ ...event, actions });
  }, [actions, event, onUpdate]);

  const handleAddAction = () => {
    addActionToList("update_state", {});
  };

  const handleUpdateAction = (actionId: string, updatedAction: EventAction) => {
    updateActionInList(actionId, updatedAction);
  };

  const handleDeleteAction = (actionId: string) => {
    removeActionFromList(actionId);
  };

  return (
    <div className="event-editor">
      <div className="event-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="event-info">
          <span className="event-type">
            {EVENT_TYPE_LABELS[event.event_type]}
          </span>
          <span className="event-actions-count">
            ({actions.length}개 액션)
          </span>
          {event.description && (
            <span className="event-description">{event.description}</span>
          )}
        </div>
        <div className="event-controls">
          <Button onPress={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronDown size={iconProps.size} />
            ) : (
              <ChevronRight size={iconProps.size} />
            )}
          </Button>
          <Button onPress={onDelete}>
            <Trash2 size={iconProps.size} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="event-content">
          <PropertySelect
            label="이벤트 타입"
            value={event.event_type}
            onChange={(selectedType) => {
              const eventType = selectedType as EventType;
              console.log("이벤트 타입 변경:", eventType);
              onUpdate({ ...event, event_type: eventType });
            }}
            options={Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => ({
              value: type,
              label: label
            }))}
          />

          <PropertyInput
            label="설명"
            value={event.description || ""}
            onChange={(value) => onUpdate({ ...event, description: value })}
          />

          <PropertyCheckbox
            label="활성화"
            isSelected={event.enabled !== false}
            onChange={(isSelected) =>
              onUpdate({ ...event, enabled: isSelected })
            }
          />

          <PropertyCheckbox
            label="기본 동작 방지"
            isSelected={event.preventDefault || false}
            onChange={(isSelected) =>
              onUpdate({ ...event, preventDefault: isSelected })
            }
          />

          <PropertyCheckbox
            label="이벤트 전파 중단"
            isSelected={event.stopPropagation || false}
            onChange={(isSelected) =>
              onUpdate({ ...event, stopPropagation: isSelected })
            }
          />

          <PropertyInput
            label={`디바운스 시간 (ms) - 기본값: ${DEFAULT_DEBOUNCE_TIME}ms`}
            type="number"
            value={String(event.debounce || "")}
            onChange={(value) =>
              onUpdate({ ...event, debounce: parseInt(value) || undefined })
            }
          />

          <PropertyInput
            label={`스로틀 시간 (ms) - 기본값: ${DEFAULT_THROTTLE_TIME}ms`}
            type="number"
            value={String(event.throttle || "")}
            onChange={(value) =>
              onUpdate({ ...event, throttle: parseInt(value) || undefined })
            }
          />

          <div className="actions-section">
            <div className="actions-header">
              <h4>액션</h4>
              <Button onPress={handleAddAction}>
                <Plus size={iconProps.size} />
              </Button>
            </div>

            <div className="actions-list">
              {actions.map((action) => (
                <ActionEditor
                  key={action.id}
                  action={action}
                  onUpdate={(updatedAction) =>
                    handleUpdateAction(action.id, updatedAction)
                  }
                  onDelete={() => handleDeleteAction(action.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Events() {
  // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectedElementProps = useStore((state) => state.selectedElementProps);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const [events, setEvents] = useState<ElementEvent[]>([]);

  // 선택된 요소의 이벤트 로드
  useEffect(() => {
    if (selectedElementProps?.events) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents(selectedElementProps.events);
    } else {
       
      setEvents([]);
    }
  }, [selectedElementProps?.events]);

  // 이벤트 업데이트 처리
  const updateEvents = async (newEvents: ElementEvent[]) => {
    setEvents(newEvents);

    if (selectedElementId) {
      const updatedProps = {
        ...selectedElementProps,
        events: newEvents,
      };

      updateElementProps(selectedElementId, updatedProps);

      try {
        await saveService.savePropertyChange({
          table: "elements",
          id: selectedElementId,
          data: { props: updatedProps },
        });
      } catch (err) {
        console.error("Events update error:", err);
      }
    }
  };

  const addEvent = () => {
    const newEvent: ElementEvent = {
      id: `event_${Date.now()}`,
      event_type: "onClick",
      actions: [],
      enabled: true,
    };
    updateEvents([...events, newEvent]);
  };

  const updateEvent = (eventId: string, updatedEvent: ElementEvent) => {
    updateEvents(
      events.map((event) => (event.id === eventId ? updatedEvent : event))
    );
  };

  const deleteEvent = (eventId: string) => {
    updateEvents(events.filter((event) => event.id !== eventId));
  };

  if (!selectedElementId) {
    return (
      <div className="events-container">
        <div className="no-selection">
          <Settings size={48} />
          <h3>요소를 선택해주세요</h3>
          <p>이벤트를 추가하려면 먼저 요소를 선택하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="panel-header">
        <h3 className="panel-title">이벤트</h3>
        <div className="header-actions">
          <Button onPress={addEvent}>
            <Plus size={iconProps.size} />
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <Play size={iconLarge.size} />
          <h4>이벤트가 없습니다</h4>
          <p>첫 번째 이벤트를 추가해보세요.</p>
          <Button onPress={addEvent}>
            <Plus size={iconProps.size} />
            이벤트 추가
          </Button>
        </div>
      ) : (
        <div className="panel-content">
          {events.map((event) => (
            <EventEditor
              key={event.id}
              event={event}
              onUpdate={(updatedEvent) => updateEvent(event.id, updatedEvent)}
              onDelete={() => deleteEvent(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Events;
