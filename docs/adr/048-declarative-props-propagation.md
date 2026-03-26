# ADR-048: S2 Context 기반 선언적 Props Propagation

## Status

Proposed (2026-03-26)

## Prerequisites

- [ADR-041](041-spec-driven-property-editor.md) Phase 0~2 완료 (GenericPropertyEditor + SpecField + specRegistry 인프라) — **이미 충족**
- ADR-041의 ChildSyncField 직접 구현 대신 본 ADR의 PropagationSpec 엔진으로 대체

## Related ADRs

- [ADR-041](041-spec-driven-property-editor.md): Spec-Driven Property Editor — 본 ADR의 선행 인프라. Phase 3 ChildSyncField를 PropagationSpec 엔진으로 위임

## Context

### 문제 발견 경위

DatePicker 컴포넌트의 Calendar 자식이 부모의 size/variant 변경에 반응하지 않는 문제를 조사하면서, 이것이 DatePicker만의 문제가 아닌 **50개+ 조합형 컴포넌트 전체**의 구조적 문제임을 확인했다.

### S2 레퍼런스 분석

React Spectrum S2에서는 부모→자식 props 전파를 **React Context**로 자동 처리한다:

```
DatePicker props
  ├─ useDatePicker hook → calendarProps (12개) → CalendarContext.Provider
  │     ↓ (Context로 자동 주입)
  │   Calendar ← useContextProps(CalendarContext) → 자동 수신
  └─ S2 JSX에서 직접 전달 (3개만)
```

- 부모가 자식의 props를 직접 관리하지 않음
- hook이 Context를 통해 **push** 방식으로 전파
- 새 컴포넌트 추가 시 hook만 구현하면 자동 적용

### XStudio 현재 상태

XStudio는 Canvas(Skia + Taffy WASM) 렌더링이라 React Context를 직접 사용할 수 없다. 현재는 **Store 역탐색 (pull)** + **태그별 수동 등록** 방식:

| 영역               | 방식                                                                   | 문제                         |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------- |
| **Factory**        | 자식 props 하드코딩 (`size: "md"`, `variant: "default"`)               | 부모 변경 시 미연동          |
| **Inspector**      | Editor별 수동 sync 코드 (`syncDatePickerChildren`, `handleSizeChange`) | 컴포넌트마다 수동 작성       |
| **Skia**           | `PARENT_SIZE_DELEGATION_TAGS` + `parentDelegatedSize` selector         | 태그 수동 등록, size만 지원  |
| **Layout (Taffy)** | `effectiveGetChildElements` 체이닝 (~200줄)                            | 태그 수동 등록, size/Label만 |
| **implicitStyles** | `getDelegatedSize()` 3단계 탐색                                        | size만                       |

### 현재 delegation 적용 범위

**적용된 컴포넌트** (size만, 3경로 중 일부):

| 컴포넌트                 | Skia |   Layout    | implicitStyles |
| ------------------------ | :--: | :---------: | :------------: |
| Select/ComboBox          |  O   |      O      |       O        |
| SearchField              |  O   |      O      |       O        |
| CheckboxGroup/RadioGroup |  O   |      O      |       X        |
| TagGroup                 |  O   |      O      |       X        |
| ProgressBar/Meter        |  O   |      O      |       X        |
| Slider                   |  O   |      O      |       X        |
| TextField/TextArea       |  X   | O (Label만) |       X        |
| DateField/TimeField      |  X   | O (Label만) |       X        |

**미적용 컴포넌트** (delegation 경로 자체가 없음):

- DatePicker → Calendar, CalendarHeader, CalendarGrid
- DateRangePicker → Calendar 서브트리
- Card → CardHeader, CardContent, CardFooter
- Dialog → Heading, Description
- ButtonGroup → Button, AvatarGroup → Avatar
- ToggleButtonGroup → ToggleButton
- Pagination → Button

**미지원 props** (size 외):

- variant, isDisabled, locale, calendarSystem, value, orientation 등

### 새 컴포넌트 추가 시 수동 작업 목록 (현재)

