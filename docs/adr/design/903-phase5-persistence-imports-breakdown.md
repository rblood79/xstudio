# ADR-903 Phase 5 — Persistence 완결 + imports 참조형 hook sub-breakdown

> 본 문서는 [ADR-903](../completed/903-ref-descendants-slot-composition-format-migration-plan.md) Phase 5 (G5 Gate)
> 의 **sub-phase 분할** 과 정량 측정 기반 마이그레이션 plan 이다.
> ADR 본문 §G5 + §R4/R7 의 high-level overview 를 실행 계획으로 분해.
>
> **상위 ADR**: ADR-903 (Status: Accepted — 2026-04-25)
> **진입 전제**: P3 G3 통과 + P4 G4 통과 + adapter shim = "P4 보험 역할"
> 완료 상태 (결정 5, 903-phase3-decisions.md §결정 5).
> **연계 결정**: decisions.md 결정 3 (`_meta` 별도 object store + backupKey) /
> 결정 5 (adapter shim P4 완료 시점 해체 — P5 진입 전에 shim 제거 완료가 전제).

---

## 0. P5 의 역할 재확인

ADR-903 §G5 는 "Persistence 전환 완결" 을 통과 조건으로 정의한다. P3-E 는 **최소 persistence**
(IndexedDB schema 에서 `layout_id` 컬럼 제거 + `_meta` 스텁 도입) 만 수행했다. P5 는 이를 완결한다:

| P3-E 범위 (완료 시점)                               | P5 추가 범위 (본 문서)                               |
| --------------------------------------------------- | ---------------------------------------------------- |
| `layout_id` 인덱스 제거 + `_meta` store 스텁        | canonical-only 저장 경로 단일화                      |
| migration script 1차 (layout_id → parent_node_path) | migration script 전체 (legacy 6필드 모두 + tag→type) |
| `backupKey` 필드 스텁                               | pre-migration JSON dump + backupKey 실 구현          |
| adapter shim read-through 유지                      | adapter shim 완전 해체                               |
| imports 타입 스텁 (`Record<string, string>`)        | imports resolver fetch + cache + invalidation 구현   |
| DesignKit 별도 track 선언                           | DesignKit ↔ imports 통합 여부 결정                   |

---

## 1. Baseline 측정 (P5 진입 시점 예상)

### 1.1 IndexedDB 현재 schema (DB_VERSION = 7)

`apps/builder/src/lib/db/indexedDB/adapter.ts:32` 기준:

| Object Store    | Key Path     | 주요 Index                                       | P5 변경 여부               |
| --------------- | ------------ | ------------------------------------------------ | -------------------------- |
| `projects`      | `id`         | —                                                | schemaVersion 간접 이관    |
| `pages`         | `id`         | `project_id`, `order_num`                        | page_id 의미 변화          |
| `elements`      | `id`         | `page_id`, `parent_id`, `order_num`, `layout_id` | **layout_id 인덱스 제거**  |
| `layouts`       | `id`         | `project_id`, `name`, `order_num`, `slug`        | **store 전체 제거 (P5-B)** |
| `design_tokens` | `id`         | `project_id`, `theme_id`                         | 변경 없음                  |
| `history`       | `id`         | `page_id`, `created_at`                          | 변경 없음                  |
| `design_themes` | `id`         | `project_id`, `status`                           | 변경 없음                  |
| `metadata`      | `project_id` | —                                                | `_meta` store 로 통합      |
| `data_tables`   | `id`         | `project_id`, `name`                             | 변경 없음                  |
| `api_endpoints` | `id`         | `project_id`, `name`, `targetDataTable`          | 변경 없음                  |
| `variables`     | `id`         | `project_id`, `name`, `scope`, `page_id`         | 변경 없음                  |
| `transformers`  | `id`         | `project_id`, `name`, `level`, ...               | 변경 없음                  |

**P5 신규 store**:

```ts
// _meta object store (결정 3 — 903-phase3-decisions.md)
interface MetaRecord {
  projectId: string; // keyPath
  schemaVersion: "legacy" | "composition-1.0";
  migratedAt?: string; // ISO timestamp
  backupKey?: string; // pre-migration backup ref
}
```

**P3-E 후 DB_VERSION = 8** (layout_id 인덱스 제거 + \_meta store 추가).
**P5 완료 후 DB_VERSION = 9** (layouts store 제거 + elements 행 canonical 전환).

### 1.2 hybrid 잔존 필드 기준 (ADR-903 §G5 측정 기준, P3 완료 후 예상)

