# XStudio — Progress Tracker

> 이 파일은 세션 간 진행 상황을 추적합니다.
> 각 에이전트는 세션 시작 시 이 파일을 읽고, 종료 시 업데이트합니다.

## 현재 상태

- 최종 업데이트: 2026-03-26
- 활성 브랜치: main

## 최근 완료된 작업

- ADR-048 선언적 Props Propagation Phase 0~2-D 구현 (진행 중, 아래 상세)
- Date & Time S2 전환 완료 (Calendar, DatePicker, DateRangePicker, RangeCalendar, DateField, TimeField)
- CSS 토큰 S2 + React Aria 리네이밍 전면 완료
- ADR-021 Theme System Phase A~E 전체 완료
- Harness 튜닝: Evaluator 에이전트 신설, Sprint Contract 도입, agent-memory 활성화

## 진행 중인 작업

### ADR-048: S2 Context 기반 선언적 Props Propagation

**완료된 Phase:**

| Phase | 작업                                                      | 상태 |
| ----- | --------------------------------------------------------- | :--: |
| 0     | 타입(PropagationRule/PropagationSpec) + 엔진 + 레지스트리 | 완료 |
| 1     | DatePicker 파일럿 (Inspector 자동 전파, 수동 sync 제거)   | 완료 |
| 2-A   | 20개 컴포넌트 propagation spec 추가                       | 완료 |
| 2-B   | propagationRegistry 전체 등록 (20개)                      | 완료 |
| 2-D   | Factory 생성 시 초기값 전파 (applyFactoryPropagation)     | 완료 |
| 2-E   | ElementSprite parentDelegatedSize Registry 교체           | 완료 |
| 2-F   | fullTreeLayout effectiveGetChildElements Registry 교체    | 완료 |
| 5     | Dead code 제거 (sync함수, ChildSyncField 타입)            | 완료 |

**신규 파일:**

- `apps/builder/src/builder/utils/propagationEngine.ts` — buildPropagationUpdates + resolvePropagatedProps + applyFactoryPropagation
- `apps/builder/src/builder/utils/propagationRegistry.ts` — 정방향/역방향 인덱스, 20개 Spec 등록

**핵심 통합 포인트:**

- `PropertiesPanel.tsx` handleUpdate → propagation 자동 전파 (모든 에디터에서 자동)
- `elementCreation.ts` createAddComplexElementAction → Factory 생성 시 자식 props 초기화

**Propagation 규칙 적용된 Spec (20개):**
Select, ComboBox, SearchField, CheckboxGroup, RadioGroup, TagGroup,
Checkbox, Radio, Switch, TextField, TextArea, NumberField,
DateField, TimeField, ColorField, Slider, ProgressBar, Meter,
DatePicker, DateRangePicker

**추가 수정:**

- CSS Preview Popover 포탈 size 전파 (DatePicker/DateRangePicker/Select/ComboBox/Menu에 data-size 전달)
- 20개 컴포넌트 CSS에 --label-font-size/--label-line-height 변수 완비
- GenericPropertyEditor renderAfterSections typeof 방어

**잔여 작업:**

| Phase | 작업                                            | 비고                                          |
| ----- | ----------------------------------------------- | --------------------------------------------- |
| 2-G   | implicitStyles.ts getDelegatedSize()            | 기존 범용 3단계 탐색 — 교체 불필요            |
| 3     | size 외 props 마이그레이션 (variant, locale 등) | 컴포넌트별 점진적                             |
| 4     | Factory 하드코딩 제거                           | propagation이 처리하므로 불필요한 기본값 제거 |

## 다음 작업 후보

- ADR-048 Phase 3: size 외 props (variant, locale 등) 컴포넌트별 점진적 마이그레이션
- ADR-041 잔여 작업 (등급 B/C 하이브리드 전환 + icon 필드)
- ADR-045 (ADR-041/048 이후)

## 알려진 이슈

- `LABEL_DELEGATION_PARENT_TAGS`/`LABEL_WRAPPER_TAGS` (fullTreeLayout.ts Label DFS) — Phase 3에서 Registry 기반 교체 가능하지만 복잡한 DFS 로직이라 안전하게 유지 중

## 세션 로그

| 날짜       | 에이전트 | 작업 요약                              | 결과 |
| ---------- | -------- | -------------------------------------- | ---- |
| 2026-03-26 | main     | ADR-048 Phase 0~2-D 구현               | 완료 |
| 2026-03-26 | main     | Harness 튜닝 (Anthropic 레퍼런스 기반) | 완료 |
