/**
 * ADR-903 P3-E E-3 — runLegacyToCanonicalMigration (read-through dry-run)
 *
 * legacy ownership marker (`element.page_id` / `element.layout_id`) 를
 * canonical parent ID 로 변환 계산하는 dry-run 함수. DB 무변경 — 변환 결과만
 * 반환. 실제 elements.updateMany / meta.set 은 E-6 (write-through) 단계에서.
 *
 * 흐름:
 * 1. `_meta.get(projectId)` 조회 — 이미 `composition-1.0` 이면 status=skipped
 * 2. `createMigrationBackup()` 호출 — backupKey 획득
 * 3. `elements.getAll()` 전수 로드
 * 4. 각 element 의 ownership → `legacyOwnershipToCanonicalParent()` 적용
 * 5. canonical parent 미존재 시 errors 에 추가 (orphan vs missing-frame 구분)
 * 6. errors 비었으면 status=success, 아니면 status=failure (DB 미변경 유지)
 *
 * 회귀 위험: dry-run 이라 DB write 0. E-6 진입 전 50+ fixture round-trip 으로
 * 변환 정합성 검증.
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
 * IndexedDBAdapter 의 elements/layouts/meta 그룹에서 read 메서드만 사용.
 */
interface MigrationCapableAdapter {
  elements: { getAll(): Promise<Element[]> };
  layouts: { getAll(): Promise<Layout[]> };
  meta: {
    get(projectId: string): Promise<MetaRecord | null>;
  };
}

export interface MigrationOptions {
  canonicalDoc: CompositionDocument;
  /**
   * E-3 단계는 항상 dry-run (default true). E-6 에서 false 옵션 활성화.
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
  const { canonicalDoc } = options;

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

  return {
    status: errors.length === 0 ? "success" : "failure",
    backupKey,
    transformations,
    errors,
  };
}