| 필드                | G3 이전 ref | P3 완료 후 예상 잔존 위치                             |
| ------------------- | ----------- | ----------------------------------------------------- |
| `layout_id`         | 282         | `adapters/legacy-layout/` shim 한정 (P4 완료 기준)    |
| `masterId`          | 55          | `adapters/legacy-layout/` shim 한정                   |
| `componentRole`     | 41          | `adapters/legacy-layout/` shim 한정                   |
| `descendants`       | 39          | canonical 코드에 정착 — 이 필드는 잔존이 목표         |
| `slot_name`         | 25          | `adapters/legacy-layout/` shim 한정                   |
| `overrides`         | 23          | `adapters/legacy-layout/` shim 한정                   |
| `tag`               | 1031        | `adapters/legacy-layout/tagRename.ts` 한정 후 전 삭제 |
| **hybrid (tag 외)** | 441         | adapter shim 완전 해체 대상 (P5-C)                    |

> `descendants` 는 canonical format 의 핵심 필드이므로 "잔존" 이 목표.
> P5-C 의 adapter shim 해체 대상은 legacy 의미의 나머지 5 필드다.

### 1.3 imports 현황

- `packages/shared/src/types/composition-document.types.ts:304` — `imports?: Record<string, string>` 스텁 선언 완료 (P0 land)
- 실 사용처: 0건 (P0~P4 기간 의도적 비활성화)
- DesignKit `kitLoader.ts` / `kitExporter.ts`: 복사-적용 파이프라인 (참조형 아님)

---

## 2. Sub-phase 분할

의존 순서:

```
P5-A (IndexedDB canonical schema 정의 + _meta store 완성)
   ↓
P5-B (legacy → canonical migration script + 사전 backup)
   ↓
P5-C (adapter shim 완전 해체)
   ↓
P5-D (imports resolver 기반 구현 — fetch + cache)  ← P5-C 완료 후 진입
   ↓
P5-E (imports ↔ ResolverCache 통합)               ← P5-D + P2 ResolverCache 정합 필요
   ↓
P5-F (DesignKit 통합 결정 실행)                   ← P5-E 완료 후 판정
```

P5-D 와 P5-C 는 논리적으로 독립이나, shim 해체 전 외부 doc 로드 경로를 투입하면
레거시 path 와 충돌 가능 → **순차 권장**.

---

### 2.1 P5-A: IndexedDB canonical schema 정의 + \_meta store 완성

**목표**: P3-E 에서 스텁으로 추가한 `_meta` store 를 실 구현하고, canonical-only 저장
경로의 schema 를 최종 확정한다. DB 행 변경 없음 — schema 정의만.

**대상 파일**:

- `apps/builder/src/lib/db/indexedDB/adapter.ts` — DB_VERSION 8→9 (layouts store 제거
  스케줄 + \_meta 실 구현)
- `apps/builder/src/lib/db/types.ts` — `MetaRecord` 인터페이스 완성 + `CanonicalElementRecord` 타입

**작업**:

1. **`_meta` object store 실 구현**:
   - `initMeta(projectId: string)`: project open 시 `schemaVersion = "legacy"` 초기화
   - `getMeta(projectId: string): MetaRecord | null`
   - `setMeta(projectId: string, meta: Partial<MetaRecord>): void`
   - read-through adapter 가 open 시 `_meta.schemaVersion` 체크 → `"legacy"` 이면
     migration 경로 분기 (P5-B 이후 실 분기)

2. **canonical element schema 정의**:

   ```ts
   interface CanonicalElementRecord {
     id: string;
     type: string; // Element.tag → Element.type (P3-D 에서 rename 완료)
     parent_id: string | null;
     project_id: string;
     page_id: string | null; // canonical 에서는 document tree 위치로 대체되므로 nullable
     order_num: number;
     props: Record<string, unknown>;
     // layout_id 필드 없음 — P3-E 에서 인덱스 제거됨
   }
   ```

3. **layouts store 제거 스케줄 확정**:
   - DB_VERSION 9 onupgradeneeded 에서 `layouts` store 삭제 (P5-B migration script 완료 후)
   - P5-B 완료 전에는 DB_VERSION = 8 (P3-E) 유지

4. **IndexedDB read 경로 단일화 설계**:
   - canonical 읽기: `elements.getAll()` + `project` 노드로 canonical document tree 재구성
   - legacy 읽기 fallback: `_meta.schemaVersion === "legacy"` → P5-B migration 자동 실행

**Sub-Gate G5-A**:

```bash
# _meta store 구현 확인
grep -n "MetaRecord\|_meta\|initMeta\|getMeta\|setMeta" \
  apps/builder/src/lib/db/indexedDB/adapter.ts \
  apps/builder/src/lib/db/types.ts | wc -l
# > 0 (실 구현 존재)
```

타입 emit 0 error + IndexedDB open 시 `_meta` store 생성 확인.

**Risk**: LOW. schema 정의만이며 기존 데이터 수정 없음. DB_VERSION bump 가 기존 사용자에게
onupgradeneeded 트리거 → `_meta` store 신규 생성 + 기존 레코드 무변경.

**추정 시간**: ~3h

---

### 2.2 P5-B: legacy → canonical migration script + 사전 backup