1. Factory에 자식 props 하드코딩
2. `PARENT_SIZE_DELEGATION_TAGS`에 자식 태그 추가 (ElementSprite.tsx)
3. `SIZE_DELEGATION_PARENT_TAGS`에 부모 태그 추가 (ElementSprite.tsx)
4. `effectiveGetChildElements` 블록 추가 (fullTreeLayout.ts ~200줄 영역)
5. `LABEL_DELEGATION_PARENT_TAGS`에 추가 (fullTreeLayout.ts)
6. Editor에 수동 sync 코드 작성 (DatePickerEditor, SelectEditor 등)
7. `getDelegatedSize()` 경로에 추가 (implicitStyles.ts, 필요 시)

**총 5~7곳 수동 업데이트 필요**, 누락 시 특정 경로에서만 props 미반영.

## Decision

**S2의 선언적 push 정신을 Spec 메타데이터 + 통합 엔진으로 구현한다.**

### 핵심 원칙

```
Spec에 전파 규칙 선언 (단일 소스)
  → Inspector: 규칙 기반 자동 Store 업데이트
  → Skia/Layout/implicitStyles: 규칙 기반 자동 주입
  → 수동 태그 등록 & Editor sync 코드 제거
```

### 새 컴포넌트 추가 시 변경 (변경 후)

1. Spec에 `propagation` 규칙 추가 → **끝** (1곳만)

## Design

### 1. 타입 정의

`packages/specs/src/types/spec.types.ts`에 추가:

```typescript
/** S2 Context 에뮬레이션: 선언적 부모→자식 props 전파 규칙 */
export interface PropagationRule {
  /** 부모 prop 키 (e.g., "size", "variant", "locale") */
  parentProp: string;

  /** 대상 자식 태그 경로. 문자열 = 직접 자식, 배열 = 중첩 경로 */
  childPath: string | string[];

  /** 자식에 설정할 prop 키 (기본: parentProp과 동일) */
  childProp?: string;

  /** 부모 값 → 자식 값 변환 (e.g., size "md" → fontSize 14) */
  transform?: (
    parentValue: unknown,
    parentProps: Record<string, unknown>,
  ) => unknown;

  /** true: style 객체 내 속성으로 설정 */
  asStyle?: boolean;

  /** true: 자식에 자체 값이 없을 때만 전파 (기본: false = 항상 덮어쓰기) */
  inheritOnly?: boolean;
}

export interface PropagationSpec {
  rules: PropagationRule[];
}
```

`ComponentSpec` 확장:

```typescript
export interface ComponentSpec<Props> {
  // ... 기존 필드 ...

  /** S2 Context 에뮬레이션: 부모→자식 props 전파 규칙 */
  propagation?: PropagationSpec;
}
```

### 2. Propagation Engine (신규)

**파일**: `apps/builder/src/builder/utils/propagationEngine.ts`

```typescript
/**
 * Inspector용: 부모 props 변경 시 자식 BatchPropsUpdate[] 생성
 *
 * childPath를 childrenMap으로 순회하여 대상 자식을 찾고,
 * transform/asStyle/inheritOnly 규칙을 적용한 업데이트 배열 반환.
 */
export function buildPropagationUpdates(
  parentElement: Element,
  changedProps: Record<string, unknown>,
  rules: PropagationRule[],
  childrenMap: Map<string, Element[]>,
  elementsMap: Map<string, Element>,
): BatchPropsUpdate[];

/**
 * Skia/Layout용: Store 쓰기 없이 가상 props 패치 반환
 *
 * 부모 tag/props와 자식 tag/props를 받아,
 * propagation 규칙에 따라 자식에 주입할 props를 계산.
 * Store를 변경하지 않음 (렌더링 시점 in-memory 패치).
 */
export function resolvePropagatedProps(
  parentTag: string,
  parentProps: Record<string, unknown>,
  childTag: string,
  childProps: Record<string, unknown>,
): Record<string, unknown> | null;
```

### 3. Propagation Registry (신규)

**파일**: `apps/builder/src/builder/utils/propagationRegistry.ts`

```typescript
// Spec에서 propagation 규칙 수집 (앱 시작 시 1회, lazy 초기화)

/** 정방향: parentTag → PropagationRule[] */
export function getPropagationRules(
  parentTag: string,
): PropagationRule[] | undefined;

/** 역방향: childTag → Set<parentTag> (ElementSprite 역탐색용) */
export function getParentTagsForChild(
  childTag: string,
): Set<string> | undefined;
```

