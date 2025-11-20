/**
 * EventTypePicker - 이벤트 타입 선택 컴포넌트
 *
 * EventPalette를 대체하는 간단한 Select 컴포넌트
 * React Aria Select를 사용하여 30줄로 구현 (기존 200+ 줄)
 *
 * Phase 1: Inspector Events React Stately 전환
 */

import { Select, Button, Popover, ListBox, ListBoxItem } from 'react-aria-components';
import { CirclePlus } from 'lucide-react';
import type { EventType } from '@/types/events/events.types';
import { EVENT_TYPE_LABELS } from '@/types/events/events.types';
import { iconProps } from '@/utils/ui/uiConstants';

interface EventTypePickerProps {
  /** 이벤트 선택 시 호출되는 콜백 */
  onSelect: (eventType: EventType) => void;
  /** 이미 등록된 이벤트 타입 목록 (중복 방지용) */
  registeredTypes?: EventType[];
  /** 비활성화 여부 */
  isDisabled?: boolean;
}

/**
 * EventTypePicker 컴포넌트
 *
 * @example
 * <EventTypePicker
 *   onSelect={(eventType) => addHandler(eventType)}
 *   registeredTypes={handlers.map(h => h.event_type)}
 * />
 */
export function EventTypePicker({
  onSelect,
  registeredTypes = [],
  isDisabled = false,
}: EventTypePickerProps) {
  // 사용 가능한 이벤트 타입 목록 (이미 등록된 타입 제외)
  const availableEventTypes = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).filter(
    (type) => !registeredTypes.includes(type)
  );

  return (
    <Select
      placeholder="이벤트 추가"
      aria-label="이벤트 타입 선택"
      onSelectionChange={(key) => {
        if (key) {
          onSelect(key as EventType);
        }
      }}
      isDisabled={isDisabled || availableEventTypes.length === 0}
      className="event-type-picker"
    >
      <Button className="iconButton" aria-label="이벤트 추가">
        <CirclePlus
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      </Button>
      <Popover>
        <ListBox>
          {availableEventTypes.map((eventType) => (
            <ListBoxItem key={eventType} id={eventType}>
              {EVENT_TYPE_LABELS[eventType]}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
