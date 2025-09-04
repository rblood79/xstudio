import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Select, SelectItem, TextField } from '../../components/list';
import {
    EventType,
    ActionType,
    ElementEvent,
    EventAction,
    EVENT_TYPE_LABELS,
    ACTION_TYPE_LABELS,
    DEFAULT_DEBOUNCE_TIME,
    DEFAULT_THROTTLE_TIME
} from '../../../types/events';
import { supabase } from '../../../env/supabase.client';
import { useSelectedElement } from '../shared/hooks';

import './index.css';

interface ActionValueEditorProps {
    action: EventAction;
    onUpdate: (action: EventAction) => void;
}

function ActionValueEditor({ action, onUpdate }: ActionValueEditorProps) {
    const [value, setValue] = useState<Record<string, unknown>>(action.value as Record<string, unknown> || {});

    const updateValue = (newValue: Record<string, unknown>) => {
        setValue(newValue);
        onUpdate({ ...action, value: newValue });
    };

    switch (action.type) {
        case 'navigate':
            return (
                <div className="action-value-editor">
                    <TextField
                        label="URL"
                        value={value.url || ''}
                        onChange={(newUrl) => {
                            updateValue({ ...(value as Record<string, unknown>), url: newUrl });
                        }}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.newTab || false}
                                onChange={(e) => {
                                    const updatedValue = { ...value, newTab: e.target.checked };
                                    setValue(updatedValue);
                                    onUpdate({ ...action, value: updatedValue });
                                }}
                            />
                            새 탭에서 열기
                        </label>
                    </div>
                </div>
            );

        case 'toggle_visibility':
            return (
                <div className="action-value-editor">
                    <Select
                        label="동작"
                        selectedKey={value.show === undefined ? 'toggle' : value.show ? 'show' : 'hide'}
                        onSelectionChange={(key) => {
                            const show = key === 'toggle' ? undefined : key === 'show';
                            updateValue({ ...value, show });
                        }}
                    >
                        <SelectItem key="toggle">토글</SelectItem>
                        <SelectItem key="show">표시</SelectItem>
                        <SelectItem key="hide">숨김</SelectItem>
                    </Select>
                    <TextField
                        label="애니메이션 지속시간 (ms)"
                        type="number"
                        value={value.duration || ''}
                        onChange={(value) => updateValue({ ...value, duration: parseInt(value) || undefined })}
                    />
                </div>
            );

        case 'update_state':
            return (
                <div className="action-value-editor">
                    <TextField
                        label="상태 키"
                        value={value.key || ''}
                        onChange={(newKey) => {
                            const updatedValue = { ...value, key: newKey };
                            setValue(updatedValue);
                            onUpdate({ ...action, value: updatedValue });
                        }}
                    />
                    <TextField
                        label="값"
                        value={value.value || ''}
                        onChange={(newVal) => {
                            const updatedValue = { ...value, value: newVal };
                            setValue(updatedValue);
                            onUpdate({ ...action, value: updatedValue });
                        }}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.merge || false}
                                onChange={(e) => {
                                    const updatedValue = { ...value, merge: e.target.checked };
                                    setValue(updatedValue);
                                    onUpdate({ ...action, value: updatedValue });
                                }}
                            />
                            객체 병합
                        </label>
                    </div>
                </div>
            );

        case 'show_modal':
            return (
                <div className="action-value-editor">
                    <TextField
                        label="모달 ID"
                        value={value.modalId || ''}
                        onChange={(value) => updateValue({ ...value, modalId: value })}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.backdrop !== false}
                                onChange={(e) => updateValue({ ...value, backdrop: e.target.checked })}
                            />
                            배경 클릭으로 닫기
                        </label>
                    </div>
                </div>
            );

        case 'custom_function':
            return (
                <div className="action-value-editor">
                    <TextField
                        label="함수 코드"
                        value={value.code || ''}
                        onChange={(newCode) => {
                            // 직접 code 속성만 업데이트
                            const updatedValue = { ...value, code: newCode };
                            setValue(updatedValue);
                            onUpdate({ ...action, value: updatedValue });
                        }}
                        multiline
                        rows={4}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.async || false}
                                onChange={(e) => {
                                    // 직접 async 속성만 업데이트
                                    const updatedValue = { ...value, async: e.target.checked };
                                    setValue(updatedValue);
                                    onUpdate({ ...action, value: updatedValue });
                                }}
                            />
                            비동기 함수
                        </label>
                    </div>
                </div>
            );

        case 'update_props':
            return (
                <div className="action-value-editor">

                    <TextField
                        label="속성 (JSON)"
                        value={value.props ? JSON.stringify(value.props, null, 2) : '{"children": "새 텍스트"}'}
                        onChange={(newProps) => {
                            try {
                                const parsedProps = JSON.parse(newProps);
                                const updatedValue = { ...value, props: parsedProps };
                                setValue(updatedValue);
                                onUpdate({ ...action, value: updatedValue });
                            } catch {
                                console.error('JSON 파싱 오류');
                            }
                        }}
                        multiline
                        rows={3}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.merge || false}
                                onChange={(e) => {
                                    const updatedValue = { ...value, merge: e.target.checked };
                                    setValue(updatedValue);
                                    onUpdate({ ...action, value: updatedValue });
                                }}
                            />
                            기존 속성과 병합
                        </label>
                    </div>
                </div>
            );

        default:
            return (
                <div className="action-value-editor">
                    <TextField
                        label="설정값 (JSON)"
                        value={JSON.stringify(value, null, 2)}
                        onChange={(jsonValue) => {
                            try {
                                const parsed = JSON.parse(jsonValue);
                                setValue(parsed);
                                onUpdate({ ...action, value: parsed });
                            } catch {
                                // JSON 파싱 에러는 무시
                            }
                        }}
                        multiline
                        rows={3}
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
                    {action.description && <span className="action-description">{action.description}</span>}
                </div>
                <div className="action-controls">
                    <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onPress={onDelete}
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="action-content">
                    <div className="select-wrapper">
                        <label>액션 타입</label>
                        <select
                            value={action.type}
                            onChange={(e) => {
                                const selectedType = e.target.value as ActionType;
                                console.log('액션 타입 변경:', selectedType);

                                // 액션 타입에 따른 기본값 설정
                                let defaultValue = {};

                                if (selectedType === 'custom_function') {
                                    defaultValue = { code: 'console.log("이벤트 발생:", event);' };
                                } else if (selectedType === 'navigate') {
                                    defaultValue = { url: '' };
                                } else if (selectedType === 'update_state') {
                                    defaultValue = { key: '', value: '' };
                                } else if (selectedType === 'toggle_visibility') {
                                    defaultValue = { show: undefined };
                                } else if (selectedType === 'show_modal') {
                                    defaultValue = { modalId: '', backdrop: true };
                                }

                                const updatedAction = {
                                    ...action,
                                    type: selectedType,
                                    value: defaultValue
                                };

                                console.log('업데이트된 액션:', updatedAction);
                                onUpdate(updatedAction);
                            }}
                            className="action-type-select"
                        >
                            {Object.entries(ACTION_TYPE_LABELS).map(([actionType, label]) => (
                                <option key={actionType} value={actionType}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <TextField
                        label="대상 요소 ID"
                        value={action.target || ''}
                        onChange={(value) => onUpdate({ ...action, target: value })}
                    />

                    <TextField
                        label="지연 시간 (ms)"
                        type="number"
                        value={String(action.delay || 0)}
                        onChange={(value) => onUpdate({ ...action, delay: Number(value) })}
                    />

                    <TextField
                        label="실행 조건"
                        value={action.condition || ''}
                        onChange={(value) => onUpdate({ ...action, condition: value })}
                        description="JavaScript 표현식 (예: state.isLoggedIn)"
                    />

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={action.enabled !== false}
                                onChange={(e) => onUpdate({ ...action, enabled: e.target.checked })}
                            />
                            활성화
                        </label>
                    </div>

                    <TextField
                        label="설명"
                        value={action.description || ''}
                        onChange={(value) => onUpdate({ ...action, description: value })}
                    />

                    <ActionValueEditor
                        key={action.type}  // 타입이 변경될 때마다 컴포넌트 재생성
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

    const addAction = () => {
        const newAction: EventAction = {
            id: `action_${Date.now()}`,
            type: 'update_state',
            enabled: true
        };
        onUpdate({
            ...event,
            actions: [...event.actions, newAction]
        });
    };

    const updateAction = (actionId: string, updatedAction: EventAction) => {
        onUpdate({
            ...event,
            actions: event.actions.map(action =>
                action.id === actionId ? updatedAction : action
            )
        });
    };

    const deleteAction = (actionId: string) => {
        onUpdate({
            ...event,
            actions: event.actions.filter(action => action.id !== actionId)
        });
    };

    return (
        <div className="event-editor">
            <div className="event-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="event-info">
                    <span className="event-type">{EVENT_TYPE_LABELS[event.event_type]}</span>
                    <span className="event-actions-count">({event.actions.length}개 액션)</span>
                    {event.description && <span className="event-description">{event.description}</span>}
                </div>
                <div className="event-controls">
                    <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onPress={onDelete}
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="event-content">
                    <div className="select-wrapper">
                        <label>이벤트 타입</label>
                        <select
                            value={event.event_type}
                            onChange={(e) => {
                                const selectedType = e.target.value as EventType;
                                console.log('이벤트 타입 변경:', selectedType);
                                onUpdate({ ...event, event_type: selectedType });
                            }}
                            className="event-type-select"
                        >
                            {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
                                <option key={type} value={type}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <TextField
                        label="설명"
                        value={event.description || ''}
                        onChange={(value) => onUpdate({ ...event, description: value })}
                    />

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={event.enabled !== false}
                                onChange={(e) => onUpdate({ ...event, enabled: e.target.checked })}
                            />
                            활성화
                        </label>
                    </div>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={event.preventDefault || false}
                                onChange={(e) => onUpdate({ ...event, preventDefault: e.target.checked })}
                            />
                            기본 동작 방지
                        </label>
                    </div>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={event.stopPropagation || false}
                                onChange={(e) => onUpdate({ ...event, stopPropagation: e.target.checked })}
                            />
                            이벤트 전파 중단
                        </label>
                    </div>

                    <TextField
                        label="디바운스 시간 (ms)"
                        type="number"
                        value={event.debounce || ''}
                        onChange={(value) => onUpdate({ ...event, debounce: parseInt(value) || undefined })}
                        description={`기본값: ${DEFAULT_DEBOUNCE_TIME}ms`}
                    />

                    <TextField
                        label="스로틀 시간 (ms)"
                        type="number"
                        value={event.throttle || ''}
                        onChange={(value) => onUpdate({ ...event, throttle: parseInt(value) || undefined })}
                        description={`기본값: ${DEFAULT_THROTTLE_TIME}ms`}
                    />

                    <div className="actions-section">
                        <div className="actions-header">
                            <h4>액션</h4>
                            <Button size="sm" onPress={addAction}>
                                <Plus size={16} />
                            </Button>
                        </div>

                        <div className="actions-list">
                            {event.actions.map(action => (
                                <ActionEditor
                                    key={action.id}
                                    action={action}
                                    onUpdate={(updatedAction) => updateAction(action.id, updatedAction)}
                                    onDelete={() => deleteAction(action.id)}
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
    const { elementId, elementProps, isSelected } = useSelectedElement();
    const [events, setEvents] = useState<ElementEvent[]>([]);

    // 선택된 요소의 이벤트 로드
    useEffect(() => {
        if (elementProps?.events) {
            setEvents(elementProps.events);
        } else {
            setEvents([]);
        }
    }, [elementProps?.events]);

    // 이벤트 업데이트 처리
    const updateEvents = async (newEvents: ElementEvent[]) => {
        setEvents(newEvents);

        if (elementId) {
            const updatedProps = {
                ...elementProps,
                events: newEvents
            };

            // Update via Supabase
            try {
                await supabase
                    .from('elements')
                    .update({ props: updatedProps })
                    .eq('id', elementId);
            } catch (err) {
                console.error('Events update error:', err);
            }
        }
    };

    const addEvent = () => {
        const newEvent: ElementEvent = {
            id: `event_${Date.now()}`,
            event_type: 'onClick',
            actions: [],
            enabled: true
        };
        updateEvents([...events, newEvent]);
    };

    const updateEvent = (eventId: string, updatedEvent: ElementEvent) => {
        updateEvents(events.map(event =>
            event.id === eventId ? updatedEvent : event
        ));
    };

    const deleteEvent = (eventId: string) => {
        updateEvents(events.filter(event => event.id !== eventId));
    };

    if (!isSelected) {
        return (
            <div className="events-container">
                <div className="empty-state">
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
                        <Plus size={16} />
                    </Button>
                </div>
            </div>

            {events.length === 0 ? (
                <div className="empty-state">
                    <Play size={24} />
                    <h4>이벤트가 없습니다</h4>
                    <p>첫 번째 이벤트를 추가해보세요.</p>
                    <Button onPress={addEvent} variant="outline">
                        <Plus size={16} />
                        이벤트 추가
                    </Button>
                </div>
            ) : (
                <div className="panel-content">
                    {events.map(event => (
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