# ADR-903 Phase 3 — 진입 전 결정 사항 권고안

> Sub-breakdown §7 의 5건 결정 필요 사항에 대한 architect 권고.
> 사용자 confirm 후 P3-A 착수 가능.
>
> 참조: [ADR-903](../completed/903-ref-descendants-slot-composition-format-migration-plan.md) /
> [sub-breakdown](903-phase3-frameset-breakdown.md) /
> [canonical examples](903-canonical-examples.md)
>
> HEAD: `56819009` (origin sync)

---

## 결정 1: page 노드의 canonical 표현

### 배경

ADR-903 §Hard Constraint #10 은 frame 전용 필드로 `clip`, `placeholder`, `slot` 을 정의한다.
`singleColumnTemplate` 등 기존 layoutTemplates.ts 를 보면 layout 은 복수 slot 을 가진 shell 이고,
page 는 그 slot 을 채우는 content 묶음이다. 즉 page 와 layout 의 관계는
canonical format 에서 "page = layout shell 의 ref 인스턴스" 로 표현하는 것이 ADR-903 결정 방향이다
(`layout.types.ts:12-16` `PageLayoutFields` 주석: "page root 노드 자체에 `ref: <layoutId>` 선언").

그러나 **page 가 layout 없이 독립적으로 존재하는 경우** (`layout_id = null`) 에 대한 canonical 표현이
현재 ADR 본문에 명시되지 않았다. 또한 frame 전용 필드 (`clip`/`placeholder`/`slot`) 가
page-level 노드에도 허용되는지가 불명확하다.

### 선택지

#### 옵션 A — page 는 항상 별도 `page-type` 노드 (frame 과 분리)

```json
{
  "id": "dashboard-page",
  "type": "page",
  "name": "Dashboard",
  "metadata": { "slug": "/dashboard" },
  "children": [
    /* page content */
  ]
}
```

layout 있을 때:

```json
{
  "id": "dashboard-page",
  "type": "page",
  "ref": "app-shell",
  "name": "Dashboard",
  "metadata": { "slug": "/dashboard" },
  "descendants": {
    "main": {
      "children": [
        /* slot content */
      ]
    }
  }
}
```

- page-type 은 `frame` 과 별도 vocabulary 진입. router 가 page 를 식별하려면 `type: "page"` 체크.
- `clip`/`placeholder`/`slot` 은 page 에 **금지** — frame 전용 의미론 유지.
- 위험: 기술 **LOW** / 유지보수 **MED** (type 값 공간에 `page` 추가 → ComponentTag union +1 / router 분기 단순화) / 마이그레이션 **LOW**

#### 옵션 B — page 는 `reusable: false` frame (frame 서브타입)

```json
{
  "id": "dashboard-page",
  "type": "frame",
  "reusable": false,
  "metadata": { "isPage": true, "slug": "/dashboard" },
  "children": [
    /* page content */
  ]
}
```

- `type: "frame"` 으로 통합. 구분은 `metadata.isPage: true`.
- frame 전용 필드(`clip`/`placeholder`/`slot`) 가 page 에도 물리적으로 허용됨 → 타입상 허용하되 router 가 slot 없는 frame 으로 처리.
- 위험: 기술 **MED** (metadata.isPage 로 page/layout shell 구분 시 router 복잡도 증가, "page 면서 reusable shell" 같은 모호 케이스 발생 가능) / 유지보수 **HIGH** (page vs layout shell 경계 흐림 → NodesPanel FramesTab 에서 "page 인 frame" vs "layout shell 인 frame" 을 metadata 로 구분하는 UI 복잡도) / 마이그레이션 **LOW**

#### 옵션 C — page 는 `ref` 또는 `frame`, 구분은 document children 위치 (권고)

```json
/* document.children[0] = reusable layout shell */
{
  "id": "app-shell",
  "type": "frame",
  "reusable": true,
  "clip": true,
  "children": [
    { "id": "main", "type": "frame", "slot": [] }
  ]
}

/* document.children[1..n] = page nodes */
{
  "id": "dashboard-page",
  "type": "ref",
  "ref": "app-shell",
  "name": "Dashboard",
  "metadata": { "type": "page", "slug": "/dashboard" },
  "descendants": {
    "main": { "children": [ /* slot content */ ] }
  }
}

/* layout 없는 독립 page */
{
  "id": "landing-page",
  "type": "frame",
  "name": "Landing",
  "metadata": { "type": "page", "slug": "/" },
  "children": [ /* page content */ ]
}
```

