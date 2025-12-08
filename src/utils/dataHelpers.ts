/**
 * Data Helpers
 *
 * EventsPanel 데이터 액션을 위한 유틸리티 함수
 * - getValueByPath: 객체에서 경로로 값 추출
 * - upsertData: Upsert 연산 수행
 *
 * @see /Users/admin/.claude/plans/linked-soaring-globe.md - Phase 4
 */

/**
 * 객체에서 점(.) 구분 경로로 값 추출
 *
 * @example
 * getValueByPath({ user: { name: 'John' }}, 'user.name') // 'John'
 * getValueByPath({ items: [1, 2, 3] }, 'items.1') // 2
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  if (typeof obj !== 'object' || obj === null) return undefined;

  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Upsert 연산 수행
 * keyField를 기준으로 기존 데이터를 업데이트하거나 새로 추가
 *
 * @example
 * const existing = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
 * const newData = { id: 2, name: 'B Updated' };
 * upsertData(existing, newData, 'id')
 * // [{ id: 1, name: 'A' }, { id: 2, name: 'B Updated' }]
 */
export function upsertData(
  existing: Record<string, unknown>[],
  newData: unknown,
  keyField: string
): Record<string, unknown>[] {
  const result = [...existing];
  const items = Array.isArray(newData) ? newData : [newData];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;

    const itemRecord = item as Record<string, unknown>;
    const keyValue = itemRecord[keyField];

    if (keyValue === undefined) {
      // keyField가 없으면 그냥 추가
      result.push(itemRecord);
      continue;
    }

    const existingIndex = result.findIndex((r) => r[keyField] === keyValue);

    if (existingIndex >= 0) {
      // 기존 항목 업데이트
      result[existingIndex] = { ...result[existingIndex], ...itemRecord };
    } else {
      // 새 항목 추가
      result.push(itemRecord);
    }
  }

  return result;
}

/**
 * 데이터 머지 (deep merge)
 *
 * @example
 * mergeData({ a: 1, b: { c: 2 }}, { b: { d: 3 }})
 * // { a: 1, b: { c: 2, d: 3 }}
 */
export function mergeData(
  target: Record<string, unknown>,
  source: unknown
): Record<string, unknown> {
  if (typeof source !== 'object' || source === null) {
    return target;
  }

  const result = { ...target };
  const sourceRecord = source as Record<string, unknown>;

  for (const key of Object.keys(sourceRecord)) {
    const targetValue = result[key];
    const sourceValue = sourceRecord[key];

    if (
      typeof targetValue === 'object' &&
      targetValue !== null &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      // 재귀적으로 객체 머지
      result[key] = mergeData(
        targetValue as Record<string, unknown>,
        sourceValue
      );
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * 배열 데이터 append
 */
export function appendData(
  existing: Record<string, unknown>[],
  newData: unknown
): Record<string, unknown>[] {
  const items = Array.isArray(newData) ? newData : [newData];
  const validItems = items.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null
  );
  return [...existing, ...validItems];
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
