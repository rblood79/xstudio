# ADR-913: `Element.tag → Element.type` rename + hybrid 6 필드 cleanup

## Status

Proposed — 2026-04-26

## Context

### Domain (SSOT 체인 - [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

- **해당 domain**: **D2 (Props/API) — 타입/필드 이름 정합** + **persistence schema** — pencil 공식 schema 정합. ADR-903 의 G5 (b)/(c)/(d)/(e)/(f) 잔여 흡수.

### 배경

[ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) Implemented (2026-04-26) 후 canonical document 의 schema 는 `type` 필드 (pencil 공식) 기준으로 정의되었으나, **runtime/persistence 경로의 hybrid 잔존**:

- **`Element.tag` → `Element.type` rename** — 1031 ref / 154 파일 (2026-04-22 실측)
- **hybrid 6 필드** — 합 1472 ref / 184 파일:
  - `layout_id` 258 ref (ADR-911 가 G3 영역 흡수, 본 ADR 가 persistence 영역 cleanup)
  - `masterId` 55 ref
  - `componentRole` 41 ref
  - `descendants` 39 ref (canonical 으로 정의됐으나 legacy `Override` 타입과 혼재)
  - `slot_name` 25 ref
  - `overrides` 23 ref
- **`layoutTemplates.ts` 28 Slot 선언** — canonical format serialize 미적용
- **DB 저장 schema** — `tag` 컬럼이 elements store 의 indexed field

이 상태에서 신 컴포넌트 추가 / migration / pencil import-export 모두 hybrid 경로를 거쳐야 함 → SSOT 혼동 + dead code 영구화.

### Hard Constraints

1. **rename 전수 0 miss** — `Element.tag` 1031 ref 가 `Element.type` 으로 일괄 rename. discriminator 오판 (`undefined tag`) 0건
2. **DataBinding.type / FieldDefinition.type 과의 scope 분리** — `Element.type: ComponentTag` (116-literal union) vs `FieldType` (7-literal union) 완전 disjoint. runtime 교집합 0건
3. **DB schema 전환** — `tag` 컬럼 → `type` 컬럼 (read-through 우선, write-through 후행)
4. **roundtrip 시각 회귀 0** — 변환 전후 Skia/CSS 렌더 결과 동일
5. **hybrid 6 필드 cleanup** — adapter shim 한정 또는 0건

### Soft Constraints

1. ast-grep 또는 tsc --noEmit 자동 rename 도구 활용 (수동 review 후 land)
2. runtime type guard `isCanonicalNode(obj): obj is Element` 도입 — `type` + `id` + (optional `children`) 조합
3. `DB_VERSION 8 → 9` 진입 시 `tag → type` migration 단계 추가 (ADR-903 P3-E E-6 의 자동 migration 패턴 재사용)

## Alternatives Considered

### 대안 A: 단일 ADR + 단일 Phase (전수 일괄 rename + cleanup) — 본 ADR scope

- 설명: `tag → type` rename + hybrid 6 필드 cleanup 을 단일 Phase 로 일괄 진행. ast-grep 도구 + runtime type guard + DB schema 전환 + roundtrip 검증
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(**HIGH**)
- **마이그레이션 HIGH**: 1472 ref / 184 파일 일괄 변경 — 부분 누락 시 runtime 회귀 가능성. 그러나 도구 자동화 + tsc --noEmit gate 로 관리 가능

### 대안 B: 2 ADR 분리 (rename 단독 + hybrid cleanup 단독)

- 설명: ADR-913a (`tag → type` rename) + ADR-913b (hybrid 6 필드 cleanup) 분리. 의존 그래프 명확화
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(M)
- 두 작업이 같은 영역의 schema cleanup → 분리 시 일관성 추적 부담 + 중간 상태 (rename 됐는데 hybrid 잔존) 가 복잡

### 대안 C: 점진 rename (componentRole/masterId 만 우선, tag/layout_id/descendants 후속)

