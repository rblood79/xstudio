# ADR-903 Breakdown: ref/descendants + slot 기본 composition 포맷 전환 계획

> 본 문서는 [ADR-903](../adr/903-ref-descendants-slot-composition-format-migration-plan.md)의 구현 상세입니다.

## 목표

기존 `Element/Page/Layout` 하이브리드 구조를 즉시 폐기하지 않고, **문서-네이티브 composition/component 포맷**과 **단일 resolved-tree resolver**를 먼저 도입한 뒤 점진적으로 저장 포맷과 편집 semantics를 전환한다.

핵심 원칙:

1. **canonical source format**: 일반 object tree + `reusable: true` + `type:"ref"` + path-based `descendants` + 컨테이너 `slot`
2. **stable identity**: runtime UUID가 아닌 문서-정본 `id` / `id path`
3. **single resolver**: `ref resolve -> descendants apply -> slot contract validate -> resolved tree`
4. **legacy adapter**: 기존 flat `elements` / `pages` / `layouts`는 전환 기간 동안 read-through adapter로 유지
5. **ADR-063 비침범**: resolved tree 아래의 렌더 체인(RAC/RSP/Spec)은 그대로 유지

## Phase 구성

| Phase | 목표 | 결과물 |
| ---- | ---- | ---- |
| P0 | canonical format / resolver 계약 고정 | JSON schema 초안, TypeScript 타입, reusable/ref/descendants/slot 문법 정의 |
| P1 | legacy → canonical adapter 도입 | flat `Element/Page/Layout`를 canonical doc tree로 투영하는 adapter |
| P2 | Preview / Skia 공통 resolved tree 입력화 | 두 renderer가 동일 resolver 결과를 소비 |
| P3 | frameset/layout/template를 새 포맷으로 흡수 | layout shell / template / slot assignment를 canonical format으로 통일 |
| P4 | 편집 semantics 전환 | copy/paste, duplicate, delete, detach, undo/redo, component/slot authoring |
| P5 | persistence / import-export 전환 | DB 저장/로드, serializer, import/export, migration |

## Canonical 포맷 초안

### 1. 재사용 가능한 컴포넌트 정의

```json
{
  "id": "round-button",
  "type": "frame",
  "reusable": true,
  "fill": "#333333",
  "children": [
    {
      "id": "label",
      "type": "text",
      "content": "Submit",
      "fill": "#FFFFFF"
    }
  ]
}
```

### 2. ref 인스턴스 + descendants 오버라이드

```json
{
  "id": "danger-button",
  "type": "ref",
  "ref": "round-button",
  "fill": "#D92D20",
  "descendants": {
    "label": {
      "content": "Delete",
      "fill": "#FFFFFF"
    }
  }
}
```

### 3. slot 선언이 있는 레이아웃/컨테이너

```json
{
  "id": "app-shell",
  "type": "frame",
  "reusable": true,
  "children": [
    {
      "id": "header",
      "type": "ref",
      "ref": "header-shell"
    },
    {
      "id": "left",
      "type": "ref",
      "ref": "left-nav"
    },
    {
      "id": "main",
      "type": "frame",
      "slot": ["dashboard-hero", "table-card", "icon-button"]
    }
  ]
}
```

### 4. page/layout 인스턴스에서 slot 영역 채우기

```json
{
  "id": "dashboard-page",
  "type": "ref",
  "ref": "app-shell",
  "descendants": {
    "header/title": {
      "content": "Dashboard"
    },
    "main": {
      "children": [
        {
          "id": "hero",
          "type": "ref",
          "ref": "dashboard-hero"
        },
        {
          "id": "table",
          "type": "ref",
          "ref": "table-card"
        }
      ]
    }
  }
}
```

### canonical 규칙

- 일반 노드는 `frame`, `text`, `rectangle`, `Button` 등 실제 object tree 타입을 그대로 가진다.
- `reusable: true`는 해당 노드를 재사용 가능한 컴포넌트/레이아웃 원본으로 승격한다.
- `type:"ref"`는 reusable node 인스턴스다. 인스턴스 자신의 루트 속성은 원본 위에 override된다.
- `descendants` key는 runtime UUID가 아니라 stable `id path`다. 예: `label`, `ok-button/label`, `header/title`
- `descendants[path]` 값은 세 가지를 지원한다.
  - 속성 patch
  - `type`가 존재하는 경우 node replacement
  - `children` 배열만 제공하는 경우 container children replacement
