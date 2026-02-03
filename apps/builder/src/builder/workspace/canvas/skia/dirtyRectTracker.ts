/**
 * Dirty Rect 병합 유틸리티
 *
 * 요소 변경 시 발생하는 dirty rect를 병합하여
 * clipRect 호출 횟수를 최소화한다.
 *
 * @see docs/WASM.md §6.2 Dirty Rect 렌더링
 */

import type { DirtyRect } from './types';

/**
 * 두 rect의 합집합 바운딩 박스를 반환한다.
 */
export function unionRect(a: DirtyRect, b: DirtyRect): DirtyRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * 두 rect가 겹치거나 mergeThreshold 이내로 인접한지 검사한다.
 */
function rectsOverlapWithThreshold(
  a: DirtyRect,
  b: DirtyRect,
  threshold: number,
): boolean {
  return (
    a.x - threshold <= b.x + b.width &&
    a.x + a.width + threshold >= b.x &&
    a.y - threshold <= b.y + b.height &&
    a.y + a.height + threshold >= b.y
  );
}

/**
 * 겹치거나 인접한 dirty rect를 병합하여 최소 세트를 반환한다.
 *
 * 알고리즘: Y→X 정렬 후 sweep-line 병합.
 * mergeThreshold (기본 16px) 이내로 인접한 rect도 병합하여
 * 과도하게 작은 clip rect가 생성되는 것을 방지한다.
 *
 * viewportArea가 제공되면 병합 결과의 총 면적이 뷰포트의 30%를 초과할 때
 * 빈 배열을 반환하여 호출자가 전체 렌더링으로 폴백하도록 유도한다.
 *
 * @param rects - 병합할 dirty rect 배열
 * @param mergeThreshold - 병합 임계값 (px, 기본 16)
 * @param viewportArea - 뷰포트 면적 (px², 선택적). 제공 시 30% 초과 폴백 활성화.
 * @returns 병합된 dirty rect 배열 (전체 렌더 폴백 시 빈 배열)
 */
export function mergeDirtyRects(
  rects: DirtyRect[],
  mergeThreshold = 16,
  viewportArea?: number,
): DirtyRect[] {
  if (rects.length <= 1) {
    // 단일 rect도 뷰포트 비율 체크
    if (viewportArea && rects.length === 1) {
      const r = rects[0];
      if (r.width * r.height > viewportArea * 0.3) return [];
    }
    return rects;
  }

  // Y, X 순으로 정렬
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: DirtyRect[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (rectsOverlapWithThreshold(last, current, mergeThreshold)) {
      merged[merged.length - 1] = unionRect(last, current);
    } else {
      merged.push(current);
    }
  }

  // 병합 결과의 총 면적이 뷰포트의 30% 초과 → 전체 렌더 폴백
  if (viewportArea) {
    let totalArea = 0;
    for (const r of merged) totalArea += r.width * r.height;
    if (totalArea > viewportArea * 0.3) return [];
  }

  return merged;
}

