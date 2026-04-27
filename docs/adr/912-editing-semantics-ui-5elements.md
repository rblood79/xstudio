# ADR-912: Editing Semantics UI 5요소 — reusable/ref/override 가시성 + detach + reset override

## Status

Proposed — 2026-04-26

## Context

### Domain (SSOT 체인 - [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

- **해당 domain**: **D2 (Props/API) + UI 영역** — composition canvas/panel UI 가 reusable/ref/override 의 시각적 가시성을 제공한다. ADR-903 의 G4 (Editing Semantics 안정화) 잔여 흡수.

### 배경

[ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) Implemented (2026-04-26) 후 canonical document 의 `reusable: true` / `type: "ref"` / `descendants` override 문법은 schema-level 에서 land 되었으나, **사용자 가시 UI 가 부재**. 현재 codebase 의 grep 실측:

- LayerTree role 표시 (reusable/ref/override 구분) **0건**
- `resetDescendantsOverride` 액션 **0건**
- "N개 인스턴스 영향" 미리보기 **0건**
- 양방향 탐색 (원본 ↔ 인스턴스) 액션 **0건**

이 상태에서 사용자가 reusable frame / ref instance / override 를 직접 편집하면:

- **무분별 detach** — instance 가 원본과 분리됐는지 인지 불가
- **의도치 않은 override 덮어쓰기** — 원본 vs override 구분 안 됨
- **원본 편집 시 영향 범위 오판** — N 개 instance 에 전파됨을 모름

ADR-903 의 R6 ("원본/인스턴스/override UI-UX 가시성 미구현") 이 본 ADR 의 출발점.

### Hard Constraints

