/**
 * World Bounds 계산
 *
 * 스크롤바의 thumb 크기/위치 결정을 위한 전체 월드 범위 계산.
 * Canvas 영역 + 모든 요소 bounds + Visible Viewport의 합집합 + 패딩.
 *
 * @since 2026-01-30
 */

import {
  getRegisteredElementIds,
  getElementBoundsSimple,
  type ElementBounds,
} from '../canvas/elementRegistry';

// ============================================
// Types
// ============================================

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// ============================================
// Internal: Global → World 역변환
// ============================================

/**
 * ElementRegistry의 global bounds를 world(Camera-local) 좌표로 역변환.
 * getBounds()는 Camera Container의 pan/zoom이 적용된 global 좌표를 반환하므로,
 * 스크롤바 계산에 사용할 경우 역변환이 필요합니다.
 */
function toWorldBounds(
  global: ElementBounds,
  cam: { x: number; y: number; scale: number },
): ElementBounds {
  return {
    x: (global.x - cam.x) / cam.scale,
    y: (global.y - cam.y) / cam.scale,
    width: global.width / cam.scale,
    height: global.height / cam.scale,
  };
}

// ============================================
// Main Function
// ============================================

/**
 * 전체 월드 범위 계산.
 *
 * Content(canvas + elements)를 기반으로 scroll 범위를 결정합니다.
 * Viewport는 content 범위를 넘을 때만 world를 확장합니다.
 *
 * @param canvasSize - 캔버스 크기 (world 좌표)
 * @param viewportBounds - 현재 Visible Viewport (world 좌표)
 * @param cameraState - Camera 상태 (역변환용)
 * @param padding - 사방 패딩 (기본값: 200)
 */
export function calculateWorldBounds(
  canvasSize: { width: number; height: number },
  viewportBounds: { x: number; y: number; width: number; height: number },
  cameraState: { x: number; y: number; scale: number },
  padding = 200,
): WorldBounds {
  // 1) Canvas 영역 (0,0 ~ canvasSize) — content의 기본 범위
  let minX = 0;
  let minY = 0;
  let maxX = canvasSize.width;
  let maxY = canvasSize.height;

  // 2) 모든 요소 bounds 합집합 (global → world 역변환)
  const ids = getRegisteredElementIds();
  for (const id of ids) {
    const globalBounds = getElementBoundsSimple(id);
    if (!globalBounds) continue;
    const wb = toWorldBounds(globalBounds, cameraState);
    minX = Math.min(minX, wb.x);
    minY = Math.min(minY, wb.y);
    maxX = Math.max(maxX, wb.x + wb.width);
    maxY = Math.max(maxY, wb.y + wb.height);
  }

  // 3) content 기반 패딩 추가
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // 4) viewport가 content+padding을 넘으면 world 확장
  minX = Math.min(minX, viewportBounds.x);
  minY = Math.min(minY, viewportBounds.y);
  maxX = Math.max(maxX, viewportBounds.x + viewportBounds.width);
  maxY = Math.max(maxY, viewportBounds.y + viewportBounds.height);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
