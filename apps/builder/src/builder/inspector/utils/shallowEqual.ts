/**
 * 🚀 Phase 16: Fast Shallow Equality Check
 *
 * JSON.stringify 대비 10-50x 빠른 얕은 비교
 * Intel Mac 최적화를 위해 추가됨
 *
 * 비교 순서 (빠른 것부터):
 * 1. 참조 동일성 (===)
 * 2. null/undefined 체크
 * 3. 키 개수 비교
 * 4. 얕은 값 비교 (1단계 깊이만)
 * 5. 중첩 객체는 JSON.stringify 폴백
 */

type AnyObject = Record<string, unknown>;

/**
 * 두 객체가 얕은 수준에서 동일한지 확인
 * @returns true if equal, false if different
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  // 1. 참조 동일성 (가장 빠름)
  if (a === b) return true;

  // 2. null/undefined 체크
  if (a == null || b == null) return a === b;

  // 3. 타입 체크
  if (typeof a !== typeof b) return false;

  // 4. 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!shallowEqualValue(a[i], b[i])) return false;
    }
    return true;
  }

  // 5. 객체 비교
  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as AnyObject;
    const objB = b as AnyObject;

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    // 키 개수 비교 (빠른 bailout)
    if (keysA.length !== keysB.length) return false;

    // 각 키의 값 비교
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
      if (!shallowEqualValue(objA[key], objB[key])) return false;
    }
    return true;
  }

  // 6. 프리미티브 비교 (이미 === 에서 처리됨, 여기 도달 시 다름)
  return false;
}

/**
 * 단일 값 비교 (1단계 깊이만)
 * 중첩 객체는 JSON.stringify 폴백
 */
function shallowEqualValue(a: unknown, b: unknown): boolean {
  // 참조 동일성
  if (a === b) return true;

  // null/undefined
  if (a == null || b == null) return a === b;

  // 타입이 다름
  if (typeof a !== typeof b) return false;

  // 프리미티브
  if (typeof a !== 'object') return a === b;

  // 중첩 객체/배열 → JSON.stringify 폴백 (가장 느림)
  // 하지만 이 시점에서 이미 많은 케이스가 필터링됨
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * 스타일 객체 전용 빠른 비교
 * CSS 속성은 대부분 문자열/숫자이므로 최적화 가능
 */
export function shallowEqualStyle(
  a: React.CSSProperties | undefined,
  b: React.CSSProperties | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;

  const keysA = Object.keys(a) as (keyof React.CSSProperties)[];
  const keysB = Object.keys(b) as (keyof React.CSSProperties)[];

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * 이벤트 배열 전용 빠른 비교
 * 이벤트 개수와 ID만 비교 (상세 내용은 스킵)
 */
export function shallowEqualEvents(
  a: Array<{ id?: string; event?: string }> | undefined,
  b: Array<{ id?: string; event?: string }> | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;

  // ID와 이벤트 타입만 비교 (빠른 체크)
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false;
    if (a[i]?.event !== b[i]?.event) return false;
  }
  return true;
}
