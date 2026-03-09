import { EventEngine } from "../../utils/events/eventEngine";
import { EventContext, ElementEvent } from "../../types/events/events.types";
import { PreviewElement, EventHandlerMap } from "../types";

/**
 * 이벤트 핸들러 생성 유틸리티
 */

/**
 * React Aria 이벤트 타입 목록
 * 이 이벤트들은 DOM Event 객체가 아닌 값(selectedKeys, isOpen 등)을 인자로 받으므로
 * 별도의 합성 이벤트 어댑터를 통해 EventEngine에 전달
 */
const REACT_ARIA_VALUE_EVENTS = new Set([
  "onSelectionChange",
  "onOpenChange",
  "onAction",
  "onPress",
]);

/**
 * 단일 이벤트 핸들러 생성
 */
export const createEventHandler = (
  element: PreviewElement,
  eventType: string,
  eventEngine: EventEngine,
  projectId?: string,
) => {
  return async (event: Event) => {
    // 요소의 이벤트 찾기
    const elementEvents =
      (element.props.events as unknown as Array<Record<string, unknown>>) || [];

    // 두 가지 타입 시스템 지원:
    // 1. 기존: { event_type: "onClick", actions: [...] }
    // 2. 새로운: { event: "onClick", actions: [...] }
    const matchingEvents = elementEvents.filter((e) => {
      const type = e.event_type || e.event; // 하위 호환성
      const enabled = e.enabled !== false;
      return type === eventType && enabled;
    });

    if (matchingEvents.length === 0) {
      return;
    }

    // 이벤트 컨텍스트 생성
    const context: EventContext = {
      event,
      element: event.target as HTMLElement,
      elementId: element.id,
      pageId: element.page_id || "",
      projectId: projectId || "",
      state: eventEngine.getState(),
    };

    // 각 이벤트 실행
    for (const elementEvent of matchingEvents) {
      try {
        await eventEngine.executeEvent(
          elementEvent as unknown as ElementEvent,
          context,
        );
      } catch (error) {
        console.error("이벤트 실행 오류:", error);
      }
    }
  };
};

/**
 * React Aria 전용 값 기반 이벤트 핸들러 생성
 *
 * React Aria 이벤트(onSelectionChange, onOpenChange, onAction 등)는
 * DOM Event 객체 대신 값(Set<Key>, boolean, Key 등)을 인자로 받습니다.
 * 이 핸들러는 해당 값을 합성 CustomEvent로 래핑하여 EventEngine에 전달합니다.
 */
export const createReactAriaEventHandler = (
  element: PreviewElement,
  eventType: string,
  eventEngine: EventEngine,
  projectId?: string,
) => {
  return async (value: unknown) => {
    const elementEvents =
      (element.props.events as unknown as Array<Record<string, unknown>>) || [];

    const matchingEvents = elementEvents.filter((e) => {
      const type = e.event_type || e.event;
      const enabled = e.enabled !== false;
      return type === eventType && enabled;
    });

    if (matchingEvents.length === 0) {
      return;
    }

    // React Aria 값을 detail로 담은 합성 CustomEvent 생성
    const syntheticEvent = new CustomEvent(eventType, {
      detail: value instanceof Set ? Array.from(value) : value,
      bubbles: false,
      cancelable: false,
    });

    const context: EventContext = {
      event: syntheticEvent as unknown as Event,
      element:
        document.getElementById(element.customId || element.id) ??
        document.body,
      elementId: element.id,
      pageId: element.page_id || "",
      projectId: projectId || "",
      state: eventEngine.getState(),
    };

    for (const elementEvent of matchingEvents) {
      try {
        await eventEngine.executeEvent(
          elementEvent as unknown as ElementEvent,
          context,
        );
      } catch (error) {
        console.error("React Aria 이벤트 실행 오류:", error);
      }
    }
  };
};

/**
 * 요소의 모든 이벤트 핸들러 맵 생성
 */
export const createEventHandlerMap = (
  element: PreviewElement,
  eventEngine: EventEngine,
  projectId?: string,
): EventHandlerMap => {
  const eventHandlers: EventHandlerMap = {};

  if (element.props.events && Array.isArray(element.props.events)) {
    const events = element.props.events as unknown as Array<
      Record<string, unknown>
    >;

    // 두 가지 타입 시스템 지원:
    // 1. 기존: { event_type: "onClick", ... }
    // 2. 새로운: { event: "onClick", ... }
    const enabledEventTypes = events
      .filter((event) => event.enabled !== false)
      .map((event) => event.event_type || event.event); // 하위 호환성

    // 중복 제거 후 각 이벤트 타입별 핸들러 생성
    [...new Set(enabledEventTypes)].forEach((eventType) => {
      if (!eventType || typeof eventType !== "string") return; // undefined와 non-string 제외

      if (REACT_ARIA_VALUE_EVENTS.has(eventType)) {
        // React Aria 값 기반 이벤트: 합성 CustomEvent 어댑터 사용
        eventHandlers[eventType] = createReactAriaEventHandler(
          element,
          eventType,
          eventEngine,
          projectId,
        ) as unknown as (e: Event) => void;
      } else {
        const handler = createEventHandler(
          element,
          eventType,
          eventEngine,
          projectId,
        );

        eventHandlers[eventType] = handler;

        // React Aria 호환: onClick → onPress 자동 매핑
        if (eventType === "onClick") {
          eventHandlers["onPress"] = handler;
        }
      }
    });
  }

  return eventHandlers;
};