**목표**: 기존 IndexedDB 데이터 (legacy schema: `layout_id` 포함 elements, `layouts` store
레코드) 를 canonical schema 로 1회 원자 변환한다. 사용자 데이터 손실 방지가 이 sub-phase 의
제1 원칙.

**대상 파일**:

- `apps/builder/src/lib/db/indexedDB/migration.ts` (신규 — P5-B 핵심)
- `apps/builder/src/lib/db/indexedDB/adapter.ts` (migration trigger 호출)
- `apps/builder/src/lib/db/indexedDB/__tests__/migration.test.ts` (신규)

**알고리즘 (3단계 원자 변환)**:

```
Step 1: Pre-migration backup
  → elements + layouts + pages 전체를 JSON blob 으로 직렬화
  → Blob URL 또는 IndexedDB separate backup store 저장
  → _meta.backupKey = "<timestamp>-pre-migration-backup"
  → 실패 시 abort (migration 진입하지 않음)

Step 2: Legacy → canonical 변환 (IDBTransaction writeable)
  → layouts store 전체 순회:
     각 layout → CanonicalFrameNode (reusable: true, metadata.slug, metadata.type: "layout")
     canonical document tree 에 삽입
  → elements store 전체 순회:
     layout_id !== null → parent 가 해당 layout 의 CanonicalFrameNode ID 로 변경
     page_id = null, layout_id !== null → canonical tree 위치 재설정
     tag → type (tagRename.ts 경유, P3-D 에서 이미 adapter 완성)
     layout_id, masterId, componentRole, slot_name, overrides 필드 canonical 변환
       (slotAndLayoutAdapter.ts 의 legacyOwnershipToCanonicalParent() 경유)
  → _meta.schemaVersion = "composition-1.0"
  → _meta.migratedAt = new Date().toISOString()

Step 3: Validation
  → canonical document roundtrip: resolveCanonicalDocument(doc) 성공 여부 체크
  → 실패 시 Step 2 rollback (legacy schema 복원) + 경고 표시
  → _meta.schemaVersion 은 validation 통과 후에만 쓰기
```

**레거시 필드 변환 매핑**:

| legacy 필드     | canonical 변환                                          |
| --------------- | ------------------------------------------------------- |
| `tag`           | `type` (tagRename.ts `tagToType()` — P3-D 완성)         |
| `layout_id`     | element 위치 → canonical parent frame node id           |
| `masterId`      | `ref: masterId` (RefNode) + `descendants` 재구성        |
| `componentRole` | `metadata.componentRole` 보존 또는 제거 (결정 필요)     |
| `slot_name`     | `descendants[slot_name].children` 재구성                |
| `overrides`     | `descendants[path].props` 형식으로 변환                 |
| `page_id`       | canonical tree 의 page 노드 위치로 대체 (nullable 유지) |

**50+ legacy fixture 검증 plan**:

```
apps/builder/src/lib/db/indexedDB/__tests__/fixtures/
  legacy-simple-page.json         (layout_id = null 단순 페이지)
  legacy-with-layout.json         (layout_id 포함, slot_name 2건)
  legacy-master-instance.json     (masterId + overrides)
  legacy-nested-slots.json        (중첩 slot_name)
  legacy-multi-page.json          (5 pages, 2 layouts)
  ... (총 50+ 케이스)
```

각 fixture 에 대해:

1. `loadLegacy(fixture)` → `_meta.schemaVersion = "legacy"`
2. `runMigration(projectId)` 실행
3. `resolveCanonicalDocument(doc)` PASS 확인
4. 시각 회귀 여부: 핵심 fixture 는 Chrome MCP parallel-verify 경유 확인

**rollback 시나리오**:

- Migration 실패 → `_meta.schemaVersion = "legacy"` 유지 (Step 2 abort)
- App 재시작 시 legacy read-through adapter 경유 정상 동작
- 경고 배너 표시: "일부 데이터를 최신 형식으로 변환하지 못했습니다. 지원팀에 문의하세요."
- `_meta.backupKey` 로 pre-migration JSON blob 접근 → 수동 복구 가능

**Sub-Gate G5-B**:

```bash
# migration 후 legacy 필드 잔존 0 확인 (migrated 문서 한정)
# (실제 DB는 테스트 환경이므로 fixture 기반 확인)
# 50+ legacy fixture 전수 변환 PASS + roundtrip 정합성 확인
```

- 50+ legacy fixture → canonical 변환 성공률 **≥ 99%** (허용 실패: 비정형 데이터 1% 미만)
- `resolveCanonicalDocument()` roundtrip 회귀 **0건**
- pre-migration backup 생성 확인 (backupKey 비어있지 않음)

**Risk**: HIGH.

