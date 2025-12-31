/**
 * Element Renderer
 *
 * 🚀 Phase 10 B2.3: 단일 Element 렌더링 컴포넌트
 *
 * @since 2025-12-11 Phase 10 B2.3
 */

import { memo, useMemo } from 'react';
import type { Element } from '@xstudio/shared';
import { getComponent } from '../registry/ComponentRegistry';

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
  const { style, children: propsChildren, ...restProps } = element.props as Record<
    string,
    unknown
  >;

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
      data-element-id={element.id}
      style={style as React.CSSProperties}
    >
      {renderedChildren}
    </Component>
  );
});

export default ElementRenderer;
