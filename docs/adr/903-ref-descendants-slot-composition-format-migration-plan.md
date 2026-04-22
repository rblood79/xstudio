# ADR-903: ref/descendants + slot 기본 composition 포맷 전환 계획

## Status

Proposed — 2026-04-22

## Context

composition은 현재 Builder(Skia)와 Preview/Publish(DOM + CSS, React Aria Components 기반)라는 두 렌더 경로를 가진다. [ADR-063](063-ssot-chain-charter.md)은 이 둘의 **컴포넌트 렌더링 SSOT 체인**을 D1(RAC DOM/접근성) / D2(RSP Props/API) / D3(Spec 시각)으로 정립했지만, **page/layout/document composition 포맷**과 **컴포넌트 재사용 문법**은 아직 단일 정본으로 정리되지 않았다.

### Domain (SSOT 체인 - [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

- **해당 domain**: **없음** - 본 ADR은 D1/D2/D3 상위에 위치하는 **문서 구조 / composition source model** 결정이다.
- **D1/D2/D3와의 관계**: `reusable: true + type:"ref" + descendants + slot` 포맷은 페이지/레이아웃/재사용 구조를 정의하고, 그 결과로 생성된 `resolved tree`가 D1/D2/D3 체인을 거쳐 Builder/Preview/Publish에 소비된다.
- **경계 정당화**: 본 ADR은 RAC DOM 구조나 RSP Props 계약, Spec 시각 정의를 직접 바꾸지 않는다. 대신 그들이 소비하는 상위 구조 포맷과 resolver를 정의한다.

### 문제

현재 구조는 composition source format이 **하이브리드**다.

1. `Element` 레코드는 `parent_id`, `page_id`, `layout_id`, `slot_name`, `componentRole`, `masterId`, `overrides`, `descendants`를 함께 가진다 [packages/shared/src/types/element.types.ts](../../packages/shared/src/types/element.types.ts).
2. Layout/Slot은 `tag="Slot"` + `Page.layout_id` + page element `slot_name` 조합으로 별도 해석된다 [apps/builder/src/types/builder/layout.types.ts](../../apps/builder/src/types/builder/layout.types.ts).
3. Preview는 `resolveLayoutForPage()`로 layout-slot 합성을 수행하지만 [apps/builder/src/preview/utils/layoutResolver.ts](../../apps/builder/src/preview/utils/layoutResolver.ts), Skia 경로는 `useResolvedElement()`에서 instance root props만 병합한다 [apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts](../../apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts).
4. `descendants`는 타입과 유틸은 있으나 실제 공통 resolved-tree 파이프라인에 정착하지 못했다 [apps/builder/src/utils/component/instanceResolver.ts](../../apps/builder/src/utils/component/instanceResolver.ts).
5. frameset 성격의 반복 레이아웃은 `layoutTemplates`와 현재 layout/slot 시스템으로 표현되지만 [apps/builder/src/builder/templates/layoutTemplates.ts](../../apps/builder/src/builder/templates/layoutTemplates.ts), 기본 포맷 자체가 ref/slot-aware 하지는 않다.

이 상태를 유지하면 다음 문제가 계속 남는다.

- **포맷 이중화**: 일반 element tree / layout-slot / master-instance가 서로 다른 문법으로 공존
- **resolver 이중화**: Preview와 Skia가 동일 source를 동일 방식으로 해석하지 못함
- **frameset 특수화**: 반복 레이아웃을 기본 composition 문법이 아니라 예외 기능으로 유지
- **컴포넌트 모델 비선언성**: 재사용 컴포넌트가 문서 자체의 문법(`reusable`, `ref`, `descendants`)이 아니라 `componentRole/masterId` 메타필드 조합으로 표현됨
- **slot 의도 비가시성**: "이 영역은 교체 가능한 컨텐츠 홀더"라는 의도가 포맷 레벨 속성이 아니라 런타임 규칙과 에디터 로직에 숨어 있음
- **편집 semantics 불일치**: copy/paste, detach, delete, duplicate, slot assign 규칙이 포맷 단일성 없이 파편화