- `slot`은 별도 특수 노드가 아니라 일반 컨테이너의 schema 속성이다.
- `slot` 값은 선택적으로 추천 가능한 reusable component ID 목록을 담는다.
- slot 채우기는 canonical format에서 `descendants[slotPath].children` 교체로 표현한다.
- legacy `slot_name` 기반 데이터는 adapter 단계에서 canonical descendants children replacement로 정규화한다.

## 현재 필드 → canonical 매핑

| 현재 | canonical | 비고 |
| ---- | --------- | ---- |
| `componentRole: "master"` | 일반 노드 + `reusable: true` | master registry 대신 문서 내부 reusable root |
| `componentRole: "instance" + masterId` | `type: "ref"`, `ref: <master-id>` | instance 상태 모델을 문법으로 승격 |
| `overrides` | ref root-level 속성 override | root patch는 인스턴스 자신의 속성으로 단순화 가능 |
| `descendants` | `descendants[idPath]` | key를 runtime id → stable path로 전환 |
| `tag="Slot"` + `slot_name` | slot 선언 컨테이너 + `descendants[slotPath].children` | slot을 1급 schema 속성으로 승격 |
| `Page.layout_id` | page root `type:"ref"` to reusable layout shell | layout 적용을 문서적으로 직접 표현 |
| `layout_id` 소속 element | reusable layout component subtree | 소속 필드가 아닌 구조적 트리 |
| `parent_id/order_num` | canonical tree order | runtime flat index는 파생 캐시로 유지 가능 |

## 세부 작업

### P0. 타입 / 계약 고정

#### 신규

| 경로 | 역할 |
| ---- | ---- |
| `packages/shared/src/types/composition-document.types.ts` | canonical document / reusable / ref / descendants / slot 타입 |
| `docs/design/903-...-breakdown.md` | phase / mapping / test strategy 문서 |

#### 수정

| 경로 | 변경 |
| ---- | ---- |
| `packages/shared/src/types/element.types.ts` | legacy 필드에 canonical 대응 주석 추가, deprecation 계획 명시 |
| `apps/builder/src/types/builder/layout.types.ts` | legacy `Slot`/`layout_id` 의미를 adapter 문맥으로 축소 |

#### 산출물

- canonical JSON 예제 4종
  - reusable component
  - ref instance with descendants override
  - slot-declared layout shell
  - page instance with slot content fill
- resolver 순서 확정
- source `id` 생성/보존 규칙 확정
- descendants path 규칙 확정

### P1. Legacy adapter

#### 목표

현 저장소의 flat records를 canonical doc tree로 투영하는 adapter를 만든다. 이 단계에서는 **저장 포맷 미변경**.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/preview/utils/layoutResolver.ts` | legacy-specific 코드 분리, adapter 입력으로 전환 준비 |
| `apps/builder/src/utils/component/instanceResolver.ts` | root instance merge / descendants merge 로직을 canonical resolver에서 재사용 가능하게 분리 |
| `apps/builder/src/builder/stores/elements.ts` | canonical adapter selector 추가 |
| `packages/shared/src/types/element.types.ts` | legacy adapter input/output 타입 선언 |

#### adapter 책임

- `elements[]`, `pages[]`, `layouts[]` → canonical document tree
- `componentRole/masterId` → `reusable` / `ref`
- `tag="Slot"` + `slot_name` → slot-declared container + `descendants[slotPath].children`
- `Page.layout_id` → page root `ref`
- `parent_id/order_num` → tree order
- 기존 UUID 기반 descendants는 임시 path map으로 투영

### P2. 공통 resolver

#### 목표

Preview와 Skia가 **같은 resolved tree**를 consume하게 만든다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/preview/utils/layoutResolver.ts` | canonical resolver consumer로 교체 |
| `apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts` | element 단건 merge 대신 resolved tree/path consumer로 축소 |
| `apps/builder/src/builder/main/BuilderCore.tsx` | Preview/Builder 공통 resolved tree 전달 경계 정리 |

#### 원칙

- Preview 전용 resolver 신규 개발 금지
- Skia 전용 instance resolver 신규 개발 금지
- canonical resolver 결과만 renderer 입력으로 허용
- slot 관련 validation은 resolver 내부에서 수행하되, slot content materialization은 descendants children replacement 결과를 기준으로 한다

### P3. frameset/layout/template 흡수

