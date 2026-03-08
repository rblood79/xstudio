/**
 * Element Renderer
 *
 * 🚀 Phase 10 B2.3: 단일 Element 렌더링 컴포넌트
 * 🚀 Phase 3: 이벤트 핸들링 추가
 *
 * @since 2025-12-11 Phase 10 B2.3
 * @since 2026-01-02 Phase 3 Event Handling
 */

import { memo, useMemo } from "react";
import type { Element } from "@xstudio/shared";
import { getComponent } from "../registry/ComponentRegistry";
import { ActionExecutor } from "@xstudio/shared";
import type { EventRuntimeContext } from "@xstudio/shared";

// 이벤트 타입 정의
interface ElementEvent {
  trigger: string;
  actions: Array<{
    type: string;
    payload?: Record<string, unknown>;
  }>;
}

// 기본 런타임 컨텍스트 생성
function createDefaultContext(): EventRuntimeContext {
  return {
    navigateToPage: (pageId: string) => {
      window.location.hash = `page-${pageId}`;
    },
    state: new Map<string, unknown>(),
    currentPageId: window.location.hash.replace("#page-", "") || null,
  };
}

// ActionExecutor 싱글톤 인스턴스
const actionExecutor = new ActionExecutor(createDefaultContext());

// ============================================
// Types
// ============================================

export interface ElementRendererProps {
  element: Element;
  elements: Element[];
  depth?: number;
}

// ============================================
// Element Renderer Component
// ============================================

export const ElementRenderer = memo(function ElementRenderer({
  element,
  elements,
  depth = 0,
}: ElementRendererProps) {
  // 자식 요소들 찾기
  const children = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id && !el.deleted)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, element.id]);

  // 이벤트 핸들러 생성
  const eventHandlers = useMemo(() => {
    const events = (element as Element & { events?: ElementEvent[] }).events;
    if (!events || events.length === 0) return {};

    const handlers: Record<string, (e: React.SyntheticEvent) => void> = {};

    for (const event of events) {
      const handlerName = event.trigger; // 'onClick', 'onMouseEnter', etc.
      handlers[handlerName] = async (e: React.SyntheticEvent) => {
        e.stopPropagation();
        console.log(`[Event] ${element.id} - ${handlerName} triggered`);

        // 모든 액션 순차 실행
        for (const action of event.actions) {
          try {
            await actionExecutor.execute({
              type: action.type,
              config: action.payload || {},
            } as import("@xstudio/shared").Action);
          } catch (error) {
            console.error(`[Event] Action ${action.type} failed:`, error);
          }
        }
      };
    }

    return handlers;
  }, [element]);

  // 컴포넌트 가져오기
  const componentEntry = getComponent(element.tag);

  // 등록되지 않은 컴포넌트는 div로 fallback
  if (!componentEntry) {
    console.warn(`[ElementRenderer] Unknown component: ${element.tag}`);
    return (
      <div
        data-element-id={element.id}
        data-element-tag={element.tag}
        style={element.props?.style as React.CSSProperties}
        {...eventHandlers}
      >
        {children.map((child) => (
          <ElementRenderer
            key={child.id}
            element={child}
            elements={elements}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const Component = componentEntry.component;

  // Props 추출 (style 제외한 나머지)
  const {
    style,
    children: propsChildren,
    accentColor,
    ...restProps
  } = element.props as Record<string, unknown>;

  // 자식이 있으면 재귀 렌더링, 없으면 props.children 사용
  const renderedChildren =
    children.length > 0
      ? children.map((child) => (
          <ElementRenderer
            key={child.id}
            element={child}
            elements={elements}
            depth={depth + 1}
          />
        ))
      : propsChildren;

  return (
    <Component
      {...restProps}
      {...eventHandlers}
      data-element-id={element.id}
      data-accent={accentColor ? String(accentColor) : undefined}
      style={style as React.CSSProperties}
    >
      {renderedChildren}
    </Component>
  );
});

export default ElementRenderer;