Pencil의 `.pen` 포맷은 이 지점에서 더 선언적이다. 공식 문서는 재사용 컴포넌트를 `reusable: true`로 선언하고, 인스턴스를 `type:"ref"`로 만들며, `descendants`에서 `ok-button/label` 같은 경로로 중첩 자식을 정밀 오버라이드하거나 `children` 교체를 수행한다고 설명한다. 또한 `slot`은 특정 컨테이너가 children 교체를 의도한 자리라는 점과 추천 가능한 reusable component ID 목록까지 문서 스키마에 직접 담는다. composition이 이 방향으로 전환한다면, 포맷 전환은 곧 **컴포넌트 재사용 모델 전환**을 의미한다. [The .pen Format](https://docs.pencil.dev/for-developers/the-pen-format), [.pen Files](https://docs.pencil.dev/core-concepts/pen-files)

### Hard Constraints

1. **렌더 결과 보존** - 기존 Preview/Publish와 Builder(Skia)의 시각 회귀를 허용하지 않는다. 최종 전환 시 기존 주요 레이아웃/페이지 기준 회귀 0건이어야 한다.
2. **점진 전환 가능** - 기존 IndexedDB/스토어 기반 프로젝트를 한 번에 재직렬화하지 않고, adapter 경로로 단계적 마이그레이션이 가능해야 한다.
3. **단일 resolver** - 최종적으로 `ref resolve -> descendants apply -> slot contract validate -> resolved tree` 순서의 공통 해석 파이프라인 1개만 유지한다. legacy `slot_name` 기반 입력은 resolver 진입 전에 canonical descendants/slot 형태로 정규화한다.
4. **편집 성능 유지** - Builder 편집 경로는 현 수준의 반응성을 유지해야 한다. 전환 과정에서 copy/paste/drag/selection이 체감 저하를 만들면 안 된다.
5. **ADR-063 비침범** - D1(RAC), D2(RSP), D3(Spec) 권한 경계를 건드리지 않는다.
6. **하위 호환 롤백 가능** - 각 Phase는 feature flag 또는 adapter 경로로 되돌릴 수 있어야 한다.
7. **문서-네이티브 컴포넌트 재사용** - 재사용 컴포넌트는 `componentRole/masterId` 메타필드가 아니라 `reusable: true`, `type:"ref"`, path-based `descendants`로 표현되어야 한다.
8. **포맷 레벨 slot 선언** - slot은 별도 `Slot` 노드 특수처리가 아니라 컨테이너의 schema 속성으로 존재해야 하며, 필요 시 추천 가능한 reusable component ID 목록을 담을 수 있어야 한다.

### Soft Constraints

- frameset 기능은 별도 전용 엔진이 아니라 기본 composition 포맷의 한 사례로 흡수한다
- Pencil 유사 문서 모델(`reusable`, `ref`, `descendants`, `slot`)을 참고하되, ADR-063의 RAC/RSP/Spec 체인은 유지한다
- 현재 flat `elements` 저장소와 인덱스는 전환 기간 동안 adapter로 존치 가능하다
- 대규모 빅뱅 재작성보다 resolver-first 전환을 우선한다

## Alternatives Considered

### 대안 A: 문서-네이티브 composition/component 포맷 + resolver-first 점진 마이그레이션

- 설명: 일반 object tree 위에 `reusable: true`, `type:"ref"`, path-based `descendants`, 컨테이너 `slot` 메타데이터를 갖는 **문서-네이티브 canonical format**을 선언하고, 우선 **공통 resolved-tree resolver**를 도입한다. 초기에는 기존 `Element/Page/Layout` 저장 구조를 유지하되 adapter가 신포맷으로 투영한다. 이후 Preview/Skia를 같은 resolved tree에 연결하고, 마지막 단계에서 저장 포맷과 편집 semantics를 점진 전환한다.
- 근거:
  - Pencil 공식 문서는 `.pen`이 object tree 기반 포맷이며 `reusable: true`, `type:"ref"`, `descendants`, `slot`을 문서 핵심 문법으로 사용한다고 설명한다. [The .pen Format](https://docs.pencil.dev/for-developers/the-pen-format)
  - 같은 문서는 `ok-button/label` 같은 descendant path override, descendant node replacement, descendants 하위 `children` 교체, slot 추천 컴포넌트 목록까지 schema 차원에서 다룬다.
  - 현재 composition 코드에서도 layout-slot과 master-instance가 이미 부분 도입되어 있어, 메타필드 중심 모델을 문서 문법으로 승격시키는 편이 자연스럽다.
- 위험:
  - 기술: **MEDIUM** - 기존 flat store와 신포맷 adapter를 일정 기간 병행해야 한다
  - 성능: **LOW** - resolver 캐시/dirty subtree invalidation을 전제로 하면 병목이 구조적으로 줄어든다
  - 유지보수: **LOW** - 최종 상태는 포맷/해석기/렌더러 경계가 가장 단순하다
  - 마이그레이션: **MEDIUM** - editor operations, persistence, import/export를 순차 전환해야 한다

### 대안 B: 저장 포맷, 스토어, 편집기, 렌더러를 한 번에 신포맷으로 빅뱅 교체

- 설명: `Element/Page/Layout` 현재 구조를 빠르게 폐기하고, DB/store/editor/runtime 전체를 새 composition/component 포맷으로 즉시 갈아탄다.
- 근거:
  - 최종 상태에 가장 빨리 도달한다
  - adapter/bridge를 오래 유지하지 않아도 된다
  - 설계 타협 없이 새 문법을 바로 강제할 수 있다
- 위험:
  - 기술: **HIGH** - store, preview, skia, history, import/export, templates, persistence가 동시에 깨질 수 있다
  - 성능: **MEDIUM** - 신 resolver와 편집 연산 성능을 실전 데이터 없이 한 번에 검증해야 한다
  - 유지보수: **MEDIUM** - 초기 구현 속도는 빠르지만 회귀 분석과 디버깅 비용이 급증한다
  - 마이그레이션: **CRITICAL** - 기존 프로젝트/세이브 파일/undo history/복사-붙여넣기 semantics 전체에 직접 충돌한다

### 대안 C: 현재 하이브리드 포맷 유지, frameset만 ref/slot 스타일로 부분 개선

- 설명: 일반 element tree와 master-instance 체계는 유지하고, frameset/layout 관련 기능만 `ref/descendants + slot` 식으로 보강한다.
- 근거:
  - 초기 작업량이 가장 적다
  - 현재 layout/slot 템플릿 자산을 재활용하기 쉽다
  - preview resolver를 크게 흔들지 않고 기능 증설이 가능하다
- 위험:
  - 기술: **LOW** - 단기 구현 난이도는 낮다
  - 성능: **MEDIUM** - Preview/Skia가 서로 다른 resolver를 유지하면 최적화 지점이 분리된다
  - 유지보수: **HIGH** - 포맷 2중화가 영속화되어 frameset, layout, component instance가 영구 예외가 된다
  - 마이그레이션: **LOW** - 기존 프로젝트는 거의 건드리지 않는다

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| :--: | :--: | :--: | :------: | :----------: | :--------: |
|  A   |  M   |  L   |    L     |      M       |     0      |
|  B   |  H   |  M   |    M     |      C       |     2      |
|  C   |  L   |  M   |    H     |      L       |     1      |

- 대안 A는 HIGH 이상이 0개이며, 중간 단계 adapter 비용만 관리하면 된다.
- 대안 B는 `stores/elements`, `preview/utils/layoutResolver`, `workspace/canvas/sprites/useResolvedElement`, persistence/export 경로를 동시에 교체해야 하므로 기술 HIGH + 마이그레이션 CRITICAL이다.
- 대안 C는 단기 안정성은 좋지만 포맷 이중화를 고착화하여 장기 유지보수 HIGH를 남긴다.

**루프 판정**: 대안 A가 유일하게 HIGH+ 0개다. 추가 대안 루프 없이 선택 가능하다.

## Decision

**대안 A: 문서-네이티브 composition/component 포맷 + resolver-first 점진 마이그레이션**을 선택한다.

선택 근거:

1. **문서 포맷 단일화**와 **컴포넌트 재사용 모델 단일화**를 동시에 달성하면서도, 저장 포맷과 편집기를 한 번에 깨지 않는다.
2. `resolved tree`를 먼저 공통화하면 Preview와 Skia가 동일 source를 소비하게 되어, 이후 렌더 회귀를 구조적으로 줄일 수 있다.
3. frameset을 별도 기능이 아니라 `reusable` layout shell + `ref` instance + `descendants` children 교체 + `slot` 선언으로 표현되는 기본 composition 문법의 한 사례로 흡수할 수 있다.
4. slot을 포맷 메타데이터로 승격하면 "교체 가능한 컨텐츠 영역"과 추천 컴포넌트 목록이 문서 스키마에 직접 남는다.
5. ADR-063의 D1/D2/D3 체인을 건드리지 않고, 그 위의 상위 document/component model만 교체할 수 있다.
6. 신포맷 도입 후에도 flat 인덱스/스토어는 캐시/저장 adapter로 존치할 수 있어, 성능과 마이그레이션 리스크를 동시에 제어하기 쉽다.

기각 사유:

- **대안 B 기각**: 최종 상태는 깨끗하지만 코드 경로 동시 교체 범위가 너무 넓다. `packages/shared/src/types/element.types.ts`, `apps/builder/src/preview/utils/layoutResolver.ts`, `apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts`, `apps/builder/src/builder/stores/elements.ts`, persistence/export 경로를 한 번에 바꾸는 것은 마이그레이션 CRITICAL이다.
- **대안 C 기각**: frameset만 신포맷으로 감싸면 기본 문서 포맷과 컴포넌트 재사용 모델은 계속 `componentRole/masterId` 중심 메타체계로 남는다. 이 경우 "새 composition 포맷"이 기본 문법이 아니라 또 다른 예외 기능이 된다.

> 구현 상세: [903-ref-descendants-slot-composition-format-migration-plan-breakdown.md](../design/903-ref-descendants-slot-composition-format-migration-plan-breakdown.md)

## Risks

| ID | 위험 | 심각도 | 대응 |
| -- | ---- | :----: | ---- |
| R1 | 기존 `layout_id / slot_name / componentRole / masterId` 하이브리드 필드가 adapter 단계에서 장기간 남아 source-of-truth 혼동을 만들 수 있음 | MEDIUM | Phase 1에서 canonical component grammar(`reusable`, `ref`, `descendants`, `slot`)와 legacy adapter 경계를 문서/타입으로 분리하고, 신규 기능은 canonical format에만 추가 |
| R2 | Preview와 Skia가 공통 resolver를 소비하기 전까지는 부분 이중화가 남아 회귀 분석 비용이 증가 | MEDIUM | Phase 2를 최우선으로 두어 `resolved tree` 공통 소비를 먼저 완료하고, legacy resolver는 read-only fallback으로 제한 |
| R3 | `descendants` 타깃을 runtime UUID에서 stable node id/path로 옮길 때 copy/paste, duplicate, detach semantics가 깨질 수 있음 | MEDIUM | Phase 3에서 id/path remap 규칙과 serialization 규칙을 고정하고, 편집 연산 테스트를 집중 추가 |
| R4 | DB 저장 포맷 전환을 너무 이르게 시작하면 undo/history/import/export 경로가 동시 회귀할 수 있음 | MEDIUM | 저장 포맷 전환은 마지막 Phase로 미루고, 그 전까지는 adapter 기반 shadow write 또는 read-through만 허용 |

잔존 HIGH 위험 없음.

## Gates

| Gate | 시점 | 통과 조건 | 실패 시 대안 |
| ---- | ---- | --------- | ------------ |
| G1: Canonical Format 고정 | Phase 0 완료 | `reusable: true`, `type:"ref"`, `descendants` path/children replacement 규칙, `slot` 메타데이터 및 추천 컴포넌트 목록 규칙, resolver 순서가 ADR + 타입으로 고정됨 | 설계 미완이면 ADR 보강 후 Phase 1 보류 |
| G2: Resolver 공통화 | Phase 2 완료 | Preview와 Skia가 동일 `resolved tree` 입력을 소비하고, legacy 전용 resolver 추가 개발이 중단됨 | Preview/Skia 중 한 경로라도 미연결이면 adapter 기간 연장 |
| G3: Frameset 흡수 | Phase 3 완료 | 기존 frameset/layout 템플릿이 `reusable` layout shell + `slot` 선언 + `ref` 기반 page instance로 표현되고, 별도 전용 엔진/전용 데이터 규칙이 제거됨 | layout-slot 어댑터 유지, 전용 기능 신규 추가 금지 |
| G4: Editing Semantics 안정화 | Phase 4 완료 | copy/paste, duplicate, detach, delete, slot assign, undo/redo가 id/path + ref/slot semantics 기준으로 회귀 0건 | 연산별 fallback 유지, 저장 포맷 전환 연기 |
| G5: Persistence 전환 | Phase 5 완료 | 기존 프로젝트를 자동 마이그레이션 또는 read-through로 열 수 있고, import/export/DB 저장이 신포맷 정본으로 전환됨 | legacy persistence 어댑터 유지, destructive migration 금지 |

## Consequences

### Positive

- 문서 구조 포맷이 `reusable + ref + descendants + slot` 중심으로 단일화된다
- 컴포넌트 재사용 모델이 메타필드 조합이 아니라 문서-네이티브 문법으로 승격된다
- Preview와 Skia가 동일 `resolved tree`를 소비하게 되어 구조적 정합성 확보가 쉬워진다
- frameset이 별도 특수 기능이 아니라 기본 composition 문법의 한 사례가 된다
- 이후 layout shell, reusable component, page composition, template system을 같은 문법으로 확장할 수 있다
- ADR-063의 RAC/RSP/Spec 체인을 그대로 유지하면서 상위 구조만 정리할 수 있다

### Negative

- 중간 단계 동안 legacy adapter와 canonical format이 병행되어 문서/타입 복잡도가 일시적으로 증가한다
- editor operations, history, persistence, import/export까지 영향 범위가 넓어 장기 작업이 된다
- `packages/shared/src/types/element.types.ts`와 builder 내부 타입/스토어 경계 재정리가 필요하다
- component authoring UI, instance override UI, slot authoring UI까지 전환 범위에 포함되어 구현 스코프가 커진다
- 완료 전까지는 "신포맷 정본 + 구포맷 저장 어댑터"라는 임시 구조를 감수해야 한다

## References

- [ADR-063: SSOT 체인 정본 정의 — 3-Domain 분할](063-ssot-chain-charter.md)
- [The .pen Format](https://docs.pencil.dev/for-developers/the-pen-format)
- [.pen Files](https://docs.pencil.dev/core-concepts/pen-files)
- [packages/shared/src/types/element.types.ts](../../packages/shared/src/types/element.types.ts)
- [apps/builder/src/types/builder/layout.types.ts](../../apps/builder/src/types/builder/layout.types.ts)
- [apps/builder/src/preview/utils/layoutResolver.ts](../../apps/builder/src/preview/utils/layoutResolver.ts)
- [apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts](../../apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts)
- [apps/builder/src/utils/component/instanceResolver.ts](../../apps/builder/src/utils/component/instanceResolver.ts)
- [docs/pencil-extracted/engine/16_mcp-processor.txt](../pencil-extracted/engine/16_mcp-processor.txt)
- [docs/pencil-extracted/index.txt](../pencil-extracted/index.txt)
