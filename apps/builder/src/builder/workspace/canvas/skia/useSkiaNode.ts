/**
 * Skia 렌더 데이터 레지스트리 + React hook
 *
 * @pixi/react의 커스텀 reconciler에서 callback ref가 호출되지 않는 문제를 우회하여
 * 전역 레지스트리(Map) 방식으로 Skia 렌더 데이터를 관리한다.
 *
 * 각 Sprite 컴포넌트에서 useSkiaNode()를 호출하면:
 * 1. element.id 키로 SkiaNodeData를 레지스트리에 등록
 * 2. 언마운트 시 자동 해제
 *
 * SkiaOverlay 렌더 루프에서 buildSkiaTree()를 호출하면:
 * 1. Store의 elements 배열로 트리 구조 구성
 * 2. 레지스트리에서 렌더 데이터 조회
 * 3. PixiJS stage의 Camera 변환을 적용
 *
 * @see docs/WASM.md §5.11 renderSkia() React 컴포넌트 통합
 */

import { useEffect } from 'react';
import type { SkiaNodeData } from './nodeRenderers';
import type { DirtyRect } from './types';


// ============================================
// 전역 레지스트리
// ============================================

/** element.id → SkiaNodeData 매핑 */
const skiaNodeRegistry = new Map<string, SkiaNodeData>();

/** 레지스트리 변경 버전 (단조 증가) */
let registryVersion = 0;

/** 프레임 간 축적되는 dirty rects */
let pendingDirtyRects: DirtyRect[] = [];

/**
 * 노드의 바운드를 DirtyRect로 변환한다.
 * 이펙트(블러, 그림자)가 있으면 확장 영역을 포함시킨다.
 * 블러 시그마 × 3이 가우시안 커널의 실질적 영향 범위이다.
 *
 * 기본 여유분 2px: 안티앨리어싱, 부동소수점 좌표 오차, 서브픽셀 렌더링으로 인한
 * 경계 잔상을 방지한다. Dirty rect가 너무 작으면 이전 프레임의 픽셀이
 * 완전히 클리어되지 않아 잔상이 남을 수 있다.
 */
function nodeToDirtyRect(data: SkiaNodeData): DirtyRect {
  // 기본 2px 여유분 (안티앨리어싱, 부동소수점 오차 대비)
  let expand = 2;

  if (data.effects) {
    for (const effect of data.effects) {
      switch (effect.type) {
        case 'background-blur':
        case 'layer-blur':
          expand = Math.max(expand, effect.sigma * 3);
          break;
        case 'drop-shadow': {
          const shadowExpand =
            Math.max(Math.abs(effect.dx), Math.abs(effect.dy)) +
            Math.max(effect.sigmaX, effect.sigmaY) * 3;
          expand = Math.max(expand, shadowExpand);
          break;
        }
      }
    }
  }

  return {
    x: data.x - expand,
    y: data.y - expand,
    width: data.width + expand * 2,
    height: data.height + expand * 2,
  };
}

/** 레지스트리에 Skia 렌더 데이터 등록 */
export function registerSkiaNode(elementId: string, data: SkiaNodeData): void {
  // 이전 데이터의 바운드 → dirty rect (지워야 할 영역)
  const oldData = skiaNodeRegistry.get(elementId);
  if (oldData) {
    pendingDirtyRects.push(nodeToDirtyRect(oldData));
  }

  // 새 데이터의 바운드 → dirty rect (그려야 할 영역)
  pendingDirtyRects.push(nodeToDirtyRect(data));

  skiaNodeRegistry.set(elementId, data);
  registryVersion++;
}

/** 레지스트리에서 Skia 렌더 데이터 해제 */
export function unregisterSkiaNode(elementId: string): void {
  const oldData = skiaNodeRegistry.get(elementId);
  if (oldData) {
    pendingDirtyRects.push(nodeToDirtyRect(oldData));
  }

  skiaNodeRegistry.delete(elementId);
  registryVersion++;
}

/** 레지스트리에서 Skia 렌더 데이터 조회 */
export function getSkiaNode(elementId: string): SkiaNodeData | undefined {
  return skiaNodeRegistry.get(elementId);
}

/** 레지스트리 크기 (디버그용) */
export function getSkiaRegistrySize(): number {
  return skiaNodeRegistry.size;
}

/**
 * 페이지 전환 시 레지스트리를 일괄 초기화한다.
 * 개별 Sprite의 useEffect cleanup보다 먼저 호출하여
 * 전환 프레임에서 stale 노드가 렌더링되는 것을 방지한다.
 */
export function clearSkiaRegistry(): void {
  skiaNodeRegistry.clear();
  pendingDirtyRects = [];
  registryVersion++;
}

/** 현재 레지스트리 변경 버전 (O(1)) */
export function getRegistryVersion(): number {
  return registryVersion;
}

/**
 * 외부 레이아웃 변경(Yoga 재계산 등)을 Skia 렌더 루프에 알린다.
 * registryVersion을 증가시켜 다음 프레임에서 재렌더링하도록 한다.
 *
 * elementRegistry.updateElementBounds() → LayoutContainer Yoga 재계산 후 호출
 */
export function notifyLayoutChange(): void {
  registryVersion++;
}

/**
 * 축적된 dirty rects를 반환하고 초기화한다.
 * 렌더 루프에서 프레임당 1회 호출한다.
 */
export function flushDirtyRects(): DirtyRect[] {
  const rects = pendingDirtyRects;
  pendingDirtyRects = [];
  return rects;
}

// ============================================
// React Hook
// ============================================

/**
 * element의 Skia 렌더 데이터를 전역 레지스트리에 등록하는 hook.
 *
 * 사용법:
 * ```tsx
 * useSkiaNode(element.id, {
 *   type: 'box',
 *   x: 0, y: 0,
 *   width: 100, height: 100,
 *   visible: true,
 *   box: { fillColor: Float32Array.of(1,0,0,1), borderRadius: 0 },
 * });
 * ```
 */
export function useSkiaNode(
  elementId: string,
  data: SkiaNodeData | null,
): void {
  useEffect(() => {
    if (!data) return;

    registerSkiaNode(elementId, data);

    return () => {
      unregisterSkiaNode(elementId);
    };
  }, [elementId, data]);
}

