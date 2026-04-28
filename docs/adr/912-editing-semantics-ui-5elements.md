# ADR-912: Editing Semantics UI 6요소 — reusable/ref/override 가시성 + detach + reset override + origin 토글

## Status

Proposed — 2026-04-26 (revision 2 — 2026-04-28: pencil app 호환 baseline 확정 + ⑥ Origin 토글 추가 + Properties 패널 ##Component section## 위치 결정 + codex review 1차 7건 반영 (HIGH 3 / MED 3 / LOW 1) + design skeleton 선행 land + codex review 2차 2건 반영 (MED-1 phase 명칭 통일 / MED-2 TOCTOU guard) — Conditional OK to proceed)

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

1. **6 요소 land 필수** (ADR-903 Hard Constraint #10 + revision 2 ⑥ 추가):
   - ① reusable / ref 시각 마커 2종 (Canvas + LayerTree + Properties 3축) — pencil 호환 baseline:
     - **Origin** = magenta + solid 라인 (Canvas bounding box, 선택 시)
     - **Instance** = violet + dot 라인 (Canvas bounding box, 선택 시)
     - **Override 마커는 두지 않음** — pencil 도 별도 시각 마커 미적용. Override 가시성은 ④ Properties 패널 필드별 indicator 로 흡수
     - DesignKit 마커는 [ADR-915](completed/915-remove-designkit-system.md) 로 제거됨
   - ② 원본 ↔ 인스턴스 양방향 탐색 액션
     - 인스턴스 → 원본: pencil 호환 ("Go to component" — Properties 패널 ##Component section## 의 navigation 진입점)
     - 원본 → N개 인스턴스 highlight: composition 자체 design (pencil 미정의)
   - ③ `detachInstance` UI (우클릭 + 단축키 + Properties 패널) + 경고 다이얼로그
     - 단축키 = `Cmd/Ctrl + Option/Alt + X` (pencil 호환 baseline)
     - 우클릭 / Properties 패널 버튼 위치는 composition 자체 결정 (pencil docs 미명시)
   - ④ `resetDescendantsOverride` 액션 + Properties 패널 필드별 "원본으로 복원" 버튼
     - pencil docs 미정의 영역 — composition 자체 design language. 호환 의무 없음
     - **Override 시각 가시성을 흡수**: ① 의 override 마커가 부재한 대신, Properties 패널 필드별 indicator (예: 필드 옆 작은 dot 또는 reset 버튼 활성 상태) 가 override 여부 노출
   - ⑤ 원본 편집 시 "N개 인스턴스 영향" 미리보기 다이얼로그
     - pencil docs 미정의 영역 — composition 자체 design. 호환 의무 없음
   - **⑥ Origin 토글 (`Cmd+Opt+K` 양방향)** — element ↔ Component 변환 (revision 2 추가)
     - 단축키 = `Cmd/Ctrl + Option/Alt + K` (pencil 호환 baseline, 양방향 토글: element → reusable 생성 + reusable → standard element 해제 양쪽 처리)
     - Properties 패널 ##Component section## 의 "Create component" 버튼 + `[-]` 토글
     - **destructive 측면**: reusable → standard 해제 시 모든 instance 가 분리됨 → 경고 다이얼로그 + N개 instance 영향 (= ⑤ 와 동일 메커니즘) 통합
2. **Properties 패널 ##Component section## 위치 (revision 2 결정)**:
   - element 1 개 선택 시 Properties (Inspector) 패널에 노출 (Style 패널 아님 — Component/Slot 는 D1/D2 영역, Style 패널은 D3 시각 영역 전용. ssot-hierarchy.md 정합)
   - 표시 항목: Component Name + **Origin/Instance 라벨** (① 의 Properties 채널) + "Go to component" 버튼 (② navigation) + "Create component" / `[-]` (⑥ origin 토글) + detach 버튼 (③ 보조 진입점) + 필드별 reset 버튼 (④ override reset, **본 ADR 에서 필수 채택 — codex M3**)
   - Slot 편집 (`frame.slot: false | string[]` schema) 은 별도 ##Slot section## — ADR-911 영역, 본 ADR 직교
   - **D3 경계 예외 명시 (codex M2)**: ① 의 Canvas marker (magenta+solid / violet+dot bounding box) 는 시각 표현이지만 **editor chrome overlay** 영역 — component runtime style (Spec D3 token / CSS 변수 / Skia render shapes) 으로 새지 않음. CSS/Skia 경로 grep + Storybook/Canvas snapshot 으로 marker 색/선이 component 자체 style 로 누출되지 않음 검증 (G4-A (e) 의 일부). marker 는 Spec D3 SSOT 의 consumer 가 아닌 별도 editor-only render layer (skipCSSGeneration + Skia overlay 전용 path)
3. **모든 destructive 액션 undo 가능** (detach, reset override, origin 토글 해제)
4. **low-friction 마커 우선** — fancy animation 후순위. canvas 툴팁 / 패널 배지 같은 경량 UI 우선
5. **회귀 0** — 기존 copy/paste/duplicate/delete/slot assign 연산이 ref/override 인지 후에도 동일 동작

### Soft Constraints

1. 시각 마커가 다른 시각적 cue (선택 outline, hover) 와 충돌하지 않도록 z-order/opacity 조정
2. detach/reset override 의 경고 다이얼로그가 사용자 학습 후 disable 가능
3. "N개 인스턴스 영향" 미리보기는 동기 계산 부하 LOW (60fps 마진 안전)

## Alternatives Considered

### 대안 A: 6 요소 일괄 land (단일 ADR, 본 ADR scope) ✅ 채택

- 설명: 6 요소를 단일 ADR + 단일 Phase 분해로 일괄 진행. design 문서 `903-phase4-editing-semantics-breakdown.md` (637 LOC) 활용 + ⑥ Origin 토글 추가 분해
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(L)
- 6 요소가 서로 의존 (마커 → 탐색 → detach UI → reset override → 영향 미리보기 → origin 토글) — 하나라도 빠지면 사용자 인지 부족. 특히 ⑥ origin 토글 (`Cmd+Opt+K`) 은 ⑤ 영향 미리보기와 destructive 측면 공유
- pencil 호환 baseline (revision 2 확정) 으로 ①/②/③/⑥ 의 외부 reference 명확

### 대안 B: 6 요소를 6 개 별도 ADR 로 분리

- 설명: 각 요소를 독립 ADR (912-a/b/c/d/e/f) 로 작성. 우선순위에 따라 점진 land
- 위험: 기술(L) / 성능(L) / 유지보수(**HIGH**) / 마이그레이션(L)
- **유지보수 HIGH**: 6 ADR 간 dependency 추적 부담 + 일관된 디자인 언어 유지 어려움 + Properties 패널 ##Component section## 의 통합 UI 가 부분 land 시 오히려 혼란 (예: 마커만 있고 detach 미지원)

### 대안 C: 부분 land (마커 + detach + origin 토글 만, 나머지 후순위)

- 설명: 6 요소 중 가장 위험한 "무분별 detach" + "원본 해제" 만 우선 처리 (①/③/⑥). ②/④/⑤ 는 후속
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 사용자 인지 부족이 절반만 해소됨 — override 영역 위험 잔존

### Risk Threshold Check

| 대안 |             HIGH+             | 판정                                                                                                                                                                                                                                                                       |
| ---- | :---------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | 1 (R6 조건부 HIGH — codex H3) | **채택 가능 ✅** — G4-G 선결조건 (G4-C 완료 후 — Phase C 가 baseline P4-A detach materialize + P4-B path-based descendants 양쪽 흡수, codex MED-1) + 0/1/1000 fixture round-trip + TOCTOU guard (codex MED-2) 로 mitigation. `instanceCount === 0` 시 LOW silent 경로 보존 |
| B    |       1 (유지보수 HIGH)       | 회피 (dependency 추적 부담)                                                                                                                                                                                                                                                |
| C    |               0               | 부분 land — 위험 절반 잔존                                                                                                                                                                                                                                                 |

대안 A 채택 — design 문서 활용 + 단일 Phase 분해로 효율 최대화. R6 조건부 HIGH 는 회피 가능한 HIGH 가 아닌 ⑥ Origin 토글의 본질적 destructive 측면 — gate (G4-G) + fixture round-trip 으로 흡수 처리.

## Decision

**대안 A: 6 요소 일괄 land** 를 선택한다 (revision 2 — 5 → 6 요소 확장, pencil 호환 baseline 확정).

선택 근거:

1. design fork skeleton 선행 land 됨 (codex H2 권고, 2026-04-28) — `912-editing-semantics-ui-breakdown.md` 8 Phase (A1+A2+A3 / B / C / D / E / F / G / H) + Gates 매핑 + Risks 매핑. baseline = `903-phase4-editing-semantics-breakdown.md` (637 LOC, ADR-903 G4 분해 시 작성). 본 fork 는 ⑥ Origin 토글 + Component section 통합 UI + override 마커 제거 + R6 조건부 HIGH + ④ 필드별 reset 필수 적용
2. 6 요소가 서로 의존 — 일괄 land 시 사용자 인지가 통합적. Properties 패널 ##Component section## 이 통합 UI hub
3. 단일 ADR scope 으로 reviewer 부담 최소화
4. **pencil 호환 baseline 확정 (revision 2)**: ①/②/③/⑥ 외부 reference 명확 — 사용자 학습 곡선 감소
5. **Properties 패널 위치 결정 (revision 2)**: D1/D2 영역으로 정합 — Style 패널 (D3) 침범 회피, ssot-hierarchy.md 정합

### 기각된 대안 사유

- **대안 B 기각**: 6 ADR 간 dependency 추적 + 디자인 언어 일관성 어려움 + Properties 패널 ##Component section## 통합 UI 부분 land 사용자 혼란
- **대안 C 기각**: 사용자 인지 부족 절반 잔존 + override 영역 위험 미해소

> 구현 상세: [912-editing-semantics-ui-breakdown.md](design/912-editing-semantics-ui-breakdown.md) — revision 2 design skeleton (codex H2 권고로 Accepted 전 선행 land, 2026-04-28). baseline = ADR-903 Phase 4 design (637 LOC) — 차별점: ⑥ Origin 토글 sub-phase (Phase G) 신규 + ① override 마커 제거 (pencil 정합) + Properties 패널 ##Component section## 통합 UI (Phase F) + G4-A → A1/A2/A3 분할 (codex L1) + R6 조건부 HIGH + ④ 필드별 reset 본문 필수 (codex M3). Phase A 진입 시점에 sub-phase 별 파일 변경 목록 + roundtrip evidence 채움

## Risks

| ID  | 위험                                                                                                                                                                                                                                                                           |                                                        심각도                                                         | 대응                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 시각 마커 2종 (origin / instance) 이 기존 시각 cue (선택 outline / hover / focus) 와 충돌                                                                                                                                                                                      |                                                          MED                                                          | Phase A 진입 전 디자인 검토 + Storybook 시각 검증. low-friction 우선 (canvas 툴팁 / 패널 배지). 색상은 pencil 호환 magenta/violet, 선 패턴은 solid/dot                                                                                                                                                                                                                                                                                                                                      |
| R2  | detach 후 override descendants subtree 의 materialize 누락                                                                                                                                                                                                                     |                                                          MED                                                          | unit test — detach 전 ref 의 resolved tree vs detach 후 element subtree 정합. fixture 50+                                                                                                                                                                                                                                                                                                                                                                                                   |
| R3  | reset override 시 일부 descendants key 누락 (deep nested case)                                                                                                                                                                                                                 |                                                          MED                                                          | recursive descendants walk + 모든 key 제거 후 resolver 재실행 검증                                                                                                                                                                                                                                                                                                                                                                                                                          |
| R4  | "N개 인스턴스 영향" 미리보기 동기 계산 부하 — 1000+ instance 시 UI 정지                                                                                                                                                                                                        |                                                          LOW                                                          | 동기 계산 우선 + 측정. 100ms 초과 시 web worker 또는 lazy load                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R5  | 6 요소 land 전 ADR-911 (Layout/frameset 재설계) 가 ref/slot 영역의 신 UI 를 land 하면 본 ADR 의 마커가 신 UI 위에 다시 작성 필요                                                                                                                                               |                                                          MED                                                          | 본 ADR 가 ADR-911 land 후 진입 (의존). ADR-911 의 신 FramesTab + Properties 패널 ##Slot section## 이 본 ADR ##Component section## 와 직교 — 충돌 0 설계                                                                                                                                                                                                                                                                                                                                     |
| R6  | ⑥ Origin 토글 (`Cmd+Opt+K`) 의 reusable → standard 해제 시 모든 instance subtree 가 detach materialize 필요 — `instanceCount` 에 비례하는 대규모 변경 위험. 현재 `detachInstance` 는 props 병합만 수행 → nested descendants/path-based override 처리 추가 구현 필요 (codex H3) | **조건부 HIGH** (`instanceCount > 0` 또는 nested descendants 존재 시 HIGH / `instanceCount === 0` 만 LOW silent 가능) | **G4-G 선결조건** = G4-C 완료 후 (Phase C 가 baseline 903 의 P4-A detach materialize + P4-B path-based descendants 양쪽 흡수, codex MED-1 정합화). 경고 다이얼로그 + ⑤ N개 인스턴스 영향 미리보기 reuse 강제 (`instanceCount > 0`) + undo 정상 + 0/1/1000 instance fixture round-trip + count 정확도 검증 + **TOCTOU guard (codex MED-2)**: silent 실행 직전 authoritative `instanceCount` 재계산 + `=== 0` confirm + race fixture (T0=0, T1 시점 instance 추가 → 다이얼로그 fallback 검증) |
| R7  | pencil 호환 baseline (magenta+solid / violet+dot / `Cmd+Opt+K` / `Cmd+Opt+X`) 가 향후 pencil app spec 변경 시 drift                                                                                                                                                            |                                                          LOW                                                          | revision 2 baseline 확정 시점 docs URL + commit SHA / fetch snapshot hash 본 ADR References 에 명시 (codex M1). drift 발견 시 follow-up ADR 로 수용 여부 판정                                                                                                                                                                                                                                                                                                                               |

**잔존 HIGH 위험**: R6 조건부 HIGH (instanceCount > 0 또는 nested descendants 존재 시) — G4-G 선결조건 + 0/1/1000 fixture round-trip 으로 mitigation. 그 외 잔존 HIGH 없음.

## Gates

| Gate                                                                  | 시점                                                                                                                                                       | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 실패 시 대안                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **G4-A**: 시각 마커 2종 land                                          | Phase A                                                                                                                                                    | (a) Canvas 선택 시 origin = magenta+solid / instance = violet+dot 라인 표시 (pencil 호환) / (b) LayerTree 보조 마커 (origin/instance 아이콘 또는 색 dot) / (c) Properties 패널 ##Component section## 의 Origin/Instance 라벨 / (d) Storybook 시각 검증 / (e) 기존 시각 cue 와 충돌 0 / (f) override 별도 마커 두지 않음 (pencil 정합 + ④ 로 흡수)                                                                                                                                                                                                                                                                                                                                                                                                                                          | 디자인 재검토 + low-friction 마커 fallback                                                         |
| **G4-B**: 양방향 탐색 액션                                            | Phase B                                                                                                                                                    | (a) 인스턴스 클릭 → Properties 패널 "Go to component" 버튼 → 원본 highlight (pencil 호환) / (b) 원본 클릭 → 인스턴스 N 개 highlight (composition 자체) / (c) 단축키 정의 land                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 단방향 (인스턴스 → 원본) 만 우선 land                                                              |
| **G4-C**: detach UI + 경고 다이얼로그                                 | Phase C                                                                                                                                                    | (a) 단축키 `Cmd/Ctrl+Opt/Alt+X` (pencil 호환) + 우클릭 + Properties 패널 detach 액션 / (b) "원본과 분리됨" 경고 다이얼로그 / (c) detach 후 ref → element subtree materialize / (d) undo 정상                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | detach 액션만 land + 경고 다이얼로그 후순위                                                        |
| **G4-D**: reset override 액션                                         | Phase D                                                                                                                                                    | (a) Properties 패널 ##Component section## 안 필드별 "원본으로 복원" 버튼 / (b) 필드별 override indicator (override 시각 가시성 흡수) / (c) recursive descendants walk + 키 제거 / (d) undo 정상                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 필드별 reset 만 land + 전체 reset 후순위                                                           |
| **G4-E**: 영향 미리보기                                               | Phase E                                                                                                                                                    | (a) 원본 편집 전 다이얼로그 표시 / (b) "N개 인스턴스 영향" 카운트 정확 / (c) 60fps 마진 안전 / (d) ⑥ origin 토글 해제 시 동일 다이얼로그 reuse                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 다이얼로그 toggle 옵션 (사용자 disable 가능)                                                       |
| **G4-F**: Component section 통합 UI 검증 (revision 2 신규 — codex H1) | Phase F                                                                                                                                                    | (a) Properties 패널 ##Component section## 가 ①/②/③/④/⑥ 의 모든 진입점 (라벨 / Go to component / detach / 필드별 reset / Create component) 을 단일 section 안에 통합 노출 / (b) ADR-911 ##Slot section## 와 같은 패널 공존 — UI 충돌 0 (cross-section 어수선 0) / (c) section 활성화/비활성화 (frame 외 노드 선택 시) 정상 / (d) Storybook + Chrome MCP 시각 검증 — 두 section 동시 노출 화면 capture                                                                                                                                                                                                                                                                                                                                                                                       | section 통합 일부 land + 잔여 진입점 후순위                                                        |
| **G4-G**: ⑥ Origin 토글 (revision 2 신규)                             | Phase G — **G4-C 완료 후 진입 (codex H3 선결조건). Phase C 가 baseline 903 P4-A detach materialize + P4-B path-based descendants 양쪽 흡수 — codex MED-1** | (a) 단축키 `Cmd/Ctrl+Opt/Alt+K` 양방향 토글 (pencil 호환) / (b) Properties 패널 ##Component section## "Create component" 버튼 + `[-]` 토글 / (c) **`instanceCount > 0` 시 G4-E 다이얼로그 reuse 강제 + 경고 (R6 조건부 HIGH 대응)** / (d) **`instanceCount === 0` 일 때만 silent 실행 허용 + TOCTOU guard (codex MED-2)**: silent 실행 직전 authoritative `instanceCount` 재계산 + `=== 0` confirm. T0(트리거) → T1(mutation 직전) 사이 instance 추가 시 자동 다이얼로그 fallback. T1 confirm 후 mutation 은 store snapshot/transaction 안에서 atomic / (e) reusable → standard 해제 시 모든 instance subtree detach materialize 정합 (50+ fixture: 0/1/1000 instance count round-trip + TOCTOU race fixture: T0=0 / T1 시점 instance 1개 추가 → 다이얼로그 fallback 검증) / (f) undo 정상 | 토글 단축키만 land + Properties 버튼 후순위 + instanceCount 정확도 우선 + TOCTOU race fixture 우선 |
| **G4-H**: 회귀 0 + undo                                               | Phase H                                                                                                                                                    | (a) copy/paste/duplicate/delete/slot assign 연산 회귀 0 / (b) detach + reset override + origin 토글 해제 모두 undo 정상 / (c) 50+ fixture round-trip                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 회귀 fix 후 재검증                                                                                 |

## Consequences

### Positive

- ADR-903 R6 ("원본/인스턴스/override 가시성 미구현") 근본 해소
- 사용자가 reusable/ref/override 영역을 인지 가능 → 무분별 detach / 의도치 않은 override 덮어쓰기 / 원본 편집 영향 범위 오판 / 원본 해제 영향 범위 오판 방지
- ADR-911 의 신 FramesTab 위에 자연스럽게 통합 — pencil app 호환 frame authoring + 본 ADR 의 Properties 패널 ##Component section## = 완전한 component 편집 경험
- pencil 호환 baseline 채택 (revision 2) — 사용자 학습 곡선 감소 (magenta+solid / violet+dot / `Cmd+Opt+K` / `Cmd+Opt+X` 동일 mental model)
- Properties 패널 위치 결정 (revision 2) — D1/D2 영역, Style 패널 (D3) 침범 회피, ssot-hierarchy.md 정합
- ADR-903 G4 잔여 영역 종결

### Negative

- UI 신규 추가 — 사용자 학습 곡선 (특히 처음 본 ref/override 개념 인지 비용)
- design + Storybook 시각 검증 + Phase A~H 8 단계 분해 (revision 2 — ⑥ Origin 토글 추가) — 일회성 작업량 큼
- pencil app spec drift 시 baseline 재정렬 follow-up ADR 필요 (R7)

## References

- [ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) — canonical document migration (Implemented 2026-04-26, 본 ADR 의 G4 잔여 흡수)
- [ADR-912 design skeleton](design/912-editing-semantics-ui-breakdown.md) — **본 ADR 전용 design fork** (revision 2 / 2026-04-28 / codex H2 선행 land). 8 Phase (A1+A2+A3 / B / C / D / E / F / G / H) + Gates 매핑 + Risks 매핑
- [ADR-903 Phase 4 design baseline](design/903-phase4-editing-semantics-breakdown.md) — 637 LOC, 본 fork 의 baseline. 차별점은 본 ADR design skeleton §1 참조
- [ADR-911](911-layout-frameset-pencil-redesign.md) — Layout/frameset pencil 호환 재설계 (본 ADR 의 선행 ADR). Properties 패널 ##Slot section## 은 ADR-911 영역, 본 ADR 의 ##Component section## 와 직교
- [pencil app components docs](https://docs.pencil.dev/core-concepts/components) — Component Origin (magenta) / Instance (violet) bounding box 정의 출처. **R7 baseline snapshot**: 2026-04-28T01:22Z fetch (URL 정적 — pencil docs 는 commit SHA 미공개. drift 검출 시 본 fetch date 와 차이 발생 시 follow-up ADR)
- [pencil app keyboard shortcuts](https://docs.pencil.dev/core-concepts/keyboard-shortcuts) — `Cmd+Opt+K` 양방향 토글 + `Cmd+Opt+X` Detach instance 정의 출처. **R7 baseline snapshot**: 2026-04-28T01:22Z fetch
- pencil app `.pen` schema (version 2.11) — `Entity.reusable`, `Frame.slot: false | string[]`, `Ref.descendants: { [idPath]: {} }`. composition canonical document 의 ref/override/slot 의미 호환 기준. **R7 baseline snapshot**: 2026-04-28 MCP `mcp__pencil__get_editor_state(include_schema=true)` 직접 fetch — 활성 file `pencil-shadcn.pen`, `Document.version: "2.11"` 명시. local extracted artifact baseline = composition repo HEAD `3f7db76e` 기준 `packages/shared/src/types/composition-document.types.ts:224-276` (CanonicalNode/FrameNode/RefNode 정의). drift 검출 패턴 = `mcp__pencil__get_editor_state` 재호출 시 schema diff 또는 type 정의 변경 grep
- 사용자 직접 확인 (2026-04-28 세션 47) — Origin solid 라인 / Instance dot 라인 / Override 별도 표시 없음 / Properties 패널 ##Component section## + ##Slot section## 구조 + Component section `[-]` `[+]` `Create component` 컨트롤
- composition repo baseline commit (revision 2 land 시점): `3f7db76e` (2026-04-28T01:22Z). drift 발견 시 본 SHA 기준 grep / diff
