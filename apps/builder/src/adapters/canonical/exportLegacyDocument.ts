/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-stub: exportLegacyDocument
 *
 * canonical primary storage 전환 후 legacy compat payload 생성 SSOT (D18=A 단일
 * 진입점). Phase 3-A-stub 단계는 stub return — 3-A-impl 에서 실 구현.
 *
 * **D18=A 채택 사유**: 모든 legacy `elements[]` 생성 site 가 본 함수 경유 →
 * grep gate 단순 (`exportLegacyDocument` 외 legacy direct write 0건). 단일
 * 진입점 testability + post-cutover refactor scope 좁힘.
 *
 * **3-A-impl 시점 구현 예정**:
 * - canonical document tree DFS 순회
 * - `metadata.legacyProps` 보존 노드 → Element 역변환 (`canonicalNodeToElement`
 *   재사용 검토)
 * - layout/page 분리 + parent_id/order_num 정확성
 * - fixture 100건 round-trip 무손실 검증
 */

import type { CompositionDocument } from "@composition/shared";
import type { Element } from "@/types/builder/unified.types";

/**
 * canonical document → legacy `Element[]` payload 역변환.
 *
 * **Phase 3-A-stub**: 미구현. 호출 site 가 `[]` 받아 no-op 동작 → 본 stub 시점
 * 에서는 legacy direct write 경로가 그대로 유지 (fallback). 3-A-impl 시점
 * 실 구현 land 후 shadow write 활성.
 *
 * @param doc - canonical CompositionDocument (sync 결과 또는 primary write 결과)
 * @returns legacy Element[] (3-A-stub: 빈 배열)
 *
 * @todo 3-A-impl — DFS 역변환 + fixture 100건 무손실 검증
 */
export function exportLegacyDocument(_doc: CompositionDocument): Element[] {
  // TODO(ADR-916 3-A-impl): canonical → legacy round-trip 실 구현
  return [];
}