- 정방향 인덱스: `handleFieldChange`에서 부모 태그로 규칙 조회
- 역방향 인덱스: ElementSprite에서 자식 태그로 부모 후보 조회

### 4. Spec 적용 예시: DatePicker

```typescript
export const DatePickerSpec: ComponentSpec<DatePickerProps> = {
  // ... 기존 필드 ...

  propagation: {
    rules: [
      // size → 모든 자식
      { parentProp: "size", childPath: "DateInput" },
      { parentProp: "size", childPath: "Calendar" },
      { parentProp: "size", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "size", childPath: ["Calendar", "CalendarGrid"] },

      // variant → Calendar 서브트리
      { parentProp: "variant", childPath: "Calendar" },
      { parentProp: "variant", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "variant", childPath: ["Calendar", "CalendarGrid"] },

      // locale/calendarSystem → Calendar 서브트리
      { parentProp: "locale", childPath: "Calendar" },
      { parentProp: "locale", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "locale", childPath: ["Calendar", "CalendarGrid"] },
      { parentProp: "calendarSystem", childPath: "Calendar" },
      {
        parentProp: "calendarSystem",
        childPath: ["Calendar", "CalendarHeader"],
      },
      { parentProp: "calendarSystem", childPath: ["Calendar", "CalendarGrid"] },

      // defaultToday → CalendarGrid only
      { parentProp: "defaultToday", childPath: ["Calendar", "CalendarGrid"] },
    ],
  },
};
```

### 5. 4경로 통합

#### 5-A. Inspector 경로

`GenericPropertyEditor.tsx`의 `handleFieldChange`에서:

1. 변경된 prop이 `spec.propagation.rules`에 매칭되는지 확인
2. 매칭되면 `buildPropagationUpdates()` → `BatchPropsUpdate[]` 생성
3. `updateSelectedPropertiesWithChildren(parentUpdate, childUpdates)` 호출
4. 기존 `ChildSyncField`(ADR-041)의 동기화 로직을 PropagationSpec 엔진으로 위임 (ChildSyncField는 UI 표현만 담당)

**제거 대상**: Editor별 수동 sync 코드 (`syncDatePickerChildren`, `handleSizeChange` 등)

#### 5-B. Skia 경로 (ElementSprite.tsx)

현재 `PARENT_SIZE_DELEGATION_TAGS` + `parentDelegatedSize` 수동 등록을 Registry 기반으로 교체:

```typescript
// Before (수동)
const PARENT_SIZE_DELEGATION_TAGS = new Set(["SelectTrigger", "ComboBoxWrapper", ...]);
const SIZE_DELEGATION_PARENT_TAGS = new Set(["Select", "ComboBox", ...]);

// After (자동)
const parentTags = getParentTagsForChild(element.tag);
if (parentTags) {
  // 부모/조부모 탐색 → resolvePropagatedProps() 호출
}
```

#### 5-C. Layout 경로 (fullTreeLayout.ts)

현재 `effectiveGetChildElements` 체이닝 5개 블록(~200줄)을 단일 범용 블록으로 교체:

```typescript
// Before (수동, 태그별 개별 블록)
if (containerTag === "taggroup" || containerTag === "taglist") { ... }
if (containerTag === "checkboxgroup" || containerTag === "radiogroup") { ... }
if (containerTag === "select" || containerTag === "combobox") { ... }

// After (자동, 단일 블록)
const rules = getPropagationRules(containerTag);
if (rules) {
  const prevGet = effectiveGetChildElements;
  effectiveGetChildElements = (id: string) => {
    const children = prevGet(id);
    return children.map(child => {
      const patch = resolvePropagatedProps(containerTag, containerProps, child.tag, child.props);
      return patch ? { ...child, props: { ...child.props, ...patch } } : child;
    });
  };
}
```

**Label fontSize/lineHeight delegation**: `transform` 함수로 처리

```typescript
{
  parentProp: "size",
  childPath: "Label",
  childProp: "fontSize",
  asStyle: true,
  transform: (size) => LABEL_SIZE_STYLE[size as string]?.fontSize,
}
```

#### 5-D. implicitStyles 경로

`getDelegatedSize()` 내부 구현을 Registry 기반 조회로 변경. 외부 API는 유지.