- 설명: 사용 빈도 낮은 hybrid 필드 (componentRole 41 / masterId 55) 만 우선 cleanup. tag rename + layout_id/descendants/slot_name/overrides 는 후속
- 위험: 기술(L) / 성능(L) / 유지보수(**HIGH**) / 마이그레이션(L)
- **유지보수 HIGH**: hybrid 영구 잔존 가능성 + tag/type 혼용 → ADR-903 R1 영구화

### Risk Threshold Check

| 대안 |         HIGH+         | 판정                               |
| ---- | :-------------------: | ---------------------------------- |
| A    | 1 (마이그레이션 HIGH) | 도구 자동화 + Gate 로 수용 가능 ✅ |
| B    |           0           | 가능하지만 중간 상태 복잡          |
| C    |   1 (유지보수 HIGH)   | 회피 (영구 hybrid)                 |

대안 A 채택 — 도구 자동화 + tsc gate + roundtrip 검증으로 마이그레이션 HIGH 관리.

## Decision

**대안 A: 단일 ADR + 단일 Phase 일괄 rename + cleanup** 를 선택한다.

선택 근거:

1. design 문서 `903-phase5-persistence-imports-breakdown.md` 의 **P5-C (adapter shim 완전 해체)** 가 본 ADR scope 와 정합. 신규 design 작성 불필요
2. tag rename + hybrid cleanup 이 같은 영역의 schema 정합 → 분리 시 중간 상태 복잡 + 일관성 추적 부담
3. ast-grep 자동 도구 + tsc --noEmit gate + roundtrip 검증 3중 안전망으로 마이그레이션 HIGH 관리 가능
4. 단일 Phase land 후 SSOT 도달 (legacy 0)

### 기각된 대안 사유

- **대안 B 기각**: 두 작업이 같은 schema 영역 → 분리 시 일관성 추적 부담
- **대안 C 기각**: hybrid 영구 잔존 → ADR-903 R1 영구화

> 구현 상세: [903-phase5-persistence-imports-breakdown.md](design/903-phase5-persistence-imports-breakdown.md) §P5-C — ADR-903 Phase 5 design 문서 그대로 활용

## Risks

| ID  | 위험                                                                                    | 심각도 | 대응                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 1031 ref `tag` rename 부분 누락 — runtime discriminator 오판 (`undefined tag`)          |  HIGH  | (a) ast-grep 자동 rename 도구 (b) TypeScript 타입 정의에서 `tag` 필드 제거 → tsc --noEmit 로 누락 참조 전량 노출 (c) `isCanonicalNode` runtime guard 도입 (d) tree walker `if (!isCanonicalNode(child)) continue` 방어 |
| R2  | DataBinding.type / FieldDefinition.type 과의 혼동 — `obj.type` 접근 시 잘못된 타입 추론 |  MED   | scope 분리 규칙 명문화 (`element.type` vs `element.props.columnMapping.*.type` vs `element.dataBinding.type` 3단계 nesting) + TypeScript literal union disjoint                                                        |
| R3  | DB schema 전환 (`tag → type` 컬럼) 시 기존 프로젝트 데이터 손실                         |  HIGH  | (a) ADR-903 P3-E E-6 의 자동 migration 패턴 재사용 — `_meta.schemaVersion` 기반 migration script + localStorage backup (b) DB_VERSION 9 진입 시 dry-run 우선 + write-through 후행 (c) roundtrip 검증 후 cutover        |
| R4  | layoutTemplates.ts 28 Slot 변환 후 시각 drift                                           |  MED   | dry-run + roundtrip Skia/CSS 시각 비교 (ADR-911 와 동일 패턴)                                                                                                                                                          |
| R5  | hybrid 6 필드 중 사용 중인 영역 (예: descendants override) 의 의미 손실                 |  MED   | descendants 는 canonical 으로 의미 유지 (구조만 수정). componentRole 변환 시 `metadata.componentRole` 보존 (P5-B 결정 필요)                                                                                            |
| R6  | tsc --noEmit 통과해도 runtime 동작 차이 (예: serializer 의 `tag` literal hardcode)      |  MED   | runtime smoke test — 샘플 프로젝트 100% 시각 회귀 검증 (mockLargeDataV2 + 사용자 프로젝트 5종)                                                                                                                         |

