/**
 * RadiusScale → Skia radius 토큰 동기화
 *
 * RadiusScale 프리셋 변경 시 radius 토큰 객체를 직접 mutation하여
 * Skia 렌더링에 즉시 반영.
 *
 * @see ADR-021 Phase B
 */

import { radius } from "@xstudio/specs";
import type { RadiusScale } from "../../stores/themeConfigStore";

// ============================================================================
// 기본값 (md 스케일 = 1x)
// ============================================================================

const BASE_RADIUS: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};

/** 스케일별 배율 */
const SCALE_FACTORS: Record<RadiusScale, number> = {
  none: 0,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
};

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * RadiusScale에 따라 radius 토큰 객체를 갱신.
 *
 * **Mutation 방식**: tintToSkiaColors/neutralToSkiaColors와 동일 패턴.
 * Object.freeze() 미적용 → 직접 mutation하여 즉시 반영.
 */
export function radiusScaleToSkia(scale: RadiusScale): void {
  const factor = SCALE_FACTORS[scale];

  for (const [key, base] of Object.entries(BASE_RADIUS)) {
    // none(0)과 full(9999)은 스케일링하지 않음
    if (key === "none" || key === "full") continue;
    (radius as unknown as Record<string, number>)[key] = Math.round(
      base * factor,
    );
  }
}
