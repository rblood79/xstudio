# ADR-916: Canonical Document SSOT 전환 계획

## Status

Proposed — 2026-04-30

## Context

ADR-903은 `CompositionDocument` canonical format, `reusable/ref/descendants/slot` 문법, resolver-first migration을 도입했고, ADR-910은 `themes`/`variables`를 canonical document에 land했다. ADR-911/912/913/914는 그 후속 영역인 frame/slot authoring, editing semantics, `tag -> type`, hybrid field cleanup, imports resolver를 나누어 처리한다.

그러나 현재 runtime/persistence 구조는 아직 **canonical document가 최종 SSOT가 아니라 read-through projection**에 가깝다. `elements[] + pages[] + layouts[]`에서 매번 `CompositionDocument`를 만들고, legacy 필드(`layout_id`, `slot_name`, `componentRole`, `masterId`, legacy `overrides/descendants`)를 canonical 의미로 역해석한다. 이 상태는 format 전환기의 완충책으로는 유효하지만, 최종 구조가 되면 성능과 의미 충돌을 계속 만든다.

이 ADR은 기존 후속 ADR들을 폐기하지 않고, 그 위에 **최종 목표를 명확히 고정**한다. 최종 기준은 Pencil 원본 `.pen` schema도, legacy `elements[]` store도 아니다. 최종 기준은 Composition component vocabulary를 유지하는 **`CompositionDocument` canonical schema**다.

**Hard Constraints**:

1. **최종 SSOT 고정** — 저장/편집/렌더/history/preview/publish의 장기 기준은 `CompositionDocument`여야 한다. legacy `elements[]`는 adapter/import/export/migration 경계로 내려간다.
2. **Pencil 원본 schema 비채택** — `frame/ref/descendants/slot` 구조는 Pencil과 정합하지만, `Button`, `Section`, `TextField` 같은 Composition component vocabulary와 Spec/D1-D3 체인은 유지한다.
3. **Hot path projection 금지** — drag, selection, canvas render, preview sync, layer tree update 같은 고빈도 경로에서 `legacyToCanonical()` 전체 문서 재구성을 호출하지 않는다.
4. **Core vs extension 경계 명시** — canonical core에는 문서 구조 문법만 둔다. Composition app behavior(`events`, `actions`, `dataBinding`, editor state)는 namespaced extension으로 분리한다.
5. **하위 호환 read-through** — 기존 프로젝트는 adapter로 읽을 수 있어야 하지만, 신규 write는 canonical document를 우선해야 한다.
6. **시각/데이터 회귀 0** — 전환 후 기존 샘플 프로젝트와 사용자 프로젝트의 Skia/Preview/Publish 렌더 결과와 slot/ref editing semantics가 보존되어야 한다.
7. **ADR-063 경계 유지** — D1(RAC DOM/접근성), D2(RSP Props/API), D3(Spec 시각) SSOT는 canonical document 하위 consumer로 유지하고, 본 ADR은 그 상위 document/source model만 다룬다.

**Soft Constraints**:

- 단계별 feature flag와 shadow write/read verification을 사용한다.
- ADR-911/913/914의 기존 phase를 최대한 재사용하되, 최종 cutover gate는 본 ADR에서 통합 관리한다.
- migration 도중 임시 adapter 최적화는 허용하지만 최종 목표로 삼지 않는다.

## Alternatives Considered

### 대안 A: Legacy `elements[]` 유지 + canonical adapter 강화

- 설명: 현재처럼 legacy store를 SSOT로 두고, `legacyToCanonical()` projection과 resolver cache를 개선한다.
- 근거: 단기 구현량이 작고 기존 저장/스토어/Undo 경로 변경이 적다.
- 위험:
  - 기술: MED — adapter/renderer/store가 계속 양방향 의미 변환을 알아야 한다.
  - 성능: HIGH — 전체 문서 projection이 hot path로 재유입될 위험이 남는다.
  - 유지보수: HIGH — legacy field와 canonical field가 계속 공존한다.
  - 마이그레이션: LOW — destructive migration은 피할 수 있다.

### 대안 B: Pencil `.pen` schema 그대로 채택

