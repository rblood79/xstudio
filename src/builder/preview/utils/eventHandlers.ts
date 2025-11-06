import { EventEngine } from "../../../utils/eventEngine";
import { ElementEvent, EventContext } from "../../../types/events";
import { PreviewElement, EventHandlerMap } from "../types";

/**
 * 이벤트 핸들러 생성 유틸리티
 */

/**
 * 단일 이벤트 핸들러 생성
 */
export const createEventHandler = (
  element: PreviewElement,
  eventType: string,
  eventEngine: EventEngine,
  projectId?: string
) => {
  return async (event: Event) => {
    // 요소의 이벤트 찾기
    const elementEvents = (element.props.events as any[]) || [];

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
        await eventEngine.executeEvent(elementEvent, context);
      } catch (error) {
        console.error("이벤트 실행 오류:", error);
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
  projectId?: string
): EventHandlerMap => {
  const eventHandlers: EventHandlerMap = {};

  if (element.props.events && Array.isArray(element.props.events)) {
    const events = element.props.events as any[];

    // 두 가지 타입 시스템 지원:
    // 1. 기존: { event_type: "onClick", ... }
    // 2. 새로운: { event: "onClick", ... }
    const enabledEventTypes = events
      .filter((event) => event.enabled !== false)
      .map((event) => event.event_type || event.event); // 하위 호환성

    // 중복 제거 후 각 이벤트 타입별 핸들러 생성
    [...new Set(enabledEventTypes)].forEach((eventType) => {
      if (!eventType) return; // undefined 제외

      const handler = createEventHandler(
        element,
        eventType,
        eventEngine,
        projectId
      );

      eventHandlers[eventType] = handler;

      // React Aria 호환: onClick → onPress 자동 매핑
      if (eventType === 'onClick') {
        eventHandlers['onPress'] = handler;
      }
    });
  }

  return eventHandlers;
};
