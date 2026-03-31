# XStudio — Progress Tracker

> 이 파일은 세션 간 진행 상황을 추적합니다.
> 각 에이전트는 세션 시작 시 이 파일을 읽고, 종료 시 업데이트합니다.

## 현재 상태

- 최종 업데이트: 2026-03-31
- 활성 브랜치: main

## 최근 완료된 작업

- ADR-048 후속 버그 수정 — size propagation WebGL/Preview 정합성 (2026-03-31, 아래 상세)
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

## ADR-048 후속 버그 수정 (2026-03-31)

| 수정              | 대상             | 내용                                                                                                       |
| ----------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `override: true`  | 22개 Spec        | 모든 size 전파 규칙에 override 추가                                                                        |
| 중첩 경로         | Select, ComboBox | SelectValue→`["SelectTrigger","SelectValue"]`, ComboBoxInput→`["ComboBoxWrapper","ComboBoxInput"]`         |
| fontSize 우선순위 | 12개 Spec shapes | `props.size ? size.fontSize : (style.fontSize ?? size.fontSize)`                                           |
| ListBox CSS       | xs/xl 추가       | `data-size` xs/xl variants + Popover 컨텍스트 변수 참조                                                    |
| ComboBox CSS      | padding          | `.combobox-container` padding을 `--combo-input-padding` + `padding-right: --combo-btn-right`               |
| data-size 이동    | Select, ComboBox | Popover→ListBox (S2 패턴: Popover padding=0)                                                               |
| Label factory     | 7개 factory      | TextField/TextArea/NumberField/SearchField/Select/ComboBox/ColorField에 `width/height: "fit-content"` 추가 |
| implicitStyles    | side label       | `minWidth: FORM_SIDE_LABEL_WIDTH` 강제 주입 제거                                                           |

## DatePicker/DateRangePicker 기능 확장 (2026-03-31)

| 수정                | 대상                                                      | 내용                                                                               |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Popover→Dialog 패턴 | DatePicker, DateRangePicker                               | Popover에서 data-size/variant 제거 → Dialog에 전달, Calendar에 data-size 직접 전달 |
| Dialog skipCSS      | Dialog.spec.ts                                            | `skipCSSGeneration: true` + generated/Dialog.css 삭제                              |
| DateSegment skipCSS | DateSegment.spec.ts                                       | `skipCSSGeneration: true` + generated/DateSegment.css 삭제                         |
| CSS xs/xl 추가      | DatePicker.css, DateRangePicker.css, Dialog.css           | 5단계 size variants 완비                                                           |
| Spec xs/xl 추가     | DATE_PICKER_SIZES, Dialog.spec, ListBox.spec              | 5단계 size 정의                                                                    |
| visibleMonths       | DatePicker, DateRangePicker, Calendar                     | Spec properties + propagation + 복수 CalendarGrid 렌더링                           |
| granularity 시간    | DatePicker, DateRangePicker                               | placeholderValue(now) + TimeField 자동 표시 + granularity 전파                     |
| labelPosition side  | DatePicker.css, DateRangePicker.css, .tsx, implicitStyles | CSS + WebGL 양쪽 side 레이아웃 지원                                                |
| Popover 자식 제외   | implicitStyles.ts                                         | Calendar/RangeCalendar을 Taffy 레이아웃에서 제외 (POPOVER_CHILDREN_TAGS)           |
| factory 기본값      | DateColorComponents.ts                                    | hideTimeZone/shouldForceLeadingZeros/visibleMonths 기본값                          |
| CSS import 정리     | index.css, Popover.css                                    | Calendar.css, Popover.css 수동 import 추가, 주석 정정                              |

## 다음 작업 후보

- ADR-045 (ADR-041/048 이후)
- ADR-046 (S2 계약 확장)
- `resolveSpecFontSize()` 유틸리티 추출 — 56개 Spec의 동일 3단계 패턴 통합
- `override: true` 엔진 자동화 — `parentProp === "size"` 암묵 적용
- `getGranularity()` / `isTimeGranularity` 헬퍼 추출 — DateRenderers.tsx / DatePicker.tsx 중복 해소

## 알려진 이슈

- `LABEL_DELEGATION_PARENT_TAGS`/`LABEL_WRAPPER_TAGS` (fullTreeLayout.ts Label DFS) — Registry 교체 가능하지만 복잡한 DFS 로직이라 안전하게 유지
- 기존 생성된 컴포넌트의 Label에 `width: "fit-content"` 미설정 가능 — 새로 생성한 컴포넌트에서만 정상 동작
- 기존 DatePicker/DateRangePicker에 `hideTimeZone`/`shouldForceLeadingZeros` prop 없음 — 렌더러 `!== false` 패턴으로 동작은 true이지만 프로퍼티 패널 표시는 off

## 세션 로그

| 날짜       | 에이전트 | 작업 요약                                                                                                                           | 결과 |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2026-03-31 | main     | ADR-048 후속 + DatePicker 기능 확장 (size propagation, visibleMonths, granularity 시간, labelPosition, Popover→Dialog 패턴)         | 완료 |
| 2026-03-27 | main     | ADR-041 Phase 0~4 전체 완료 (Card/Slider/Icon hybrid + 수동 에디터 22개 삭제 + Phase 4 정리)                                        | 완료 |
| 2026-03-27 | main     | ADR-041 Phase 2~3 확장 (30개+ Spec properties + Checkbox/Switch/Radio hybrid + icon field + specRegistry 58개 + createElement 패치) | 완료 |
| 2026-03-27 | main     | ADR-048 Phase 2-E/F + 4 + 5 전체 완료 (3경로 교체+Factory+정리)                                                                     | 완료 |
| 2026-03-26 | main     | ADR-048 Phase 0~2-D 구현 + 검증 + 버그 수정                                                                                         | 완료 |
| 2026-03-26 | main     | Harness 튜닝 (Anthropic 레퍼런스 기반)                                                                                              | 완료 |
