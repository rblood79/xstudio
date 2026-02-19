/**
 * CSS Cascade Resolver
 *
 * CSS `inherit` 키워드와 상속 가능 속성(inheritable properties)을 처리한다.
 * 부모의 computed style에서 자식으로 값을 전파하며,
 * 명시적 `inherit` 키워드는 부모 값을 그대로 유지한다.
 *
 * Phase 5 (2026-02-19):
 * - currentColor 키워드: color 속성 값을 색상 속성에 전파
 * - initial 키워드: CSS 사양 초기값으로 되돌림
 * - unset 키워드: 상속 가능 → inherit, 비상속 → initial
 * - revert 키워드: 노코드 빌더에서는 initial과 동일하게 처리
 * - font shorthand: parseFontShorthand()로 개별 속성 분리
 *
 * @since 2026-02-16 S4 - CSS Cascade (inherit + var())
 * @updated 2026-02-19 Phase 5 - currentColor + initial/unset/revert
 */

import { parseFontShorthand } from './cssValueParser';

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
  'wordSpacing',
  'textAlign',
  'textTransform',
  'textIndent',
  'visibility',
  'wordBreak',
  'overflowWrap',
  'whiteSpace',
]);

// ============================================
// CSS 속성 초기값 맵 (initial 키워드용)
// ============================================

/**
 * CSS 속성별 초기값 (CSS 명세 기반)
 *
 * `initial` 키워드를 처리할 때 이 맵에서 초기값을 조회한다.
 * `revert` 키워드도 노코드 빌더에서는 initial과 동일하게 처리한다.
 *
 * 참고: https://developer.mozilla.org/en-US/docs/Web/CSS/initial_value
 */
export const CSS_INITIAL_VALUES: Record<string, string | number> = {
  // 상속 속성
  color: '#000000',
  fontSize: 16,
  fontWeight: '400',
  fontStyle: 'normal',
  fontFamily: 'sans-serif',
  textAlign: 'start',
  textDecoration: 'none',
  textTransform: 'none',
  letterSpacing: 0,
  wordSpacing: 0,
  lineHeight: 'normal',
  textIndent: 0,
  visibility: 'visible',
  whiteSpace: 'normal',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  // 비상속 속성
  backgroundColor: 'transparent',
  borderColor: '#000000',
  borderWidth: 0,
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderRadius: 0,
  borderStyle: 'none',
  margin: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  opacity: 1,
  display: 'inline',
  position: 'static',
  overflow: 'visible',
  textDecorationColor: 'currentColor',
  outlineColor: 'invert',
  zIndex: 'auto',
};

// ============================================
// 색상 속성 목록 (currentColor 대체 대상)
// ============================================

/**
 * currentColor 키워드 대체가 필요한 색상 속성 목록
 *
 * 이 속성들의 값이 'currentColor'이면 현재 요소의 `color` 값으로 대체한다.
 */
