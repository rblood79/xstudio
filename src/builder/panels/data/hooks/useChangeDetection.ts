import { useMemo } from "react";

/**
 * useChangeDetection - 변경사항 감지 훅
 *
 * 현재 값과 원본 값을 비교하여 변경 여부를 감지합니다.
 * JSON 직렬화를 통한 deep equality 비교를 기본으로 사용하며,
 * 커스텀 비교 함수를 제공할 수도 있습니다.
 *
 * @example
 * ```tsx
 * const endpointChanged = useChangeDetection(localEndpoint, config.endpoint);
 * const paramsChanged = useChangeDetection(
 *   localParams,
 *   JSON.stringify(config.params, null, 2)
 * );
 * ```
 */
export function useChangeDetection<T>(
  current: T,
  original: T,
  compareFn?: (a: T, b: T) => boolean
): boolean {
  return useMemo(() => {
    // 커스텀 비교 함수가 있으면 사용
    if (compareFn) {
      return !compareFn(current, original);
    }

    // 기본: JSON 직렬화를 통한 deep equality 비교
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [current, original, compareFn]);
}

/**
 * useChangeDetectionMap - 여러 필드의 변경사항을 추적
 *
 * 여러 필드의 변경 여부를 한 번에 확인할 수 있습니다.
 *
 * @example
 * ```tsx
 * const changes = useChangeDetectionMap({
 *   endpoint: [localEndpoint, config.endpoint],
 *   params: [localParams, JSON.stringify(config.params, null, 2)],
 *   headers: [localHeaders, JSON.stringify(config.headers, null, 2)],
 * });
 *
 * console.log(changes.endpoint); // true or false
 * console.log(changes.hasAnyChanges); // true if any field changed
 * ```
 */
export function useChangeDetectionMap<T extends Record<string, [unknown, unknown]>>(
  fields: T
): Record<keyof T, boolean> & { hasAnyChanges: boolean } {
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    let hasAnyChanges = false;

    for (const [key, [current, original]] of Object.entries(fields)) {
      const changed = JSON.stringify(current) !== JSON.stringify(original);
      result[key] = changed;
      if (changed) {
        hasAnyChanges = true;
      }
    }

    result.hasAnyChanges = hasAnyChanges;
    return result as Record<keyof T, boolean> & { hasAnyChanges: boolean };
  }, [fields]);
}
