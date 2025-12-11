/**
 * Component Registry
 *
 * 🚀 Phase 10 B2.3: Publish App 컴포넌트 레지스트리
 *
 * Element tag를 실제 React 컴포넌트로 매핑합니다.
 *
 * @since 2025-12-11 Phase 10 B2.3
 */

import type { ComponentType } from 'react';

// ============================================
// Component Registry Types
// ============================================

export interface ComponentRegistryEntry {
  component: ComponentType<Record<string, unknown>>;
  displayName: string;
  category: 'layout' | 'input' | 'display' | 'navigation' | 'collection';
}

export type ComponentRegistry = Map<string, ComponentRegistryEntry>;

// ============================================
// Registry Instance
// ============================================

const registry: ComponentRegistry = new Map();

// ============================================
// Registry API
// ============================================

/**
 * 컴포넌트 등록
 */
export function registerComponent(
  tag: string,
  entry: ComponentRegistryEntry
): void {
  registry.set(tag, entry);
}

/**
 * 컴포넌트 가져오기
 */
export function getComponent(tag: string): ComponentRegistryEntry | undefined {
  return registry.get(tag);
}

/**
 * 컴포넌트 존재 확인
 */
export function hasComponent(tag: string): boolean {
  return registry.has(tag);
}

/**
 * 모든 컴포넌트 가져오기
 */
export function getAllComponents(): ComponentRegistry {
  return registry;
}

/**
 * 카테고리별 컴포넌트 가져오기
 */
export function getComponentsByCategory(
  category: ComponentRegistryEntry['category']
): Map<string, ComponentRegistryEntry> {
  const filtered = new Map<string, ComponentRegistryEntry>();

  registry.forEach((entry, tag) => {
    if (entry.category === category) {
      filtered.set(tag, entry);
    }
  });

  return filtered;
}

// ============================================
// Default Components Registration
// ============================================

/**
 * 기본 HTML 요소들 등록
 */
export function registerDefaultComponents(): void {
  // Layout Components
  const layoutTags = ['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav'];
  layoutTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag),
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'layout',
    });
  });

  // Display Components
  const displayTags = ['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'a'];
  displayTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag),
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'display',
    });
  });

  // Input Components
  const inputTags = ['input', 'textarea', 'button', 'select', 'form'];
  inputTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag),
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'input',
    });
  });
}

/**
 * HTML 요소 컴포넌트 팩토리
 */
function createHtmlElement(tag: string): ComponentType<Record<string, unknown>> {
  const HtmlElement = (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Tag = tag as any;
    return <Tag {...rest}>{children}</Tag>;
  };
  HtmlElement.displayName = `Html${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
  return HtmlElement;
}

// Auto-register default components
registerDefaultComponents();

export default registry;
