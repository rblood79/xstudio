# ADR-903 P3-E — Persistence sub-breakdown (IndexedDB schema 마이그레이션)

## Status

Proposed — 2026-04-26

---

## 부모 문서 / ADR 본문 / 관련 링크

| 문서                | 경로                                                                                                                                 | 관련 항목                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 부모 sub-breakdown  | [903-phase3-frameset-breakdown.md](903-phase3-frameset-breakdown.md)                                                                 | §2.5 P3-E + §3 의존성 + §6 P3→P5         |
| 결정 문서           | [903-phase3-decisions.md](903-phase3-decisions.md)                                                                                   | 결정 3: `_meta` object store + backupKey |
| ADR-903 본문        | [../903-ref-descendants-slot-composition-format-migration-plan.md](../903-ref-descendants-slot-composition-format-migration-plan.md) | R4 위험 + G5 조건                        |
| P5 persistence 연계 | [903-phase5-persistence-imports-breakdown.md](903-phase5-persistence-imports-breakdown.md)                                           | P5-B migration script + P5-C shim 해체   |
| 회귀 위험 패턴      | [903-phase3a-regression-risk.md](903-phase3a-regression-risk.md)                                                                     | 안전망 패턴 reference                    |
| 검증 계획 sibling   | [903-p3d4-phase-d-verification.md](903-p3d4-phase-d-verification.md)                                                                 | 구조 참조 (Phase C 정합화 시나리오)      |

---

## Context

### P3-E 진입 조건 (현재 미충족)

P3-E 착수 전 아래가 모두 충족되어야 한다:

| 조건                                            |  상태  | 비고                      |
| ----------------------------------------------- | :----: | ------------------------- |
| P3-D-1 (factory ownership 제거) 머지            | 미충족 | PR 미머지 잔여            |
| P3-D-2 (elementCreation canonical context) 머지 | 미충족 | PR 미머지 잔여            |
| P3-D-4 Phase C 정합화 완료                      | 미충족 | P3-D-1 선행 필요          |
| P3-D-5 6/6 종결                                 |  충족  | 세션 33 완료              |
| G3 (a)~(e) 통과 ≈ 100%                          | 미충족 | P3-D 전 sub-phase 머지 후 |

**핵심 원칙**: P3-E 는 IndexedDB 에서 `layout_id` 를 읽고 쓰는 코드 경로가 이미 canonical 전환된 이후에만 안전하게 착수할 수 있다. P3-D 가 완결되기 전 schema 를 바꾸면 P3-D 와 충돌하여 양방향 회귀가 발생한다.

### 현재 IndexedDB schema 상태

현재 `IndexedDBAdapter` (`apps/builder/src/lib/db/indexedDB/adapter.ts`) 의 schema:

- **DB_NAME**: `"composition"` (line 31)
- **DB_VERSION**: `7` (line 32) — 버전 7 = Data Panel 스토어들 추가
- **`elements` object store** (line 75-101):
  - index `layout_id` 존재 — line 86-88 (신규 생성 시) + line 95-100 (버전 5 업그레이드 시)
  - 주석: `✅ Layout/Slot System` (line 88)
- **`layouts` object store** (line 160-189):
  - 버전 4 에서 추가 (`✅ 버전 4: Layouts store`)
  - 버전 6 에서 `order_num`, `slug` 인덱스 추가
- **`getByLayout` 메서드** (line 754-763): `"layout_id"` 인덱스 기반 조회
- **기존 `_meta` store 없음**: `_meta` object store 는 현재 미존재

`apps/builder/src/utils/` 의 추가 참조 (2건):

- `apps/builder/src/utils/urlGenerator.ts:45` — JSDoc 주석에 `layout_id` 예시 (line 45)
- `apps/builder/src/utils/urlGenerator.ts:219` — `page.layout_id ? layouts.find(...)` 런타임 분기
- `apps/builder/src/utils/element/elementUtils.ts:44` — `el.layout_id === layoutId && el.tag === 'body'` 필터

총 `lib/` 내 직접 참조: 6건 (`adapter.ts` 단독). `utils/` 추가: 3건 (2 파일).

### 결정 3: `_meta` object store + backupKey (확정)