- layout 있는 page → `type: "ref"` (layout shell 인스턴스). `clip`/`placeholder`/`slot` 불필요.
- layout 없는 독립 page → `type: "frame"` + `metadata.type: "page"`. `clip: true` 적용 가능.
- **frame 전용 필드의 page 적용 범위**: layout shell frame 에는 `clip`/`placeholder`/`slot` 모두 허용. 독립 page frame 에는 `clip` 허용, `placeholder`/`slot` 은 의미 없으므로 schema 허용하되 실사용 금지 (validator warning 수준).
- 위험: 기술 **LOW** / 유지보수 **LOW** (type 값 공간 최소 확장, `metadata.type = "page"` 로 router 판정 단순) / 마이그레이션 **LOW**

### 위험 비교

| 옵션 | 기술 | 유지보수 | 마이그레이션 | 비고                              |
| :--: | :--: | :------: | :----------: | --------------------------------- |
|  A   | LOW  |   MED    |     LOW      | type 공간에 `page` 신규 진입      |
|  B   | MED  |   HIGH   |     LOW      | page/layout shell 경계 모호       |
|  C   | LOW  |   LOW    |     LOW      | pencil 관례 정합, metadata 라우팅 |

### 권고

**옵션 C** — layout 있는 page 는 `type: "ref"`, 독립 page 는 `type: "frame" + metadata.type: "page"`.

근거:

1. pencil.dev 공식 `.pen` 포맷에서 page-type 독립 노드가 없음. document children 위치와 ref 여부로 구분.
2. `canonical-examples.md §4` 의 `dashboard-page` 예제가 이미 `type: "ref"` 를 사용.
3. `metadata.type: "page"` 는 router 가 `type !== "ref"` 이면서 page 인 경우를 단일 조건으로 판정 가능 → 별도 type literal 불필요.
4. frame 전용 필드의 page 적용 범위: **ADR-903 §95-101 의 `clip`/`placeholder`/`slot` 은 frame 노드에 정의** → layout shell frame 에 모두 적용. 독립 page frame 에는 `clip` 만 의미 있음 (overflow 동작). `slot`/`placeholder` 를 독립 page 에 허용하면 "page 이면서 layout shell 역할" 이라는 모호 케이스가 생기므로 validator 에서 `metadata.type: "page"` + `slot !== undefined` 조합 시 warning emit 권장.

### 사용자 결정 필요 여부

**결정 필요**: `metadata.type: "page"` 대신 별도 `type: "page"` 진입을 선호하는 경우 (옵션 A) — 팀의 router 코드베이스에서 `type` 값 분기가 더 명시적으로 관리되길 원한다면 옵션 A 도 유효.
두 옵션 모두 P3-A 타입 정의에서 수용 가능. **권고는 C 이나 사용자 확인 필요.**

---

## 결정 2: Layout slug (URL path) 매핑

### 배경

기존 `Layout.slug` 는 URL base path (`"/products"`, `"/dashboard"`) 를 저장하는 문자열 필드다
(`layout.types.ts:49-50`). P3-C 에서 `LayoutSlugEditor.tsx` 를 canonical frame authoring UI 로
재설계할 때 slug 가 canonical 어디에 저장되는지 결정이 필요하다.

현재 sub-breakdown P3-C §2.3 는 `frame.metadata.slug` 와 `frame.id = slug` 를 양자택일로 언급한다.

### 선택지

#### 옵션 A — `frame.id = slug` (frame id 자체를 slug 로 사용)

```json
{
  "id": "/products",
  "type": "frame",
  "reusable": true,
  "name": "Products Layout"
}

/* page ref */
{
  "id": "products-page",
  "type": "ref",
  "ref": "/products"
}
```

- id 자체가 URL path → 별도 slug 필드 불필요. `CanvasRouter` 가 `ref.ref === routePath` 로 직접 매핑.
- **Hard Constraint #1 위반**: canonical 규칙에서 `id` 에 slash (`/`) 포함 금지 (descendants path 구분자 충돌).
- 위험: 기술 **CRITICAL** (id slash 금지 규칙 위반 → descendants path 파싱 모호성)

#### 옵션 B — `metadata.slug` (메타데이터 필드로 분리) (권고)

