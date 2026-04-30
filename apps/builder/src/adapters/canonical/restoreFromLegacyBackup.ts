/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-stub: restoreFromLegacyBackup
 *
 * project-level rollback 경로 (D19=B 채택). Phase 3-A-impl 시점 localStorage
 * /IndexedDB backup snapshot 자동 저장 + restore API 활성. 3-D 시점
 * `_meta.schemaVersion === "canonical-primary-1.0"` + `canRollback: true` flag
 * 와 결합하여 사용자 프로젝트 사고 시 legacy primary 복귀 가능.
 *
 * **D19=B 채택 사유**: schemaVersion bump-only (D19=A) 시 rollback 부재 →
 * 사용자 프로젝트 사고 시 복구 불가. backup snapshot + 명시적 restore API 로
 * MED risk 수용.
 *
 * **3-A-impl 시점 구현 예정**:
 * - localStorage key: `__adr916_legacy_backup_{projectId}` (snapshot JSON)
 * - IndexedDB fallback (localStorage quota 초과 시)
 * - restore 순서: backup load → legacy primary 재설정 → schemaVersion 되돌림
 *   → page reload prompt
 * - sample project rollback PASS evidence 의무
 */

/**
 * project 단위 legacy backup 으로 rollback.
 *
 * **Phase 3-A-stub**: 미구현. `false` 반환 — caller 가 rollback 미지원 처리.
 * 3-A-impl 시점 실 구현 + 3-D 시점 사용자 evidence 확보.
 *
 * @param projectId - rollback 대상 project id
 * @returns rollback 성공 여부 (3-A-stub: 항상 `false`)
 *
 * @todo 3-A-impl — localStorage/IndexedDB backup load + 복원 logic
 * @todo 3-D — sample project rollback evidence
 */
export async function restoreFromLegacyBackup(
  _projectId: string,
): Promise<boolean> {
  // TODO(ADR-916 3-A-impl): localStorage/IndexedDB backup restore 실 구현
  return false;
}
