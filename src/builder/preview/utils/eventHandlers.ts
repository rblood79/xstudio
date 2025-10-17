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
    const elementEvents = (element.props.events as ElementEvent[]) || [];
    const matchingEvents = elementEvents.filter(
      (e) => e.event_type === eventType && e.enabled !== false
    );

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
    const events = element.props.events as ElementEvent[];
    const enabledEventTypes = events
      .filter((event) => event.enabled !== false)
      .map((event) => event.event_type);

    // 중복 제거 후 각 이벤트 타입별 핸들러 생성
    [...new Set(enabledEventTypes)].forEach((eventType) => {
      eventHandlers[eventType] = createEventHandler(
        element,
        eventType,
        eventEngine,
        projectId
      );
    });
  }

  return eventHandlers;
};
