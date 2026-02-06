/**
 * Style Adapter
 *
 * AI 도구가 출력하는 CSS-like 스타일을 내부 요소 스키마로 변환.
 * Phase 현재: CSS 스타일을 그대로 props.style에 전달 (패스스루).
 * CanvasKit 전환 후: fills/effects/stroke 구조화된 형식으로 변환 예정.
 *
 * 이 레이어가 존재함으로써 AI 전환과 렌더링 전환이 독립적으로 진행 가능.
 */

/**
 * CSS 스타일 객체를 내부 스타일 형식으로 변환
 */
export function adaptStyles(
  cssStyles: Record<string, unknown>,
): { style: Record<string, unknown> } {
  return { style: cssStyles };
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