#### 목표

기존 frameset/layout/template 시스템을 canonical composition/component format의 사례로 변환한다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/builder/templates/layoutTemplates.ts` | layout shell 정의를 reusable + slot-declared doc tree로 전환 |
| `apps/builder/src/types/builder/layout.types.ts` | legacy `Slot` 설명을 adapter 문맥으로 축소 |
| `apps/builder/src/builder/panels/properties/editors/LayoutPresetSelector/**` | slot 생성/매핑 UI를 slot authoring UI로 전환 |

#### 완료 기준

- header/left/main 형태의 layout shell이 `reusable + ref + slot`으로 표현됨
- page는 layout shell의 `ref` 인스턴스로 표현됨
- main slot 채우기는 `descendants["main"].children` 패턴으로 정착함
- frameset 전용 엔진/특수 규칙 삭제 가능 상태
- template export/import가 canonical format을 기준으로 동작

### P4. 편집 semantics 전환

#### 목표

편집 연산을 canonical semantics에 맞춘다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/builder/stores/utils/instanceActions.ts` | create/detach semantics를 `ref` 기준으로 재정의 |
| `apps/builder/src/builder/utils/multiElementCopy.ts` | id remap / descendants path remap |
| `apps/builder/src/builder/stores/history/**` | undo/redo payload를 canonical 연산 기준으로 정리 |
| `apps/builder/src/builder/panels/designKit/**` | master/instance UI를 reusable/ref UI로 재해석 |

#### 핵심 규칙

- duplicate: 새로운 runtime id + 새로운 source `id` scope remap
- delete: slot/ref-aware validation
- detach: `ref` 해제 후 subtree materialize
- copy/paste: descendants key, slot binding, source `id` collision 처리
- component authoring: 일반 노드를 `reusable:true`로 승격하는 명시적 연산
- slot authoring: 컨테이너에 `slot` 메타데이터와 추천 reusable IDs를 편집하는 UI 제공

### P5. persistence / import-export 전환

#### 목표

canonical format을 저장 정본으로 승격한다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/lib/db/indexedDB/adapter.ts` | canonical 문서 저장 스키마 또는 serializer 도입 |
| `apps/builder/src/services/save/**` | save/load를 canonical 기준으로 전환 |
| `apps/builder/src/utils/designKit/kitExporter.ts` | component export를 canonical 구조로 정리 |
| `apps/builder/src/utils/designKit/kitLoader.ts` | import 시 id/ref/slot-aware 로드 |

#### 전환 원칙

- read-through 먼저, write-through 나중
- shadow serializer 기간 운영 가능
- destructive migration 금지

## 테스트 전략

### 단위 테스트

- canonical resolver
  - ref nesting
  - descendants override precedence
  - descendants path override (`ok-button/label`)
  - descendant node replacement (`descendants[path].type`)
  - descendants children replacement on slot container
  - slot suggestion/contract validation
- id/path remap
  - duplicate
  - copy/paste
  - detach

### 통합 테스트

- Preview와 Skia가 같은 resolved tree snapshot을 받는지 비교
- layout template 적용 후 동일 slot fill 결과 비교
- legacy project load → canonical adapter → save roundtrip
- reusable component authoring → ref instance 생성 → descendants override roundtrip

### 회귀 체크리스트

- [ ] 기존 layout preset 페이지가 그대로 열린다
- [ ] 기존 component instance가 시각적으로 동일하다
- [ ] `ok-button/label` 같은 nested descendants override가 유지된다
- [ ] slot 영역의 `children` 교체가 Preview와 Skia에서 동일하게 materialize 된다
- [ ] detach 후 일반 subtree로 정상 materialize 된다
- [ ] undo/redo가 ref/slot 변경을 안정적으로 복원한다
- [ ] import/export 결과가 source `id` 충돌 없이 재로드된다

## 비목표

- ADR-063의 D1/D2/D3 체인 수정
- RAC DOM 구조 변경
- RSP props 계약 재설계
- Spec 시각 토큰/shape 규칙 변경
- Builder/Preview 렌더러 전면 재작성

## 마이그레이션 전략 메모

- **절대 금지**: P0 이전에 DB 스키마부터 바꾸기
- **권장 순서**: canonical type → adapter → resolver → renderer consumer → editor operations → persistence
- **운영 전략**: feature flag 또는 adapter 선택자로 rollback 가능성 유지