잔존 HIGH 위험 = R1, R3 — 모두 Gate 매핑.

## Gates

| Gate                                            | 시점    | 통과 조건                                                                                                                                                                                                                                                                                                                           | 실패 시 대안                                 |
| ----------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **G5-B**: tag rename 도구 land                  | Phase 1 | (a) ast-grep 자동 rename 1031 ref / 154 파일 / (b) tsc --noEmit 0 error / (c) `isCanonicalNode` runtime guard land                                                                                                                                                                                                                  | 도구 보강 + 수동 review                      |
| **G5-C**: hybrid 6 필드 cleanup                 | Phase 2 | (a) `componentRole` / `masterId` / `slot_name` / `overrides` 4 필드 0 ref (b) `layout_id` adapter shim 한정 또는 0 (c) `descendants` canonical 으로 통합 (legacy Override 타입 제거)                                                                                                                                                | adapter shim 디렉터리 한정 + dead code 제거  |
| **G5-D**: layoutTemplates serialize             | Phase 3 | layoutTemplates.ts 28 Slot 전수 canonical format serialize / dry-run + roundtrip 시각 회귀 0                                                                                                                                                                                                                                        | 변환 도구 보강                               |
| **G5-E**: DB schema 전환 (R3 매핑)              | Phase 4 | (a) `DB_VERSION 8 → 9` migration script land / (b) `tag → type` 컬럼 전환 + index 갱신 / (c) read-through 우선 + write-through 후행 / (d) localStorage backup 3중 안전망 / (e) dev 환경 수동 검증                                                                                                                                   | fallback 자동 복귀 (`schemaVersion: legacy`) |
| **G5-F**: repo-wide legacy layout 0건 (R1 매핑) | Phase 5 | (a) §M7 측정 명령 결과 = 0 또는 `apps/builder/src/adapters/legacy-layout/` 한정 / (b) `useLayoutsStore` 본체 0줄 / (c) `BuilderCore.tsx` / `useIframeMessenger.ts` / `BuilderCanvas.tsx` / `AddPageDialog.tsx` / `PageLayoutSelector.tsx` / `stores/utils/layoutActions.ts` / `workspace/canvas/skia/workflowEdges.ts` 전 경로 해체 | adapter shim 디렉터리 한정                   |

## Consequences

### Positive

- ADR-903 R5 (`tag → type` rename 부분 누락) + R1 (legacy hybrid 영구화) 근본 해소
- pencil 공식 schema 와 1:1 매칭 — 외부 import/export 자연스럽게 지원 (ADR-911 + ADR-914 와 통합)
- legacy 0 도달 → 신 컴포넌트 추가 / migration / pencil import-export 모두 단일 SSOT 경로
- ADR-903 G5 (b)~(f) 잔여 영역 종결

### Negative

- 1472 ref / 184 파일 일괄 변경 — 일회성 작업량 큼
- DB schema 전환 — 기존 사용자 데이터 자동 migration 첫 실행 시 dev 검증 필수
- Phase 1~5 land 동안 일시적 mixed state (일부 rename / 일부 hybrid)

## References

- [ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) — canonical document migration (Implemented 2026-04-26, 본 ADR 의 G5 (b)~(f) 잔여 흡수)
- [ADR-903 Phase 5 design](design/903-phase5-persistence-imports-breakdown.md) — P5-C 영역 본 ADR 의 구현 상세 그대로 활용
- [ADR-903 P3-E E-6](#) — IndexedDB schema 자동 migration 패턴 (본 ADR Phase 4 G5-E 에서 재사용)
- [ADR-911](911-layout-frameset-pencil-redesign.md) — Layout/frameset pencil 호환 재설계 (본 ADR 가 hybrid `layout_id` 영역 cleanup 의 일부 흡수)
- pencil app schema — 본 ADR 의 `type` 필드 호환 기준