```json
{
  "id": "layout-products",
  "type": "frame",
  "reusable": true,
  "name": "Products Layout",
  "metadata": { "type": "layout", "slug": "/products" }
}
```

- `id` 는 고유 식별자 (slash 금지), `metadata.slug` 가 URL path.
- `CanvasRouter` 는 canonical document tree 를 순회, `metadata.slug === routePath` 인 layout frame 을 찾아 page 인스턴스들을 resolve.
- 기존 `Layout.slug` → `metadata.slug` 는 `legacyLayoutToCanonicalFrame()` adapter 에서 1:1 매핑.
- 위험: 기술 **LOW** / 유지보수 **LOW** (slug 변경 시 `updateLayout` → canonical frame node 의 metadata.slug 업데이트) / 마이그레이션 **LOW** (adapter 자동 변환)

#### 옵션 C — 별도 최상위 `slug` 필드 (pencil 정합 미고려)

```json
{
  "id": "layout-products",
  "type": "frame",
  "reusable": true,
  "slug": "/products"
}
```

- pencil 공식 schema 에 `slug` 최상위 필드 없음 → pencil 정합 어긋남.
- composition 전용 필드 추가 → 향후 pencil import/export adapter 에서 무시 처리 필요.
- 위험: 기술 **LOW** / 유지보수 **MED** (pencil 비표준 필드 관리 부담) / 마이그레이션 **LOW**

### 위험 비교

| 옵션 |   기술   | 유지보수 | 마이그레이션 | 비고                           |
| :--: | :------: | :------: | :----------: | ------------------------------ |
|  A   | CRITICAL |    —     |      —       | id slash 금지 위반 즉시 기각   |
|  B   |   LOW    |   LOW    |     LOW      | metadata 일관성 + adapter 자동 |
|  C   |   LOW    |   MED    |     LOW      | pencil 비표준                  |

### 권고

**옵션 B** — `metadata.slug` 사용.

근거:

1. 옵션 A 는 `id` slash 금지 (canonical 규칙, ADR-903 breakdown §canonical 규칙 §166) 즉시 위반으로 **기각 필수**.
2. `metadata` 는 이미 ADR-903 §102 에서 "모든 노드에 extensibility hook" 으로 정의됨 — slug 는 extensibility 대상.
3. `Layout.slug` 의 기존 의미 (URL route base path) 를 `metadata.slug` 에 동형 이관 → adapter 변환 1줄.
4. `CanvasRouter` 는 `metadata.type: "layout"` + `metadata.slug` 두 조건으로 routing frame 식별 — 단순 순회로 충분.
5. 향후 page 에도 `metadata.slug: "/products/detail"` 형태로 확장 가능 → 일관성.

### 사용자 결정 필요 여부

**확인 권장**: `metadata.slug` vs 최상위 `slug` 필드 (옵션 C) 중 팀 내 convention 선호가 있다면. 옵션 A 는 기술적으로 불가. **권고 B 로 즉시 진행 가능.**

---

## 결정 3: IndexedDB schema migration version field 위치

### 배경

P3-E 에서 IndexedDB schema 의 `layout_id` 컬럼을 제거하고 migration script 를 작성할 때,
"이 DB 데이터가 어떤 canonical 버전인가" 를 식별하는 `schema` version field 가 필요하다.
sub-breakdown §P3-E 는 `schema: "composition-1.0"` 도입을 언급하지만 위치가 미결.

현재 구조:

- IndexedDB 에는 `projects`, `elements`, `pages`, `layouts` 등 개별 collection (object store) 이 있다.
- document-level meta (version 등) 는 별도 저장 없음 (2026-04-25 기준).

### 선택지

#### 옵션 A — document (project) level — `projects` object store 에 `schemaVersion` 필드

```ts
// projects object store
interface ProjectRecord {
  id: string;
  name: string;
  schemaVersion: "legacy" | "composition-1.0"; // 신규
  // ...
}
```

- project 전체가 하나의 schema 버전을 가짐.
- migration 시 project 단위로 한 번 변환 → `schemaVersion` 업데이트.
- 위험: 기술 **LOW** / 유지보수 **LOW** (단일 체크포인트) / 마이그레이션 **LOW**

#### 옵션 B — collection (object store) level — 각 store 에 개별 `_schemaVersion` 필드

