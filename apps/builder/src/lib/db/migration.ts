/**
 * ADR-903 P3-E E-3 + E-6 — runLegacyToCanonicalMigration
 *
 * legacy ownership marker (`element.page_id` / `element.layout_id`) 를
 * canonical parent ID 로 변환. `dryRun` 옵션으로 read-only/write-through 분기.
 *
 * 흐름:
 * 1. `_meta.get(projectId)` 조회 — 이미 `composition-1.0` 이면 status=skipped
 * 2. `createMigrationBackup()` 호출 — backupKey 획득
 * 3. `elements.getAll()` 전수 로드
 * 4. 각 element 의 ownership → `legacyOwnershipToCanonicalParent()` 적용
 * 5. canonical parent 미존재 시 errors 에 추가 (orphan vs missing-frame 구분)
 * 6. errors 비었으면 status=success, 아니면 status=failure
 * 7. `dryRun=false` (E-6) — status=success 시 elements.updateMany +
 *    meta.set composition-1.0. status=failure 시 meta.set legacy + console.warn.
 *    `dryRun=true` (E-3 호환) — DB 미변경 유지.
 */

import type { CompositionDocument } from "@composition/shared";
import type { Element } from "../../types/core/store.types";
import type { Layout } from "../../types/builder/layout.types";
import type { MetaRecord } from "./types";
import { legacyOwnershipToCanonicalParent } from "../../adapters/canonical";
import { createMigrationBackup } from "./migrationBackup";

export interface MigrationTransformation {
  elementId: string;
  page_id_was: string | null;
  layout_id_was: string | null;
  canonicalParentId: string | null;
}

export interface MigrationResult {
  status: "skipped" | "success" | "failure";
  reason?: string;
  backupKey?: string;
  transformations: MigrationTransformation[];
  errors: string[];
}

/**
 * runLegacyToCanonicalMigration 가 의존하는 adapter 의 minimal surface.
 * E-3 단계: read-only (`elements.getAll` / `meta.get`).
 * E-6 단계: write-through 진입 — `elements.updateMany` + `meta.set` 추가 활성화.
 */
interface MigrationCapableAdapter {
  elements: {
    getAll(): Promise<Element[]>;
    updateMany(
      updates: Array<{ id: string; data: Partial<Element> }>,
    ): Promise<Element[]>;
  };
  layouts: { getAll(): Promise<Layout[]> };
  meta: {
    get(projectId: string): Promise<MetaRecord | null>;
    set(record: MetaRecord): Promise<MetaRecord>;
  };
}

export interface MigrationOptions {
  canonicalDoc: CompositionDocument;
  /**
   * E-3 호환: `true` (default) — read-only dry-run. E-6: `false` — write-through.
   */
  dryRun?: boolean;
}

/**
 * legacy → canonical-1.0 변환을 dry-run 으로 계산.
 * @returns 변환 결과 + errors. DB 는 무변경.
 */
export async function runLegacyToCanonicalMigration(
  adapter: MigrationCapableAdapter,
  projectId: string,
  options: MigrationOptions,
): Promise<MigrationResult> {
  const { canonicalDoc, dryRun = true } = options;

  // 1. Skip if already migrated
  const existing = await adapter.meta.get(projectId);
  if (existing?.schemaVersion === "composition-1.0") {
    return {
      status: "skipped",
      reason: "already migrated to composition-1.0",
      transformations: [],
      errors: [],
    };
  }

  // 2. Create backup (read-only — localStorage dump)
  const backupKey = await createMigrationBackup(
    adapter as unknown as Parameters<typeof createMigrationBackup>[0],
    projectId,
  );

  // 3. Read all elements (no DB write)
  const elements = await adapter.elements.getAll();

  // 4. Compute transformations
  const transformations: MigrationTransformation[] = [];
  const errors: string[] = [];

  for (const el of elements) {
    const ownership = {
      page_id: el.page_id ?? null,
      layout_id: el.layout_id ?? null,
    };
    const canonicalParentId = legacyOwnershipToCanonicalParent(
      ownership,
      canonicalDoc,
    );

    transformations.push({
      elementId: el.id,
      page_id_was: ownership.page_id,
      layout_id_was: ownership.layout_id,
      canonicalParentId,
    });

    if (canonicalParentId === null) {
      if (ownership.page_id == null && ownership.layout_id == null) {
        errors.push(`orphan element ${el.id} (page_id=null, layout_id=null)`);
      } else {
        errors.push(
          `canonical parent missing for element ${el.id} (page_id=${ownership.page_id}, layout_id=${ownership.layout_id})`,
        );
      }
    }
  }

  const status: MigrationResult["status"] =
    errors.length === 0 ? "success" : "failure";

  // E-6: write-through (dryRun=false 시 실제 DB 반영)
  if (!dryRun) {
    if (status === "success") {
      // elements 의 parent_id 를 canonical 로 갱신 + legacy layout_id 정리
      await adapter.elements.updateMany(
        transformations.map((t) => ({
          id: t.elementId,
          data: {
            parent_id: t.canonicalParentId,
            layout_id: null,
          } as Partial<Element>,
        })),
      );
      await adapter.meta.set({
        projectId,
        schemaVersion: "composition-1.0",
        migratedAt: new Date().toISOString(),
        backupKey,
      });
    } else {
      // 실패 시: schemaVersion=legacy 로 fallback 유지 + dev console.warn
      await adapter.meta.set({
        projectId,
        schemaVersion: "legacy",
        backupKey,
      });
      console.warn(
        `[ADR-903 P3-E E-6] migration failed for project ${projectId}: ${errors.length} errors`,
        errors,
      );
    }
  }

  return {
    status,
    backupKey,
    transformations,
    errors,
  };
}
