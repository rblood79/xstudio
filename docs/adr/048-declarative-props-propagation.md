# ADR-048: S2 Context 기반 선언적 Props Propagation

## Status

**Accepted** — Phase 0~5 전체 완료 (2026-03-27)

## Prerequisites

- [ADR-041](041-spec-driven-property-editor.md) Phase 0~2 완료 (GenericPropertyEditor + SpecField + specRegistry 인프라) — **이미 충족**
- ADR-041의 ChildSyncField 직접 구현 대신 본 ADR의 PropagationSpec 엔진으로 대체

## Related ADRs

- [ADR-041](041-spec-driven-property-editor.md): Spec-Driven Property Editor — 본 ADR의 선행 인프라. Phase 3 ChildSyncField를 PropagationSpec으로 대체(supersede)

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

### 설계 원칙: S2 방향 추종

XStudio의 근본 컨셉은 React Aria Components / React Spectrum S2를 쉽게 사용할 수 있는 노코드 빌더이다. HTML 편집 한계로 WebGL(Skia + Taffy)로 전환했으나, **S2의 컴포넌트 설계 방향을 따르는 것이 최우선**.

- S2에서 React Context로 전파하는 모든 props는 PropagationSpec 대상
- isDisabled, orientation, isRequired, isReadOnly 등 S2 Context 전파 props 점진적 추가
- 새 S2 컴포넌트 추가 시 해당 컴포넌트의 S2 소스코드에서 Context 전파 props를 확인하여 propagation 규칙 정의

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

  /** false: 자식 자체 값을 무시하고 항상 덮어쓰기 (기본: true = 자식 값 우선) */
  override?: boolean;
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

#### 역할 분담: buildPropagationUpdates vs resolvePropagatedProps

두 함수는 **다른 경로, 다른 역할**이다:

- **`buildPropagationUpdates`** (Inspector 전용): `childrenMap`을 받아 중첩 경로(`["Calendar", "CalendarHeader"]`)를 실제 Element ID로 해석. Store에 값을 기록하는 **primary 경로**.
- **`resolvePropagatedProps`** (Skia/Layout fallback): 부모-자식 태그 쌍만으로 직접 자식 1단계 규칙만 매칭. Store에 값이 없을 때(Factory 생성 직후, 마이그레이션 과도기)의 **방어적 fallback**. Inspector가 정상 동작하면 대부분 null 반환.