| 위험                          | 심각도 | 대응                                                                     |
| ----------------------------- | :----: | ------------------------------------------------------------------------ |
| migration 실패 시 데이터 손실 |  HIGH  | Step 1 backup 필수 완료 후 Step 2 진입. rollback 경로 명시               |
| 대용량 프로젝트 migration OOM |  MED   | 청크 단위 처리 (500 elements/batch IDBTransaction) + 진행 표시 UI        |
| 부분 migration (중간 abort)   |  MED   | IDBTransaction 단일 트랜잭션 — 원자성 보장 (partial write 불가)          |
| componentRole 변환 의미 손실  |  MED   | `metadata.componentRole` 보존 (P5-B 결정 필요, §4 DesignKit 결정과 연계) |

**추정 시간**: ~10h (알고리즘 구현 4h + fixture 작성/테스트 6h)

---

### 2.3 P5-C: adapter shim 완전 해체

**전제**: P4 G4 통과 (결정 5: P4 완료 시점 shim 해체). P5 진입 = shim 해체 착수.

**목표**: `apps/builder/src/adapters/legacy-layout/` (P3-A 에서 격리된 shim 모듈)
의 read-through adapter 를 완전 제거한다. canonical 저장/로드 단일 경로만 잔존.

**대상**:

```
apps/builder/src/adapters/legacy-layout/         ← 이 디렉터리 전체 삭제
  slotAndLayoutAdapter.ts   (legacyOwnershipToCanonicalParent 등)
  tagRename.ts              (P5-B migration script 내재화 후 제거)
  componentRoleAdapter.ts   (componentRole legacy 처리)
  idPath.ts                 (legacy id path 변환 — canonical idPath 로 이관)
  types.ts                  (legacy adapter 전용 타입)
  index.ts                  (export surface)
  __tests__/                (adapter compat test — P5-B 완료 후 불필요)
```

> P3-A 에서 격리한 디렉터리명이 `adapters/canonical/` 이고
> legacy shim 은 P3 작업 시 `adapters/legacy-layout/` 로 이관 예정.
> 현재 코드베이스의 `adapters/canonical/slotAndLayoutAdapter.ts` 등이
> P3 완료 후 `adapters/legacy-layout/` 로 이동되어 있는 상태가 전제.

**작업**:

1. `grep -r "legacy-layout\|legacyOwnership\|convertSlotElement\|convertPageLayout" apps/builder/src/ --include='*.ts'` → 잔존 호출처 전수 확인
2. 각 호출처를 canonical path 로 교체 (이미 P3-D/P4 에서 대부분 완료 상태여야 함)
3. `adapters/legacy-layout/` 디렉터리 삭제
4. `tagRename.ts` 의 `tagToType()` 는 P5-B migration script 에 직접 내재화 후 adapter 버전 삭제

**Sub-Gate G5-D** (ADR-903 본문 G5 조건 f 부분):

```bash
grep -r "legacyOwnership\|legacy-layout\|convertSlotElement\|convertPageLayout\|LegacyLayoutId\|LegacyLayoutOwnership" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l
```

→ **0**

**Risk**: MEDIUM.

P3-D + P4 에서 대부분 canonical path 전환이 완료된 상태이므로 남은 작업은
"마지막 호출처 3~5개 교체 + 디렉터리 삭제". 단, 누락된 호출처가 있을 경우
runtime error 가 발생하므로 grep 전수 확인이 필수.

**추정 시간**: ~4h

---

### 2.4 P5-D: imports resolver 기반 구현

**목표**: P0 에서 스텁으로만 정의된 `CompositionDocument.imports?: Record<string, string>`
의 실 구현을 완성한다. 외부 `.pen` 또는 canonical 문서를 URL/path 로 fetch 하고,
해당 문서의 reusable 노드를 `ref: "<importKey>:<nodeId>"` 형식으로 인스턴스화한다.

**인터페이스 설계**:

```ts
// packages/shared/src/types/import-resolver.types.ts (신규)

/**
 * import key + 외부 URL/path 매핑.
 * CompositionDocument.imports 의 한 엔트리.
 * 예: { "basic-kit": "./kits/basic.pen" }
 *     { "icon-kit": "@composition/icon-kit" }
 */
type ImportEntry = { key: string; source: string };

/**
 * Import resolver 인터페이스.
 * 실제 구현은 환경에 따라 교체 (browser fetch / Node.js fs / test mock).
 */
interface ImportResolver {
  /** 외부 source 를 fetch 하여 CompositionDocument 반환. */
  fetchDocument(source: string): Promise<CompositionDocument>;
  /** resolver cache. importKey 단위 LRU 캐시. */
  cache: ImportCache;
}

interface ImportCache {
  get(importKey: string): CompositionDocument | undefined;
  set(importKey: string, doc: CompositionDocument): void;
  invalidate(importKey: string): void;
  clear(): void;
}
```

**URL/path resolver 두 패턴 지원**:

