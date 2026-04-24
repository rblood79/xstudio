/**
 * @fileoverview Legacy `tag` → canonical `type` 단일 rename — ADR-903 P1.
 *
 * 값 공간 보존: legacy `tag = "Button"` → canonical `type = "Button"`.
 * 특수 케이스:
 * - `tag = "Slot"`: caller가 slotAndLayoutAdapter로 분기 처리 후 canonical
 *   container의 `slot` 메타로 변환. 본 함수는 그대로 "Slot" 반환 (caller 책임)
 * - 알려지지 않은 tag: warning 로그 + "frame" fallback (canonical 구조 타입)
 *
 * adapter 입력 시점 1회 호출. 호출 횟수 baseline (2026-04-25): 1075 ref.
 */

import type { ComponentTag } from "@composition/shared";

/**
 * legacy `tag` 문자열을 canonical `ComponentTag`로 rename.
 *
 * P1 단계에서는 단순 cast로 시작 — runtime validation은 Phase 2 resolver에서.
 * 알려지지 않은 tag는 "frame" fallback + console.warn.
 */
export function tagToType(legacyTag: string): ComponentTag {
  if (!legacyTag) {
    console.warn(`[ADR-903 P1] tagToType: empty tag, falling back to "frame"`);
    return "frame";
  }
  // Phase 1: 직접 cast (값 공간은 ComponentTag와 동일하게 수렴 중)
  // Phase 2+ resolver에서 isCanonicalNode guard로 재검증
  return legacyTag as ComponentTag;
}

/**
 * Slot 특수 처리 분기 판정.
 * caller (slotAndLayoutAdapter)가 이 함수로 Slot 여부 확인 후 별도 변환 분기.
 */
export function isLegacySlotTag(legacyTag: string): boolean {
  return legacyTag === "Slot";
}
