# XStudio — Progress Tracker

> 이 파일은 세션 간 진행 상황을 추적합니다.
> 각 에이전트는 세션 시작 시 이 파일을 읽고, 종료 시 업데이트합니다.

## 현재 상태

- 최종 업데이트: 2026-03-27
- 활성 브랜치: main

## 최근 완료된 작업

- ADR-041 Spec-Driven Property Editor **Phase 0~4 전체 완료** (58개 Spec properties, 16개 hybrid, icon field, 수동 에디터 34개 삭제)
- ADR-048 선언적 Props Propagation **Phase 0~5 전체 완료** (아래 상세)
- Date & Time S2 전환 완료 (Calendar, DatePicker, DateRangePicker, RangeCalendar, DateField, TimeField)
- CSS 토큰 S2 + React Aria 리네이밍 전면 완료
- ADR-021 Theme System Phase A~E 전체 완료

## ADR-048 구현 완료 현황

### 완료된 Phase

| Phase | 작업                                                                 | 상태 |
| ----- | -------------------------------------------------------------------- | :--: |
| 0     | PropagationRule/PropagationSpec 타입 + 엔진 + 레지스트리             | 완료 |
| 1     | DatePicker 파일럿 (Inspector 자동 전파, 수동 sync 제거)              | 완료 |
| 2-A/B | 20개 컴포넌트 propagation spec + Registry 등록                       | 완료 |
| 2-D   | Factory 생성 시 초기값 전파 (applyFactoryPropagation)                | 완료 |
| 2-E   | ElementSprite parentDelegatedSize Registry 교체 (~110줄→16줄)        | 완료 |
| 2-F   | fullTreeLayout effectiveGetChildElements Registry 교체 (~180줄→30줄) | 완료 |
| 4     | 20개 컴포넌트 Factory 하드코딩 제거 (~29건)                          | 완료 |
| 5     | Dead code 제거 (sync함수, ChildSyncField 타입, tagGroupAncestorSize) | 완료 |

### 신규 파일

- `apps/builder/src/builder/utils/propagationEngine.ts` — buildPropagationUpdates + resolvePropagatedProps + applyFactoryPropagation
- `apps/builder/src/builder/utils/propagationRegistry.ts` — 정방향/역방향 인덱스, 20개 Spec 등록

### 4경로 통합

| 경로                        | 통합 방식                                                                     |
| --------------------------- | ----------------------------------------------------------------------------- |
| Inspector (PropertiesPanel) | handleUpdate → buildPropagationUpdates → updateSelectedPropertiesWithChildren |
| Factory (factories/utils)   | createElementsFromDefinition → applyFactoryPropagation → 자식 초기값 전파     |
| Skia (ElementSprite)        | getParentTagsForChild → 3단계 조상 스캔                                       |
| Layout (fullTreeLayout)     | resolvePropagatedProps + getLabelDelegationParents                            |

### 추가 수정 (ADR 외)

- CSS Preview Popover 포탈 `data-size`/`data-variant` 전달 (5개 컴포넌트)
- 22개 CSS 파일에 `--label-font-size`/`--label-line-height` 변수 완비
- GenericPropertyEditor renderAfterSections typeof 방어
- Inspector childHasValue 제거 + undefined 전파 버그 수정

### 제거된 수동 코드

- `PARENT_SIZE_DELEGATION_TAGS` (25태그), `SIZE_DELEGATION_PARENT_TAGS` (18태그), `GROUP_WRAPPER_TAGS`
- `tagGroupAncestorSize` selector, `parentDelegatedSize` 47줄 수동 탐색
- `effectiveGetChildElements` 5블록 (~180줄), `LABEL_SIZE_DELEGATION_CONTAINERS` (20태그)
- `syncDatePickerChildren`, `syncLabelChild`, `DATE_PICKER_SYNC_KEYS`
- `ChildSyncField`, `ChildSyncConfig` 타입

### 잔여 (유지 판단)

| 항목                                    | 비고                              |
| --------------------------------------- | --------------------------------- |
| LABEL_DELEGATION_PARENT_TAGS (DFS 내부) | 복잡한 DFS 로직이라 안전하게 유지 |
| implicitStyles getDelegatedSize         | 범용 3단계 탐색 — 교체 불필요     |

## 다음 작업 후보

- ADR-045 (ADR-041/048 이후)
- ADR-046 (S2 계약 확장)

## 알려진 이슈

- `LABEL_DELEGATION_PARENT_TAGS`/`LABEL_WRAPPER_TAGS` (fullTreeLayout.ts Label DFS) — Registry 교체 가능하지만 복잡한 DFS 로직이라 안전하게 유지

## 세션 로그

| 날짜       | 에이전트 | 작업 요약                                                                                                                           | 결과 |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2026-03-27 | main     | ADR-041 Phase 0~4 전체 완료 (Card/Slider/Icon hybrid + 수동 에디터 22개 삭제 + Phase 4 정리)                                        | 완료 |
| 2026-03-27 | main     | ADR-041 Phase 2~3 확장 (30개+ Spec properties + Checkbox/Switch/Radio hybrid + icon field + specRegistry 58개 + createElement 패치) | 완료 |
| 2026-03-27 | main     | ADR-048 Phase 2-E/F + 4 + 5 전체 완료 (3경로 교체+Factory+정리)                                                                     | 완료 |
| 2026-03-26 | main     | ADR-048 Phase 0~2-D 구현 + 검증 + 버그 수정                                                                                         | 완료 |
| 2026-03-26 | main     | Harness 튜닝 (Anthropic 레퍼런스 기반)                                                                                              | 완료 |
