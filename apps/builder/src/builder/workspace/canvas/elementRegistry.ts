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

import { Container, Bounds } from 'pixi.js';

import { notifyLayoutChange } from './skia/useSkiaNode';

// Phase 1: SpatialIndex 동기화 (lazy import, 호출 빈도가 높으므로 캐싱)
let _spatialModule: typeof import('./wasm-bindings/spatialIndex') | null = null;
async function getSpatialModule() {
  if (!_spatialModule) {
    _spatialModule = await import('./wasm-bindings/spatialIndex');
  }
  return _spatialModule;
}
// SpatialIndex 모듈 프리로드
getSpatialModule();

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

/**
 * Element ID → 직접 계산된 layout bounds 매핑
 * getBounds()가 layout 적용 전 0,0을 반환하는 문제 해결용.
 * LayoutContainer에서 layout prop 변경 시 직접 저장.
 */
const layoutBoundsRegistry = new Map<string, ElementBounds>();

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
 * 요소의 layout bounds를 직접 저장
 * LayoutContainer에서 layout prop이 변경될 때 호출.
 * getBounds()의 타이밍 문제를 우회.
 */
export function updateElementBounds(id: string, bounds: ElementBounds): void {
  const prev = layoutBoundsRegistry.get(id);
  if (prev) {
    const eps = 0.01;
    const unchanged =
      Math.abs(prev.x - bounds.x) < eps &&
      Math.abs(prev.y - bounds.y) < eps &&
      Math.abs(prev.width - bounds.width) < eps &&
      Math.abs(prev.height - bounds.height) < eps;
    if (unchanged) return;
  }

  layoutBoundsRegistry.set(id, bounds);

  // Phase 6: Yoga 레이아웃 재계산 후 Skia 렌더 루프에 알림
  // LayoutContainer의 RAF 콜백에서 호출되므로, registryVersion 증가로
  // 다음 프레임에서 container.width가 반영된 Skia 트리가 재구축된다.
  notifyLayoutChange();

  // Phase 1: SpatialIndex 동기화 (스크린 좌표 저장)
  // getBounds()는 스크린 좌표(pan/zoom 포함)를 반환한다.
  // pan 시 stale될 수 있으므로, useViewportCulling에서 getBounds() 폴백으로 보완한다.
  if (_spatialModule) {
    _spatialModule.updateElement(id, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}

/**
 * Container를 registry에서 해제
 *
 * @param id - Element ID
 */
export function unregisterElement(id: string): void {
  elementRegistry.delete(id);
  layoutBoundsRegistry.delete(id);

  // Phase 1: SpatialIndex 동기화
  if (_spatialModule) {
    _spatialModule.removeElement(id);
  }
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
export function getElementBounds(id: string): Bounds | null {
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
  // 직접 저장된 layout bounds 우선 사용 (getBounds() 타이밍 문제 우회)
  const layoutBounds = layoutBoundsRegistry.get(id);
  if (layoutBounds) return layoutBounds;

  // fallback: PixiJS Container의 getBounds()
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
  layoutBoundsRegistry.clear();

  // Phase 1: SpatialIndex 초기화
  if (_spatialModule) {
    _spatialModule.clearAll();
  }
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