| 패턴            | 예시                                | resolver 전략                                     |
| --------------- | ----------------------------------- | ------------------------------------------------- |
| 상대 path       | `"./kits/basic.pen"`                | `fetch(new URL(source, document.baseURI))`        |
| npm-style scope | `"@composition/icon-kit"`           | registry URL 로 resolve (별도 registry 설정 필요) |
| http/https URL  | `"https://cdn.example.com/kit.pen"` | `fetch(source)` + CORS 검증                       |

**`ref: "basic-kit:round-button"` 형식 resolver 통합**:

현재 `resolveCanonicalDocument()` 는 `RefNode.ref` 가 외부 import key 포함 형식을
처리하지 않는다. P5-D 에서 다음 분기를 추가한다:

```ts
// resolvers/canonical/index.ts 변경 (개념 코드)
function resolveRef(
  refNode: RefNode,
  doc: CompositionDocument,
  cache,
  importResolver?,
): ResolvedNode {
  if (refNode.ref.includes(":")) {
    // import ref: "importKey:nodeId"
    const [importKey, nodeId] = refNode.ref.split(":", 2);
    const importDoc = importResolver?.cache.get(importKey);
    if (!importDoc) {
      // fetch 는 비동기 → P5-D 에서 동기 캐시 히트 설계 + async prefetch
      throw new ImportNotLoadedError(importKey);
    }
    const masterNode = importDoc.children.find(
      (n) => n.id === nodeId && isReusable(n),
    );
    // ... 이하 기존 ref resolve 흐름
  }
  // 기존 local ref resolve
}
```

**fetch + cache 전략**:

- 메모리 LRU 캐시 (최대 20 import docs). 세션 중 invalidation 기준: 외부 source URL 변경.
- IndexedDB 캐시는 P5-E 범위 (ResolverCache 통합 시 함께 설계).
- fetch 는 비동기이므로 **document open 시 prefetch** 패턴:
  ```ts
  // document load 시 imports 전수 prefetch
  for (const [key, source] of Object.entries(doc.imports ?? {})) {
    importResolver
      .fetchDocument(source)
      .then((impDoc) => importResolver.cache.set(key, impDoc));
  }
  ```
  → resolver 는 캐시 히트를 동기로 소비. 캐시 미스 시 `ImportNotLoadedError` (개발 경고 수준).

**invalidation 시점**:

- `doc.imports` 의 source URL 변경 시 → 해당 importKey cache invalidate
- 외부 파일 변경 감지: 브라우저 환경에서는 자동 변경 감지 불가 → "새로고침" 또는
  명시적 "Import 다시 로드" 액션 제공
- 개발 환경: hot-reload 시 전체 import cache clear

**보안 (CORS / origin 검증)**:

- `fetch()` 는 브라우저 CORS 정책을 자동 적용
- 허용 origin 화이트리스트 설정: `importResolver.allowedOrigins: string[]`
  (비어있으면 동일 origin 한정, 명시적 추가 시 cross-origin 허용)
- `@composition/*` scope 패키지: composition 공식 CDN origin 만 허용 (hardcoded)
- 악의적 import source 방어: URL scheme 화이트리스트 (`https`, `file`(dev only)) 체크

**Sub-Gate G5-C**:

```bash
# imports resolver 구현 확인
grep -rn "ImportResolver\|ImportCache\|fetchDocument" \
  packages/shared/src/ apps/builder/src/ --include='*.ts' | wc -l
# > 0 (실 구현 존재)
```

- `ref: "basic-kit:round-button"` 형식 e2e 테스트 PASS
- 외부 `.pen` 파일 fetch + cache + resolve 단위 테스트 PASS
- `ImportNotLoadedError` 경고 emit 확인

**Risk**: MEDIUM.

| 위험                         | 심각도 | 대응                                                |
| ---------------------------- | :----: | --------------------------------------------------- |
| 외부 fetch 실패 시 렌더 중단 |  MED   | `ImportNotLoadedError` graceful — fallback 빈 frame |
| import 무한 루프 (A→B→A)     |  MED   | fetch depth limit 3 + 순환 감지 Set                 |
| 대용량 외부 doc 메모리 OOM   |  LOW   | LRU 캐시 max size 설정 + 오래된 항목 eviction       |
| CORS 제한으로 외부 kit 불가  |  LOW   | composition 공식 CDN 화이트리스트 + 오류 안내 UI    |

**추정 시간**: ~12h (resolver 4h + cache 3h + 보안 2h + e2e 테스트 3h)

---

### 2.5 P5-E: imports ↔ ResolverCache 통합

**목표**: P5-D 의 `ImportCache` (import key → CompositionDocument) 와 P2 의 `ResolverCache`
(ref resolve fingerprint 캐시) 를 통합하여 중복 캐시 계층을 제거하고 일관된 invalidation
정책을 적용한다.

**현재 ResolverCache (P2 구현)**:

```ts
// packages/shared/src/types/canonical-resolver.types.ts:77
// ResolverCache — docVersion + descendants fingerprint 기반 캐시
```

**통합 설계 (2-layer)**:

```
Layer 1: ImportCache (import key → CompositionDocument)
   ↓ doc 접근 시 Layer 2 trigger
Layer 2: ResolverCache (refNode fingerprint → ResolvedNode)
   — import doc 에서 온 refNode 도 동일 fingerprint 로 캐시
```

- `docVersion` 계산에 `import source URL` 포함 → import doc 변경 시 자동 invalidation
- `computeDescendantsFingerprint()` 는 변경 없음 — import ref 도 동일 함수 사용

**IndexedDB 영속 캐시 (선택)**:

import doc 는 외부 fetch 결과이므로 세션 간 재사용 이점이 있다. 단, 신선도 관리 필요:

```ts
// IndexedDB "import_cache" store (선택적 추가)
interface ImportCacheRecord {
  importKey: string; // keyPath
  source: string;
  fetchedAt: string; // ISO timestamp
  doc: CompositionDocument;
  etag?: string; // HTTP ETag 기반 조건부 fetch
}
```

- TTL: 24시간 (configurable)
- ETag 지원 시 조건부 fetch (`If-None-Match`) 로 대역폭 절약
- 이 IndexedDB store 추가는 DB_VERSION 10 (P5-E 전용 bump) 으로 처리 — P5-A/B 와 분리

**Sub-Gate G5-E** (합성, P5-D 포함):

```bash
# imports resolver + ResolverCache 통합 확인
grep -rn "ImportCache\|ImportResolver" \
  packages/shared/src/ apps/builder/src/resolvers/ --include='*.ts' | wc -l
# > 0 (통합 구현 존재)
```

- P2 ResolverCache 기존 테스트 전원 PASS (회귀 0건)
- import ref + local ref 혼재 문서 resolve 단위 테스트 PASS

**Risk**: LOW.

P2 ResolverCache 는 이미 fingerprint 기반으로 설계되었으므로 통합은 `docVersion` 에
import source 를 포함하는 1줄 변경 수준. IndexedDB 영속 캐시는 선택적이므로 생략 가능.

**추정 시간**: ~5h

---

### 2.6 P5-F: DesignKit 통합 결정 실행

**배경**: ADR-903 §R7 은 DesignKit (복사-적용 파이프라인) 과 `imports` (참조형) 를
**별도 migration track** 으로 분리하고, 통합 여부를 별도 ADR 에서 결정한다고 명시한다.
P5-F 는 그 결정을 실행하는 단계다.

**DesignKit 현재 동작** (P5 진입 시점 기준):

- `kitLoader.ts:259`: `localId → new UUID` 재발급 + 프로젝트 삽입 (복사본)
- `kitExporter.ts:33`: snapshot JSON export
- metadata: `metadata.importedFrom = "designkit:<kit-id>"` (ADR-903 §R7 d)

#### 옵션 A: DesignKit 영구 별도 track 유지

- 복사-적용 파이프라인 현행 유지. `imports` 참조형과 의미 분리 명시.
- DesignKit 관련 코드: kitLoader / kitExporter / DesignKitPanel 변경 없음.

**위험**:

- 기술 LOW (변경 없음) / 유지보수 MED (두 자산 가져오기 패러다임 병존) /
  마이그레이션 LOW

**적합 조건**: DesignKit 이 "kit 내용을 프로젝트에 복사하는 일회성 작업" 으로 충분하고,
외부 원본 업데이트를 추적할 필요가 없는 경우.

#### 옵션 B: DesignKit → imports 참조형 마이그레이션 (장기)

- kitLoader 를 `imports resolver` 기반으로 재작성. kit 는 외부 참조로만 사용.
- 기존 복사본: `metadata.importedFrom` 추적 + "참조형으로 전환" 마이그레이션 UI 제공.

**위험**:

- 기술 HIGH (kitLoader 전면 재작성, 외부 kit hosting 인프라 필요) /
  유지보수 LOW (단일 패러다임) / 마이그레이션 HIGH (기존 복사본 처리 복잡)

**적합 조건**: composition 이 "design system kit 구독 모델" 을 목표로 하는 경우.
외부 kit 업데이트가 자동 반영되어야 하는 경우.

#### 옵션 C: DesignKit 을 imports 의 한 사례로 wrap (adapter, 권고)

- `kitLoader.ts` 는 유지하되, import resolution 의 **특수 케이스** 로 등록:
  ```ts
  // importResolver 에 DesignKit resolver 등록
  importResolver.register("designkit", async (source) => {
    // source = "designkit:kit-id" → kitLoader 경유 문서 반환
    return await kitLoader.loadAsCanonicalDocument(kitId);
  });
  ```
- DesignKit 의 복사 의미론은 유지하되 `ref: "designkit:<kit-id>:<nodeId>"` 형식 인스턴스화 지원.
- kit 원본 업데이트 시 "kit 업데이트 적용" 액션 → re-import + canonical tree 내 복사본 갱신.

