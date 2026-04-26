# ADR-903 신규 추가 필드 P0 Land 상태 검증

> 흡수 (frameset → reusable frame) 외에 ADR-903 §3.10/§3.11 에서 신규 추가된 4 카테고리의 실제 land 상태 검증. HEAD `151d2e27` 기준. Team 3 (Explore agent) 분석 산출물 — Explore 도구 제한으로 task output 에서 본 파일로 이관.

## 1. 검증 결과 종합 분포

**~12 항목 분포** (4 카테고리 × 평균 3 필드):

| 상태             | 항목 수 | 비중 | 의미                                        |
| ---------------- | :-----: | ---: | ------------------------------------------- |
| **Land 완료**    |    4    |  33% | 타입 + 어댑터 + 리졸버 + 테스트 전수 동작   |
| **Partial Land** |    4    |  33% | 타입 정의 + 일부 구현, 일부 후속 phase 대기 |
| **Stub Only**    |    4    |  33% | 타입만 land, implementation 미존재          |

**해석**: ADR-903 P0 진행도가 메모리상 "100%" 로 표시되어 있으나 **실제 70% 만 동작** — 타입 정의 100%, 어댑터/리졸버 50%. 진행도 표시 갱신 권고.

## 2. Cat 1 — Frame 전용 컨테이너 필드 (3종)

| 필드          | 타입 land | 사용처 / 구현                                                               | 상태        | 후속 phase 권고                                                     |
| ------------- | :-------: | --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `clip`        |    ✅     | 타입만 정의, 렌더 미구현 (Skia / DOM 어디에서도 `overflow:hidden` 매핑 0건) | **STUB**    | **P3** (G3 통과 시 frame 노드 활성화 동시) 또는 **별도 phase 명시** |
| `placeholder` |    ✅     | 타입만 정의, UI marker 미구현                                               | **STUB**    | **P4-D** (시각 마커 sub-phase 와 동시 land 권고)                    |
| `slot`        |    ✅     | `validateSlotContract()` 구현 (검증만), UI 노출 없음                        | **PARTIAL** | **P3-C** (NodesPanel UI 재설계) + **P4-D** (slot 마커)              |

**의외 발견**: `slot` 의 검증 로직은 P0 에 land 되었으나 UI 단의 slot 편집/표시 0건. P3-C 까지 사용자 가시 미진입.

## 3. Cat 2 — 문서-level 메타 필드 (4종)

| 필드        | 타입 land | 사용처 / 구현                                                                        | 상태        | 후속 phase 권고                                                           |
| ----------- | :-------: | ------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| `version`   |    ✅     | 모든 도큐먼트에 `"composition-1.0"` 주입 + 캐시 key 사용 + read-through adapter 분기 | **LAND**    | (완료)                                                                    |
| `themes`    |    ✅     | 타입 정의만, ADR-021 Theme 시스템 통합 미대기                                        | **STUB**    | **별도 phase 명시 필요** — ADR-021 통합 ADR 또는 P5-A 흡수                |
| `variables` |    ✅     | `VariableRef` / `VariableDefinition` 타입 정의 + 일부 구조 활용, 리졸버 통합 미대기  | **PARTIAL** | **별도 phase 명시 필요** — ADR-022 TokenRef 통합 + variable resolver 구현 |
| `imports`   |    ✅     | 명시적 "P5 이후" 스텁 — 정상 (DesignKit 과 분리)                                     | **STUB**    | **P5-D/E** (imports resolver) — Team 2 P5 breakdown 에 명시               |

**의외 발견**: `themes` / `variables` 가 phase 미명시 미구현 — ADR-903 본문에는 "ADR-021 Theme 시스템 투영" / "ADR-022 TokenRef 투영" 만 있고 land phase 명시 없음. **별도 plan 필수**.

## 4. Cat 3 — 엔티티 공통 필드 (2종)

| 필드       | 타입 land | 사용처 / 구현                              | 상태        | 후속 phase 권고                    |
| ---------- | :-------: | ------------------------------------------ | ----------- | ---------------------------------- |
| `name`     |    ✅     | 어댑터 생성 동작, 테스트만 미분            | **PARTIAL** | **P3-A** 안전망에 테스트 추가 흡수 |
| `metadata` |    ✅     | element.props 보존 + 패턴 검증 테스트 완료 | **LAND**    | (완료)                             |

**의외 발견**: `name` 은 변환은 동작하나 dedicated test 0건. P3-A 진입 시 테스트 추가 권고.

## 5. Cat 4 — Rename + 매핑 (3 항목)