- 설명: Composition 내부 저장 format을 Pencil primitive schema에 맞춘다.
- 근거: 외부 Pencil 호환성과 import/export 단순성이 가장 높다.
- 위험:
  - 기술: HIGH — Composition의 component/spec/RAC vocabulary와 primitive scenegraph가 충돌한다.
  - 성능: MED — primitive 변환 layer가 별도로 필요하다.
  - 유지보수: HIGH — Button/TextField/Section 같은 component semantics 손실을 adapter가 계속 복구해야 한다.
  - 마이그레이션: HIGH — 기존 component-centric 데이터의 의미 손실 위험이 크다.

### 대안 C: `CompositionDocument` canonical schema를 최종 SSOT로 전환

- 설명: Composition component vocabulary를 유지한 canonical document를 저장/편집/렌더의 최종 기준으로 승격한다. Pencil 구조 필드는 정합하게 유지하고, Pencil primitive와 app behavior는 adapter/extension으로 분리한다.
- 근거: ADR-903/910/911/913의 실제 전환 방향과 일치하고, format 변경의 목적을 완료 상태까지 밀어붙인다.
- 위험:
  - 기술: MED — canonical document mutation API, history, persistence, preview bridge를 재정렬해야 한다.
  - 성능: LOW — cutover 후 hot path의 legacy projection 제거가 가능하다.
  - 유지보수: LOW — document/source model이 하나로 줄어든다.
  - 마이그레이션: HIGH — 저장/편집/history/preview/publish 경계 전환 범위가 크다.

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | MED  | HIGH | HIGH     | LOW          |     2      |
| B    | HIGH | MED  | HIGH     | HIGH         |     3      |
| C    | MED  | LOW  | LOW      | HIGH         |     1      |

대안 C도 migration HIGH가 남지만, 이 위험은 단계별 shadow write/read gate로 관리 가능하다. 대안 A는 현재 문제를 고착시키고, 대안 B는 Composition의 component model을 손상시킨다.

## Decision

**대안 C: `CompositionDocument` canonical schema를 최종 SSOT로 전환**을 선택한다.

선택 근거:

1. format 변경의 목적이 reusable/ref/descendants/slot/frame을 문서 문법으로 승격하는 것이므로, 최종 기준도 문서-네이티브 schema여야 한다.
2. legacy `elements[]`를 최종 SSOT로 두면 `layout_id`, `slot_name`, `componentRole`, `masterId`를 계속 canonical 의미로 변환/역해석해야 한다.
3. Pencil 구조 정합은 유지하되 Pencil primitive schema를 그대로 채택하지 않아야 Composition의 React Aria/Spectrum + Spec component model을 보존할 수 있다.
4. 성능 문제의 근본 처리는 adapter cache가 아니라 hot path에서 legacy projection 자체를 제거하는 것이다.

기각 사유:

- **대안 A 기각**: migration 완충책으로는 유효하지만 최종 구조가 되면 현재 hybrid 비용과 의미 충돌을 영구화한다.
- **대안 B 기각**: Pencil 호환성은 높지만 Composition의 component-centric schema와 충돌한다.

> 구현 상세: [916-canonical-document-ssot-transition-breakdown.md](design/916-canonical-document-ssot-transition-breakdown.md)

## Risks

| ID  | 위험                                                                                                        | 심각도 | 대응                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------- |
| R1  | canonical document mutation API가 저장/history/undo 경계를 한 번에 바꾸면서 데이터 손실을 만들 수 있음      |  HIGH  | Phase 1은 API + unit test까지만 진행하고, Phase 3에서 shadow write + backup + roundtrip diff 후 write-through |
| R2  | `legacyToCanonical()` 또는 `selectCanonicalDocument()`가 drag/selection/render hot path에 계속 남을 수 있음 |  HIGH  | G3에 hot path projection 0건 grep gate를 두고, cold path/adapter-only 예외를 파일 경로로 제한                 |
| R3  | `events`/`dataBinding`/`actions`가 canonical core에 섞여 Pencil-compatible 구조 경계를 흐릴 수 있음         |  MED   | `x-composition` extension namespace를 먼저 고정하고, function callback serialize를 금지                       |
| R4  | ADR-911/913/914가 각자 cleanup을 진행하면서 최종 cutover 기준이 다시 흩어질 수 있음                         |  HIGH  | ADR-916 G5를 상위 closure gate로 두고 README row와 각 ADR phase 상태를 동시 갱신                              |
| R5  | legacy field quarantine이 과도하게 빨리 진행되어 기존 프로젝트 read-through가 깨질 수 있음                  |  HIGH  | adapter-only read-through와 migration marker를 유지하고, destructive migration 없이 shadow 검증 후 제거       |
| R6  | canonical primary 전환 후 Skia/Preview/Publish 중 한 경로만 다른 tree를 소비할 수 있음                      |  MED   | G6에서 3경로 parity matrix와 history/slot/ref 시나리오를 함께 검증                                            |