**위험**:

- 기술 MED (kitLoader 인터페이스 변경, 복사 의미론 유지하면서 import ref 형식 지원) /
  유지보수 LOW (단일 resolver 진입점) / 마이그레이션 LOW (기존 복사본은 현행 유지)

**위험 비교**:

| 옵션 | 기술 | 유지보수 | 마이그레이션 | 비고                                  |
| :--: | :--: | :------: | :----------: | ------------------------------------- |
|  A   | LOW  |   MED    |     LOW      | 현행 유지, 이원화 영구화              |
|  B   | HIGH |   LOW    |     HIGH     | 참조형 단일화, 인프라 필요            |
|  C   | MED  |   LOW    |     LOW      | wrapper 통합, 복사 의미론 보존 (권고) |

**권고**: **옵션 C** — DesignKit 을 imports resolver 의 특수 케이스로 wrap.

근거:

1. 옵션 A 의 이원화는 `imports` 참조형 구현 이후에도 두 자산 가져오기 패러다임이 병존해
   UX 혼란을 남긴다 (사용자가 "kit 삽입" vs "import 참조" 를 구분해야 함).
2. 옵션 B 는 외부 kit hosting 인프라가 없으면 실현 불가. DesignKit 의 현재 사용 패턴
   (로컬 JSON 파일 가져오기) 과 맞지 않는다.
3. 옵션 C 는 `kitLoader` 의 복사 의미론을 보존하면서 resolver 단일 진입점을 달성한다.
   `metadata.importedFrom: "designkit:<kit-id>"` 추적이 이미 ADR-903 §R7 d 로 land 되어
   있으므로 traceability 는 현재도 확보됨.

**P5-F 작업** (옵션 C 기준):

1. `kitLoader.ts` 에 `loadAsCanonicalDocument(kitId): Promise<CompositionDocument>` 추가
2. `importResolver.register("designkit", ...)` 등록 (P5-D ImportResolver 확장)
3. `ref: "designkit:<kit-id>:<nodeId>"` 형식 resolver 분기 추가
4. DesignKit Panel: "복사 삽입" 대신 "참조 삽입" 옵션 UI 추가 (선택적)
5. 기존 복사본(`metadata.importedFrom = "designkit:*"`) 은 현행 그대로 유지

**Sub-Gate G5-F**:

```bash
# DesignKit 통합 확인
grep -n "designkit\|loadAsCanonicalDocument" \
  apps/builder/src/utils/designKit/kitLoader.ts | wc -l
# > 0 (통합 구현 존재)
```

- `ref: "designkit:icon-kit:arrow-icon"` resolve e2e PASS
- 기존 `kitLoader.ts` 복사 삽입 동작 회귀 **0건**

**Risk**: MEDIUM. 옵션 C 는 kitLoader 인터페이스 확장이 필요하나, 기존 복사 의미론을
보존하므로 기존 DesignKit 사용자에게 breaking change 없음.

**추정 시간**: ~8h (kitLoader 확장 3h + resolver 연결 2h + 테스트 3h)

---

## 3. 의존 그래프 + 일정 추정

```
P5-A (schema 정의)         ~3h   LOW
  ↓
P5-B (migration script)    ~10h  HIGH      ← 사용자 데이터 보호 최우선
  ↓
P5-C (shim 해체)           ~4h   MEDIUM
  ↓
P5-D (imports resolver)    ~12h  MEDIUM
  ↓
P5-E (cache 통합)          ~5h   LOW
  ↓
P5-F (DesignKit 통합)      ~8h   MEDIUM
                       ─────────────────
                       total ~42h
```

**권장 PR 분할**:

| PR    | 범위        | 병렬 가능 with | 비고                                     |
| ----- | ----------- | -------------- | ---------------------------------------- |
| PR-5A | P5-A        | —              | schema 정의만, 데이터 변경 없음          |
| PR-5B | P5-B        | —              | migration script + 50+ fixture 검증 포함 |
| PR-5C | P5-C        | —              | shim 해체, P5-B 완료 후 진입             |
| PR-5D | P5-D + P5-E | —              | imports resolver + cache 통합            |
| PR-5F | P5-F        | —              | DesignKit 통합 (옵션 C 결정 후)          |

> P5-D 와 P5-E 는 밀접하게 결합되므로 단일 PR 권장.

---

## 4. ADR-903 G5 조건 매핑

| G5 조건                                       | sub-phase 커버                   |
| --------------------------------------------- | -------------------------------- |
| (a) 기존 프로젝트 100% read-through 로드 가능 | P5-A + P5-B (migration + backup) |
| (b) hybrid 1472 ref canonical 전환 0 miss     | P5-B migration + P5-C shim 해체  |
| (c) roundtrip 시각 회귀 0건                   | P5-B fixture 50+ 검증            |
| (d) layoutTemplates.ts 28건 Slot → canonical  | P5-B migration script 포함       |
| (e) DB tag → type 전환                        | P5-B migration script            |
| (f) legacy layout API 최종 0건                | P5-C shim 해체 + G5-D grep = 0   |

