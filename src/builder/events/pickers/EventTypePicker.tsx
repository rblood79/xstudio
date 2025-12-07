/**
 * EventTypePicker - 이벤트 타입 선택 컴포넌트
 *
 * ComboBox 기반 검색 가능한 이벤트 선택기
 * React Aria ComboBox를 사용하여 검색 기능 제공
 *
 * Phase 2: Events Panel 재설계 - 검색 기능 추가
 */

import { useState, useMemo } from 'react';
import {
  ComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
} from 'react-aria-components';
import { CirclePlus, Search, ChevronDown } from 'lucide-react';
import type { EventType } from '@/types/events/events.types';
import { EVENT_TYPE_LABELS, EVENT_CATEGORIES } from '@/types/events/events.types';
import { iconProps } from '@/utils/ui/uiConstants';

interface EventTypePickerProps {
  /** 이벤트 선택 시 호출되는 콜백 */
  onSelect: (eventType: EventType) => void;
  /** 이미 등록된 이벤트 타입 목록 (중복 방지용) */
  registeredTypes?: EventType[];
  /** 현재 선택된 이벤트 타입 (WhenBlock에서 사용) */
  selectedType?: EventType;
  /** 비활성화 여부 */
  isDisabled?: boolean;
  /** 인라인 모드 (버튼 대신 입력 필드 표시) */
  inline?: boolean;
}

/**
 * EventTypePicker 컴포넌트
 *
 * @example
 * // 헤더 버튼 모드
 * <EventTypePicker
 *   onSelect={(eventType) => addHandler(eventType)}
 *   registeredTypes={handlers.map(h => h.event_type)}
 * />
 *
 * // 인라인 모드 (검색 입력 필드)
 * <EventTypePicker
 *   onSelect={(eventType) => updateTrigger({ event: eventType })}
 *   selectedType={trigger.event}
 *   inline
 * />
 */
export function EventTypePicker({
  onSelect,
  registeredTypes = [],
  selectedType,
  isDisabled = false,
  inline = false,
}: EventTypePickerProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // 사용 가능한 이벤트 타입 목록 (이미 등록된 타입 제외)
  const availableEventTypes = useMemo(() => {
    return (Object.keys(EVENT_TYPE_LABELS) as EventType[]).filter(
      (type) => !registeredTypes.includes(type) || type === selectedType
    );
  }, [registeredTypes, selectedType]);

  // 검색 필터링된 목록
  const filteredEventTypes = useMemo(() => {
    if (!searchValue) return availableEventTypes;

    const searchLower = searchValue.toLowerCase();
    return availableEventTypes.filter((type) => {
      const label = EVENT_TYPE_LABELS[type]?.toLowerCase() || '';
      return type.toLowerCase().includes(searchLower) || label.includes(searchLower);
    });
  }, [availableEventTypes, searchValue]);

  // 카테고리별 그룹화
  const groupedEventTypes = useMemo(() => {
    const groups: { category: string; events: EventType[] }[] = [];

    // EVENT_CATEGORIES가 있으면 사용, 없으면 단일 그룹
    if (typeof EVENT_CATEGORIES !== 'undefined') {
      Object.entries(EVENT_CATEGORIES).forEach(([, categoryData]) => {
        // categoryData는 { label: string, events: readonly string[] } 형태
        const categoryInfo = categoryData as { label: string; events: readonly string[] };
        const filtered = (categoryInfo.events as unknown as EventType[]).filter((e) =>
          filteredEventTypes.includes(e)
        );
        if (filtered.length > 0) {
          groups.push({ category: categoryInfo.label, events: filtered });
        }
      });
    } else {
      groups.push({ category: 'Events', events: filteredEventTypes });
    }

    return groups;
  }, [filteredEventTypes]);

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      onSelect(key as EventType);
      setSearchValue('');
      setIsOpen(false);
    }
  };

  // 인라인 모드: 검색 입력 필드
  if (inline) {
    return (
      <ComboBox
        className="event-type-picker-inline"
        inputValue={searchValue}
        onInputChange={setSearchValue}
        onSelectionChange={handleSelectionChange}
        selectedKey={selectedType}
        isDisabled={isDisabled}
        aria-label="이벤트 타입 선택"
        onOpenChange={setIsOpen}
      >
        <div className="event-picker-input-wrapper">
          <Input
            className="event-picker-input"
            placeholder="Search events..."
          />
          <Button className="event-picker-button">
            <ChevronDown size={14} />
          </Button>
        </div>

        <Popover
          className="event-picker-popover"
          placement="bottom start"
          offset={4}
        >
          <ListBox className="event-picker-list">
            {filteredEventTypes.length === 0 ? (
              <div className="event-picker-empty">
                <Search size={16} color={iconProps.color} />
                <span>No events found</span>
              </div>
            ) : (
              groupedEventTypes.map((group) => (
                <div key={group.category} className="event-group">
                  <div className="event-group-label">{group.category}</div>
                  {group.events.map((eventType) => (
                    <ListBoxItem
                      key={eventType}
                      id={eventType}
                      className="event-item"
                      textValue={EVENT_TYPE_LABELS[eventType] || eventType}
                    >
                      <span className="event-name">
                        {EVENT_TYPE_LABELS[eventType] || eventType}
                      </span>
                      <span className="event-type-code">{eventType}</span>
                    </ListBoxItem>
                  ))}
                </div>
              ))
            )}
          </ListBox>
        </Popover>
      </ComboBox>
    );
  }

  // 버튼 모드: 헤더에서 + 버튼 클릭
  return (
    <ComboBox
      className="event-type-picker"
      inputValue={searchValue}
      onInputChange={setSearchValue}
      onSelectionChange={handleSelectionChange}
      isDisabled={isDisabled || availableEventTypes.length === 0}
      aria-label="이벤트 타입 선택"
      onOpenChange={setIsOpen}
      menuTrigger="focus"
    >
      <Button className="iconButton" aria-label="이벤트 추가">
        <CirclePlus
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      </Button>

      <Popover
        className="event-picker-popover"
        placement="bottom end"
        offset={4}
      >
        <div className="event-picker-search">
          <Search size={14} color={iconProps.color} />
          <Input
            className="event-picker-search-input"
            placeholder="Search events..."
          />
        </div>

        <ListBox className="event-picker-list">
          {filteredEventTypes.length === 0 ? (
            <div className="event-picker-empty">
              <span>No events found</span>
            </div>
          ) : (
            groupedEventTypes.map((group) => (
              <div key={group.category} className="event-group">
                <div className="event-group-label">{group.category}</div>
                {group.events.map((eventType) => (
                  <ListBoxItem
                    key={eventType}
                    id={eventType}
                    className="event-item"
                    textValue={EVENT_TYPE_LABELS[eventType] || eventType}
                  >
                    <span className="event-name">
                      {EVENT_TYPE_LABELS[eventType] || eventType}
                    </span>
                    <span className="event-type-code">{eventType}</span>
                  </ListBoxItem>
                ))}
              </div>
            ))
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