[903-phase3-decisions.md §결정 3](903-phase3-decisions.md) 에서 **옵션 C** 채택 확정:

```ts
// _meta object store (신규, project scoped)
interface MetaRecord {
  projectId: string; // keyPath
  schemaVersion: "legacy" | "composition-1.0";
  migratedAt?: string; // ISO timestamp
  backupKey?: string; // pre-migration backup reference
}
```

근거 요약:

1. 기존 `projects` / `elements` / `pages` / `layouts` 스토어 schema 를 **건드리지 않음** → P3-E 이전 sub-phase 의 IndexedDB 회귀 위험 0
2. `backupKey` 필드로 pre-migration backup 참조 보존 → rollback 경로 확보
3. project 단위 원자 전환 원칙 (ADR-903 HC #2) 정합

---

## 현재 코드 분석

### adapter.ts 의 layout_id 사용 (6 ref)

| Line    | 위치                          | 내용                                                   | P3-E 작업                                                       |
| ------- | ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| 86      | `onupgradeneeded` 신규 생성   | `elementsStore.createIndex("layout_id", ...)`          | 버전 8 업그레이드: index 유지 또는 조건부 보존                  |
| 88      | 위와 동일                     | 주석 `✅ Layout/Slot System`                           | 주석 업데이트                                                   |
| 91      | 버전 5 업그레이드 분기        | 조건부 `layout_id` 인덱스 추가                         | 신규 DB 에서는 불필요 (legacy 분기만 유지)                      |
| 95      | 위 조건                       | `if (!elementsStore.indexNames.contains("layout_id"))` | legacy 분기 그대로 보존                                         |
| 96-99   | 위                            | index 생성 + console.log                               | 보존                                                            |
| 754-763 | `elements.getByLayout` 메서드 | `getAllByIndex("elements", "layout_id", layoutId)`     | P3-E 이후: `@deprecated` 마크 + migration script 한정 주석 추가 |

**핵심 관찰**: `adapter.ts` 의 `layout_id` 참조는 모두 (a) schema 정의 (인덱스 생성) 또는 (b) 단일 조회 메서드(`getByLayout`)에 집중된다. `adapter.ts` 자체가 schema 권위를 가지므로, P3-E 의 schema 변경은 반드시 `adapter.ts` 의 `onupgradeneeded` 블록에서 수행해야 한다.

### utils/ 의 layout_id 참조 (3 ref)

| 파일              | Line | 내용                                 | P3-E 작업                                                |
| ----------------- | ---- | ------------------------------------ | -------------------------------------------------------- |
| `urlGenerator.ts` | 45   | JSDoc 예시 `layout_id`               | 주석 교체 (`parentFrameId` 또는 제거)                    |
| `urlGenerator.ts` | 219  | `page.layout_id ? layouts.find(...)` | P3-D 완료 시 자연 해소 예정 — P3-E 시점에 잔존 여부 확인 |
| `elementUtils.ts` | 44   | `el.layout_id === layoutId` 필터     | P3-D-1 완료 후 canonical parent 기반 필터로 교체         |

**예상 G3-E 측정 결과**: P3-D 전 sub-phase 머지 + P3-E 완료 후 `lib/` 0건, `utils/` 0건 (migration script 제외).

---

## Schema 변경 안

### DB_VERSION: 7 → 8

```ts
const DB_VERSION = 8; // P3-E: _meta store 추가 + elements.layout_id index @deprecated 마크
```

**변경 내용**:

1. **신규**: `_meta` object store 추가 (keyPath: `"projectId"`)
2. **유지**: `elements` store 의 `layout_id` index — 기존 데이터 read-through 를 위해 **버전 8 에서도 유지** (P5-B migration script 완료 후 버전 9 에서 제거 예정)
3. **유지**: `layouts` store 전체 — P3-E 는 `layouts` store 를 삭제하지 않음. P5-B 가 처리
4. **신규 타입 인터페이스**:

```ts
// apps/builder/src/lib/db/indexedDB/types.ts (신규 또는 adapter.ts 상단에 추가)
export interface MetaRecord {
  projectId: string;
  schemaVersion: "legacy" | "composition-1.0";
  migratedAt?: string; // ISO timestamp — migration 완료 시각
  backupKey?: string; // JSON export key (localStorage 또는 별도 blob 참조)
}
```

### onupgradeneeded 버전 8 블록 (예시)

```ts
// ✅ 버전 8: _meta object store 추가 (P3-E — canonical schema version tracking)
if (!db.objectStoreNames.contains("_meta")) {
  db.createObjectStore("_meta", { keyPath: "projectId" });
  console.log("[IndexedDB] Created store: _meta");
}
// Note: elements.layout_id index 는 P5-B migration 완료 후 버전 9 에서 제거 예정
// @see docs/adr/design/903-phase5-persistence-imports-breakdown.md §P5-B
```

### schemaVersion 조회 패턴

```ts
// adapter.ts 에 신규 메서드 추가
meta = {
  get: async (projectId: string): Promise<MetaRecord | null> => {
    return this.getFromStore<MetaRecord>("_meta", projectId);
  },
  set: async (record: MetaRecord): Promise<void> => {
    await this.putToStore("_meta", record);
  },
  update: async (
    projectId: string,
    updates: Partial<MetaRecord>,
  ): Promise<void> => {
    const existing = await this.meta.get(projectId);
    if (!existing) {
      throw new Error(`MetaRecord not found for project: ${projectId}`);
    }
    await this.putToStore("_meta", { ...existing, ...updates });
  },
};
```

---

## Migration Script 설계

### 목표

기존 `layout_id` 기반 elements 를 가진 사용자 DB 를 canonical schema 로 1회 변환. 실패 시 데이터 보전 + 경고 표시.

### 변환 흐름

```
initializeProject() 호출
    ↓
_meta.get(projectId) 조회
    ↓
┌─────────────────────────────────────────────────┐
│ schemaVersion 확인                               │
│                                                  │
│  "composition-1.0" → canonical direct read      │
│  null (미등록) or "legacy" → migration 실행    │
└─────────────────────────────────────────────────┘
    ↓ migration 실행
1. backup: elements.getAll() + layouts.getAll()
           → JSON stringify → localStorage 또는 IDB blob 저장
           → _meta.backupKey = <backup reference>

2. transform:
   legacy element (layout_id !== null) 각각에 대해:
   - legacyOwnershipToCanonicalParent(element) 호출 (P3-A adapter)
   - element.layout_id → canonical parent_id 업데이트
   - elements.put(transformedElement)

3. verify:
   transformed elements 재조회 → canonical parent 구조 검증
   실패 시 → step 4 (rollback)

4. commit or rollback:
   성공: _meta.set({ projectId, schemaVersion: "composition-1.0", migratedAt: now })
   실패: _meta.set({ projectId, schemaVersion: "legacy" }) + console.warn + UI 경고
         → graceful degradation: legacy adapter 경유 계속 동작
```

### 자동 backup 설계

```ts
interface MigrationBackup {
  projectId: string;
  timestamp: string;
  elements: Element[]; // layout_id 포함 원본 전체
  layouts: Layout[]; // layouts store 전체
  backupVersion: "legacy";
}

// backup key 패턴: "composition-migration-backup:<projectId>:<timestamp>"
const backupKey = `composition-migration-backup:${projectId}:${Date.now()}`;
localStorage.setItem(backupKey, JSON.stringify(backup));
// _meta.backupKey = backupKey
```

**backup 보존 정책**: localStorage 용량 제한으로 1 project 당 최신 1건만 유지. 이전 backup 은 덮어쓰기.

### graceful degradation

변환 실패 시:

1. `_meta.schemaVersion = "legacy"` 유지
2. `adapter.ts` 의 `getByLayout` 메서드 정상 동작 (legacy read-through 계속)
3. Builder UI 에 `[WARN] schema migration 실패 — 이전 버전으로 계속 동작 중` 배너
4. 다음 세션 재시도 가능 (`_meta.schemaVersion = "legacy"` 이면 migration 재시도 트리거)

### 검증: 50+ legacy fixture 케이스

| 검증 항목                                         | 방법                                                     |
| ------------------------------------------------- | -------------------------------------------------------- |
| layout element 가 올바른 canonical parent 로 변환 | `legacyOwnershipToCanonicalParent` unit test 50+ fixture |
| page element (layout_id = null) 는 변환 불필요    | 변환 전후 동일성 검증                                    |
| `order_num` 보존                                  | 변환 전후 order_num 정렬 동일                            |
| `_meta.schemaVersion` 업데이트 확인               | `meta.get(projectId)` → `"composition-1.0"`              |
| backup JSON 완전성                                | backup elements 수 = DB elements 수                      |
| rollback 시 DB 무손상                             | 실패 주입 후 elements 전수 재확인                        |

---

## Phase 분해

> **총 추정 시간**: 6~8h. P3-D-5 step 패턴 참조 (각 step = type-check 통과 + 회귀 위험 0 단위).

### Step E-1: `_meta` object store stub land (no migration) — ~1h

**작업**:

- `DB_VERSION` 7 → 8 증가
- `onupgradeneeded` 에 `_meta` store 생성 블록 추가
- `MetaRecord` 타입 인터페이스 정의 (`adapter.ts` 또는 별도 `types.ts`)
- `meta` 메서드 그룹 추가 (`get` / `set` / `update`)
- `getByLayout` 메서드에 `@deprecated P3-E: migration script 완료 후 제거 예정` JSDoc 추가

**회귀 위험**: 0 — schema 추가만, 기존 스토어 무변경. `DB_VERSION` 증가는 기존 DB 를 자동 업그레이드 (새 store 추가만).

**Sub-step 확인**:

- `type-check 3/3 PASS`
- `DB_VERSION = 8` 확인
- `_meta` store 생성 코드 존재 확인

---

### Step E-2: backup 함수 추가 — ~1h

**작업**:

- `adapter.ts` 또는 별도 `migrationBackup.ts` 에 `createMigrationBackup(projectId)` 함수 추가:
  ```ts
  async function createMigrationBackup(
    adapter: IndexedDBAdapter,
    projectId: string,
  ): Promise<string>; // returns backupKey
  ```
- localStorage 기반 JSON dump 구현
- backup key 패턴: `"composition-migration-backup:<projectId>:<Date.now()>"`
- 이전 backup 덮어쓰기 로직 (localStorage 용량 보호)

**회귀 위험**: 0 — 읽기 전용 함수. DB 쓰기 없음.

**Sub-step 확인**:

- `type-check 3/3 PASS`
- backup JSON 구조 확인 (`elements` + `layouts` + `backupVersion: "legacy"`)

---

### Step E-3: migration script read-through 구현 — ~2h

**작업**:

- `runLegacyToCanonicalMigration(adapter, projectId)` 함수 구현:
  1. `_meta.get(projectId)` 조회 → 이미 `"composition-1.0"` 이면 skip
  2. `createMigrationBackup()` 호출 → backupKey 획득
  3. `elements.getAll()` 전수 로드
  4. `layout_id !== null` 인 elements 에 `legacyOwnershipToCanonicalParent()` 적용
  5. 변환 결과 검증 (canonical parent 존재 확인)
  6. 성공: `elements.updateMany()` + `_meta.set({ schemaVersion: "composition-1.0", ... })`
  7. 실패: `_meta.set({ schemaVersion: "legacy" })` + 경고 로깅

- `apps/builder/src/lib/db/__tests__/migration.test.ts` 신규 작성:
  - 50+ legacy fixture (layout_id 있음 / 없음 / null mix)
  - round-trip: backup → migrate → 결과 검증
  - rollback 경로: 실패 주입 후 `schemaVersion = "legacy"` 확인

**회귀 위험**: MEDIUM → 안전망:

- migration 은 **read-through** 먼저: `elements.getAll()` 로드 + 변환 계산 → **DB 에는 아직 쓰지 않음**
- write 는 별도 step (E-6) 에서 실행. E-3 에서는 dry-run 모드
- unit test 로 변환 정합성 50+ fixture 확인 후 E-6 착수

**Sub-step 확인**:

- `migration.test.ts` 50+ fixture ALL PASS
- dry-run 모드 확인 (DB 무변경)
- `type-check 3/3 PASS`

---

### Step E-4: schema version field 및 `_meta` 생명주기 연결 — ~1h

**작업**:

- `initializeProject` 호출 경로 (`usePageManager.ts`) 에 migration 진입 조건 추가:
  ```ts
  const meta = await adapter.meta.get(projectId);
  if (!meta || meta.schemaVersion === "legacy") {
    await runLegacyToCanonicalMigration(adapter, projectId);
  }
  ```
- dev 모드: migration 실행 결과 console.log 출력
- UI 경고 배너 placeholder (`schemaVersion === "legacy"` 일 때 표시) — 실제 배너 구현은 E-5 이후 optional

**회귀 위험**: LOW — E-3 의 dry-run migration 만 호출하는 단계. 실제 DB write 는 E-6.

**Sub-step 확인**:

- `usePageManager.ts` 에 migration 진입 조건 코드 존재 확인
- `type-check 3/3 PASS`

---

### Step E-5: legacy column read-only 선언 (write 차단 준비) — ~0.5h

**작업**:

- `adapter.ts:getByLayout` 메서드에 `schemaVersion === "composition-1.0"` 시 early return + dev console.warn 추가:
  ```ts
  // composition-1.0 이후: getByLayout 호출은 migration script 에서만 허용.
  // 일반 caller 는 canonical parent 기반 조회를 사용할 것.
  if (process.env.NODE_ENV === "development") {
    const meta = await this.meta.get(/* projectId */);
    if (meta?.schemaVersion === "composition-1.0") {
      console.warn(
        "[IndexedDB] getByLayout called after canonical migration — use canonical parent query instead",
      );
    }
  }
  ```
- `utils/urlGenerator.ts:219` 및 `utils/element/elementUtils.ts:44` 의 `layout_id` 참조에 `// TODO(P3-E): canonical parent 기반으로 교체` 주석 추가

**회귀 위험**: 0 — dev-only warning, 실제 동작 변경 없음.

**Sub-step 확인**:

- `type-check 3/3 PASS`
- dev console.warn 코드 확인

---

### Step E-6: write-through 전환 (G3-E 통과 시점) — ~1.5h

**진입 조건**: P3-D 전 sub-phase 머지 완료 + G3 (a)~(e) ≈ 100% + migration.test.ts 50+ ALL PASS

**작업**:

- E-3 migration script 의 dry-run 플래그 제거 → 실제 `elements.updateMany()` 활성화
- `adapter.ts:getByLayout` 를 `schema === "composition-1.0"` 시 empty 배열 반환 (canonical path 강제)
- `utils/urlGenerator.ts:219` + `utils/element/elementUtils.ts:44` 의 `layout_id` 참조를 canonical parent 기반 쿼리로 교체
- G3-E 측정 명령 실행 → 0건 확인

**회귀 위험**: HIGH → 안전망:

- write 활성화 전 50+ fixture integration test PASS 필수
- 첫 실제 migration 은 dev 환경에서 브라우저 DevTools IndexedDB 탐색기로 수동 확인
- 실패 시 `_meta.schemaVersion = "legacy"` + legacy adapter fallback 즉시 복귀

**Sub-step 확인**:

- G3-E grep 0건 (`lib/` + `utils/` 합산, migration script 제외)
- type-check 3/3 PASS
- integration test (migration.test.ts) ALL PASS
- dev 환경 직접 IndexedDB 확인: `_meta` store + `schemaVersion: "composition-1.0"` 기록 확인

---

## 회귀 위험 평가

### 4축 위험 테이블

| 축               | 위험                                                                                            | 심각도 | 대응                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **기술**         | `legacyOwnershipToCanonicalParent()` 변환 로직 불완전 → layout element 의 canonical parent 오판 |  HIGH  | P3-A adapter 단위 테스트 50+ fixture + integration test 선행                                                                             |
| **성능**         | `elements.getAll()` 전수 로드 (대규모 프로젝트 시 수천 element) → migration 시간 지연           |  LOW   | batch 처리 + IndexedDB transaction 단일 commit (updateMany 사용). migration 은 1회성이므로 허용                                          |
| **유지보수**     | `_meta` store 의 `schemaVersion` 이 부분 업데이트되거나 backup 유실 시 상태 불일치              | MEDIUM | atomic transaction — backup 완료 후 migration write 후 `_meta` 업데이트를 동일 transaction 또는 try-catch-rollback 패턴으로 처리         |
| **마이그레이션** | 사용자 데이터 손실 — migration 실패 + backup 유실 시 layout element 접근 불가                   |  HIGH  | 3중 안전망: (1) localStorage backup 선행 (2) dry-run 검증 후 write (3) 실패 시 `schemaVersion = "legacy"` 유지 + legacy adapter fallback |

**HIGH 위험 2건** → Gate E-6 진입 전 두 조건 모두 충족 필수.

---

## R4 mitigation 매핑

ADR-903 본문 R4 = "DB 저장 포맷 전환을 너무 이르게 시작하면 undo/history/import/export 경로가 동시 회귀"

| R4 mitigation                                        | P3-E step 매핑                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "저장 포맷 전환은 마지막 Phase로 미루고"             | P3-E 는 P3-D 완료 후 착수 (의존 조건)                                                                     |
| "adapter 기반 shadow write 또는 read-through만 허용" | E-1~E-5 = dry-run + read-through only. write 는 E-6 마지막                                                |
| undo/history 경로 보호                               | E-3 migration script 은 `history` store 를 건드리지 않음. element 변환만                                  |
| import/export 경로 보호                              | `batch.export()` 는 `layouts` store 포함 → migration 후에도 동일 동작 유지 (`layouts` store P5 까지 유지) |
| rollback 가능                                        | `_meta.schemaVersion = "legacy"` + legacy adapter fallback + localStorage backup 3중                      |

---

## 검증 시나리오

### Unit Test 목록 (`lib/db/__tests__/migration.test.ts`)

| #    | 시나리오                                                          | 기대 결과                                                   |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| T-1  | legacy element (layout_id = "layout-abc") → canonical parent 변환 | canonical parent_id = legacyOwnershipToCanonicalParent 결과 |
| T-2  | page element (layout_id = null) → 변환 스킵                       | element 동일                                                |
| T-3  | 50+ fixture mix (layout/page 혼합)                                | 각각 올바른 변환                                            |
| T-4  | `_meta` 초기 상태 (미등록) → migration 실행                       | `schemaVersion: "composition-1.0"`                          |
| T-5  | `_meta.schemaVersion = "composition-1.0"` → migration skip        | 기존 elements 무변경                                        |
| T-6  | migration 중 변환 실패 (corrupt element)                          | `schemaVersion: "legacy"` + elements 무변경                 |
| T-7  | backup JSON 완전성                                                | elements count = DB count                                   |
| T-8  | backup key 저장 및 `_meta.backupKey` 연결                         | localStorage + `_meta.backupKey` 일치                       |
| T-9  | `order_num` 보존                                                  | 변환 전후 elements[i].order_num 동일                        |
| T-10 | round-trip: backup → migrate → `getAll()` 재조회                  | canonical parent 구조 올바름                                |

### Integration Test

- migration 실행 후 `initializeProject` 정상 완료 → Builder UI 렌더 회귀 0
- migration 후 page 전환: layout-linked elements 정상 로드 (P3-D-4 Phase C 정합화 후)
- migration 후 Undo/Redo 정상 동작
- write-through 전환 (E-6) 후 시각 회귀 0 (`/cross-check` 스킬)

---

## 체크리스트

### 진입 시 (P3-E 착수 전)

- [ ] P3-D-1 factory ownership 제거 PR 머지 완료
- [ ] P3-D-2 elementCreation canonical context PR 머지 완료
- [ ] P3-D-4 Phase C 정합화 완료 (usePageManager.ts layoutElements 미병합 해소)
- [ ] G3 (a)~(e) 통과 ≈ 100% 확인
- [ ] `legacyOwnershipToCanonicalParent()` P3-A 구현 완성 + unit test 통과 확인
- [ ] `type-check 3/3 PASS` (현재 baseline)

### 구현 중 (각 step 완료 시)

- [ ] E-1: `DB_VERSION = 8`, `_meta` store 생성, `MetaRecord` 타입, `meta` 메서드 그룹
- [ ] E-2: `createMigrationBackup()` 구현 + 읽기 전용 확인
- [ ] E-3: migration.test.ts 50+ fixture ALL PASS (dry-run 모드)
- [ ] E-4: `usePageManager.ts` migration 진입 조건 연결
- [ ] E-5: `getByLayout` dev warning + `utils/` TODO 주석
- [ ] E-6 진입 전: migration.test.ts 재확인 + dev 환경 수동 검증

### 구현 후 (P3-E 완료 기준)

- [ ] G3-E grep 0건 (`lib/` + `utils/`, migration script 제외)
- [ ] `_meta` store 에 `schemaVersion: "composition-1.0"` 기록 확인 (dev 브라우저)
- [ ] type-check 3/3 PASS
- [ ] integration test: page 전환 + Undo/Redo 회귀 0
- [ ] CHANGELOG 업데이트 (사용자 가시 schema 변경)

---

## 금지 패턴

- **자동 destructive migration 금지**: backup 없이 `elements.updateMany()` 실행 절대 금지. 반드시 `createMigrationBackup()` 선행
- **backup 없이 schema 변경 금지**: `_meta.backupKey` 설정 전 write 금지
- **P3-D 미완 상태 P3-E 착수 금지**: P3-D 완료 전 `layout_id` 참조가 factory/hooks/preview 에 잔존하면 migration 이 미완성 데이터를 변환하여 양방향 회귀 발생
- **`layouts` store 삭제 금지 (P3-E 범위)**: `layouts` store 제거는 P5-C shim 해체 시점 (G4 통과 후). P3-E 에서 `layouts` store 를 건드리면 P5-B migration script 와 충돌
- **IndexedDB transaction 부분 커밋 금지**: elements 변환 write 와 `_meta.schemaVersion` 업데이트는 단일 transaction 또는 명확한 try-catch-rollback 패턴으로 atomic 처리
- **`DB_VERSION` 을 8 이상으로 skip 금지**: 7 → 8 순서 증가 필수 (사용자 DB 에서 `onupgradeneeded` 버전 분기가 정확히 동작하려면 연속 버전 필요)
- **migration script 를 `batch.clear()` 경로로 실행 금지**: `batch.clear()` 는 모든 store 를 지우므로 migration 에 사용 불가. `elements.getAll()` + `elements.updateMany()` 패턴만 허용
- **`utils/urlGenerator.ts` + `elementUtils.ts` 의 `layout_id` 참조를 migration script 완료 전 제거 금지**: E-6 write-through 전환 완료 후에만 제거 (그 전까지는 legacy adapter fallback 경로에서 사용)

---

## G3-E Sub-Gate 측정 명령

```bash
# P3-E 완료 확인 명령 (0 이어야 통과, migration script 파일 제외)
grep -rnE "layout_id" \
  apps/builder/src/lib/ \
  apps/builder/src/utils/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v "migration" \
  | grep -v "__tests__" \
  | wc -l
```

**통과 조건**: 0건 (migration script + test fixture 제외)

**현재 baseline** (P3-E 착수 전):

```bash
# 현재 측정 (2026-04-26):
# lib/: 6건 (adapter.ts)
# utils/: 3건 (urlGenerator.ts 2건 + elementUtils.ts 1건)
# 합계: 9건
```

**단계별 감소 목표**:

- E-1~E-5 후: 9건 유지 (migration script 한정으로 이동)
- E-6 후: 0건 (migration script / test 제외)

---

## G5 매핑

P3-E 가 land 하는 항목과 Phase 5 Gate G5 조건의 관계:

| G5 조건                                                              | P3-E 관련 여부 | 비고                                                           |
| -------------------------------------------------------------------- | :------------: | -------------------------------------------------------------- |
| G5 (b): `_meta` store + `schemaVersion: "composition-1.0"` 기록 확인 | **직접 land**  | P3-E E-1~E-6 완료 시                                           |
| G5 (c): legacy element 의 `layout_id` → canonical parent 변환 완료   | **직접 land**  | E-6 write-through 완료                                         |
| G5 (d): `layouts` store 제거                                         |   **미착수**   | P5-C shim 해체 시 (G4 통과 후)                                 |
| G5 (e): `elements.layout_id` index 제거                              |   **미착수**   | P5-B migration script 완료 후 DB_VERSION 9                     |
| G5 (f): `getByLayout` 메서드 삭제                                    |    **준비**    | E-5 에서 `@deprecated` + E-6 에서 empty 반환. 실제 삭제는 P5-C |

**요약**: P3-E 는 G5 (b)(c) 를 land 하고, G5 (d)(e)(f) 는 P5-B/C 에서 완결. `layouts` store 삭제 (DB_VERSION 9) 는 P3-E 범위 외.

---

## 위험 시나리오 사례

### 시나리오 S-1: migration 실패 + localStorage backup 유실 (최고 위험)

**경로**:

1. `createMigrationBackup()` 성공 → `localStorage.setItem(backupKey, ...)` 성공
2. `elements.updateMany()` 실행 중 브라우저 탭 강제 종료
3. 재시작: `_meta.schemaVersion` 업데이트 미완 → `"legacy"` 상태
4. localStorage backup: 탭 종료 전 저장되었으면 복구 가능. **그러나** private 모드나 용량 초과 시 localStorage 유실 가능성 존재

**영향**: 부분 변환된 elements 잔존 + backup 유실 → canonical parent 정합 불일치

**안전망**:

- `elements.updateMany()` 는 단일 IndexedDB transaction → 브라우저 강제 종료 시 transaction rollback 보장 (IndexedDB ACID 보장)
- 따라서 `elements` store 의 부분 변환 위험은 IndexedDB transaction 의 ACID 로 방지됨
- `_meta.schemaVersion` 업데이트는 elements write 완료 후 별도 transaction → 브라우저 종료 시 `_meta` 미업데이트 = `"legacy"` 재시도 가능

**결론**: IndexedDB ACID + `_meta` 별도 transaction 패턴으로 elements 부분 변환은 구조적으로 불가. localStorage backup 유실은 복구 경로 소실이지만 IndexedDB 원본은 legacy 상태로 완전 보존.

### 시나리오 S-2: `legacyOwnershipToCanonicalParent()` 미구현 상태 E-6 착수

**경로**: P3-A adapter 의 `legacyOwnershipToCanonicalParent()` 가 부분 구현 상태에서 E-6 write-through 활성화 → layout element 의 canonical parent 오판

**영향**: layout-linked elements 가 wrong canonical parent 에 배치 → page 로드 시 element 누락 또는 위치 오류

**안전망**:

- G3-A Sub-Gate: `legacyOwnershipToCanonicalParent()` 구현 완성이 P3-A 완료 조건
- E-3 migration.test.ts 50+ fixture ALL PASS 가 E-6 진입 선행 조건
- E-6 진입 전 dev 환경 직접 확인 필수

### 시나리오 S-3: P5-B 가 P3-E 의 `_meta` 구조를 재정의

**경로**: P5-B migration script 가 P3-E 의 `MetaRecord` 와 다른 schema 를 정의하여 충돌

**영향**: `schemaVersion` 관리 이중화 + migration 중복 실행

**안전망**:

- P3-E 의 `MetaRecord` 를 P5-B 의 공식 타입으로 선언 (`@see 903-phase5-persistence-imports-breakdown.md P5-B`)
- P5-B 에서 P3-E 의 `MetaRecord` 를 import 하여 확장 (`{ ...MetaRecord, canonicalVersion: string }`)
- P5-B 착수 전 P3-E `MetaRecord` 타입 안정화 확인

---

## 후속 Phase 와의 관계

### P3-E → P5-B 의존

P5-B (legacy → canonical migration script) 는 P3-E 가 land 한 `_meta` store + `schemaVersion` 을 기반으로 동작한다.
P3-E E-6 완료 = P5-B 진입 가능 상태.

P5-B 추가 작업:

- `elements.layout_id` index 제거 (DB_VERSION 9)
- `layouts` store 삭제 또는 archive
- `getByLayout` 메서드 완전 삭제
- 50+ fixture 재검증 (canonical-only path)

### P3-E → P5-C 연계

P5-C (adapter shim 완전 해체) 는 G4 통과 후 진입. P3-E 는 adapter shim 을 해체하지 않음.
P3-E 완료 후 `adapters/legacy-layout/` shim 은 P4 기간 동안 read-only fallback 유지 (decisions.md 결정 5).
