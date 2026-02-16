/**
 * CSS Cascade Resolver
 *
 * CSS `inherit` 키워드와 상속 가능 속성(inheritable properties)을 처리한다.
 * 부모의 computed style에서 자식으로 값을 전파하며,
 * 명시적 `inherit` 키워드는 부모 값을 그대로 유지한다.
 *
 * @since 2026-02-16 S4 - CSS Cascade (inherit + var())
 */

// ============================================
// 상속 가능 속성 목록
// ============================================

/**
 * CSS 명세에서 기본적으로 상속되는 속성 목록
 *
 * 참고: https://developer.mozilla.org/en-US/docs/Web/CSS/inheritance
 */
export const INHERITABLE_PROPERTIES = new Set([
  'color',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'visibility',
  'wordBreak',
  'overflowWrap',
  'whiteSpace',
]);

// ============================================
// 타입 정의
// ============================================

/**
 * 계산된 스타일 (상속 가능 속성만 포함)
 *
 * 각 요소의 최종 computed value를 표현한다.
 * 부모로부터 상속된 값과 자체 선언 값이 병합된 결과.
 */
export interface ComputedStyle {
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  fontStyle: string;
  lineHeight?: number;
  letterSpacing: number;
  textAlign: string;
  textTransform: string;
  visibility: string;
  wordBreak: string;
  whiteSpace: string;
}

// ============================================
// 루트 기본값
// ============================================

/**
 * 루트 요소의 기본 computed style
 *
 * 최상위 요소(body/root)에서 사용되는 초기값.
 * CSS 명세의 initial value 기반.
 */
export const ROOT_COMPUTED_STYLE: ComputedStyle = {
  color: '#000000',
  fontSize: 16,
  fontFamily: 'Pretendard, sans-serif',
  fontWeight: 400,
  fontStyle: 'normal',
  letterSpacing: 0,
  textAlign: 'left',
  textTransform: 'none',
  visibility: 'visible',
  wordBreak: 'normal',
  whiteSpace: 'normal',
};

// ============================================
// 스타일 해석
// ============================================

/**
 * 요소의 스타일을 부모 computed style 기반으로 해석
 *
 * - style이 없으면 부모 값을 전부 상속
 * - `inherit` 키워드는 부모 값 유지
 * - 명시적 값은 부모 값을 덮어씀
 * - fontSize의 em/rem 단위는 부모 fontSize 기준으로 해석
 *
 * @param style - 요소의 선언된 스타일 (props.style)
 * @param parentComputed - 부모의 computed style
 * @returns 요소의 computed style
 */
export function resolveStyle(
  style: Record<string, unknown> | undefined,
  parentComputed: ComputedStyle,
): ComputedStyle {
  // 스타일 미선언 시 부모 값 전체 상속
  if (!style) return { ...parentComputed };

  // 부모 computed 기반으로 시작 (상속 가능 속성 기본값)
  const computed = { ...parentComputed };

  for (const prop of INHERITABLE_PROPERTIES) {
    const value = style[prop];
    // `inherit` 키워드: 부모 값 유지 (이미 computed에 있음)
    if (value === 'inherit') continue;
    // 명시적 값이 있으면 덮어쓰기
    if (value !== undefined && value !== null && value !== '') {
      (computed as Record<string, unknown>)[prop] = value;
    }
  }

  // fontSize 상대 단위 해석 (em, rem, px)
  if (typeof computed.fontSize === 'string') {
    const fs = String(computed.fontSize);
    if (fs.endsWith('em') && !fs.endsWith('rem')) {
      // em: 부모 fontSize 기준
      computed.fontSize = parseFloat(fs) * parentComputed.fontSize;
    } else if (fs.endsWith('rem')) {
      // rem: 루트 fontSize 기준 (16px 고정)
      computed.fontSize = parseFloat(fs) * 16;
    } else if (fs.endsWith('px')) {
      computed.fontSize = parseFloat(fs);
    } else {
      computed.fontSize = parseFloat(fs) || parentComputed.fontSize;
    }
  }

  return computed;
}