### 6. Store 아키텍처 결정

**자식 props를 Store에 독립 저장하는 현재 구조 유지.**

이유:

- DB(IndexedDB) 영속화가 요소별 독립 저장 구조
- 파생(derive) 방식은 캐시 무효화 복잡도 급증
- `batchUpdateElementProps`가 이미 원자적 부모+자식 업데이트 지원
- propagation 엔진이 실제 prop 값을 자식에 기록 → 현재 저장 모델과 호환

### 7. ADR-041 ChildSyncField와의 관계

#### 분석: ChildSyncField = UI 표현 + 동기화가 결합된 구조

ADR-041의 `ChildSyncField`는 두 가지 역할을 하나의 타입에 결합하고 있다:

1. **UI 표현** — Inspector에 이 필드를 렌더링하고 사용자가 편집할 수 있게 하는 것
2. **동기화** — 필드 값 변경 시 `childSync.path` 기반으로 자식 Element의 prop을 업데이트하는 것

```typescript
// ChildSyncField 예시 (ADR-041)
{ key: "children", type: "childSync", label: "Label",
  childSync: { path: ["Label"], propKey: "children" } }
//           ↑ UI 표현 (Inspector에 Label 필드 렌더링)
//                                    ↑ 동기화 (Label 자식의 children prop 업데이트)
```

#### 문제: 동기화 로직이 Inspector 경로에 갇혀 있음

ChildSyncField의 동기화는 **Inspector 경로에서만 동작**한다. 동일한 전파가 필요한 Skia/Layout/implicitStyles 경로는 별도 수동 코드(태그 상수 등록)로 처리해야 한다.

#### 결론: PropagationSpec이 하위 엔진, ChildSyncField는 UI 레이어

ChildSyncField의 동기화 로직은 PropagationRule로 **완전히 표현 가능**하다:

```typescript
// ChildSyncField의 동기화 (AS-IS)
{ childSync: { path: ["Label"], propKey: "children" } }

// PropagationRule로 동일 표현 (TO-BE)
{ parentProp: "children", childPath: "Label", childProp: "children" }
```

따라서 "공존"이 아니라 **계층 분리**가 올바른 관계다:

```
ChildSyncField (UI 레이어)
  = Inspector에 필드 렌더링 + 사용자 편집 UI 제공
  → 값 변경 시 PropagationSpec 엔진 호출로 위임

PropagationSpec (엔진 레이어)
  = 4경로 통합 전파 규칙 (Inspector + Skia + Layout + implicitStyles)
  → ChildSyncField에서도, 프로그래밍 API에서도 동일 엔진 사용
```

|               | ChildSyncField (UI 레이어)           | PropagationSpec (엔진 레이어)              |
| ------------- | ------------------------------------ | ------------------------------------------ |
| **역할**      | Inspector 필드 렌더링 + 편집 UI      | 순수 전파 규칙 (4경로 통합)                |
| **동기화**    | PropagationSpec 엔진에 위임          | 실제 동기화 수행                           |
| **적용 경로** | Inspector UI 표현                    | Inspector + Skia + Layout + implicitStyles |
| **위치**      | `ComponentSpec.properties` (ADR-041) | `ComponentSpec.propagation` (ADR-048)      |

## Implementation Plan

### Phase 0: 인프라 (타입 + 엔진 + 레지스트리)