const COLOR_PROPERTIES = new Set([
  'borderColor',
  'backgroundColor',
  'textDecorationColor',
  'outlineColor',
  'boxShadow',
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
  wordSpacing: number;
  textAlign: string;
  textTransform: string;
  textIndent?: number | string;
  visibility: string;
  wordBreak: string;
  overflowWrap: string;
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
  wordSpacing: 0,
  textAlign: 'left',
  textTransform: 'none',
  visibility: 'visible',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  whiteSpace: 'normal',
};

// ============================================
// currentColor 해석
// ============================================

/**
 * 색상 값에서 currentColor 키워드를 해석하여 실제 색상으로 대체한다.
 *
 * CSS 명세: currentColor는 요소의 `color` 속성 계산값과 동일한 값을 갖는다.
 * box-shadow 등 색상이 포함된 복합 속성은 문자열 내 'currentColor' 토큰을 교체한다.
 *
 * @param value - 원본 속성값
 * @param resolvedColor - 현재 요소의 계산된 color 값
 * @returns currentColor가 대체된 값
 */
export function resolveCurrentColor(
  value: unknown,
  resolvedColor: string,
): unknown {
  if (typeof value !== 'string') return value;
  if (!value.toLowerCase().includes('currentcolor')) return value;

  // 전체 값이 currentColor인 경우 (대소문자 무관)
  if (value.toLowerCase() === 'currentcolor') {
    return resolvedColor;
  }

  // box-shadow 등 복합 속성에서 currentColor 토큰을 교체
  return value.replace(/\bcurrentColor\b/gi, resolvedColor);
}

// ============================================
// cascade 키워드 해석
// ============================================

/**
 * CSS cascade 키워드를 해석하여 실제 적용할 값을 반환한다.
 *
 * - `inherit`: 부모 값 유지 (null 반환 → 호출자가 부모 값 유지)
 * - `initial`: CSS 사양 초기값
 * - `unset`: 상속 속성이면 inherit, 비상속 속성이면 initial
 * - `revert`: 노코드 빌더에서는 initial과 동일하게 처리
 *
 * @param prop - CSS 속성명 (camelCase)
 * @param value - 선언된 값
 * @param parentValue - 부모 computed 값
 * @returns 해석된 값, 또는 'INHERIT' 센티넬(부모 값 그대로 사용 의미)
 */
const INHERIT_SENTINEL = Symbol('inherit');

function resolveCascadeKeyword(
  prop: string,
  value: unknown,
  parentValue: unknown,
): unknown | typeof INHERIT_SENTINEL {
  if (typeof value !== 'string') return value;

  const lower = value.toLowerCase();

  switch (lower) {
    case 'inherit':
      return INHERIT_SENTINEL;

    case 'initial':
    case 'revert': {
      // CSS 초기값 맵에서 조회, 없으면 값 그대로 유지
      const initial = CSS_INITIAL_VALUES[prop];
      return initial !== undefined ? initial : value;
    }

    case 'unset':
      // 상속 속성: inherit처럼 동작
      if (INHERITABLE_PROPERTIES.has(prop)) {
        return INHERIT_SENTINEL;
      }
      // 비상속 속성: initial처럼 동작
      {
        const initial = CSS_INITIAL_VALUES[prop];
        return initial !== undefined ? initial : value;
      }

    default:
      return value;
  }
}

// ============================================
// 스타일 해석
// ============================================

/**
 * 요소의 스타일을 부모 computed style 기반으로 해석
 *
 * - style이 없으면 부모 값을 전부 상속
 * - `inherit` 키워드는 부모 값 유지
 * - `initial` 키워드는 CSS 사양 초기값으로 되돌림
 * - `unset` 키워드는 상속 속성이면 inherit, 비상속이면 initial
 * - `revert` 키워드는 노코드 빌더에서 initial과 동일하게 처리
 * - 명시적 값은 부모 값을 덮어씀
 * - fontSize의 em/rem 단위는 부모 fontSize 기준으로 해석
 * - 색상 속성의 `currentColor`는 현재 요소의 color 값으로 대체
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

  // font shorthand를 개별 속성으로 전개 (개별 속성이 있으면 shorthand보다 우선)
  let effectiveStyle = style;
  if (style['font'] !== undefined) {
    const parsed = parseFontShorthand(style['font']);
    if (parsed) {
      const expanded: Record<string, unknown> = { ...style };
      delete expanded['font'];
      if (parsed.fontStyle !== undefined && expanded['fontStyle'] === undefined) {
        expanded['fontStyle'] = parsed.fontStyle;
      }
      if (parsed.fontWeight !== undefined && expanded['fontWeight'] === undefined) {
        expanded['fontWeight'] = parsed.fontWeight;
      }
      if (parsed.fontSize !== undefined && expanded['fontSize'] === undefined) {
        expanded['fontSize'] = parsed.fontSize;
      }
      if (parsed.lineHeight !== undefined && expanded['lineHeight'] === undefined) {
        expanded['lineHeight'] = parsed.lineHeight;
      }
      if (parsed.fontFamily !== undefined && expanded['fontFamily'] === undefined) {
        expanded['fontFamily'] = parsed.fontFamily;
      }
      effectiveStyle = expanded;
    }
  }

  // 부모 computed 기반으로 시작 (상속 가능 속성 기본값)
  const computed = { ...parentComputed };

  for (const prop of INHERITABLE_PROPERTIES) {
    const rawValue = effectiveStyle[prop];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    const resolved = resolveCascadeKeyword(prop, rawValue, computed[prop as keyof ComputedStyle]);

    // inherit 센티넬: 부모 값을 그대로 유지 (computed에 이미 있음)
    if (resolved === INHERIT_SENTINEL) continue;

    (computed as Record<string, unknown>)[prop] = resolved;
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

// ============================================
// 스타일 전처리 (비상속 속성의 cascade 키워드 + currentColor 해석)
// ============================================

/**
 * 요소의 전체 스타일(비상속 속성 포함)에서 cascade 키워드와 currentColor를 전처리한다.
 *
 * `resolveStyle()`이 상속 속성만 처리하는 것과 달리,
 * 이 함수는 borderColor, backgroundColor 등 비상속 색상 속성의
 * `currentColor`, `initial`, `unset`, `revert` 키워드를 해석하여
 * 렌더러가 바로 사용할 수 있는 구체적인 값으로 변환한다.
 *
 * @param style - 요소의 원본 스타일
 * @param computedColor - 현재 요소의 계산된 color 값 (resolveStyle() 결과)
 * @returns 전처리된 스타일 (원본을 수정하지 않고 새 객체 반환)
 */
export function preprocessStyle(
  style: Record<string, unknown>,
  computedColor: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...style };

  for (const prop of Object.keys(result)) {
    const rawValue = result[prop];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    // cascade 키워드 해석 (부모 없는 flat 처리: 비상속 속성은 initial로 fallback)
    if (typeof rawValue === 'string') {
      const lower = rawValue.toLowerCase();

      if (lower === 'initial' || lower === 'revert') {
        const initial = CSS_INITIAL_VALUES[prop];
        if (initial !== undefined) {
          result[prop] = initial;
          continue;
        }
      } else if (lower === 'unset') {
        if (INHERITABLE_PROPERTIES.has(prop)) {
          // 상속 속성의 unset은 resolveStyle()에서 처리됨, 여기서는 건너뜀
          continue;
        }
        const initial = CSS_INITIAL_VALUES[prop];
        if (initial !== undefined) {
          result[prop] = initial;
          continue;
        }
      }
    }

    // currentColor 키워드 해석
    if (COLOR_PROPERTIES.has(prop)) {
      result[prop] = resolveCurrentColor(rawValue, computedColor);
    }
  }

  return result;
}
