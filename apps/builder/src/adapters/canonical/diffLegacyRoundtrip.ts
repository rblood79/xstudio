/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-stub: diffLegacyRoundtrip
 *
 * shadow write 결과 차이 요약 (3 카테고리 분류). Phase 3-A monitoring 1-2주
 * destructive=0 시그널 검증의 source.
 *
 * **3 카테고리 분류**:
 * - **destructive**: id/parent_id/page_id/layout_id/type/props 무손실 위반.
 *   destructive=0 가 G4 PASS prerequisite (3-B 진입 차단).
 * - **reorder**: order_num 변경 (시각 순서 정합 영향). warn 수준.
 * - **cosmetic**: legacy/canonical 이 동등 의미로 표현하는 차이 (예: 빈 props
 *   `{}` vs `undefined`). ignore.
 *
 * **3-A-impl 시점 구현 예정**:
 * - element 별 deep equal (id 매칭 + 7 top-level fields + props recursive)
 * - 3 카테고리 자동 분류
 * - 결과 console UI 노출 (dev only) + production telemetry hook
 */

import type { Element } from "@/types/builder/unified.types";

export interface RoundtripDiffEntry {
  /** legacy element id */
  id: string;
  /** 차이 발생 필드명 (예: "parent_id", "props.label") */
  field: string;
  /** before 값 (legacy export 시점) */
  before: unknown;
  /** after 값 (canonical roundtrip 결과) */
  after: unknown;
}

export interface RoundtripDiff {
  /** id/parent_id/page_id/layout_id/type/props 무손실 위반 — G4 PASS 차단 */
  destructive: RoundtripDiffEntry[];
  /** order_num 변경 — warn 수준 */
  reorder: RoundtripDiffEntry[];
  /** 동등 의미 차이 — ignore */
  cosmetic: RoundtripDiffEntry[];
}

/**
 * legacy `Element[]` 두 snapshot 간 차이 요약.
 *
 * **Phase 3-A-stub**: 미구현. 빈 diff 반환 → caller 가 destructive=0 으로
 * 평가하지만 실제 검증 미수행. 3-A-impl 시점 실 구현 land.
 *
 * @param before - 비교 기준 (legacy 직접 저장 결과)
 * @param after - 비교 대상 (canonical 저장 → legacy export 결과)
 * @returns 3 카테고리 분류된 RoundtripDiff (3-A-stub: 빈 결과)
 *
 * @todo 3-A-impl — element 별 deep equal + 3 카테고리 자동 분류
 */
export function diffLegacyRoundtrip(
  _before: Element[],
  _after: Element[],
): RoundtripDiff {
  // TODO(ADR-916 3-A-impl): deep equal + 3 카테고리 분류 실 구현
  return {
    destructive: [],
    reorder: [],
    cosmetic: [],
  };
}