```typescript
/**
 * Inspector용 (primary): 부모 props 변경 시 자식 BatchPropsUpdate[] 생성
 *
 * childPath를 childrenMap으로 단계별 순회하여 대상 자식을 실제 Element ID로 해석.
 * 중첩 경로 ["Calendar", "CalendarHeader"]도 해석 가능:
 *   childrenMap.get(parentId) → Calendar 찾기 → childrenMap.get(calendarId) → CalendarHeader 찾기
 * transform/asStyle/override 규칙을 적용한 업데이트 배열 반환.
 */
export function buildPropagationUpdates(
  parentElement: Element,
  changedProps: Record<string, unknown>,
  rules: PropagationRule[],
  childrenMap: Map<string, Element[]>,
  elementsMap: Map<string, Element>,
): BatchPropsUpdate[];

/**
 * Skia/Layout용 (fallback): Store 쓰기 없이 가상 props 패치 반환
 *
 * 부모-자식 태그 쌍으로 직접 자식 1단계 규칙만 매칭.
 * Store에 값이 없을 때의 방어적 fallback.
 * Inspector가 정상 동작하면 대부분 null 반환 (Store에 이미 값 존재).
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

- 정방향 인덱스: `handleFieldChange`에서 부모 태그로 규칙 조회 (모든 규칙 포함 — 중첩 경로도)
- 역방향 인덱스: ElementSprite에서 자식 태그로 부모 후보 조회

#### 역방향 인덱스 계약: 직접 부모 규칙만 포함

역방향 인덱스는 **`childPath`가 단일 문자열인 규칙만** 인덱싱한다. 중첩 경로(`["Calendar", "CalendarHeader"]`)의 최종 자식(CalendarHeader)은 역방향 인덱스에 **포함하지 않는다**.

이유: `resolvePropagatedProps`(Skia/Layout fallback)는 직접 부모-자식 1단계만 매칭한다. 역방향 인덱스에 중첩 경로의 최종 자식을 포함하면, ElementSprite에서 불필요한 ancestor scan이 발생하고 실제 매칭은 실패하여 false candidate만 증가한다.

```typescript
// 빌드 시 역방향 인덱스 규칙
for (const rule of spec.propagation.rules) {
  if (typeof rule.childPath === "string") {
    // 직접 자식 → 역방향 인덱스에 포함
    reverseIndex.get(rule.childPath).add(parentTag);
  }
  // 배열(중첩 경로) → 역방향 인덱스에서 제외
  // 중첩 경로는 Inspector의 buildPropagationUpdates에서만 해석
}
```

중첩 경로의 자식(CalendarHeader 등)은 Phase 2의 Factory 초기 적용으로 Store에 값이 기록되므로, fallback 자체가 불필요.

#### 태그 정규화 규칙

Registry는 **소문자 키**로 인덱싱한다. Spec 정의는 PascalCase(`DatePicker`)이지만, Registry 빌드 시 `toLowerCase()`로 정규화.

현재 3경로의 태그 표기가 불일치하므로 통일 필요:

| 경로              | 현재 표기           | Registry 조회 시                            |
| ----------------- | ------------------- | ------------------------------------------- |
| ElementSprite.tsx | PascalCase 그대로   | `element.tag.toLowerCase()` → Registry 조회 |
| fullTreeLayout.ts | `tag.toLowerCase()` | 기존 정규화 그대로 → Registry 조회          |
| implicitStyles.ts | `tag.toLowerCase()` | 기존 정규화 그대로 → Registry 조회          |

```typescript
// Registry 빌드 (1회)
for (const [tag, spec] of specEntries) {
  const key = tag.toLowerCase();
  forwardIndex.set(key, spec.propagation.rules);
}

// 조회 (모든 경로에서 동일)
getPropagationRules(tag.toLowerCase());
```

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

`GenericPropertyEditor.tsx`는 `onUpdate` 콜백을 SpecField에 전달하는 wrapper 구조. propagation 로직은 `onUpdate`를 래핑하여 주입:

1. `onUpdate` 콜백을 propagation-aware wrapper로 래핑
2. 변경된 prop이 `spec.propagation.rules`에 매칭되는지 확인
3. 매칭되면 `buildPropagationUpdates()` → `BatchPropsUpdate[]` 생성
4. `updateSelectedPropertiesWithChildren(parentUpdate, childUpdates)` 호출
5. `ChildSyncField`(ADR-041)는 구현하지 않음 — PropagationSpec이 대체(supersede)

**제거 대상**: Editor별 수동 sync 코드 (`syncDatePickerChildren`, `handleSizeChange` 등)

#### 5-B. Skia 경로 (ElementSprite.tsx)

현재 `PARENT_SIZE_DELEGATION_TAGS`(23개 자식 태그) + `SIZE_DELEGATION_PARENT_TAGS`(18개 부모 태그) + `parentDelegatedSize`(최대 3단계 탐색: 부모→조부모→증조부모) 수동 등록을 Registry 기반으로 교체:

```typescript
// Before (수동)
const PARENT_SIZE_DELEGATION_TAGS = new Set(["SelectTrigger", "ComboBoxWrapper", ...]);  // 23개
const SIZE_DELEGATION_PARENT_TAGS = new Set(["Select", "ComboBox", ...]);  // 18개

