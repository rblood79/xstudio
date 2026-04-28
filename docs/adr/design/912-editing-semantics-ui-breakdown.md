# ADR-912 design — Editing Semantics UI 6요소 breakdown (skeleton)

> **Status**: skeleton (Accepted 전 codex H2 권고로 선행 land — 2026-04-28 세션 47).
> Phase A 진입 시 본 skeleton 의 각 sub-phase 가 파일 변경 목록 + 회귀 시나리오 + roundtrip evidence 로 확장됨.
>
> **Baseline**: [903-phase4-editing-semantics-breakdown.md](903-phase4-editing-semantics-breakdown.md) (637 LOC) — ADR-903 G4 분해 시 작성. 본 fork 가 아래 차별점 적용:
>
> 1. ⑥ Origin 토글 sub-phase (P4-G) 신규 추가
> 2. ① 시각 마커 — DesignKit 마커 제거 ([ADR-915](../completed/915-remove-designkit-system.md)) + override 마커 미적용 (pencil 정합)
> 3. Properties 패널 ##Component section## 통합 UI 분해 (P4-F 신규)
> 4. G4-A 를 A1/A2/A3 분할 (codex L1)
> 5. R6 조건부 HIGH 승급 + G4-G 선결조건 명시 (codex H3)
> 6. ④ 필드별 reset 본문 필수 채택 (codex M3) — Phase D 에 partial update + indicator + test 흡수

## 1. baseline 차이점 요약

| 영역                         | baseline (903 P4)                  | revision 2 (본 fork)                                                                            |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| 요소 수                      | 5                                  | **6 (⑥ Origin 토글 추가)**                                                                      |
| 시각 마커 위치               | LayerTree + Canvas + DesignKit     | LayerTree + Canvas + **Properties 패널 라벨** (DesignKit 제거 — ADR-915 / Properties 라벨 신규) |
| override 마커                | 별도 시각 cue                      | **두지 않음** — ④ Properties 필드별 indicator 로 흡수 (pencil 정합)                             |
| ④ 필드별 reset               | P4 후속 defer 권고 (baseline §4.2) | **본 ADR 필수 채택 — Phase D 에 흡수** (codex M3)                                               |
| sub-phase 수                 | 6 (P4-A ~ P4-F)                    | **8 (P4-A ~ P4-H, P4-G ⑥ + P4-H 회귀로 분리)**                                                  |
| G4-A                         | 단일 Gate (시각 마커)              | **G4-A1 / A2 / A3 3-rolldown** (codex L1)                                                       |
| R6 (Origin 토글 destructive) | 부재                               | **조건부 HIGH** — `instanceCount > 0` 시 (codex H3)                                             |

## 2. Sub-phase 분할 (8개)

### Phase A — 시각 마커 2종 + Properties 라벨 (G4-A 분할)

#### A1 — Canvas bounding box marker (origin = magenta+solid / instance = violet+dot)

- 영역: Skia overlay render layer (component runtime style 과 분리 — D3 누출 없음, codex M2)
- 핵심 결정: marker 는 `skipCSSGeneration` + Skia overlay 전용 path. CSS variable / Spec D3 token 미사용
- 검증: Storybook 시각 + Chrome MCP screenshot + CSS/Skia grep (marker 색/선이 component CSS 로 누출 0)

#### A2 — LayerTree 보조 마커 (origin/instance 아이콘 또는 색 dot)

- 영역: LayerTree row indicator
- 핵심 결정: A1 의 magenta/violet 와 공통 시각 언어 (색 dot 또는 작은 아이콘)
- 검증: LayerTree fixture + 시각 검증

#### A3 — Properties 패널 라벨 (Origin / Instance text label)

- 영역: Properties 패널 ##Component section## 헤더 영역
- 핵심 결정: 텍스트 라벨 — "Origin" 또는 "Instance" (i18n 가능 영어 baseline). pencil 의 보조 cue
- 검증: 패널 렌더 fixture + 라벨 정확도 (`reusable: true` → "Origin" / `type: "ref"` → "Instance" / 그 외 → 라벨 미노출)

> **G4-A 통과 조건** (3 sub-gate 묶음): A1 + A2 + A3 모두 land + 기존 시각 cue (선택 outline / hover / focus) 와 충돌 0 + override 별도 마커 부재 (pencil 정합) 검증

