import type { BoundingBox } from './types';

/**
 * 시작점과 현재점으로부터 정규화된 바운딩 박스 계산
 * (음수 width/height 처리)
 */
export function getLassoBounds(
  start: { x: number; y: number },
  current: { x: number; y: number }
): BoundingBox {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);
  return { x, y, width, height };
}

