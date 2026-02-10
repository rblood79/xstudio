/**
 * RecommendedEventsSection - 추천 이벤트 칩 섹션
 *
 * 컴포넌트 타입에 따라 추천 이벤트를 칩 형태로 표시합니다.
 * 이미 등록된 이벤트는 제외하고, 최대 4개까지 표시합니다.
 *
 * @example
 * ```tsx
 * <RecommendedEventsSection
 *   componentType="Button"
 *   registeredEvents={["onClick", "onPress"]}
 *   onAddEvent={(type) => addHandler(type)}
 * />
 * ```
 */

import { useMemo } from "react";
import { TooltipTrigger, Tooltip, Button } from "react-aria-components";
import { Zap } from "lucide-react";
import { useRecommendedEvents } from "../hooks/useRecommendedEvents";
import type { RecommendedEvent } from "../hooks/useRecommendedEvents";
import type { EventType } from "../types/eventTypes";
import { iconSmall } from "@/utils/ui/uiConstants";

// ============================================
// Constants
// ============================================

const MAX_VISIBLE_CHIPS = 4;

// ============================================
// Types
// ============================================

export interface RecommendedEventsSectionProps {
  componentType: string;
  registeredEvents: EventType[];
  onAddEvent: (type: EventType) => void;
}

// ============================================
// Component
// ============================================

export function RecommendedEventsSection({
  componentType,
  registeredEvents,
  onAddEvent,
}: RecommendedEventsSectionProps) {
  const allRecommended = useRecommendedEvents(componentType);

  const availableEvents = useMemo(() => {
    return allRecommended.filter(
      (event) => !registeredEvents.includes(event.type)
    );
  }, [allRecommended, registeredEvents]);

  if (availableEvents.length === 0) {
    return null;
  }

  const visibleEvents = availableEvents.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = availableEvents.length - MAX_VISIBLE_CHIPS;

  return (
    <div className="recommended-events-section">
      <div className="recommended-events-header">
        <Zap {...iconSmall} />
        <span>추천</span>
      </div>
      <div className="recommended-events-chips">
        {visibleEvents.map((event) => (
          <RecommendedChip
            key={event.type}
            event={event}
            onAdd={onAddEvent}
          />
        ))}
        {overflowCount > 0 && (
          <span className="recommended-overflow">+{overflowCount} more</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Chip Sub-component
// ============================================

interface RecommendedChipProps {
  event: RecommendedEvent;
  onAdd: (type: EventType) => void;
}

function RecommendedChip({ event, onAdd }: RecommendedChipProps) {
  const tooltipContent = [
    event.description,
    event.example ? `e.g. ${event.example}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <TooltipTrigger delay={400}>
      <Button
        className="recommended-event-chip"
        aria-label={`Add ${event.label} event handler`}
        onPress={() => onAdd(event.type)}
      >
        {event.label}
      </Button>
      <Tooltip className="recommended-chip-tooltip" placement="bottom">
        {tooltipContent}
      </Tooltip>
    </TooltipTrigger>
  );
}

export default RecommendedEventsSection;