## Gates

| Gate                          | 시점    | 통과 조건                                                                                                                          | 실패 시 대안                    |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| G1: Schema Boundary Freeze    | Phase 0 | canonical core, Composition extension, legacy adapter field 분류표가 타입/문서에 고정됨                                            | Phase 1 진입 보류               |
| G2: Canonical Store API       | Phase 1 | `CompositionDocument` read/write/mutation API가 `elements[]` 직접 mutation 없이 테스트 가능                                        | adapter write-through 유지      |
| G3: Hot Path Cutover          | Phase 2 | drag/selection/render/LayerTree/Preview sync 경로에서 full `legacyToCanonical()` 호출 0건                                          | 해당 경로 flag rollback         |
| G4: Persistence Write-Through | Phase 3 | 신규 저장은 canonical document 우선, legacy 저장은 adapter/shadow로만 유지                                                         | read-through only 연장          |
| G5: Legacy Field Quarantine   | Phase 4 | `layout_id`, `slot_name`, `componentRole`, `masterId`, legacy `overrides/descendants`가 adapter 디렉터리 밖 runtime read/write 0건 | 필드별 cleanup sub-phase 재분리 |
| G6: Runtime Parity            | Phase 5 | Skia/Preview/Publish/History/Undo/Redo/slot fill/ref detach 샘플 회귀 0건                                                          | cutover 보류, shadow mode 유지  |
| G7: Extension Boundary        | Phase 5 | `events`, `actions`, `dataBinding`이 canonical core가 아닌 namespaced Composition extension으로만 serialize됨                      | extension schema 보강           |

## Consequences

### Positive

- document/source model의 최종 기준이 명확해진다.
- Pencil식 `frame/ref/descendants/slot` 구조와 Composition component vocabulary를 동시에 유지한다.
- legacy-to-canonical projection 비용을 hot path에서 제거할 수 있다.
- slot fill, detach, override reset, origin/ref 관계를 schema 기준으로 판단할 수 있다.
- import/export adapter와 내부 저장 format 경계가 분리된다.

### Negative

- 저장, history, preview bridge, renderer input, LayerTree, properties panel까지 전환 범위가 넓다.
- 전환 기간에는 canonical document와 legacy adapter가 계속 병행된다.
- ADR-911/913/914의 잔여 phase와 의존 관계를 다시 정렬해야 한다.
- extension namespace를 확정하기 전까지 events/dataBinding schema를 성급히 core에 넣을 수 없다.

## References

- [ADR-903: ref/descendants + slot 기본 composition 포맷 전환 계획](completed/903-ref-descendants-slot-composition-format-migration-plan.md)
- [ADR-910: Canonical `themes`/`variables` 필드 Land Plan](completed/910-canonical-themes-variables-land-plan.md)
- [ADR-911: Layout/Slot Frameset 완전 재설계](911-layout-frameset-pencil-redesign.md)
- [ADR-912: Editing Semantics UI 6요소 + Slot section base](912-editing-semantics-ui-5elements.md)
- [ADR-913: `Element.tag -> Element.type` rename + hybrid 6 필드 cleanup](913-tag-type-rename-hybrid-cleanup.md)
- [ADR-914: `imports` resolver + DesignKit 통합](914-imports-resolver-designkit-integration.md)
- [`CompositionDocument` 타입](../../packages/shared/src/types/composition-document.types.ts)
- [Legacy `Element` 타입](../../apps/builder/src/types/builder/unified.types.ts)
- [Legacy -> canonical adapter](../../apps/builder/src/adapters/canonical/index.ts)
- [Pencil copy clean-room mapping](../pencil-copy/composition-mapping.md)