| 파일                                                    | 작업                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/specs/src/types/spec.types.ts`                | `PropagationRule`, `PropagationSpec` 타입 추가, `ComponentSpec` 확장 |
| `packages/specs/src/types/index.ts`                     | 새 타입 export                                                       |
| `packages/specs/src/index.ts`                           | 새 타입 re-export                                                    |
| `apps/builder/src/builder/utils/propagationEngine.ts`   | 핵심 엔진 (buildPropagationUpdates, resolvePropagatedProps)          |
| `apps/builder/src/builder/utils/propagationRegistry.ts` | Registry (정방향/역방향 인덱스)                                      |

**게이트**: `pnpm type-check` 통과 + 엔진 단위 테스트

### Phase 1: 파일럿 — DatePicker (4경로 통합 검증)

| 순서 | 작업                                                                     |
| ---- | ------------------------------------------------------------------------ |
| 1-1  | `DatePicker.spec.ts`에 `propagation` 규칙 추가                           |
| 1-2  | `GenericPropertyEditor.tsx`에 propagation 자동 전파 로직 추가            |
| 1-3  | Inspector에서 DatePicker size/variant 변경 → Calendar 서브트리 반영 검증 |
| 1-4  | Undo/Redo 검증 (단일 히스토리)                                           |
| 1-5  | `DatePickerEditor.tsx`에서 `syncDatePickerChildren` 제거                 |
| 1-6  | `CalendarEditor.tsx`에서 수동 자식 sync 제거                             |

**게이트**: DatePicker size "lg" → Calendar/CalendarHeader/CalendarGrid 모두 "lg" 반영 (Canvas + Preview)

### Phase 2: Skia/Layout 3경로 통합

| 순서 | 작업                                                                |
| ---- | ------------------------------------------------------------------- |
| 2-1  | `ElementSprite.tsx`: `parentDelegatedSize`를 Registry 기반으로 교체 |
| 2-2  | `fullTreeLayout.ts`: `effectiveGetChildElements` 범용 블록 교체     |
| 2-3  | `implicitStyles.ts`: `getDelegatedSize()` Registry 기반 교체        |
| 2-4  | Select/ComboBox size 변경 → 기존 동작 유지 회귀 검증                |

**게이트**: 기존 delegation 동작 100% 유지 + 수동 상수 제거

### Phase 3: 컴포넌트 점진적 마이그레이션

| 순서 | 컴포넌트                                      | 전파 props                            | 난이도 |
| ---- | --------------------------------------------- | ------------------------------------- | :----: |
| 3-1  | DateRangePicker, Calendar, RangeCalendar      | size, variant, locale, calendarSystem |   L    |
| 3-2  | Select, ComboBox                              | size → Trigger/Wrapper/Value/Icon     |   M    |
| 3-3  | CheckboxGroup, RadioGroup                     | size → Checkbox/Radio 자식            |   M    |
| 3-4  | TagGroup                                      | size, allowsRemoving → Tag            |   L    |
| 3-5  | TextField, TextArea, SearchField, NumberField | size → Label/Input                    |   L    |
| 3-6  | ProgressBar, Meter                            | size, value, variant → Track/Value    |   M    |
| 3-7  | Slider                                        | size → Track/Thumb/Output             |   L    |
| 3-8  | Card, Dialog, ButtonGroup, AvatarGroup 등     | 점진적                                |  L-M   |

### Phase 4: Factory 정리

propagation 규칙이 있으면 Factory에서 자식 props 하드코딩 제거:

```typescript
// Before
{ tag: "Calendar", props: { variant: "default", size: "md", ... } }

