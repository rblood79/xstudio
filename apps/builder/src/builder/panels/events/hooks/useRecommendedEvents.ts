/**
 * 컴포넌트별 추천 이벤트 Hook
 */

import { useMemo } from "react";
import {
  getRecommendedEvents,
  EVENT_METADATA
} from "../data/eventCategories";
import type { EventType, EventMetadata } from "../types/eventTypes";

/**
 * 추천 이벤트 아이템 (메타데이터 포함)
 */
export interface RecommendedEvent extends EventMetadata {
  type: EventType;
  recommended: boolean;
}

/**
 * useRecommendedEvents Hook
 *
 * 컴포넌트 타입에 따라 추천 이벤트 목록을 반환합니다.
 * 추천 이벤트는 사용률이 높고 해당 컴포넌트와 호환되는 이벤트입니다.
 *
 * @param componentType - 컴포넌트 타입 (예: "Button", "TextField")
 * @returns 추천 이벤트 목록
 *
 * @example
 * ```tsx
 * const recommended = useRecommendedEvents("Button");
 * // → [
 * //   { type: "onPress", label: "프레스", usage: "90%", recommended: true },
 * //   { type: "onClick", label: "클릭", usage: "95%", recommended: true }
 * // ]
 * ```
 */
export function useRecommendedEvents(
  componentType: string
): RecommendedEvent[] {
  const recommendedEvents = useMemo(() => {
    // 컴포넌트별 추천 이벤트 타입 가져오기
    const recommendedTypes = getRecommendedEvents(componentType);

    // 메타데이터와 결합
    const events = recommendedTypes.map((type) => ({
      type,
      ...EVENT_METADATA[type],
      recommended: true
    }));

    // 사용률 기준 정렬 (높은 순)
    return events.sort((a, b) => {
      const usageA = parseInt(a.usage || "0");
      const usageB = parseInt(b.usage || "0");
      return usageB - usageA;
    });
  }, [componentType]);

  return recommendedEvents;
}

/**
 * useEventMetadata Hook
 *
 * 특정 이벤트 타입의 메타데이터를 반환합니다.
 *
 * @param eventType - 이벤트 타입
 * @returns 이벤트 메타데이터
 *
 * @example
 * ```tsx
 * const metadata = useEventMetadata("onClick");
 * // → { label: "클릭", usage: "95%", category: "mouse", ... }
 * ```
 */
export function useEventMetadata(eventType: EventType): EventMetadata {
  return useMemo(() => EVENT_METADATA[eventType], [eventType]);
}

/**
 * useIsEventRecommended Hook
 *
 * 특정 이벤트가 컴포넌트에 추천되는지 확인합니다.
 *
 * @param eventType - 이벤트 타입
 * @param componentType - 컴포넌트 타입
 * @returns 추천 여부
 *
 * @example
 * ```tsx
 * const isRecommended = useIsEventRecommended("onClick", "Button");
 * // → true
 * ```
 */
export function useIsEventRecommended(
  eventType: EventType,
  componentType: string
): boolean {
  return useMemo(() => {
    const recommendedTypes = getRecommendedEvents(componentType);
    return recommendedTypes.includes(eventType);
  }, [eventType, componentType]);
}
