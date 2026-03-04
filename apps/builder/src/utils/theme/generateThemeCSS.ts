/**
 * ThemeConfig → CSS 변수 문자열 생성
 *
 * Publish/Export 시 ThemeConfig 설정을 CSS 변수로 변환하여
 * HTML <style> 태그에 삽입할 수 있는 문자열을 생성한다.
 *
 * @see ADR-021 Phase C
 */

import type { TintPreset } from "./tintToSkiaColors";
import type { NeutralPreset } from "./neutralToSkiaColors";
import type { RadiusScale } from "../../stores/themeConfigStore";

// ============================================================================
// Radius 매핑
// ============================================================================

const RADIUS_MAP: Record<RadiusScale, string> = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
};

// ============================================================================
// Neutral steps (preview-system.css 기준 11단계)
// ============================================================================

const NEUTRAL_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// ============================================================================
// Generator
// ============================================================================

/**
 * ThemeConfig를 CSS 변수 선언 문자열로 변환.
 *
 * 기본값(`blue`, `neutral`, `md`)과 동일한 경우에도
 * 명시적으로 CSS 변수를 출력하여 일관성을 보장한다.
 */
export function generateThemeCSS(config: {
  tint: TintPreset;
  neutral: NeutralPreset;
  radiusScale: RadiusScale;
}): string {
  const lines: string[] = [];

  // --tint: var(--{preset})
  lines.push(`  --tint: var(--${config.tint});`);

  // --color-neutral-{step}: var(--color-{neutral}-{step})
  for (const step of NEUTRAL_STEPS) {
    lines.push(
      `  --color-neutral-${step}: var(--color-${config.neutral}-${step});`,
    );
  }

  // --radius-base
  lines.push(`  --radius-base: ${RADIUS_MAP[config.radiusScale]};`);

  return `:root {\n${lines.join("\n")}\n}`;
}
