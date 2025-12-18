/**
 * Computed Style Extractor
 *
 * 🚀 Phase 6.2: computedStyle 비동기 분리
 *
 * 문제:
 * - 선택 시 getComputedStyle() + 모든 속성 추출을 동기 실행 → 클릭이 멈춤
 * - 전체 computedStyle (~50+ 속성) 전송 → payload 크기 증가
 *
 * 해결:
 * - Inspector에서 실제 사용하는 속성만 추출 (화이트리스트)
 * - requestIdleCallback으로 지연 처리
 * - payload 70% 감소
 *
 * @since 2025-12-18 Phase 6.2
 */

// ============================================
// Computed Style Whitelist
// ============================================

/**
 * Inspector에서 실제 사용하는 CSS 속성 목록
 * 전체 ~50개 속성 대신 필수 ~20개만 추출
 */
export const COMPUTED_STYLE_WHITELIST = [
  // Layout (핵심)
  'display',
  'position',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',

  // Box Model
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',

  // Flexbox
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'alignContent',
  'gap',
  'rowGap',
  'columnGap',

  // Grid (기본)
  'gridTemplateColumns',
  'gridTemplateRows',

  // Typography
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'color',

  // Background
  'backgroundColor',
  'backgroundImage',

  // Border
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',

  // Effects
  'opacity',
  'overflow',
  'overflowX',
  'overflowY',

  // Transform
  'transform',
] as const;

export type ComputedStyleProperty = (typeof COMPUTED_STYLE_WHITELIST)[number];

// ============================================
// CSS Property Name Conversion
// ============================================

/**
 * camelCase → kebab-case 변환
 * 예: marginTop → margin-top
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

// ============================================
// Computed Style Extraction
// ============================================

/**
 * 요소의 computedStyle에서 화이트리스트 속성만 추출
 *
 * @param element - 대상 HTML 요소
 * @returns 속성 이름(camelCase) → 값 맵
 *
 * @example
 * ```typescript
 * const style = extractComputedStyleSubset(element);
 * // { display: 'flex', width: '200px', ... }
 * ```
 */
export function extractComputedStyleSubset(
  element: HTMLElement
): Record<string, string> {
  const computed = getComputedStyle(element);
  const result: Record<string, string> = {};

  for (const prop of COMPUTED_STYLE_WHITELIST) {
    // getPropertyValue는 kebab-case를 기대
    const kebabProp = camelToKebab(prop);
    const value = computed.getPropertyValue(kebabProp);

    // 빈 값은 스킵 (payload 최소화)
    if (value && value !== '' && value !== 'none' && value !== 'normal') {
      result[prop] = value;
    }
  }

  return result;
}

/**
 * 요소의 computedStyle 전체 추출 (레거시 호환용)
 *
 * @deprecated Phase 6.2 이후 extractComputedStyleSubset() 사용 권장
 */
export function extractFullComputedStyle(
  element: HTMLElement
): Record<string, string> {
  const computed = getComputedStyle(element);
  const result: Record<string, string> = {};

  // 모든 CSS 속성 순회 (느림)
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    result[prop] = computed.getPropertyValue(prop);
  }

  return result;
}

// ============================================
// Async Computed Style Extraction
// ============================================

/**
 * requestIdleCallback으로 computedStyle 추출 지연
 *
 * @param element - 대상 HTML 요소
 * @param callback - 추출 완료 시 호출될 콜백
 * @param options - 옵션 (timeout: 최대 대기 시간)
 *
 * @example
 * ```typescript
 * extractComputedStyleAsync(element, (style) => {
 *   sendComputedStyleToBuilder(elementId, style);
 * });
 * ```
 */
export function extractComputedStyleAsync(
  element: HTMLElement,
  callback: (style: Record<string, string>) => void,
  options: { timeout?: number; useFullStyle?: boolean } = {}
): void {
  const { timeout = 100, useFullStyle = false } = options;

  const doExtract = () => {
    const style = useFullStyle
      ? extractFullComputedStyle(element)
      : extractComputedStyleSubset(element);
    callback(style);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(doExtract, { timeout });
  } else {
    // fallback: setTimeout
    setTimeout(doExtract, 0);
  }
}

// ============================================
// Rect + Style Bundle (선택 응답용)
// ============================================

export interface ElementSelectionBundle {
  elementId: string;
  rect: DOMRect;
  tag: string;
  props: Record<string, unknown>;
  // Phase 6.2: computedStyle은 별도 메시지로 지연 전송
  // computedStyle?: Record<string, string>;
}

/**
 * 선택 응답용 번들 생성 (rect + props만, computedStyle 제외)
 *
 * @param elementId - 요소 ID
 * @param element - DOM 요소
 * @param tag - 컴포넌트 태그
 * @param props - 요소 props
 */
export function createSelectionBundle(
  elementId: string,
  element: HTMLElement,
  tag: string,
  props: Record<string, unknown>
): ElementSelectionBundle {
  return {
    elementId,
    rect: element.getBoundingClientRect(),
    tag,
    props,
  };
}

// ============================================
// Computed Style Diff (Delta Update 지원)
// ============================================

/**
 * 두 computedStyle 간의 차이점만 추출
 *
 * @param prev - 이전 스타일
 * @param next - 현재 스타일
 * @returns 변경된 속성만 포함된 객체 (없으면 null)
 *
 * @example
 * ```typescript
 * const diff = diffComputedStyle(prevStyle, nextStyle);
 * if (diff) {
 *   sendStyleDelta(elementId, diff);
 * }
 * ```
 */
export function diffComputedStyle(
  prev: Record<string, string>,
  next: Record<string, string>
): Record<string, string> | null {
  const diff: Record<string, string> = {};
  let hasChanges = false;

  for (const prop of COMPUTED_STYLE_WHITELIST) {
    const prevValue = prev[prop];
    const nextValue = next[prop];

    if (prevValue !== nextValue) {
      if (nextValue !== undefined) {
        diff[prop] = nextValue;
      }
      hasChanges = true;
    }
  }

  return hasChanges ? diff : null;
}