// After (자동)
const parentTags = getParentTagsForChild(element.tag);
if (parentTags) {
  // 부모/조부모/증조부모 탐색 → resolvePropagatedProps() 호출
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

#### Inspector ↔ Skia/Layout 경로 우선순위

두 경로가 **동일 prop을 이중 적용하지 않는다**:

- **Inspector 경로**: 사용자 조작 시 `buildPropagationUpdates()` → 자식 Store에 **실제 값 기록** (DB 영속화)
- **Skia/Layout 경로**: 렌더링 시 `resolvePropagatedProps()` → Store에 값이 **없을 때만** 보완 패치

Inspector가 정상 동작하면 Store에 이미 올바른 값이 있으므로, Skia/Layout 패치는 **null 반환** (패치 불필요). Skia/Layout 패치는 Factory 생성 직후(Inspector 미경유 상태)나 마이그레이션 과도기의 **방어적 fallback** 역할이다.

```
우선순위: Store 저장 값 (Inspector 전파) > 렌더링 시 메모리 패치 (Skia/Layout fallback)
```

#### 자식 명시값 우선 원칙 (기본 동작)

현재 코드 6곳에서 일관된 패턴: **자식에 이미 값이 있으면 전파를 건너뜀**.

- ElementSprite: `if (parentDelegatedSize && !specProps.size)`
- fullTreeLayout Tag: `if (tagGroupSize && !cp?.size)`
- fullTreeLayout Checkbox: `if (cp?.size) return child`
- fullTreeLayout Label: `if (cs.lineHeight != null) return child`
- fullTreeLayout Select: `if (cp?.size) return child`
- fullTreeLayout DFS: `if (!rawElement.props?.size)`

이 원칙을 PropagationSpec에서도 유지한다. `override` 옵션 기본값은 미설정(= 자식 값 우선):

- 자식에 자체 값이 없을 때만 전파 (기본 동작, `override` 미설정)
- 자식 값을 무시하고 강제 덮어쓰기 필요 시 `override: true` 명시

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

#### 결론: PropagationSpec이 ChildSyncField를 대체(supersede)

ChildSyncField의 동기화 로직은 PropagationRule로 **완전히 표현 가능**하다:

```typescript
// ChildSyncField 설계 (구현된 적 없음)
{ childSync: { path: ["Label"], propKey: "children" } }

// PropagationRule로 대체
{ parentProp: "children", childPath: "Label", childProp: "children" }
```

ChildSyncField는 **미구현 상태**(타입 정의만 존재, SpecField 처리 없음, 사용 Spec 0건)이므로, "공존"이나 "통합"이 아니라 **미구현 상태에서 PropagationSpec으로 직행 전환**한다:

```
ChildSyncField: 타입 정의만 존재, 구현/사용 없음
  → 구현하지 않고 타입 정의 제거

PropagationSpec: ChildSyncField가 하려던 일을 4경로 통합으로 수행
  = Inspector + Skia + Layout + implicitStyles 모두 단일 엔진
```

|          | ChildSyncField (미구현 → 제거) | PropagationSpec (대체)                      |
| -------- | ------------------------------ | ------------------------------------------- |
| **상태** | 타입만 존재, 구현/사용 없음    | 신규 구현                                   |
| **역할** | Inspector 전용 동기화 (설계만) | 4경로 통합 전파 (Inspector/Skia/Layout/CSS) |
| **결정** | 구현 없이 타입 정의 제거       | ChildSyncField를 대체(supersede)            |

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

### Phase 2: Factory 초기 적용 + Skia/Layout 3경로 통합

Phase 2의 핵심: **Store에 값이 없는 상태를 먼저 해소**한 뒤 렌더링 경로를 교체한다.

현재 렌더링 경로의 래퍼 경유 탐색(CheckboxGroup→CheckboxItems→Checkbox, DatePicker→Calendar→CalendarHeader)은 Store에 값이 없어서 존재한다. `resolvePropagatedProps`(직접 자식 1단계 fallback)만으로는 이 다단계 구조를 커버할 수 없다. 따라서 **Factory 초기 적용을 Phase 2로 앞당겨**, 요소 생성 시점에 `buildPropagationUpdates` 1회 호출로 모든 자식에 값을 기록한다.

| 순서 | 작업                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| 2-1  | Factory 생성 시 `buildPropagationUpdates` 1회 호출 → 자식 Store에 초기값 기록  |
| 2-2  | `ElementSprite.tsx`: `parentDelegatedSize`를 Registry 기반으로 교체            |
| 2-3  | `fullTreeLayout.ts`: `effectiveGetChildElements` 범용 블록 교체                |
| 2-4  | `implicitStyles.ts`: `getDelegatedSize()` Registry 기반 교체                   |
| 2-5  | 기존 delegation 컴포넌트 회귀 검증 (Select/ComboBox/CheckboxGroup/TagGroup 등) |

**게이트**: 기존 delegation 동작 100% 유지 + 수동 상수 제거. Factory 초기 적용이 선행하므로, Store에 값이 보장된 상태에서 렌더링 경로 교체.

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

### Phase 4: Factory 하드코딩 제거

Phase 2에서 Factory 생성 시 `buildPropagationUpdates` 1회 호출이 도입되었으므로, Factory 정의에서 자식 props 하드코딩을 점진적으로 제거:

```typescript
// Before
{ tag: "Calendar", props: { variant: "default", size: "md", ... } }

// After — size/variant는 부모에서 전파 (Factory 생성 시 buildPropagationUpdates가 자동 적용)
{ tag: "Calendar", props: { defaultToday: true } }
```

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

## Fail-safe 원칙

노코드 빌더 환경에서는 사용자가 조합형 컴포넌트의 자식을 삭제하거나 트리 구조를 변경할 수 있다. 전파 엔진은 **비정상 트리에서도 안전하게 동작**해야 한다.

### 엔진 방어 규칙

1. **`childPath` 순회 중 대상 미발견 시 해당 규칙을 무시하고 계속 진행** (silent skip). Error를 throw하지 않음
2. `childrenMap.get(parentId)`가 `undefined`/빈 배열이면 해당 부모의 전파를 건너뜀
3. 중첩 경로 `["Calendar", "CalendarHeader"]`에서 1단계(Calendar)는 존재하지만 2단계(CalendarHeader)가 없으면, 해당 규칙만 스킵하고 나머지 규칙은 정상 처리
4. `elementsMap.get(id)`가 `undefined`이면 해당 업데이트를 `BatchPropsUpdate[]`에서 제외
5. `transform` 함수가 예외를 throw하면 catch하여 해당 규칙만 스킵 + console.warn 로깅

### 구현 예시

```typescript
// buildPropagationUpdates 내부
for (const rule of rules) {
  const targets = resolveChildPath(parentElement, rule.childPath, childrenMap);
  if (targets.length === 0) continue; // silent skip — 대상 미발견

  for (const target of targets) {
    let value = changedProps[rule.parentProp];
    if (rule.transform) {
      try {
        value = rule.transform(value, parentElement.props);
      } catch {
        console.warn(
          `[Propagation] transform failed: ${rule.parentProp} → ${rule.childPath}`,
        );
        continue; // 해당 규칙만 스킵
      }
    }
    // ... 업데이트 생성
  }
}
```

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

### ADR-048이 해결하는 기존 문제 (리스크 아님)

현재 렌더링 경로의 복잡도(Label 이중경로, CheckboxGroup 이중경로, effectiveGetChildElements 체이닝 순서 의존)는 "Store에 값이 없어서 렌더링 시점에 동적 보충(pull)"하는 패턴의 산물이다. ADR-048의 push 패턴(Inspector → Store에 실제 값 기록)이 적용되면 이 복잡도 자체가 소멸한다.

| 기존 복잡도                                             | 원인                             | ADR-048 적용 후                                 |
| ------------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| Label DFS 이중경로 + lastDelegationAncestor             | Store에 Label fontSize 미저장    | Store에 값 기록 → 조상 탐색 불필요              |
| CheckboxGroup DFS + effectiveGetChildElements 이중 주입 | Store에 Checkbox size 미저장     | Store에 값 기록 → 이중 경로 불필요              |
| effectiveGetChildElements 5블록 순서 의존               | 각 블록이 이전 결과에 의존       | Store 값 직접 읽기 → 체이닝 불필요              |
| syncDatePickerChildren 히스토리 분리 버그               | 자식마다 개별 updateElement 호출 | batchUpdateElementProps 단일 호출로 원자적 처리 |

### 실제 구현 리스크

| 리스크                                                                        | 등급 | Phase | 완화                                                                         |
| ----------------------------------------------------------------------------- | :--: | :---: | ---------------------------------------------------------------------------- |
| 기존 수동 코드와 새 엔진 코드가 마이그레이션 기간 동안 혼재                   | HIGH |  2-3  | Phase별 점진적 전환, 기존 코드는 해당 컴포넌트 마이그레이션 완료 후에만 제거 |
| Registry 기반 교체 시 useMemo deps 누락 → 부모 size 변경 시 자식 Skia 미갱신  | HIGH |   2   | Registry selector 반환값을 반드시 useMemo deps에 포함                        |
| size 외 12개+ prop delegation (iconName, value, variant 등) 마이그레이션 범위 | HIGH |   3   | Phase 3에 ProgressBar/Slider/DateField 명시적 포함, S2 소스 대조             |
| implicitStyles.ts의 fontSize 주입이 fullTreeLayout과 별도 경로                | MED  |   2   | implicitStyles도 Registry 기반 교체 대상에 포함                              |
| Label transform 함수로 LABEL_SIZE_STYLE 재현 정확도                           | MED  |   2   | Phase 2에서 LABEL_SIZE_STYLE 완전 매핑 검증 후 진행                          |
| tagGroupAncestorSize 별도 selector와의 우선순위 체인 보존                     | MED  |   3   | props.size > parentDelegated > tagGroupAncestor > "md" 체인 유지             |

## 후속 버그 수정 (2026-03-31)

### 1. `override: true` 일괄 적용 (22개 Spec)

**문제**: size 전파 시 `childHasValue` 체크로 인해 자식에 이미 size가 있으면 전파가 스킵됨
**수정**: 모든 `parentProp: "size"` 규칙에 `override: true` 추가 (22개 Spec)

### 2. 중첩 경로 수정 (Select/ComboBox)

**문제**: SelectValue/SelectIcon은 SelectTrigger의 자식, ComboBoxInput/ComboBoxTrigger는 ComboBoxWrapper의 자식이므로 직접 경로로 찾지 못함
**수정**: 중첩 경로로 변경 — `["SelectTrigger", "SelectValue"]`, `["ComboBoxWrapper", "ComboBoxInput"]` 등

### 3. Spec shapes fontSize 우선순위 (12개 Spec)

**문제**: DFS/Factory가 주입한 `style.fontSize`가 propagation으로 변경된 `size` prop보다 우선되어 Canvas에서 size 변경 미반영
**수정**: `props.size`가 명시적으로 설정된 경우 `size.fontSize`를 우선 사용

```typescript
const rawFontSize = props.size
  ? size.fontSize
  : (props.style?.fontSize ?? size.fontSize);
```

대상: Label, SelectValue, Input, Description, FieldError, Radio, Checkbox, Switch, SliderOutput, ProgressBarValue, MeterValue, DateSegment

### 4. Label factory `width: "fit-content"` 누락 (7개 factory)

**문제**: DateField/TimeField Label factory에는 `width: "fit-content"`가 있어 side 모드에서 정상이지만, TextField/Select/ComboBox 등은 누락되어 `implicitStyles.ts`의 `FORM_SIDE_LABEL_WIDTH(176px)` fallback 적용
**수정**: TextField, TextArea, NumberField, SearchField, Select, ComboBox, ColorField factory에 `width: "fit-content", height: "fit-content"` 추가 + `minWidth: FORM_SIDE_LABEL_WIDTH` 강제 주입 제거
