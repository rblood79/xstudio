import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Play, Pause, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Select, SelectItem, TextField } from '../../components/list';
import { useStore } from '../../stores/elements';
import {
    EventType,
    ActionType,
    ElementEvent,
    EventAction,
    EVENT_TYPE_LABELS,
    ACTION_TYPE_LABELS,
    ACTION_CATEGORIES,
    DEFAULT_DEBOUNCE_TIME,
    DEFAULT_THROTTLE_TIME
} from '../../../types/events';
import { supabase } from '../../../env/supabase.client';
import { iconProps } from '../../constants';

import './index.css';

interface ActionValueEditorProps {
    action: EventAction;
    onUpdate: (action: EventAction) => void;
}

function ActionValueEditor({ action, onUpdate }: ActionValueEditorProps) {
    const [value, setValue] = useState<any>(action.value || {});

    const updateValue = (newValue: any) => {
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
                        onChange={(value) => updateValue({ ...value, url: value })}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.newTab || false}
                                onChange={(e) => updateValue({ ...value, newTab: e.target.checked })}
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
                        onChange={(value) => updateValue({ ...value, key: value })}
                    />
                    <TextField
                        label="값"
                        value={value.value || ''}
                        onChange={(value) => updateValue({ ...value, value: value })}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.merge || false}
                                onChange={(e) => updateValue({ ...value, merge: e.target.checked })}
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
                        onChange={(value) => updateValue({ ...value, code: value })}
                        multiline
                        rows={4}
                    />
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={value.async || false}
                                onChange={(e) => updateValue({ ...value, async: e.target.checked })}
                            />
                            비동기 함수
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
                        onChange={(value) => {
                            try {
                                const parsed = JSON.parse(value);
                                updateValue(parsed);
                            } catch (err) {
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
                    <Select
                        label="액션 타입"
                        selectedKey={action.type}
                        onSelectionChange={(key) => onUpdate({ ...action, type: key as ActionType })}
                    >
                        {Object.entries(ACTION_TYPE_LABELS).map(([actionType, label]) => (
                            <SelectItem key={actionType}>
                                {label}
                            </SelectItem>
                        ))}
                    </Select>

                    <TextField
                        label="대상 요소 ID"
                        value={action.target || ''}
                        onChange={(value) => onUpdate({ ...action, target: value })}
                    />

                    <TextField
                        label="지연 시간 (ms)"
                        type="number"
                        value={action.delay || ''}
                        onChange={(value) => onUpdate({ ...action, delay: parseInt(value) || undefined })}
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

                    <ActionValueEditor action={action} onUpdate={onUpdate} />
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
                    <Select
                        label="이벤트 타입"
                        selectedKey={event.event_type}
                        onSelectionChange={(key) => onUpdate({ ...event, event_type: key as EventType })}
                    >
                        {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
                            <SelectItem key={type}>{label}</SelectItem>
                        ))}
                    </Select>

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
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();
    const [events, setEvents] = useState<ElementEvent[]>([]);

    // 선택된 요소의 이벤트 로드
    useEffect(() => {
        if (selectedElementProps?.events) {
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
                events: newEvents
            };

            updateElementProps(selectedElementId, updatedProps);

            // Supabase 업데이트
            try {
                await supabase
                    .from('elements')
                    .update({ props: updatedProps })
                    .eq('id', selectedElementId);
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
            <div className="events-header">
                <h3>이벤트</h3>
                <Button onPress={addEvent}>
                    <Plus size={16} />
                </Button>
            </div>

            {events.length === 0 ? (
                <div className="no-events">
                    <Play size={48} />
                    <h4>이벤트가 없습니다</h4>
                    <p>첫 번째 이벤트를 추가해보세요.</p>
                    <Button onPress={addEvent} variant="outline">
                        <Plus size={16} />
                        이벤트 추가
                    </Button>
                </div>
            ) : (
                <div className="events-list">
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