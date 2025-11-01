/**
 * EventCategoryGroup - 카테고리별 이벤트 그룹 표시
 */

import { useState } from "react";
import { Button } from "react-aria-components";
import { EVENT_METADATA, isEventCompatible } from "../../data/eventCategories";
import { highlightMatch } from "../../hooks/useEventSearch";
import type { EventCategory, EventType } from "../../types";

export interface EventCategoryGroupProps {
  category: EventCategory;
  searchQuery?: string;
  registeredEvents: string[];
  componentType?: string;
  onAddEvent: (eventType: EventType) => void;
}

/**
 * EventCategoryGroup Component
 *
 * 카테고리별로 이벤트를 그룹화하여 표시합니다.
 * 검색어가 있으면 매칭되는 이벤트만 표시합니다.
 *
 * @example
 * ```tsx
 * <EventCategoryGroup
 *   category={EVENT_CATEGORIES.mouse}
 *   searchQuery="클릭"
 *   registeredEvents={["onClick"]}
 *   componentType="Button"
 *   onAddEvent={(eventType) => console.log(eventType)}
 * />
 * ```
 */
export function EventCategoryGroup({
  category,
  searchQuery = "",
  registeredEvents,
  componentType,
  onAddEvent
}: EventCategoryGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 카테고리의 이벤트 필터링
  const filteredEvents = category.events.filter((eventType) => {
    // 검색어가 있으면 매칭 체크
    if (searchQuery) {
      const metadata = EVENT_METADATA[eventType];
      const matchesSearch =
        metadata.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eventType.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
    }

    // 컴포넌트 호환성 체크
    if (componentType && !isEventCompatible(eventType, componentType)) {
      return false;
    }

    return true;
  });

  // 표시할 이벤트가 없으면 렌더링하지 않음
  if (filteredEvents.length === 0) {
    return null;
  }

  return (
    <div className="event-category-group">
      <button
        className="category-header"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="category-icon">{category.icon}</span>
        <span className="category-label">{category.label}</span>
        <span className="category-count">
          {filteredEvents.length}
        </span>
        <span className={`category-toggle ${isExpanded ? "expanded" : ""}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="category-events">
          {filteredEvents.map((eventType) => {
            const metadata = EVENT_METADATA[eventType];
            const isRegistered = registeredEvents.includes(eventType);
            const highlight = highlightMatch(metadata.label, searchQuery);

            return (
              <div key={eventType} className="event-item">
                <div className="event-info">
                  <div className="event-name">
                    {highlight ? (
                      <>
                        {highlight.before}
                        <mark className="highlight">{highlight.match}</mark>
                        {highlight.after}
                      </>
                    ) : (
                      metadata.label
                    )}
                  </div>
                  <div className="event-description">
                    {metadata.description}
                  </div>
                  {metadata.usage && (
                    <div className="event-usage">사용률: {metadata.usage}</div>
                  )}
                </div>

                <Button
                  className="add-event-button"
                  onPress={() => onAddEvent(eventType)}
                  isDisabled={isRegistered}
                >
                  {isRegistered ? "✓ Added" : "+ Add"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
