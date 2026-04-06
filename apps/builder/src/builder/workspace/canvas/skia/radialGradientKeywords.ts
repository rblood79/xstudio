/**
 * Radial Gradient 키워드 변환 (ADR-100 Phase 3 — G6)
 *
 * CSS radial-gradient 크기 키워드를 수치(rx, ry)로 변환.
 * @see https://www.w3.org/TR/css-images-3/#radial-gradients
 */

/**
 * CSS radial-gradient 크기 키워드를 반지름으로 변환.
 *
 * @param keyword - closest-side | farthest-side | closest-corner | farthest-corner
 * @param cx - 중심 x (요소 좌측 기준)
 * @param cy - 중심 y (요소 상단 기준)
 * @param w - 요소 너비
 * @param h - 요소 높이
 */
export function resolveRadialSize(
  keyword: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
): { rx: number; ry: number } {
  switch (keyword) {
    case "closest-side":
      return {
        rx: Math.min(cx, w - cx),
        ry: Math.min(cy, h - cy),
      };

    case "farthest-side":
      return {
        rx: Math.max(cx, w - cx),
        ry: Math.max(cy, h - cy),
      };

    case "closest-corner": {
      const dx = Math.min(cx, w - cx);
      const dy = Math.min(cy, h - cy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return { rx: dist, ry: dist };
    }

    case "farthest-corner":
    default: {
      // CSS 기본값
      const dx = Math.max(cx, w - cx);
      const dy = Math.max(cy, h - cy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return { rx: dist, ry: dist };
    }
  }
}
