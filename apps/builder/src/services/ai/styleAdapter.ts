/**
 * Style Adapter
 *
 * AI 도구가 출력하는 CSS-like 스타일을 내부 요소 스키마로 변환.
 * AI-A5a: CSS 크기 단위(rem, em, vh, vw 등)를 px 숫자로 정규화.
 * CanvasKit 전환 후: fills/effects/stroke 구조화된 형식으로 변환 예정.
 *
 * 이 레이어가 존재함으로써 AI 전환과 렌더링 전환이 독립적으로 진행 가능.
 */

import { resolveCSSSizeValue } from '../../builder/workspace/canvas/layout/engines/cssValueParser';
import type { CSSValueContext } from '../../builder/workspace/canvas/layout/engines/cssValueParser';

/** CSS 크기 속성 목록 — 이 속성들만 단위 정규화 대상 */
const SIZE_PROPERTIES = new Set([
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left',
  'fontSize', 'lineHeight', 'letterSpacing',
  'borderWidth', 'borderRadius',
  'outlineWidth', 'outlineOffset',
]);

/**
 * CSS 스타일 객체를 내부 스타일 형식으로 변환
 *
 * AI-A5a: rem/em/vh/vw 등의 CSS 단위를 px 숫자로 정규화.
 * % 포함 값은 레이아웃 엔진이 처리하므로 그대로 유지.
 */
export function adaptStyles(
  cssStyles: Record<string, unknown>,
): { style: Record<string, unknown> } {
  const normalized: Record<string, unknown> = {};
  const ctx: CSSValueContext = {};

  for (const [key, value] of Object.entries(cssStyles)) {
    if (SIZE_PROPERTIES.has(key) && typeof value === 'string') {
      // % 포함 값은 레이아웃 엔진이 처리 → 그대로 유지
      if (value.includes('%')) {
        normalized[key] = value;
        continue;
      }
      const px = resolveCSSSizeValue(value, ctx);
      normalized[key] = px !== undefined && px >= 0 ? px : value;
    } else {
      normalized[key] = value;
    }
  }
  return { style: normalized };
}

/**
 * 요소 생성/수정 시 props와 styles를 병합
 */
export function adaptPropsForElement(
  _tag: string,
  props: Record<string, unknown>,
  styles: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(styles).length === 0) {
    return props;
  }

  return {
    ...props,
    ...adaptStyles(styles),
  };
}
