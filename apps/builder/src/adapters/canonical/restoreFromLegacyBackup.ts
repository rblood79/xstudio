/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-impl: restoreFromLegacyBackup
 *
 * project-level rollback 경로 (D19=B 채택). localStorage backup snapshot 자동
 * 저장 + restore API. 3-D 시점 `_meta.schemaVersion === "canonical-primary-1.0"`
 * + `canRollback: true` flag 와 결합하여 사용자 프로젝트 사고 시 legacy primary
 * 복귀 가능.
 *
 * **D19=B 채택 사유**: schemaVersion bump-only (D19=A) 시 rollback 부재 →
 * 사용자 프로젝트 사고 시 복구 불가. backup snapshot + 명시적 restore API 로
 * MED risk 수용.
 *
 * **API 분리**:
 * - `saveLegacyBackup(projectId, elements)` — 사용자 dev 환경 또는 cutover 직전
 *   호출. localStorage 에 snapshot 직렬화 저장.
 * - `loadLegacyBackup(projectId)` — backup 존재 시 parsed Element[] 반환.
 * - `restoreFromLegacyBackup(projectId)` — backup 존재 + parse 가능 검증
 *   (boolean). 실 적용 (elementsApi.setElements) 은 caller 책임 — 3-D 시점
 *   사용자 evidence 수집 시 별도 hook 통합.
 */

import type { Element } from "@/types/builder/unified.types";

const BACKUP_KEY_PREFIX = "__adr916_legacy_backup_" as const;

interface BackupPayload {
  /** schema version of the backup format */
  version: "1.0";
  /** ISO 8601 timestamp */
  savedAt: string;
  /** legacy elements snapshot */
  elements: Element[];
}

function backupKey(projectId: string): string {
  return `${BACKUP_KEY_PREFIX}${projectId}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Project 단위 legacy backup 저장 — localStorage snapshot.
 *
 * @param projectId - 대상 project id
 * @param elements - legacy elements snapshot (cutover 직전 상태)
 * @returns 저장 성공 여부 (false = storage 없음 또는 quota exceeded)
 */
export function saveLegacyBackup(
  projectId: string,
  elements: Element[],
): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const payload: BackupPayload = {
    version: "1.0",
    savedAt: new Date().toISOString(),
    elements,
  };

  try {
    storage.setItem(backupKey(projectId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Project 단위 legacy backup load — 직렬화된 snapshot 을 Element[] 로 파싱.
 *
 * @param projectId - 대상 project id
 * @returns parsed Element[] 또는 null (backup 없음 또는 parse 실패)
 */
export function loadLegacyBackup(projectId: string): Element[] | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(backupKey(projectId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<BackupPayload>;
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    return parsed.elements;
  } catch {
    return null;
  }
}

/**
 * project 단위 legacy backup 으로 rollback 가능 여부 검증.
 *
 * Phase 3-A-impl 시점: backup 존재 + parse 가능하면 `true` 반환. 실제 elements
 * 재적용 (elementsApi.setElements) 은 caller 책임 — 3-D 시점 사용자 evidence
 * 수집 시 별도 hook 통합 예정.
 *
 * @param projectId - rollback 대상 project id
 * @returns rollback 가능 여부 (backup 존재 + parse 성공)
 */
export async function restoreFromLegacyBackup(
  projectId: string,
): Promise<boolean> {
  const elements = loadLegacyBackup(projectId);
  return elements !== null;
}

/**
 * Project 단위 legacy backup 삭제 — cutover 검증 완료 후 cleanup 용.
 *
 * @param projectId - 대상 project id
 */
export function clearLegacyBackup(projectId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(backupKey(projectId));
  } catch {
    // ignore
  }
}
