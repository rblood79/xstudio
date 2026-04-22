# ADR-903 Breakdown: ref/descendants + slot 기본 composition 포맷 전환 계획

> 본 문서는 [ADR-903](../adr/903-ref-descendants-slot-composition-format-migration-plan.md)의 구현 상세입니다.

## 목표

기존 `Element/Page/Layout` 하이브리드 구조를 즉시 폐기하지 않고, **canonical composition format**과 **단일 resolved-tree resolver**를 먼저 도입한 뒤 점진적으로 저장 포맷과 편집 semantics를 전환한다.

핵심 원칙:

1. **canonical source format**: `element | ref | slot`
2. **stable identity**: runtime UUID가 아닌 `localId` / `localId path`
3. **single resolver**: `ref resolve -> descendants apply -> slot fill -> resolved tree`
4. **legacy adapter**: 기존 flat `elements` / `pages` / `layouts`는 전환 기간 동안 read-through adapter로 유지
5. **ADR-063 비침범**: resolved tree 아래의 렌더 체인(RAC/RSP/Spec)은 그대로 유지

## Phase 구성

| Phase | 목표 | 결과물 |
| ---- | ---- | ---- |
| P0 | canonical format / resolver 계약 고정 | JSON schema 초안, TypeScript 타입, resolver 순서 문서화 |
| P1 | legacy → canonical adapter 도입 | flat `Element/Page/Layout`를 canonical doc tree로 투영하는 adapter |
| P2 | Preview / Skia 공통 resolved tree 입력화 | 두 renderer가 동일 resolver 결과를 소비 |
| P3 | frameset/layout/template를 새 포맷으로 흡수 | layout shell / template / slot assignment를 canonical format으로 통일 |
| P4 | 편집 semantics 전환 | copy/paste, duplicate, delete, detach, undo/redo, slot assign |
| P5 | persistence / import-export 전환 | DB 저장/로드, serializer, import/export, migration |

## Canonical 포맷 초안

```json
{
  "type": "element | ref | slot",
  "localId": "stable-local-id",
  "tag": "Button",
  "ref": "component:HeaderShell",
  "props": {},
  "children": [],
  "slots": {
    "main": []
  },
  "descendants": {
    "header.title": {
      "props": {
        "children": "Dashboard"
      }
    }
  }
}
```

### canonical 규칙

- `type="element"`: 실제 leaf/container node
- `type="ref"`: 재사용 subtree 참조
- `type="slot"`: 주입 지점
- `localId`: 문서 내부 stable identifier
- `descendants` key: runtime UUID가 아니라 `localId path`
- `slots`: component/layout/page 어디서나 동일 문법

## 현재 필드 → canonical 매핑

| 현재 | canonical | 비고 |
| ---- | --------- | ---- |
| `componentRole: "master"` | `documents.components[*]` 정의 | master registry 대신 component document |
| `componentRole: "instance" + masterId` | `type: "ref"` | instance 상태 모델을 문법으로 승격 |
| `overrides` | `ref.props override` 또는 `descendants[root]` | root-level override는 ref props로 단순화 가능 |
| `descendants` | `descendants[localIdPath]` | key를 runtime id → stable path로 전환 |
| `tag="Slot"` + `slot_name` | `type: "slot"` + `slots.<name>[]` | slot을 1급 composition primitive로 승격 |
| `Page.layout_id` | `page.layoutRef` | layout 적용을 직접 표현 |
| `layout_id` 소속 element | `documents.layouts[*].root` | 소속 필드가 아닌 문서 root 구조 |
| `parent_id/order_num` | canonical tree order | runtime flat index는 파생 캐시로 유지 가능 |

## 세부 작업

### P0. 타입 / 계약 고정

#### 신규

| 경로 | 역할 |
| ---- | ---- |
| `packages/shared/src/types/composition-document.types.ts` | canonical document / node / ref / slot 타입 |
| `docs/design/903-...-breakdown.md` | phase / mapping / test strategy 문서 |