```ts
// elements object store
interface ElementRecord {
  id: string;
  _schemaVersion: "legacy" | "composition-1.0"; // 행 단위
  // ...
}
```

- 일부 element 만 canonical 로 마이그레이션되는 점진 전환 가능.
- 각 행 read 시 `_schemaVersion` 체크 후 read-through adapter 분기.
- 위험: 기술 **MED** (행마다 version 필드 → storage overhead + 읽기 분기 복잡도) / 유지보수 **HIGH** (mixed-version collection 에서 동시 쓰기 시 version 관리 에러 발생 가능) / 마이그레이션 **MED**

#### 옵션 C — document root + IndexedDB meta store (권고)

```ts
// _meta object store (신규, project scoped)
interface MetaRecord {
  projectId: string; // key
  schemaVersion: "legacy" | "composition-1.0";
  migratedAt?: string; // ISO timestamp
  backupKey?: string; // pre-migration backup reference
}
```

- `_meta` 별도 object store → 기존 `projects`/`elements`/`pages`/`layouts` schema 는 건드리지 않음.
- migration 전 `backupKey` 에 backup blob reference 저장 → 롤백 가능.
- read-through adapter 가 open 시 `_meta.schemaVersion` 체크 → `"legacy"` 이면 adapter 경유, `"composition-1.0"` 이면 canonical direct read.
- 위험: 기술 **LOW** / 유지보수 **LOW** (단일 체크포인트, 기존 store 무영향) / 마이그레이션 **LOW**

### 위험 비교

| 옵션 | 기술 | 유지보수 | 마이그레이션 | 비고                                   |
| :--: | :--: | :------: | :----------: | -------------------------------------- |
|  A   | LOW  |   LOW    |     LOW      | 간단하나 기존 projects store 변경 필요 |
|  B   | MED  |   HIGH   |     MED      | 행 단위 mixed-version 관리 부담        |
|  C   | LOW  |   LOW    |     LOW      | 기존 store 무침범 + 롤백 정보 보존     |

### 권고

**옵션 C** — `_meta` 별도 object store 도입.

근거:

1. P3-E 의 핵심 위험은 **사용자 데이터 마이그레이션 실패** (HIGH) 다. `backupKey` 필드로 pre-migration backup 참조를 `_meta` 에 저장하면 rollback 경로 보존이 용이.
2. 기존 `projects`/`elements`/`pages`/`layouts` object store schema 를 변경하지 않으므로 P3-E 이전 sub-phase 에서 IndexedDB 관련 회귀 위험 없음.
3. `schemaVersion` 을 `projects` 레코드에 넣으면 (옵션 A) migration 전 `projects.schemaVersion` 이 없는 레코드의 읽기 fallback 로직이 필요 — 결국 `_meta` 와 동등한 분기가 발생.
4. 옵션 B 의 행 단위 version 은 partial migration (일부 element 만 canonical) 을 허용하는데, ADR-903 §Hard Constraint #2 는 adapter 경로로 단계적 마이그레이션을 지원하되 "collection 내 mixed-version" 은 허용하지 않는 방향 — project 단위 원자 전환이 원칙.

**P3-E 진입 전에만 확정하면 됨** (P3-A~D 는 IndexedDB 미변경). P3-A 에서 타입 정의 시 `MetaRecord` 인터페이스만 stub land 하면 충분.

### 사용자 결정 필요 여부

**낮음** — 기술적으로 옵션 C 가 우세하며, P3-A 단계에서는 타입 stub 만 추가. 이견 없으면 **권고 C 로 진행 가능.** P3-E 실제 구현 전 최종 확인 권장.

---

## 결정 4: P2 옵션 C 미완 상태에서 P3-D 진입 차단 강제 메커니즘

### 배경

sub-breakdown §P3-D 는 **P2 옵션 C 완료 (G2 = 0) 가 P3-D 진입 hard precondition** 임을 명시한다.
현재 G2 = 12 (preview/App.tsx hybrid 분기 잔존). 이 조건이 우회되면:

- preview/App.tsx 의 `layout_id` 기반 hybrid 12건 과 P3-D factory ownership 제거가 충돌
- `legacyLayoutToCanonicalFrame()` adapter 를 제거하기 전에 preview 가 legacy path 를 직접 호출하는 코드가 남으면 런타임 에러