// After — size/variant는 부모에서 전파
{ tag: "Calendar", props: { defaultToday: true } }
```

Factory 생성 시 `buildPropagationUpdates`를 1회 호출하여 부모 기본값을 자식에 초기 적용.

### Phase 5: 기존 수동 코드 제거

| 제거 대상                                          | 파일              | 시점                 |
| -------------------------------------------------- | ----------------- | -------------------- |
| `PARENT_SIZE_DELEGATION_TAGS`                      | ElementSprite.tsx | Phase 2 완료 시      |
| `SIZE_DELEGATION_PARENT_TAGS`                      | ElementSprite.tsx | Phase 2 완료 시      |
| `parentDelegatedSize` selector                     | ElementSprite.tsx | Phase 2 완료 시      |
| `effectiveGetChildElements` 개별 블록 (5개)        | fullTreeLayout.ts | Phase 2 완료 시      |
| `LABEL_SIZE_DELEGATION_CONTAINERS`                 | fullTreeLayout.ts | Phase 3-5 완료 시    |
| `getDelegatedSize()`                               | implicitStyles.ts | Phase 3 전체 완료 시 |
| `syncDatePickerChildren` + `DATE_PICKER_SYNC_KEYS` | editorUtils.ts    | Phase 1 완료 시      |
| `handleSizeChange` 수동 코드                       | SelectEditor 등   | Phase 3-2 완료 시    |

## 수정 파일 목록

### 신규 파일

| 파일                                                    | 용도      |
| ------------------------------------------------------- | --------- |
| `apps/builder/src/builder/utils/propagationEngine.ts`   | 핵심 엔진 |
| `apps/builder/src/builder/utils/propagationRegistry.ts` | Registry  |

### 수정 파일

| 파일                                                                           | 변경 내용                                                  |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `packages/specs/src/types/spec.types.ts`                                       | PropagationRule, PropagationSpec 타입 + ComponentSpec 확장 |
| `packages/specs/src/types/index.ts`                                            | 새 타입 export                                             |
| `packages/specs/src/index.ts`                                                  | 새 타입 re-export                                          |
| `packages/specs/src/components/DatePicker.spec.ts`                             | propagation 규칙 추가 (파일럿)                             |
| `apps/builder/src/builder/panels/properties/generic/GenericPropertyEditor.tsx` | handleFieldChange에 propagation 자동 전파                  |
| `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`          | parentDelegatedSize → Registry 기반                        |
| `apps/builder/src/builder/workspace/canvas/layout/engines/fullTreeLayout.ts`   | effectiveGetChildElements → 범용 블록                      |
| `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts`   | getDelegatedSize → Registry 기반                           |

### 제거 대상 (마이그레이션 완료 시)

| 대상                                                         | 위치                                              |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `syncDatePickerChildren`, `DATE_PICKER_SYNC_KEYS`            | editorUtils.ts                                    |
| Editor별 수동 sync 코드                                      | DatePickerEditor, CalendarEditor, SelectEditor 등 |
| `PARENT_SIZE_DELEGATION_TAGS`, `SIZE_DELEGATION_PARENT_TAGS` | ElementSprite.tsx                                 |
| `effectiveGetChildElements` 개별 체이닝 블록 5개             | fullTreeLayout.ts                                 |
| `LABEL_SIZE_DELEGATION_CONTAINERS`                           | fullTreeLayout.ts                                 |

## 성능 고려

- **Registry**: lazy 초기화, O(1) lookup by tag. 역방향 인덱스도 O(1).
- **Propagation 해석**: `childPath` 순회에 `childrenMap.get()` O(1). 최대 3단계 깊이.
- **Store 업데이트**: 기존 `batchUpdateElementProps` 사용 — 단일 `set()` + 단일 히스토리
- **Layout/Skia**: DFS 순회 중 기존 인라인 코드를 Registry 호출로 교체 — 동일 복잡도
- **`transform` 함수**: 순수 함수, 부작용 없음

## 검증 방법

### 기능 검증

1. DatePicker 배치 → Inspector에서 size "lg" 변경 → Calendar/CalendarHeader/CalendarGrid 모두 "lg" 반영
2. DatePicker variant "accent" 변경 → Calendar border 색상 accent 반영
3. DatePicker locale 변경 → Calendar 요일/월 표시 변경
4. Undo → 부모+자식 모두 원복 (단일 히스토리)
5. 새로고침 → DB에서 로드 후 정상 렌더링
6. Canvas(Skia) + CSS Preview 양쪽 동일 결과

### 회귀 검증

- Select/ComboBox size 변경 → 기존 동작 유지
- CheckboxGroup → Checkbox size delegation 유지
- Label fontSize/lineHeight delegation 유지
- TagGroup → Tag allowsRemoving delegation 유지

### 성능 검증

- `pnpm type-check` 통과
- Canvas FPS 60fps 유지
- Registry 초기화 < 1ms

## Risks

| 리스크                                                                       | 영향            | 완화                                                                         |
| ---------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| Label fontSize delegation이 `transform` 함수로 정확히 재현 안 될 수 있음     | Layout 불일치   | Phase 2에서 LABEL_SIZE_STYLE 완전 매핑 검증 후 진행                          |
| 기존 수동 코드와 새 엔진 코드가 충돌할 수 있음                               | 이중 전파       | Phase별 점진적 전환, 기존 코드는 해당 컴포넌트 마이그레이션 완료 후에만 제거 |
| ProgressBar/Meter의 value/variant 전파가 기존 커스텀 selector와 다를 수 있음 | 렌더링 불일치   | Phase 3-6에서 개별 검증                                                      |
| 50개+ 컴포넌트 마이그레이션 완료까지 기존/신규 코드가 혼재                   | 유지보수 복잡도 | Registry 기반 분기로 신규 코드 우선, 기존 코드 fallback                      |