| 항목                       | 타입 land | 구현 상태                                           | 상태        | 후속 phase 권고                     |
| -------------------------- | :-------: | --------------------------------------------------- | ----------- | ----------------------------------- |
| `Element.tag` → `type`     |    ✅     | tagRename 어댑터 변환 구현, **DB rename 은 P5**     | **PARTIAL** | **P5-A** schema 정의 시 컬럼 rename |
| `ComponentTag` literal     |    ✅     | 121-literal union 완성 (composition 118 + pencil 3) | **LAND**    | (완료)                              |
| pencil primitive 10종 매핑 |    ✅     | import/export adapter 매핑 규칙 land                | **LAND**    | (완료)                              |

**의외 발견**: `tag → type` 어댑터는 동작하지만 **IndexedDB 컬럼명은 여전히 `tag`** — P5-A schema 정의 시 컬럼 rename 동시 진행 권고.

## 6. R5 (스코프 분리) 안전성 검증

ADR-903 Risk R5 = "type 값 공간 (`ComponentTag` literal union) 이 다른 도메인의 `type` 필드 (DataBinding.type / FieldDefinition.type) 와 의미 충돌 가능성".

**검증 결과**: `isCanonicalNode()` guard 로 tree 보호됨. 세 type 필드가 disjoint scope 에 있고, runtime check 가 boundary 에서 작동. **R5 위험 LOW 유지**.

## 7. 별도 plan 필요 항목 정리

ADR 본문에 phase 명시가 없는 항목:

1. **`clip` 렌더 구현** — Skia overflow:hidden 매핑 + DOM CSS 매핑. 권고: P3 G3 통과 시 frame 노드 활성화와 동시 또는 별도 micro-phase.
2. **`placeholder` UI marker** — 빈 frame UI hint. 권고: P4-D (시각 마커 sub-phase) 흡수.
3. **`themes` ADR-021 통합** — Tint/Dark mode 매핑 구현. 권고: 별도 ADR 또는 P5-A 흡수.
4. **`variables` ADR-022 통합** — TokenRef resolver 통합. 권고: 별도 ADR 또는 P5-A 흡수.
5. **smoke test 격차** — clip / placeholder / themes / variables 0 smoke test. 권고: 각 land phase 와 동시 추가.
6. **`tag` IndexedDB 컬럼 rename** — 어댑터 변환은 동작하나 컬럼명 미변경. 권고: P5-A 흡수.
7. **`name` dedicated test** — 어댑터 동작하나 테스트 미분. 권고: P3-A 흡수.

## 8. ADR-903 진행도 갱신 권고

**현재 메모리 표시**: `~50% (P0 100% + P1 100% + P2 ~70% + P3 sub-breakdown 만)`

**실측 기반 갱신**:

- P0 = **70%** (타입 정의 100%, 어댑터/리졸버 50%)
- P1 = 100%
- P2 = ~70%
- P3 = sub-breakdown + decisions + 안전망 정밀화 완료 (구현 0%)
- P4 = sub-breakdown 작성 완료 (구현 0%)
- P5 = sub-breakdown 작성 완료 (구현 0%)

**조정 진행도**: 약 **~40%** (P0 80% land 가정 감점 + Team 3 발견 반영). 실 land 진척이 명목 진행도보다 낮음.

## 9. 후속 검토 권고

본 검증으로 phase 미명시 미구현 항목 4건 + 부분 land 4건 식별. 다음 권고:

1. **ADR-903 본문 §3.10 보강** — `clip` / `placeholder` / `themes` / `variables` 에 구현 phase 명시 추가
2. **별도 ADR 발의 검토** — `themes` (ADR-021 통합) / `variables` (ADR-022 통합) 가 ADR-903 범위 밖이라면 별도 ADR
3. **P3-A 진입 시 안전망 흡수** — `name` test + `tag` 컬럼 rename plan 흡수
4. **P5-A 진입 시 schema 동시 처리** — `tag → type` 컬럼 rename + `themes` / `variables` resolver 정의

## 관련 문서

- ADR-903: `docs/adr/completed/903-ref-descendants-slot-composition-format-migration-plan.md`
- canonical 예제: `docs/adr/design/903-canonical-examples.md`
- P3 sub-breakdown: `docs/adr/design/903-phase3-frameset-breakdown.md`
- P4 sub-breakdown: `docs/adr/design/903-phase4-editing-semantics-breakdown.md`
- P5 sub-breakdown: `docs/adr/design/903-phase5-persistence-imports-breakdown.md`
- 결정 사항: `docs/adr/design/903-phase3-decisions.md`
- 회귀 위험: `docs/adr/design/903-phase3a-regression-risk.md`
