/**
 * 스타일 값 변환 헬퍼 — use*Values 훅 공용
 */

export function numToPx(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return `${n}px`;
}

export function firstDefined(
  inline: unknown,
  specPx: string | undefined,
  fallback: string,
): string {
  if (inline !== undefined && inline !== null && inline !== "") {
    return String(inline);
  }
  if (specPx !== undefined) return specPx;
  return fallback;
}
