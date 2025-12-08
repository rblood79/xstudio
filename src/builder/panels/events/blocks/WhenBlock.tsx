/**
 * WhenBlock - WHEN 트리거 블록
 *
 * 이벤트 타입과 대상 요소를 설정하는 블록
 * 블록 기반 Events Panel의 첫 번째 블록
 */

import { Button } from 'react-aria-components';
import { Zap, Settings } from 'lucide-react';
import type { EventTrigger } from '../../../events/types/eventBlockTypes';
import type { EventType } from '../../../events/types/eventTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { BlockConnector } from './BlockConnector';
import { EventTypePicker } from '../../../events/pickers/EventTypePicker';

interface WhenBlockProps {
  /** 트리거 설정 */
  trigger: EventTrigger;

  /** 트리거 변경 핸들러 */
  onChange: (trigger: EventTrigger) => void;

  /** 이미 등록된 이벤트 타입 목록 (중복 방지) */
  registeredEventTypes?: EventType[];

  /** 옵션 버튼 클릭 핸들러 */
  onOptionsClick?: () => void;

  /** 연결선 표시 여부 */
  showConnector?: boolean;
}

/**
 * WHEN 블록 컴포넌트
 *
 * @example
 * <WhenBlock
 *   trigger={{ event: 'onClick', target: 'self' }}
 *   onChange={(trigger) => setTrigger(trigger)}
 *   registeredEventTypes={['onClick', 'onChange']}
 * />
 */
export function WhenBlock({
  trigger,
  onChange,
  registeredEventTypes = [],
  onOptionsClick,
  showConnector = true,
}: WhenBlockProps) {
  const handleEventChange = (event: EventType) => {
    onChange({ ...trigger, event });
  };

  return (
    <div className="event-block when-block" role="group" aria-label="When trigger">
      {/* Block Header */}
      <div className="block-header">
        <Zap
          className="block-icon"
          size={iconProps.size}
          strokeWidth={iconProps.stroke}
        />
        <span className="block-label">WHEN</span>
      </div>

      {/* Block Content */}
      <div className="block-content">
        <div className="trigger-row">
          {/* Event Type Picker */}
          <EventTypePicker
            onSelect={handleEventChange}
            registeredTypes={registeredEventTypes}
            selectedType={trigger.event}
          />

          {/* Target */}
          <span className="trigger-target">
            {trigger.target === 'self' ? 'on this element' : `on ${trigger.target}`}
          </span>

          {/* Options Button */}
          {onOptionsClick && (
            <Button
              className="iconButton"
              onPress={onOptionsClick}
              aria-label="Trigger options"
            >
              <Settings
                size={14}
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Connector to next block */}
      {showConnector && <BlockConnector direction="down" />}
    </div>
  );
}