차단 메커니즘으로 3가지 접근 중 하나를 P3-A 착수 전에 결정해야 한다.

### 선택지

#### 옵션 A — CI Gate (GitHub Actions check)

```yaml
# .github/workflows/p3d-precondition.yml
- name: Check G2 (P2 Option C completion)
  run: |
    COUNT=$(grep -rnE "layout_id|slot_name" \
      apps/builder/src/preview/App.tsx | wc -l | tr -d ' ')
    if [ "$COUNT" -gt "0" ]; then
      echo "P3-D BLOCKED: preview/App.tsx G2=$COUNT (must be 0)"
      exit 1
    fi
```

- merge 시점에 자동 차단. 브랜치 protection rule 로 bypass 불가.
- 위험: 기술 **LOW** / 유지보수 **MED** (CI file 별도 관리, false positive 가능성) / 마이그레이션 **LOW**

#### 옵션 B — 사전 Checklist (PR 체크리스트 + 규칙 문서)

- sub-breakdown §P3-D 상단에 `> **진입 전 Gate**: G2 = 0 확인 필수` 경고 삽입.
- PR template 에 "P3-D PR 인 경우: G2 = 0 측정 결과 첨부" 체크 항목 추가.
- 위험: 기술 **LOW** / 유지보수 **LOW** (문서만) / 마이그레이션 **LOW** → 그러나 **인적 실패 가능성** 높음

#### 옵션 C — 코드 레벨 Guard (TypeScript compile-time) (권고)

```ts
// apps/builder/src/preview/App.tsx 상단 (P2 Option C 완료 전)
// P3-D 진입 차단 guard — G2 = 0 달성 전까지 유지.
// G2 = 0 (preview/App.tsx layout_id/slot_name 분기 전원 제거) 완료 시
// 이 블록을 제거하고 P3-D 착수 가능.
// @see docs/adr/design/903-phase3-frameset-breakdown.md §P3-D precondition
const _P3D_PRECONDITION_G2_MUST_BE_ZERO = (() => {
  // 이 상수가 존재하는 한 P3-D 의 legacy_layout_adapter 완전 제거 불가.
  // slotAndLayoutAdapter.ts 가 이 심볼을 import 하도록 강제하면
  // 파일이 살아있는 동안 P3-D 완전 제거 PR 이 type-check fail.
  return true;
})();
export { _P3D_PRECONDITION_G2_MUST_BE_ZERO };
```

그리고 `adapters/canonical/slotAndLayoutAdapter.ts` 에 dev-only import:

```ts
// dev guard: P3-D 는 preview/App.tsx G2 = 0 이후에만 완전 제거 가능.
// @see 903-phase3-frameset-breakdown.md §P3-D precondition
if (process.env.NODE_ENV === "development") {
  // 이 import 가 존재하면 P3-D 의 "adapter 완전 제거" 커밋이
  // 해당 심볼 미존재로 type-check fail → 사전 조건 강제.
  void import("../../preview/App").then((m) => {
    if (!m._P3D_PRECONDITION_G2_MUST_BE_ZERO) {
      console.error(
        "[P3-D] Precondition G2 not met: preview/App.tsx hybrid branches remain",
      );
    }
  });
}
```

- **더 간단하고 확실한 변형**: `slotAndLayoutAdapter.ts` 에 `// TODO(P3-D): G2 must be 0 before removing this file` 주석 + `pnpm type-check` 에 추가 lint rule ("이 파일이 존재하면 P3-D 미완") 대신, **P3-D PR 의 코드 리뷰 checklist 로 문서화 + G2 측정 자동화** (옵션 A 경량 버전) 를 결합하는 것이 실용적.
- 위험: 기술 **LOW** (dev-only, prod 무영향) / 유지보수 **LOW** / 마이그레이션 **LOW**

### 위험 비교

| 옵션 | 기술 | 유지보수 | 차단 강도 | 비고                           |
| :--: | :--: | :------: | :-------: | ------------------------------ |
|  A   | LOW  |   MED    |  **강**   | CI 자동 차단, 가장 확실        |
|  B   | LOW  |   LOW    |    약     | 인적 실패 가능성 높음          |
|  C   | LOW  |   LOW    |    중     | 코드 레벨 명시, CI 없어도 동작 |

### 권고

**옵션 A (CI Gate) + 옵션 B (사전 Checklist) 병행** — 최소 비용으로 가장 확실한 차단.