#### 수정

| 경로 | 변경 |
| ---- | ---- |
| `packages/shared/src/types/element.types.ts` | legacy 필드에 canonical 대응 주석 추가, deprecation 계획 명시 |
| `apps/builder/src/types/builder/layout.types.ts` | canonical slot/layout 용어와 legacy adapter 경계 주석 추가 |

#### 산출물

- canonical JSON 예제 3종
  - reusable component
  - layout shell
  - page with slot fill
- resolver 순서 확정
- `localId` 생성/보존 규칙 확정

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
- `componentRole/masterId` → `ref`
- `tag="Slot"` + `slot_name` → `slot`
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

### P3. frameset/layout/template 흡수

#### 목표

기존 frameset/layout/template 시스템을 canonical composition format의 사례로 변환한다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/builder/templates/layoutTemplates.ts` | layout shell 정의를 canonical doc tree로 전환 |
| `apps/builder/src/types/builder/layout.types.ts` | legacy `Slot` 설명을 adapter 문맥으로 축소 |
| `apps/builder/src/builder/panels/properties/editors/LayoutPresetSelector/**` | slot 생성/매핑 UI를 canonical slots 편집 UI로 전환 |

#### 완료 기준

- header/left/main 형태의 layout shell이 `ref + slot`로 표현됨
- frameset 전용 엔진/특수 규칙 삭제 가능 상태
- template export/import가 canonical format을 기준으로 동작

### P4. 편집 semantics 전환

#### 목표

편집 연산을 canonical semantics에 맞춘다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/builder/stores/utils/instanceActions.ts` | create/detach semantics를 `ref` 기준으로 재정의 |
| `apps/builder/src/builder/utils/multiElementCopy.ts` | localId remap / descendants path remap |
| `apps/builder/src/builder/stores/history/**` | undo/redo payload를 canonical 연산 기준으로 정리 |
| `apps/builder/src/builder/panels/designKit/**` | master/instance UI를 component/ref UI로 재해석 |

#### 핵심 규칙

- duplicate: 새로운 runtime id + 새로운 localId scope remap
- delete: slot/instance-aware validation
- detach: `ref` 해제 후 subtree materialize
- copy/paste: descendants key, slot binding, localId collision 처리

### P5. persistence / import-export 전환

#### 목표

canonical format을 저장 정본으로 승격한다.

#### 대상 파일

| 경로 | 변경 |
| ---- | ---- |
| `apps/builder/src/lib/db/indexedDB/adapter.ts` | canonical 문서 저장 스키마 또는 serializer 도입 |
| `apps/builder/src/services/save/**` | save/load를 canonical 기준으로 전환 |
| `apps/builder/src/utils/designKit/kitExporter.ts` | component export를 canonical 구조로 정리 |
| `apps/builder/src/utils/designKit/kitLoader.ts` | import 시 localId/ref/slot-aware 로드 |

#### 전환 원칙

- read-through 먼저, write-through 나중
- shadow serializer 기간 운영 가능
- destructive migration 금지

## 테스트 전략

### 단위 테스트

- canonical resolver
  - ref nesting
  - descendants override precedence
  - slot fill precedence
  - empty required slot validation
- localId/path remap
  - duplicate
  - copy/paste
  - detach

### 통합 테스트

- Preview와 Skia가 같은 resolved tree snapshot을 받는지 비교
- layout template 적용 후 동일 slot fill 결과 비교
- legacy project load → canonical adapter → save roundtrip

### 회귀 체크리스트

- [ ] 기존 layout preset 페이지가 그대로 열린다
- [ ] 기존 component instance가 시각적으로 동일하다
- [ ] copy/paste 후 descendants override가 유지된다
- [ ] detach 후 일반 subtree로 정상 materialize 된다
- [ ] undo/redo가 ref/slot 변경을 안정적으로 복원한다
- [ ] import/export 결과가 localId 충돌 없이 재로드된다

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
