/**
 * ADR-913 Phase 4 Step 4-2 — runTagTypeMigration (dry-run)
 *
 * legacy `tag` field → canonical `type` field rename migration.
 *
 * 흐름 (Step 4-2 = dry-run only):
 *   1. `_meta.get(projectId)` 조회 — 이미 `composition-1.1` 이면 status=skipped
 *   2. `createMigrationBackup()` 호출 — backupKey 획득 (write 단계 안전망)
 *   3. `elements.getAll()` 전수 로드 (read-only)
 *   4. transform: `tag` field → `type` field (값 동일, 키만 rename)
 *      - `tag` only          → `{ ...el, type: el.tag, tag: undefined }`
 *      - `type` only         → 변경 없음 (이미 canonical)
 *      - `tag` + `type` 둘 다 → `type` 우선 보존, `tag` 제거 (transformer 우선순위)
 *      - 둘 다 missing       → error (orphan tag)
 *   5. dryRun=true (default): 결과 + transformedCount 반환, DB 무변경
 *   6. dryRun=false: Step 4-4 에서 활성화 (write-through 분기 — 본 파일에 미구현)
 *
 * 본 함수는 ADR-903 P3-E `runLegacyToCanonicalMigration` 과 독립 — 다른 schema
 * 차원의 변환 (tag/type ↔ ownership marker). 두 migration 은 서로 다른 시점에
 * 실행되며 `_meta.schemaVersion` 으로 단계 추적: legacy → composition-1.0
 * (ADR-903 P3-E) → composition-1.1 (ADR-913 P4).
 */

import type { Element } from "../../types/core/store.types";
import type { Layout } from "../../types/builder/layout.types";
import type { MetaRecord } from "./types";
import { createMigrationBackup } from "./migrationBackup";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * `tag` 필드를 가진 legacy element 의 최소 형태.
 * `Element.type` 은 canonical, `tag` 는 legacy stub (ADR-913 P1+P2 read-through compat).
 */
type LegacyOrCanonicalElement = Element & { tag?: string };

export interface TagTypeTransformation {
  elementId: string;
  tag_was: string | null;
  type_was: string | null;
  type_after: string | null;
  /** 본 element 가 transform 대상이면 true (tag→type rename 발생) */
  changed: boolean;
}

export interface TagTypeMigrationResult {
  status: "skipped" | "success" | "failure";
  reason?: string;
  backupKey?: string;
  /** transform 대상 (tag → type rename) 의 수 */
  transformedCount: number;
  /** 전체 element 수 (orphan + already-canonical 포함) */
  totalCount: number;
  transformations: TagTypeTransformation[];
  errors: string[];
  dryRun: boolean;
}

/**
 * runTagTypeMigration 가 의존하는 adapter 의 minimal surface.
 * Step 4-2 단계: read-only (`elements.getAll` / `meta.get`).
 * Step 4-4 단계: write-through 진입 — `elements.updateMany` + `meta.set` 추가 활성화.
 *
 * `layouts.getAll` 은 `createMigrationBackup` 의 BackupCapableAdapter 호환 위해 필요.
 */
interface TagTypeMigrationCapableAdapter {
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

export interface TagTypeMigrationOptions {
  /**
   * Step 4-2 default: `true` — dry-run (DB 무변경, transformations 만 계산).
   * Step 4-4: `false` — write-through (env flag `VITE_ADR913_P4_WRITE_THROUGH` 으로 게이트).
   */
  dryRun?: boolean;
}

// ─────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────

/**
 * Pure transformer — element 1개의 tag/type 정규화 결과 계산.
 *
 * 우선순위:
 * - `tag` only          → `{ ...el, type: el.tag, tag: undefined }`
 * - `type` only         → 변경 없음 (이미 canonical)
 * - `tag` + `type` 둘 다 → `type` 우선 보존, `tag` 제거 (transformer 우선순위 = type)
 * - 둘 다 missing       → null 반환 (caller 가 error 처리)
 *
 * @internal — 외부 노출은 테스트 + runTagTypeMigration 내부 호출만.
 */
export function transformElementTagToType(
  el: LegacyOrCanonicalElement,
): { transformed: Element; changed: boolean } | null {
  const hasTag = el.tag !== undefined;
  const hasType = el.type !== undefined;

  if (!hasTag && !hasType) {
    return null; // orphan tag — caller 가 error 처리
  }

  if (hasType && !hasTag) {
    // already canonical
    return { transformed: el, changed: false };
  }

  if (hasTag && !hasType) {
    // tag → type rename
    const { tag, ...rest } = el;
    return {
      transformed: { ...rest, type: tag } as Element,
      changed: true,
    };
  }

  // hasTag && hasType — type 우선 보존, tag 제거
  const { tag: _tag, ...rest } = el;
  return {
    transformed: rest as Element,
    changed: true,
  };
}

/**
 * legacy `tag` → canonical `type` field rename 변환을 dry-run 으로 계산.
 *
 * Step 4-2: dryRun=true (default) — DB 무변경, transformations 결과만 반환.
 * Step 4-4: dryRun=false — env flag 로 게이트된 write-through (본 파일에 미구현).
 *
 * @returns 변환 결과 + errors. DB 는 dryRun=true 시 무변경.
 */
export async function runTagTypeMigration(
  adapter: TagTypeMigrationCapableAdapter,
  projectId: string,
  options: TagTypeMigrationOptions = {},
): Promise<TagTypeMigrationResult> {
  const { dryRun = true } = options;

  // 1. Skip if already migrated to composition-1.1
  const existing = await adapter.meta.get(projectId);
  if (existing?.schemaVersion === "composition-1.1") {
    return {
      status: "skipped",
      reason: "already migrated to composition-1.1",
      transformedCount: 0,
      totalCount: 0,
      transformations: [],
      errors: [],
      dryRun,
    };
  }

  // 2. Create backup (read-only — localStorage dump). dry-run 에도 backup 생성하여
  //    Step 4-4 write-through 진입 시 fallback 안전망 보장.
  const backupKey = await createMigrationBackup(
    adapter as unknown as Parameters<typeof createMigrationBackup>[0],
    projectId,
  );

  // 3. Read all elements (no DB write)
  const elements = await adapter.elements.getAll();

  // 4. Compute transformations
  const transformations: TagTypeTransformation[] = [];
  const errors: string[] = [];
  let transformedCount = 0;

  for (const raw of elements) {
    const el = raw as LegacyOrCanonicalElement;
    const result = transformElementTagToType(el);

    if (result === null) {
      errors.push(
        `orphan tag/type element ${el.id} (tag=undefined, type=undefined)`,
      );
      transformations.push({
        elementId: el.id,
        tag_was: null,
        type_was: null,
        type_after: null,
        changed: false,
      });
      continue;
    }

    transformations.push({
      elementId: el.id,
      tag_was: el.tag ?? null,
      type_was: el.type ?? null,
      type_after: result.transformed.type ?? null,
      changed: result.changed,
    });

    if (result.changed) transformedCount += 1;
  }

  const status: TagTypeMigrationResult["status"] =
    errors.length === 0 ? "success" : "failure";

  // Step 4-4 write-through 분기 — 본 파일에 미구현. dryRun=false 호출 시 명시 throw.
  if (!dryRun) {
    throw new Error(
      "[ADR-913 P4 Step 4-2] write-through 미구현 — Step 4-4 에서 활성화. " +
        "dryRun=true 로 호출하거나 Step 4-4 land 후 재시도.",
    );
  }

  return {
    status,
    backupKey,
    transformedCount,
    totalCount: elements.length,
    transformations,
    errors,
    dryRun: true,
  };
}