1. **5 요소 land 필수** (ADR-903 Hard Constraint #10):
   - ① reusable / ref / override 시각 마커 2종 (LayerTree + Canvas) — DesignKit 마커는 [ADR-915](915-remove-designkit-system.md) 로 제거됨
   - ② 원본 ↔ 인스턴스 양방향 탐색 액션
   - ③ `detachInstance` UI (우클릭 + 단축키 + Properties 패널) + 경고 다이얼로그
   - ④ `resetDescendantsOverride` 액션 + Properties 패널 필드별 "원본으로 복원" 버튼
   - ⑤ 원본 편집 시 "N개 인스턴스 영향" 미리보기 다이얼로그
2. **모든 destructive 액션 undo 가능** (detach, reset override)
3. **low-friction 마커 우선** — fancy animation 후순위. canvas 툴팁 / 패널 배지 같은 경량 UI 우선
4. **회귀 0** — 기존 copy/paste/duplicate/delete/slot assign 연산이 ref/override 인지 후에도 동일 동작

### Soft Constraints

1. 시각 마커가 다른 시각적 cue (선택 outline, hover) 와 충돌하지 않도록 z-order/opacity 조정
2. detach/reset override 의 경고 다이얼로그가 사용자 학습 후 disable 가능
3. "N개 인스턴스 영향" 미리보기는 동기 계산 부하 LOW (60fps 마진 안전)

## Alternatives Considered

### 대안 A: 5 요소 일괄 land (단일 ADR, 본 ADR scope)

- 설명: 5 요소를 단일 ADR + 단일 Phase 분해로 일괄 진행. design 문서 `903-phase4-editing-semantics-breakdown.md` (637 LOC) 그대로 활용
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(L)
- 5 요소가 서로 의존 (마커 → 탐색 → detach UI → reset override → 영향 미리보기) — 하나라도 빠지면 사용자 인지 부족 → 일괄 진행이 효율적

### 대안 B: 5 요소를 5 개 별도 ADR 로 분리

- 설명: 각 요소를 독립 ADR (912-a/b/c/d/e) 로 작성. 우선순위에 따라 점진 land
- 위험: 기술(L) / 성능(L) / 유지보수(**HIGH**) / 마이그레이션(L)
- **유지보수 HIGH**: 5 ADR 간 dependency 추적 부담 + 일관된 디자인 언어 유지 어려움 + 사용자 인지가 부분 land 시 오히려 혼란 (예: 마커만 있고 detach 미지원)

### 대안 C: 부분 land (마커 + detach 만, 나머지 후순위)

- 설명: 5 요소 중 가장 위험한 "무분별 detach" 만 우선 처리 (마커 + detach UI). reset override + 영향 미리보기는 후속
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 사용자 인지 부족이 절반만 해소됨 — override 영역 위험 잔존

### Risk Threshold Check

| 대안 |       HIGH+       | 판정                        |
| ---- | :---------------: | --------------------------- |
| A    |         0         | 채택 가능 ✅                |
| B    | 1 (유지보수 HIGH) | 회피 (dependency 추적 부담) |
| C    |         0         | 부분 land — 위험 절반 잔존  |

대안 A 채택 — design 문서 활용 + 단일 Phase 분해로 효율 최대화.

## Decision

**대안 A: 5 요소 일괄 land** 를 선택한다.

선택 근거:

1. design 문서 `903-phase4-editing-semantics-breakdown.md` (637 LOC) 가 이미 5 요소 baseline + Phase A~F + Sub-Gate G4-A~G4-F 로 분해되어 있음. 신규 design 작성 불필요
2. 5 요소가 서로 의존 — 일괄 land 시 사용자 인지가 통합적
3. 단일 ADR scope 으로 reviewer 부담 최소화

### 기각된 대안 사유

- **대안 B 기각**: 5 ADR 간 dependency 추적 + 디자인 언어 일관성 어려움 + 부분 land 사용자 혼란
- **대안 C 기각**: 사용자 인지 부족 절반 잔존 + override 영역 위험 미해소

> 구현 상세: [903-phase4-editing-semantics-breakdown.md](design/903-phase4-editing-semantics-breakdown.md) — ADR-903 Phase 4 design 문서 그대로 활용 (referencce ADR migration 시 본 ADR 안에 inline 또는 별도 design 문서로 fork)

## Risks

| ID  | 위험                                                                                                                             | 심각도 | 대응                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------------- |
| R1  | 시각 마커 3종 (reusable/ref/override) 이 기존 시각 cue (선택 outline / hover / focus) 와 충돌                                    |  MED   | Phase A 진입 전 디자인 검토 + Storybook 시각 검증. low-friction 우선 (canvas 툴팁 / 패널 배지) |
| R2  | detach 후 override descendants subtree 의 materialize 누락                                                                       |  MED   | unit test — detach 전 ref 의 resolved tree vs detach 후 element subtree 정합. fixture 50+      |
| R3  | reset override 시 일부 descendants key 누락 (deep nested case)                                                                   |  MED   | recursive descendants walk + 모든 key 제거 후 resolver 재실행 검증                             |
| R4  | "N개 인스턴스 영향" 미리보기 동기 계산 부하 — 1000+ instance 시 UI 정지                                                          |  LOW   | 동기 계산 우선 + 측정. 100ms 초과 시 web worker 또는 lazy load                                 |
| R5  | 5 요소 land 전 ADR-911 (Layout/frameset 재설계) 가 ref/slot 영역의 신 UI 를 land 하면 본 ADR 의 마커가 신 UI 위에 다시 작성 필요 |  MED   | 본 ADR 가 ADR-911 land 후 진입 (의존). ADR-911 의 신 FramesTab 이 본 ADR 마커 토대             |

잔존 HIGH 위험 없음.

## Gates

| Gate                                  | 시점    | 통과 조건                                                                                                                                                      | 실패 시 대안                                 |
| ------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **G4-A**: 시각 마커 2종 land          | Phase A | (a) LayerTree/Canvas 에서 reusable/ref/override 각각 고유 시각 마커 / (b) Storybook 시각 검증 / (c) 기존 시각 cue 와 충돌 0 (DesignKit 마커는 ADR-915 로 제거) | 디자인 재검토 + low-friction 마커 fallback   |
| **G4-B**: 양방향 탐색 액션            | Phase B | (a) 원본 클릭 → 인스턴스 N 개 highlight / (b) 인스턴스 클릭 → 원본 highlight / (c) 단축키 정의 land                                                            | 단방향 (인스턴스 → 원본) 만 우선 land        |
| **G4-C**: detach UI + 경고 다이얼로그 | Phase C | (a) 우클릭 + 단축키 + Properties 패널 detach 액션 / (b) "원본과 분리됨" 경고 다이얼로그 / (c) detach 후 ref → element subtree materialize / (d) undo 정상      | detach 액션만 land + 경고 다이얼로그 후순위  |
| **G4-D**: reset override 액션         | Phase D | (a) Properties 패널 필드별 "원본으로 복원" 버튼 / (b) recursive descendants walk + 키 제거 / (c) undo 정상                                                     | 필드별 reset 만 land + 전체 reset 후순위     |
| **G4-E**: 영향 미리보기               | Phase E | (a) 원본 편집 전 다이얼로그 표시 / (b) "N개 인스턴스 영향" 카운트 정확 / (c) 60fps 마진 안전                                                                   | 다이얼로그 toggle 옵션 (사용자 disable 가능) |
| **G4-F**: 회귀 0 + undo               | Phase F | (a) copy/paste/duplicate/delete/slot assign 연산 회귀 0 / (b) detach + reset override 모두 undo 정상 / (c) 50+ fixture round-trip                              | 회귀 fix 후 재검증                           |

## Consequences

### Positive

- ADR-903 R6 ("원본/인스턴스/override 가시성 미구현") 근본 해소
- 사용자가 reusable/ref/override 영역을 인지 가능 → 무분별 detach / 의도치 않은 override 덮어쓰기 / 원본 편집 영향 범위 오판 방지
- ADR-911 의 신 FramesTab 위에 자연스럽게 통합 — pencil app 호환 frame authoring + 본 ADR 의 마커 = 완전한 frame 편집 경험
- ADR-903 G4 잔여 영역 종결

### Negative

- UI 신규 추가 — 사용자 학습 곡선 (특히 처음 본 ref/override 개념 인지 비용)
- design + Storybook 시각 검증 + Phase A~F 6 단계 분해 — 일회성 작업량 큼

## References

- [ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) — canonical document migration (Implemented 2026-04-26, 본 ADR 의 G4 잔여 흡수)
- [ADR-903 Phase 4 design](design/903-phase4-editing-semantics-breakdown.md) — 637 LOC 본 ADR 의 구현 상세 그대로 활용
- [ADR-911](911-layout-frameset-pencil-redesign.md) — Layout/frameset pencil 호환 재설계 (본 ADR 의 선행 ADR)
- pencil app schema — 본 ADR 의 ref/override 의미 호환 기준
