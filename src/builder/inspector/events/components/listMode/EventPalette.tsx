/**
 * EventPalette - 이벤트 팔레트 메인 컴포넌트
 */

import { useState } from "react";
import { TextField, Button } from "react-aria-components";
import { EVENT_CATEGORIES } from "../../data/eventCategories";
import { useEventSearch } from "../../hooks/useEventSearch";
import { useRecommendedEvents } from "../../hooks/useRecommendedEvents";
import { EventCategoryGroup } from "./EventCategoryGroup";
import type { EventType } from "../../types";

export interface EventPaletteProps {
  componentType: string;
  registeredEvents: string[];
  onAddEvent: (eventType: EventType) => void;
}

/**
 * EventPalette Component
 *
 * 이벤트를 검색하고 추가할 수 있는 팔레트 UI
 *
 * Features:
 * - 검색 기능 (fuse.js 기반 퍼지 검색)
 * - 컴포넌트별 추천 이벤트 표시
 * - 카테고리별 그룹화
 * - 이미 등록된 이벤트 비활성화
 *
 * @example
 * ```tsx
 * <EventPalette
 *   componentType="Button"
 *   registeredEvents={["onClick"]}
 *   onAddEvent={(eventType) => {
 *     console.log("Adding event:", eventType);
 *   }}
 * />
 * ```
 */
export function EventPalette({
  componentType,
  registeredEvents,
  onAddEvent
}: EventPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 검색 결과
  const { searchResults, isSearching } = useEventSearch(
    searchQuery,
    componentType
  );

  // 추천 이벤트
  const recommendedEvents = useRecommendedEvents(componentType);

  // 등록되지 않은 추천 이벤트만 표시
  const availableRecommended = recommendedEvents.filter(
    (event) => !registeredEvents.includes(event.type)
  );

  return (
    <div className="event-palette">
      {/* 검색 필드 */}
      <div className="event-palette-header">
        <h6 className="event-palette-title">Add Event</h6>
        <TextField
          className="event-search-field"
          aria-label="Search events"
          value={searchQuery}
          onChange={setSearchQuery}
        >
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search events..."
            />
            {searchQuery && (
              <Button
                className="clear-search-button"
                onPress={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </Button>
            )}
          </div>
        </TextField>
      </div>

      {/* 검색 결과 표시 */}
      {isSearching && (
        <div className="search-results">
          <div className="search-results-header">
            <span className="results-count">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="empty-results">
              <p className="empty-message">
                No events found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="search-results-list">
              {searchResults.map((result) => {
                const isRegistered = registeredEvents.includes(result.type);

                return (
                  <div key={result.type} className="search-result-item">
                    <div className="result-info">
                      <div className="result-name">{result.label}</div>
                      <div className="result-description">
                        {result.description}
                      </div>
                      <div className="result-meta">
                        <span className="result-category">
                          {result.category}
                        </span>
                        {result.usage && (
                          <span className="result-usage">{result.usage}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      className="add-event-button"
                      onPress={() => onAddEvent(result.type)}
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
      )}

      {/* 검색 중이 아닐 때: 추천 + 카테고리 표시 */}
      {!isSearching && (
        <>
          {/* 추천 이벤트 */}
          {availableRecommended.length > 0 && (
            <div className="recommended-events">
              <div className="recommended-header">
                <span className="recommended-icon">⭐</span>
                <span className="recommended-label">Recommended for {componentType}</span>
              </div>
              <div className="recommended-list">
                {availableRecommended.map((event) => (
                  <Button
                    key={event.type}
                    className="recommended-event-button"
                    onPress={() => onAddEvent(event.type)}
                  >
                    <span className="event-name">{event.label}</span>
                    {event.usage && (
                      <span className="event-usage">{event.usage}</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리별 이벤트 */}
          <div className="event-categories">
            {Object.values(EVENT_CATEGORIES).map((category) => (
              <EventCategoryGroup
                key={category.id}
                category={category}
                searchQuery={searchQuery}
                registeredEvents={registeredEvents}
                componentType={componentType}
                onAddEvent={onAddEvent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