### Phase B — 양방향 탐색 액션 (G4-B)

- 인스턴스 → 원본: Properties 패널 "Go to component" 버튼 (pencil 호환)
- 원본 → N개 인스턴스 highlight (composition 자체)
- 단축키 (composition 자체 — pencil 미정의)

### Phase C — detach UI + 경고 다이얼로그 (G4-C)

- 단축키 `Cmd/Ctrl+Opt/Alt+X` (pencil 호환)
- 우클릭 + Properties 패널 detach 버튼
- 경고 다이얼로그 + detach 후 ref → element subtree materialize + undo

### Phase D — reset override + 필드별 indicator (G4-D, codex M3)

- Properties 패널 ##Component section## 안 필드별 "원본으로 복원" 버튼
- 필드별 override indicator (override 시각 가시성 흡수 — ① override 마커 부재 보완)
- recursive descendants walk + 키 제거 + resolver 재실행 + undo
- partial update 안전성 — `descendants[path][fieldKey]` 단일 삭제 단위 fixture

### Phase E — 영향 미리보기 (G4-E)

- 원본 편집 전 다이얼로그 표시
- "N개 인스턴스 영향" 카운트 정확
- 60fps 마진 안전 (1000+ instance 시 동기 계산 여부 측정 → 100ms 초과 시 web worker 또는 lazy load)
- ⑥ Origin 토글 해제 시 동일 다이얼로그 reuse

### Phase F — Component section 통합 UI 검증 (G4-F, codex H1 신규)

- Properties 패널 ##Component section## 가 ①(라벨) + ②(Go to component) + ③(detach) + ④(필드별 reset) + ⑥(Create component / `[-]`) 모든 진입점 단일 section 통합 노출
- ADR-911 ##Slot section## 과 같은 패널 공존 — UI 충돌 0 (cross-section 어수선 0)
- section 활성화/비활성화 (frame 외 노드 선택 시) 정상
- Storybook + Chrome MCP 시각 검증 — 두 section 동시 노출 화면 capture

### Phase G — ⑥ Origin 토글 (G4-G, codex H3 — 선결조건 명시)

- **선결조건**: G4-C (detach 본체) + Phase D (path-based descendants 처리) 완료 후 진입
- 단축키 `Cmd/Ctrl+Opt/Alt+K` 양방향 토글 (pencil 호환)
- Properties 패널 ##Component section## "Create component" 버튼 + `[-]` 토글
- **`instanceCount > 0` 또는 nested descendants 존재 시**: G4-E 다이얼로그 reuse 강제 + 경고
- **`instanceCount === 0` 일 때만**: silent 실행 허용
- reusable → standard 해제 시 모든 instance subtree detach materialize 정합 — `0 / 1 / 1000 instance count` fixture round-trip
- undo 정상 — 토글 전 상태 복원

### Phase H — 회귀 0 + undo (G4-H)

- 기존 copy/paste/duplicate/delete/slot assign 연산이 ref/override/origin-toggle 인지 후에도 동일 동작
- detach + reset override + origin 토글 해제 모두 undo 정상
- 50+ fixture round-trip

## 3. Gates 매핑

본 ADR Gates 8개 ↔ 본 design Phase 8개 1:1 매핑:

| Gate                                  | Phase    | 핵심 통과 조건                                                                                  |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| G4-A (codex L1 — A1/A2/A3 3-rolldown) | A1+A2+A3 | Canvas marker (A1) + LayerTree marker (A2) + Properties 라벨 (A3) + 충돌 0 + override 마커 부재 |
| G4-B                                  | B        | 양방향 탐색 land (인스턴스→원본 pencil 호환 + 원본→N개)                                         |
| G4-C                                  | C        | detach 단축키 + 경고 + materialize + undo                                                       |
| G4-D                                  | D        | 필드별 reset + indicator + recursive walk + undo                                                |
| G4-E                                  | E        | 영향 미리보기 + 카운트 정확 + 60fps                                                             |
| G4-F                                  | F        | Component section 통합 UI + ADR-911 Slot 공존 0 충돌                                            |
| G4-G (codex H3 — 선결조건)            | G        | G4-C + Phase D 완료 후 진입 + instanceCount 정확도 + 0/1/1000 fixture round-trip                |
| G4-H                                  | H        | 회귀 0 + 모든 undo + 50+ fixture                                                                |

