/**
 * ADR-903 P3-E E-2 — Migration Backup (read-only)
 *
 * legacy IndexedDB schema (DB_VERSION 8 이전 또는 `_meta.schemaVersion = "legacy"`)
 * 의 전체 elements + layouts 를 localStorage 에 dump. E-3 migration script 의
 * 사전 안전망. 본 함수는 DB 무변경 (read-only) — 안전망 3중 중 localStorage
 * backup 부분.
 *
 * backup 보존 정책: localStorage 용량 제한으로 1 project 당 최신 1건만 유지.
 * 동일 projectId 의 이전 backup 은 새 backup 생성 시 정리.
 */

import type { Element } from "../../types/core/store.types";
import type { Layout } from "../../types/builder/layout.types";

export interface MigrationBackup {
  projectId: string;
  timestamp: string;
  elements: Element[];
  layouts: Layout[];
  backupVersion: "legacy";
}

/**
 * createMigrationBackup 가 필요한 adapter 의 minimal surface.
 * IndexedDBAdapter 의 elements + layouts 그룹 중 read 메서드만 사용.
 */
interface BackupCapableAdapter {
  elements: { getAll(): Promise<Element[]> };
  layouts: { getAll(): Promise<Layout[]> };
}

const BACKUP_KEY_PREFIX = "composition-migration-backup:";

function makeBackupKey(projectId: string, ts: number): string {
  return `${BACKUP_KEY_PREFIX}${projectId}:${ts}`;
}

/**
 * 동일 projectId 의 prior backup 전수 삭제. localStorage 용량 보호.
 */
function clearProjectBackups(projectId: string): void {
  const projectPrefix = `${BACKUP_KEY_PREFIX}${projectId}:`;
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(projectPrefix)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((k) => localStorage.removeItem(k));
}

/**
 * legacy schema 의 elements + layouts 를 localStorage backup 으로 dump.
 *
 * @param adapter - read-only fetch 용 adapter
 * @param projectId - 백업 대상 프로젝트 ID
 * @param preReadData - 호출자가 이미 IDB 에서 읽은 데이터를 재사용할 때 주입.
 *   미주입 시 adapter 에서 한 번 더 read (기존 동작). caller 가 transform 등
 *   다른 용도로 같은 데이터를 사용할 때 IDB read 중복 1회 제거.
 * @returns backup key — `_meta.backupKey` 에 보관 권장
 */
export async function createMigrationBackup(
  adapter: BackupCapableAdapter,
  projectId: string,
  preReadData?: { elements: Element[]; layouts: Layout[] },
): Promise<string> {
  // 1. read-only fetch (no DB write) — preReadData 주입 시 재사용
  const [elements, layouts] = preReadData
    ? [preReadData.elements, preReadData.layouts]
    : await Promise.all([adapter.elements.getAll(), adapter.layouts.getAll()]);

  // 2. clear any prior backup for this project (1 project = 1 backup 정책)
  clearProjectBackups(projectId);

  // 3. construct backup record
  const now = Date.now();
  const backup: MigrationBackup = {
    projectId,
    timestamp: new Date(now).toISOString(),
    elements,
    layouts,
    backupVersion: "legacy",
  };

  // 4. persist to localStorage
  const backupKey = makeBackupKey(projectId, now);
  localStorage.setItem(backupKey, JSON.stringify(backup));

  return backupKey;
}