근거:

1. P3-D 는 CRITICAL 위험 (`(b) preview path canonical 단일화 → P2 옵션 C 와 직접 의존`). 차단 실패 시 preview 런타임 에러 발생 범위가 넓음.
2. CI Gate (옵션 A) 의 grep 명령은 측정 baseline 과 동일 — sub-breakdown §1.1 의 G3 측정 명령과 구조 동일하므로 추가 관리 부담 거의 없음.
3. 옵션 C 의 코드 guard 는 dev-only guard 라 production build 에 영향 없고 PR merge 를 막지는 못함 → CI Gate 없이는 강제력 부족.
4. `P2 옵션 C` 는 sub-breakdown 기준 worktree 별도 작업 권장 → **worktree 완료 후 merge 시 CI 자동 체크** 가 가장 자연스러운 흐름.

**옵션 B 단독은 권고하지 않음** — 인적 실패 허용 범위가 CRITICAL 위험에 비해 너무 넓음.

### 사용자 결정 필요 여부

**결정 필요**: GitHub Actions CI 가 이 프로젝트에서 활성화되어 있는지, 그리고 P3-D 전에 CI Gate 를 추가할 수 있는지 확인 필요. CI 가 없다면 옵션 C (코드 레벨 guard) + 옵션 B (checklist) 병행으로 차선책 운영.

---

## 결정 5: Adapter shim 의 lifecycle

### 배경

P3 완료 후 `adapters/legacy-layout/` (P3-A 에서 격리된 `LegacyLayoutId`, `slotAndLayoutAdapter`, `convertSlotElement`, `convertPageLayout` 등) 이 잔존한다. 이 shim 의 제거 시점이 미결.

ADR-903 G5 (`Phase 5 완료`) 에서 "repo-wide legacy layout API 최종 0건" 을 통과 조건으로 정의하지만, G3 (P3 완료) 이후 adapter shim 이 얼마나 오래 허용되는지 명시 없음.

현재 layout.types.ts 의 모든 타입이 `@deprecated ADR-903 P3` 마크됨. shim 의 과도한 잔존은 R1 위험 ("source-of-truth 혼동") 을 늘린다.

### 선택지

#### 옵션 A — P3 완료 즉시 shim 해체 (P4 착수와 동시)

- P3 G3 통과 → adapter shim 즉시 제거 → P4 진입.
- "P3 와 shim 제거를 하나의 PR" 로 처리.
- 위험: 기술 **HIGH** (P4 편집 semantics 작업 중 legacy path 가 필요한 edge case 발생 시 롤백 비용) / 마이그레이션 **MED** (shim 제거 후 미발견 호출 사이트 런타임 에러)

#### 옵션 B — 다음 major release 까지 shim 유지 (P5 G5 완료 시점까지)

- ADR-903 §G5 조건에 "adapter shim 완전 제거" 포함.
- P3~P4 전 기간 동안 shim 잔존 허용.
- 위험: 기술 **LOW** / 유지보수 **HIGH** (R1 위험 장기화 — legacy + canonical 이중 source 기간 길어짐) / 마이그레이션 **LOW**

#### 옵션 C — 1 minor release 후 shim 해체 (P4 완료 시점) (권고)

- P3 완료 (G3 통과) → shim 은 P4 기간 동안 허용.
- P4 G4 통과 (editing semantics 안정화) → shim 제거 + P5 persistence 전환 진입.
- "P3 완료 → P4 사이 1개 sprint/release" 동안 shim 보험 역할.
- 위험: 기술 **LOW** / 유지보수 **MED** (P4 기간 한정 이중 source) / 마이그레이션 **LOW**

### 위험 비교

| 옵션 | 기술 | 유지보수 | 마이그레이션 |    shim 잔존 기간     |
| :--: | :--: | :------: | :----------: | :-------------------: |
|  A   | HIGH |   LOW    |     MED      |   0 (P3 즉시 제거)    |
|  B   | LOW  |   HIGH   |     LOW      |  P5 완료까지 (장기)   |
|  C   | LOW  |   MED    |     LOW      | P4 완료까지 (1 phase) |

### 권고

**옵션 C** — P4 완료 시점 (G4 통과 후) 에 shim 해체.

근거:

1. P3-D 의 factory ownership 제거 + preview path canonical 단일화는 규모가 크다 (CRITICAL). P4 기간 shim 을 보험으로 유지하면 P4 편집 semantics 작업 중 legacy edge case 발견 시 adapter 재활용 가능.
2. ADR-903 의 G5 (Persistence 전환) 통과 조건에 "adapter shim 완전 제거" 가 포함되므로, 옵션 B 도 기술적으로는 G5 와 연계된다. 그러나 P4 기간 동안 shim 을 유지하는 명시 기간이 없으면 **사실상 무기한 잔존** 이 될 위험 — 옵션 C 로 명확한 종료 시점 설정.
3. R1 위험 대응: ADR §R1 는 "Phase 1 에서 canonical 과 legacy adapter 경계를 문서/타입으로 분리" 를 mitigation 으로 정의 — P3-A 에서 `@deprecated` + `adapters/legacy-layout/` 격리로 경계 명확화, P4 완료 후 경계 해체가 자연스러운 흐름.
4. 옵션 A (즉시 제거) 는 P3-D 의 207 ref sweep 이 완전히 안정화되기 전 shim 제거 → 회귀 발견 시 핫픽스 비용 높음.

**lifecycle 요약**:

```
P3 완료 (G3) → adapter shim = "P4 보험 역할" (읽기 전용 legacy fallback)
P4 완료 (G4) → adapter shim 제거 착수
P5 완료 (G5) → IndexedDB legacy schema 완전 해체 (shim 이미 제거 상태)
```

### 사용자 결정 필요 여부

**낮음** — 옵션 C 가 R1 위험 관리와 P5 G5 조건 사이의 자연스러운 중간 지점. **사용자 확인 권장** (혹시 P4 기간 중 shim 을 완전히 제거하고 P5 에서 DB 만 전환하는 흐름을 선호하는지).

---

## 종합: 권고 결합 시 P3-A 진입 가능 여부

### 결정별 P3-A 진입 차단 여부

| 결정 | 권고                                         |       P3-A 차단 여부       | P3-A 에서 필요한 작업                                                     |
| :--: | :------------------------------------------- | :------------------------: | :------------------------------------------------------------------------ |
|  1   | 옵션 C (page = ref or frame + metadata.type) |       **차단 없음**        | `CanonicalNode` 에 `metadata.type: "page" \| "layout"` 서브타입 hint 추가 |
|  2   | 옵션 B (metadata.slug)                       |       **차단 없음**        | `legacyLayoutToCanonicalFrame()` 에 `metadata.slug` 매핑 추가             |
|  3   | 옵션 C (\_meta object store stub)            |       **차단 없음**        | `MetaRecord` 인터페이스 stub land (P3-A 타입 기반)                        |
|  4   | A+B (CI Gate + Checklist)                    | **차단 있음 (CI 설정 전)** | CI file 추가 후 P3-D 착수 가능. P3-A~C 는 CI 없이 진행 가능               |
|  5   | 옵션 C (P4 완료 시 shim 해체)                |       **차단 없음**        | sub-breakdown §2.1 P3-A 작업에 lifecycle 문서화 주석 추가                 |

### P3-A 즉시 진입 가능 조건

5건 중 **결정 1, 2, 3, 5 는 권고안 기준 P3-A 즉시 착수 가능**.

결정 4 (CI Gate) 는 **P3-D 진입 전 조건** — P3-A~C 는 CI Gate 없이도 진행 가능.
P3-A 에서 sub-breakdown 에 "P3-D 진입 전 CI Gate 필수" 주석 추가로 문서화만으로 충분.

**결론: 사용자 confirm 후 즉시 P3-A 착수 가능.**

단, 결정 1 (page 노드 표현) 은 P3-A 의 `CanonicalNode` 타입 정의에 직접 영향을 미치므로
**P3-A 첫 커밋 전에 확인 필요**.

### 사용자 confirm 요청 (우선순위 순)

1. **[필수, P3-A 착수 전]** 결정 1: 옵션 C (`metadata.type: "page"`) 동의 여부. 옵션 A (`type: "page"` 진입) 선호 시 명시.
2. **[권장, P3-D 착수 전]** 결정 4: GitHub Actions CI 활성화 여부 확인.
3. **[선택, P3-E 착수 전]** 결정 3: 옵션 C (`_meta` store) 이견 없으면 진행.
4. **[선택]** 결정 2, 5: 이견 없으면 권고안으로 진행.