## 4. Risks 매핑

본 ADR Risks 7개 ↔ 본 design 의 sub-phase mitigation 매핑:

| Risk                                           | 매핑 sub-phase  | mitigation 핵심                                                        |
| ---------------------------------------------- | --------------- | ---------------------------------------------------------------------- |
| R1 (시각 cue 충돌)                             | A1 + A2         | 디자인 검토 + Storybook + low-friction 우선                            |
| R2 (detach materialize 누락)                   | C               | 50+ fixture round-trip                                                 |
| R3 (deep nested key 누락)                      | D               | recursive walk + resolver 재실행                                       |
| R4 (영향 계산 부하)                            | E               | 동기 우선 + 100ms 초과 시 worker                                       |
| R5 (ADR-911 신 UI 위 재작성)                   | F               | ADR-911 Slot section 직교 검증                                         |
| **R6 (Origin 토글 destructive — 조건부 HIGH)** | **G**           | **G4-G 선결조건 + 0/1/1000 fixture round-trip**                        |
| R7 (pencil drift)                              | (cross-cutting) | revision 2 baseline snapshot SHA 명시 — `3f7db76e` (2026-04-28T01:22Z) |

## 5. ADR-911 ##Slot section## 와의 직교 검증 (Phase F)

본 ADR ##Component section## 와 ADR-911 ##Slot section## 은 같은 Properties (Inspector) 패널에 공존:

| section                        | 표시 조건                          | 표시 항목                                                                                                  |
| ------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| ##Component section## (본 ADR) | element 1 개 선택 시 항상 노출     | Component Name + Origin/Instance 라벨 + Go to component + Create component / `[-]` + detach + 필드별 reset |
| ##Slot section## (ADR-911)     | 선택된 노드가 `frame` 일 때만 노출 | `slot` field 상태 (false 또는 string[]) + `[+]` (활성화/추가) + `[-]` (제거/해제)                          |

- 선택 노드가 frame 이면 두 section 동시 노출 (위/아래 또는 collapse 가능 영역)
- frame 이 아닌 노드 (text / icon / rectangle 등) 선택 시 ##Slot section## 미노출, ##Component section## 만
- UI 충돌 0 검증 = Storybook + Chrome MCP capture (frame + 비-frame 양쪽)

## 6. design 확장 작업 (Phase A 진입 시)

본 skeleton 은 sub-phase + Gates + Risks 매핑까지만 land. 다음 항목은 Phase A 진입 시점에 본 design 파일에 채움:

- 각 sub-phase 별 파일 변경 목록 (apps/builder/src/builder/...)
- 회귀 시나리오 fixture (50+ project + 0/1/1000 instance count)
- roundtrip evidence (Skia/CSS/Preview 3축 screenshot diff)
- ADR-911 Phase 3 P3-ε / P3-ζ 와의 의존 순서 (FramesTab + Slot section UI 가 본 ADR Component section 의 토대)
- ⑥ Origin 토글 ↔ ⑤ 영향 미리보기 다이얼로그 reuse 시 prop 인터페이스 정의

## 7. 후속 / 차단 사항

- **차단**: 본 design skeleton 이 Accepted 되기 전 ADR-912 Phase A 진입 금지 (codex H2)
- **차단 해제 조건**: 사용자 review + ADR-911 Phase 3 (P3-δ fix #3 + P3-ε + P3-ζ) land 완료
- **선결**: ADR-911 Hard Constraint #6 (##Slot section## land) 가 Phase F 통과 조건 — 양 section 공존 검증의 baseline

## 관련

- [ADR-912 본문](../912-editing-semantics-ui-5elements.md) (revision 2 — 2026-04-28)
- [ADR-911 본문](../911-layout-frameset-pencil-redesign.md) (revision 2 — Hard Constraint #6 + Gate G6 신설)
- [ADR-903 Phase 4 baseline](903-phase4-editing-semantics-breakdown.md) (637 LOC, 본 fork 의 baseline)
- [ssot-hierarchy.md](../../../.claude/rules/ssot-hierarchy.md) — D1/D2/D3 분할 정본
- [adr-writing.md](../../../.claude/rules/adr-writing.md) — Risk-First 템플릿 + "스캐폴딩 먼저" 원칙
- pencil baseline snapshot: `3f7db76e` (2026-04-28T01:22Z)