---

## 5. Gates

> ADR-903 G5 를 세부 Gate 로 분해.

| Gate     | 시점      | 통과 조건                                                                                       | 실패 시 대안                                          |
| -------- | --------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **G5-A** | P5-A 완료 | `_meta` store 실 구현 + DB_VERSION 9 schema 정의 완료 + type-check PASS                         | DB_VERSION 8 유지 + P5-B 보류                         |
| **G5-B** | P5-B 완료 | 50+ legacy fixture 변환 성공률 ≥ 99% + roundtrip 회귀 0건 + pre-migration backup 자동 생성 확인 | migration 실패율 > 1% → legacy read-through 기간 연장 |
| **G5-C** | P5-D 완료 | `ref: "importKey:nodeId"` 형식 e2e PASS + ImportNotLoadedError graceful fallback PASS           | imports 기능 비활성화 + 스텁 유지                     |
| **G5-D** | P5-C 완료 | `grep legacyOwnership\|legacy-layout\|convertSlotElement` → 0건                                 | shim 읽기 전용 보존                                   |
| **G5-E** | P5-E 완료 | P2 ResolverCache 기존 테스트 PASS (회귀 0) + import ref 혼재 문서 PASS                          | ImportCache 독립 계층 유지                            |
| **G5-F** | P5-F 완료 | `ref: "designkit:*"` resolve PASS + 기존 kitLoader 복사 동작 회귀 0건                           | 옵션 A 전환 (DesignKit 별도 유지)                     |

---

## 6. 회귀 검증 매트릭스

| 검증 항목                           | 위치                                                   | sub-phase |
| ----------------------------------- | ------------------------------------------------------ | :-------: |
| `_meta` store CRUD                  | `lib/db/__tests__/meta.test.ts`                        |   P5-A    |
| legacy fixture 50+ → canonical 변환 | `lib/db/__tests__/migration.test.ts`                   |   P5-B    |
| pre-migration backup 생성 확인      | `lib/db/__tests__/migration.test.ts`                   |   P5-B    |
| roundtrip 시각 회귀                 | `parallel-verify` skill (Chrome MCP) 핵심 fixture 5건  |   P5-B    |
| adapter shim grep = 0               | CI Gate (grep 명령, P3 §결정 4 패턴)                   |   P5-C    |
| import ref resolve e2e              | `resolvers/canonical/__tests__/importResolver.test.ts` |   P5-D    |
| ResolverCache 회귀                  | `resolvers/canonical/__tests__/cache.test.ts`          |   P5-E    |
| DesignKit resolve e2e               | `utils/designKit/__tests__/kitLoader.test.ts`          |   P5-F    |

---

## 7. P5 진입 전 결정 사항

P5-A 착수 전에 다음 항목의 확인이 필요하다.

| ID       | 결정                                    | 권고                               | 차단 대상      |
| -------- | --------------------------------------- | ---------------------------------- | -------------- |
| **P5-1** | `componentRole` 변환 방향 (P5-B 내)     | `metadata.componentRole` 보존 권고 | P5-B 착수      |
| **P5-2** | `import_cache` IndexedDB 영속 캐시 여부 | 선택적 구현 — P5-E 에서 결정       | P5-E 착수      |
| **P5-3** | DesignKit 통합 옵션 (P5-F)              | 옵션 C 권고 (wrap adapter)         | P5-F 착수      |
| **P5-4** | import source 허용 origin 화이트리스트  | 동일 origin 기본 + 명시 추가       | P5-D 보안 구현 |

> **결정 P5-1** 은 P5-B migration script 의 `componentRole` 변환 코드에 직접 영향.
> 이견 없으면 `metadata.componentRole` 보존으로 즉시 진행.

---

## 8. 후속 Phase 와의 관계

- **P3-E** (전제): layout_id 인덱스 제거 + `_meta` store 스텁 — P5-A 는 이를 완성
- **G5 완료 시점**: ADR-903 전체 Gate 완결. legacy adapter, layout store, hybrid field
  전부 해체. composition 은 canonical format 단일 source 로 동작.
- **G5 이후 잔존 작업** (ADR-903 범위 외):
  - `Element.tag` 1031 참조 → `Element.type` rename 은 P5-B migration script 와 동시에
    codebase 수준 rename (ast-grep 또는 ts-morph 활용). G5 조건 (b) 에 포함.
  - history/undo stack 의 canonical serialization — P4 G4 에서 상당 부분 완료되나,
    완전한 undo determinism 은 P5 완료 후 별도 검증.
  - 성능 벤치마크: P5 완료 후 `resolveCanonicalDocument` + IndexedDB load 의 50개
    element 이상 프로젝트 측정 (Builder 편집 반응성 현 수준 유지 확인).
