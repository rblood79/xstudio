/**
 * Element Registry
 *
 * 🚀 Phase 1: @pixi/layout 마이그레이션 준비
 *
 * PixiJS Container 참조를 저장하여 getBounds() 호출을 가능하게 합니다.
 * layoutResult.positions 대신 실제 DisplayObject의 bounds를 사용할 수 있습니다.
 *
 * @since 2025-01-06 Phase 1 ElementRegistry
 */

import { Container, Rectangle } from 'pixi.js';

// ============================================
// Types
// ============================================

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Registry (Module-level singleton)
// ============================================

/**
 * Element ID → PixiJS Container 매핑
 * React 리렌더링을 트리거하지 않는 단순 Map 사용
 */
const elementRegistry = new Map<string, Container>();

// ============================================
// Registry API
// ============================================

/**
 * Container를 registry에 등록
 *
 * @param id - Element ID
 * @param container - PixiJS Container 인스턴스
 */
export function registerElement(id: string, container: Container): void {
  elementRegistry.set(id, container);
}

/**
 * Container를 registry에서 해제
 *
 * @param id - Element ID
 */
export function unregisterElement(id: string): void {
  elementRegistry.delete(id);
}

/**
 * Element ID로 Container 조회
 *
 * @param id - Element ID
 * @returns Container 또는 undefined
 */
export function getElementContainer(id: string): Container | undefined {
  return elementRegistry.get(id);
}

/**
 * Element ID로 bounds 조회 (getBounds() 호출)
 *
 * @param id - Element ID
 * @returns Rectangle 또는 null
 */
export function getElementBounds(id: string): Rectangle | null {
  const container = elementRegistry.get(id);
  if (!container) return null;

  try {
    return container.getBounds();
  } catch {
    // Container가 아직 렌더링되지 않았거나 destroyed된 경우
    return null;
  }
}

/**
 * Element ID로 bounds 조회 (간단한 객체 형태)
 *
 * @param id - Element ID
 * @returns ElementBounds 또는 null
 */
export function getElementBoundsSimple(id: string): ElementBounds | null {
  const bounds = getElementBounds(id);
  if (!bounds) return null;

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

/**
 * Registry에 등록된 모든 element ID 조회
 *
 * @returns Element ID 배열
 */
export function getRegisteredElementIds(): string[] {
  return Array.from(elementRegistry.keys());
}

/**
 * Registry 크기 조회
 *
 * @returns 등록된 element 수
 */
export function getRegistrySize(): number {
  return elementRegistry.size;
}

/**
 * Registry 초기화 (테스트 또는 페이지 전환 시 사용)
 */
export function clearRegistry(): void {
  elementRegistry.clear();
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Registry 상태 로깅 (개발 환경)
 */
export function logRegistryStats(): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.log(
    `📦 [ElementRegistry] registered: ${elementRegistry.size} elements`,
    Array.from(elementRegistry.keys()).slice(0, 5)
  );
}

export default {
  registerElement,
  unregisterElement,
  getElementContainer,
  getElementBounds,
  getElementBoundsSimple,
  getRegisteredElementIds,
  getRegistrySize,
  clearRegistry,
  logRegistryStats,
};
