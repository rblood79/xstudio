# ADR-041: Spec-Driven Property Editor — Spec 기반 프로퍼티 에디터 자동 생성

## Status

Proposed

## Date

2026-03-13 (2026-03-16 코드베이스 실측 + 구현 완성도 보강)

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-036](completed/036-spec-first-single-source.md): Spec-First Single Source (CSS 자동 생성)

---

## Context

### 문제: 107개 에디터 파일의 반복 코드

현재 컴포넌트별 프로퍼티 에디터가 **107개의 개별 파일**로 존재한다.

```
apps/builder/src/builder/panels/properties/editors/
├── ButtonEditor.tsx        (variant/size/fillStyle/icon/disabled/pending...)
├── BadgeEditor.tsx         (variant/size/fill/children...)
├── SwitchEditor.tsx        (size/children/disabled/selected...)
├── TextFieldEditor.tsx     (size/label/placeholder/type/disabled/readonly...)
├── CardEditor.tsx          (variant/size/density/orientation/selectable...)
├── SelectEditor.tsx        (variant/size/placeholder/disabled...)
└── ... (101개 더)
```

이 파일들의 **80% 이상이 동일한 패턴을 반복**한다:

```typescript
// 모든 에디터가 반복하는 패턴
<PropertySelect label="Variant"
  options={[{ value: "accent", label: "Accent" }, ...]}  // ← Spec.variants에 이미 있음
/>
<PropertySizeToggle scale="5" />                          // ← Spec.sizes 키 개수
<PropertySwitch label="Disabled" />                       // ← Props의 boolean 필드
```

### 핵심 문제: Spec ↔ Editor 이중 정의

| 데이터        | Spec 정의                                                   | Editor 하드코딩                        |
| ------------- | ----------------------------------------------------------- | -------------------------------------- |
| variant 옵션  | `ButtonSpec.variants = { accent, primary, secondary, ... }` | `options={[{ value: "accent" }, ...]}` |
| size 옵션     | `ButtonSpec.sizes = { xs, sm, md, lg, xl }`                 | `scale="5"`                            |
| 기본값        | `ButtonSpec.defaultVariant = "primary"`                     | `currentProps.variant \|\| "primary"`  |
| boolean props | `ButtonProps.isDisabled?: boolean`                          | `PropertySwitch label="Disabled"`      |

ADR-036이 **Spec → CSS** 동기화를 해결한다면, 이 ADR은 **Spec → Editor UI** 동기화를 해결한다.

### 변경 비용

- **새 variant 추가**: Spec + Editor 2곳 수정 (Editor에서 options 배열에 추가해야 함)
- **새 컴포넌트 추가**: Spec + CSS + Editor + Metadata 4곳 생성
- **prop 이름 변경**: Spec + Editor 2곳 수정

### Hard Constraints

1. **기존 PropertyEditorProps 인터페이스 유지** — `{ elementId, currentProps, onUpdate }`
2. **성능 패턴 보존** — memo, useCallback, useMemo 최적화 유지
3. **커스텀 에디터 지원** — Table, ColorPicker 등 특수 에디터는 수동 유지 가능
4. **Deep child sync 지원** — Card, Switch 등 자식 동기화 패턴 유지

---

## Alternatives Considered

### 대안 A: 현행 유지 (107개 개별 에디터)

- 위험: 기술(L) / 유지보수(**H**) / 마이그레이션(L)
- 장점: 변경 없음, 에디터별 완전한 자유도
- 단점: 107개 파일 반복 코드, Spec ↔ Editor 이중 정의 영구 지속

### 대안 B: PropertySchema를 Spec에 추가 (채택)

- 위험: 기술(M) / 유지보수(**L**) / 마이그레이션(M)
- `ComponentSpec.properties`에 에디터 구조를 선언적으로 정의
- `GenericPropertyEditor`가 schema에서 동적으로 UI 생성
- 장점: Spec 단일 소스, 새 컴포넌트 추가 시 Editor 파일 불필요
- 단점: Schema 설계 투자, 커스텀 위젯 확장 체계 필요

### 대안 C: Props 인터페이스에서 자동 추론 (리플렉션)

- 위험: 기술(**H**) / 유지보수(L) / 마이그레이션(**H**)
- TypeScript 타입에서 런타임에 UI 자동 생성
- 단점: TS 타입은 런타임에 사라짐, 별도 스키마 생성 빌드 스텝 필요, 섹션 구조/레이블 등 메타 정보 부재

### Risk Threshold Check

| 대안  | 기술  | 유지보수 | 마이그레이션 | 판정        |
| ----- | ----- | -------- | ------------ | ----------- |
| A     | L     | **H**    | L            | 장기 부적합 |
| **B** | M     | **L**    | M            | **채택**    |
| C     | **H** | L        | **H**        | 과잉 복잡   |

---

## Decision

**ComponentSpec에 `properties` 필드를 추가하여 프로퍼티 에디터 UI를 선언적으로 정의하고, GenericPropertyEditor가 이를 동적으로 렌더링한다.**

### Rationale

> 107개 에디터 중 80% 이상이 5가지 필드 타입(variant, size, boolean, enum, string)의 조합이다. 이 패턴은 Spec의 `variants`/`sizes` + Props 인터페이스에서 완전히 유도 가능하다. 나머지 20%의 커스텀 로직(deep child sync, 조건부 표시, 특수 위젯)은 schema의 확장 필드로 처리한다.

**ADR-036과의 관계 — Spec이 4중 단일 소스로 확장:**

```
ComponentSpec (단일 소스)
  ├── shapes()        → Skia 캔버스 렌더링
  ├── variants/sizes  → CSS 자동 생성 (ADR-036)
  ├── properties      → 프로퍼티 에디터 자동 생성 (ADR-041)
  └── react/pixi      → DOM/PixiJS 속성
```

---

## Design

### PropertySchema 타입

```typescript
interface ComponentSpec<Props> {
  // ... 기존 (name, variants, sizes, states, render)
  properties?: PropertySchema;
}

interface PropertySchema {
  sections: SectionDef[];
}

interface SectionDef {
  title: string; // "Design", "Content", "Behavior"
  fields: FieldDef[];
  visibleWhen?: VisibilityCondition; // 섹션 전체 조건부 표시
}
```

### FieldDef 유니온 타입

```typescript
type FieldDef =
  | VariantField
  | SizeField
  | BooleanField
  | EnumField
  | StringField
  | NumberField
  | IconField
  | CustomField
  | ChildSyncField;

// variant — Spec.variants에서 옵션 자동 추출
interface VariantField {
  key: string; // "variant"
  type: "variant";
  label?: string; // 미지정 시 "Variant"
}

// size — Spec.sizes에서 scale 자동 결정
interface SizeField {
  key: string; // "size"
  type: "size";
  label?: string;
}

// boolean — PropertySwitch
interface BooleanField {
  key: string; // "isDisabled"
  type: "boolean";
  label?: string; // 미지정 시 key에서 유추 ("Disabled")
  visibleWhen?: VisibilityCondition;
}

// enum — PropertySelect
interface EnumField {
  key: string; // "fillStyle"
  type: "enum";
  options: Array<{ value: string; label: string }>;
  label?: string;
  visibleWhen?: VisibilityCondition;
}

// string — PropertyInput
interface StringField {
  key: string; // "children"
  type: "string";
  label?: string;
  placeholder?: string;
  multiline?: boolean;
}

// number — PropertyInput type="number"
interface NumberField {
  key: string; // "iconStrokeWidth"
  type: "number";
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

// icon — PropertyIconPicker
interface IconField {
  key: string; // "iconName"
  type: "icon";
  label?: string;
}

// custom — 수동 컴포넌트 참조
interface CustomField {
  key: string;
  type: "custom";
  component: string; // "ColorPickerField", "ImageUploader" 등
}

// childSync — 부모 prop 변경 시 자식 자동 동기화
interface ChildSyncField {
  key: string; // "children" (부모 prop)
  type: "string"; // 기본 UI 타입
  label?: string;
  childSync: {
    path: string[]; // ["CardHeader", "Heading"] — 자식 트리 경로
    propKey: string; // "children" — 동기화할 자식 prop
  };
}

// 조건부 표시
interface VisibilityCondition {
  key: string; // 참조할 prop
  isNotEmpty?: boolean; // truthy 체크
  equals?: unknown; // 특정 값 비교
  notEquals?: unknown;
}
```

### 적용 예시: ButtonSpec

```typescript
export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: "Button",
  variants: { accent: {...}, primary: {...}, secondary: {...}, negative: {...} },
  sizes: { xs: {...}, sm: {...}, md: {...}, lg: {...}, xl: {...} },
  // ...

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          { key: "children", type: "string", label: "Label", placeholder: "Button text" },
          { key: "iconName", type: "icon" },
          { key: "iconPosition", type: "enum", label: "Icon Position",
            options: [{ value: "start", label: "Start" }, { value: "end", label: "End" }],
            visibleWhen: { key: "iconName", isNotEmpty: true } },
        ],
      },
      {
        title: "Design",
        fields: [
          { key: "variant", type: "variant" },
          { key: "fillStyle", type: "enum", label: "Fill Style",
            options: [{ value: "fill", label: "Fill" }, { value: "outline", label: "Outline" }] },
          { key: "size", type: "size" },
        ],
      },
      {
        title: "Behavior",
        fields: [
          { key: "isDisabled", type: "boolean", label: "Disabled" },
          { key: "isPending", type: "boolean", label: "Loading" },
        ],
      },
    ],
  },
};
```

### 적용 예시: SwitchSpec (childSync)

```typescript
export const SwitchSpec: ComponentSpec<SwitchProps> = {
  // ...
  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Label",
            childSync: { path: ["Label"], propKey: "children" },
          },
        ],
      },
      {
        title: "Design",
        fields: [
          { key: "size", type: "size" },
          { key: "isEmphasized", type: "boolean", label: "Emphasized" },
        ],
      },
      {
        title: "Behavior",
        fields: [
          { key: "isSelected", type: "boolean", label: "Selected" },
          { key: "isDisabled", type: "boolean", label: "Disabled" },
          { key: "isReadOnly", type: "boolean", label: "Read Only" },
        ],
      },
    ],
  },
};
```

### GenericPropertyEditor 구현

```typescript
function GenericPropertyEditor({ elementId, currentProps, onUpdate, spec }: Props) {
  const { buildChildUpdates } = useSyncChildProp(elementId);

  const handleFieldChange = useCallback((field: FieldDef, value: unknown) => {
    const updatedProps = { [field.key]: value };

    // childSync 처리
    if ('childSync' in field && field.childSync) {
      const childUpdates = buildChildUpdates([{
        childTag: field.childSync.path[field.childSync.path.length - 1],
        propKey: field.childSync.propKey,
        value,
      }]);
      useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    } else {
      onUpdate(updatedProps);
    }
  }, [onUpdate, buildChildUpdates]);

  return (
    <>
      {spec.properties.sections
        .filter(section => evaluateVisibility(section.visibleWhen, currentProps))
        .map(section => (
          <PropertySection key={section.title} title={section.title}>
            {section.fields
              .filter(field => evaluateVisibility(field.visibleWhen, currentProps))
              .map(field => (
                <SpecField
                  key={field.key}
                  field={field}
                  spec={spec}
                  value={currentProps[field.key]}
                  onChange={(v) => handleFieldChange(field, v)}
                />
              ))}
          </PropertySection>
        ))}
    </>
  );
}
```

### SpecField 렌더링

```typescript
function SpecField({ field, spec, value, onChange }: SpecFieldProps) {
  switch (field.type) {
    case "variant":
      return (
        <PropertySelect
          label={field.label ?? "Variant"}
          value={String(value ?? spec.defaultVariant)}
          onChange={onChange}
          options={Object.keys(spec.variants).map(k => ({ value: k, label: capitalize(k) }))}
        />
      );

    case "size":
      const sizeKeys = Object.keys(spec.sizes);
      return (
        <PropertySizeToggle
          label={field.label ?? "Size"}
          value={String(value ?? spec.defaultSize)}
          onChange={onChange}
          scale={String(sizeKeys.length) as "3" | "5"}
          options={sizeKeys.map(k => ({ id: k, label: k.toUpperCase() }))}
        />
      );

    case "boolean":
      return (
        <PropertySwitch
          label={field.label ?? inferLabel(field.key)}
          isSelected={Boolean(value)}
          onChange={onChange}
        />
      );

    case "enum":
      return (
        <PropertySelect
          label={field.label ?? inferLabel(field.key)}
          value={String(value ?? field.options[0]?.value)}
          onChange={onChange}
          options={field.options}
        />
      );

    case "string":
      return (
        <PropertyInput
          label={field.label ?? inferLabel(field.key)}
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={field.placeholder}
          multiline={field.multiline}
        />
      );

    case "number":
      return (
        <PropertyInput
          label={field.label ?? inferLabel(field.key)}
          value={value ?? field.min ?? 0}
          onChange={(v) => onChange(Number(v))}
          type="number"
          min={field.min}
          max={field.max}
        />
      );

    case "icon":
      return <PropertyIconPicker label={field.label ?? "Icon"} value={value} onChange={onChange} />;

    case "custom":
      return <CustomFieldRenderer component={field.component} value={value} onChange={onChange} />;
  }
}
```

### 에디터 레지스트리 변경

```typescript
// registry.ts — 변경
export async function getEditor(type: string, context?: EditorContext) {
  const metadata = getComponentMeta(type);

  // 1. 커스텀 에디터가 있으면 기존 방식
  if (metadata?.inspector.hasCustomEditor) {
    return importEditor(metadata.inspector.editorName);
  }

  // 2. Spec에 properties가 있으면 GenericPropertyEditor 사용
  const spec = getSpecByTag(type);
  if (spec?.properties) {
    return (props: PropertyEditorProps) => (
      <GenericPropertyEditor {...props} spec={spec} />
    );
  }

  return null;
}
```

---

## Gates

| 게이트 | 조건                                                                                      | 위험 등급 |
| ------ | ----------------------------------------------------------------------------------------- | --------- |
| G0     | PropertySchema 타입 추가 후 `pnpm type-check` 통과                                        | L         |
| G1     | ButtonSpec에 properties 추가 → GenericPropertyEditor 렌더링 → 기존 ButtonEditor와 동일 UI | M         |
| G2     | 등급 A (단순 에디터) 10개 전환 후 기능 동일 확인                                          | M         |
| G3     | childSync 패턴: SwitchSpec properties → Label 자식 동기화 정상                            | M         |
| G4     | visibleWhen: iconPosition이 iconName 존재 시에만 표시                                     | L         |
| G5     | 성능: GenericPropertyEditor의 리렌더 횟수 ≤ 기존 에디터                                   | M         |

---

## Implementation

### Phase 0-pre: 103개 에디터 전수 조사 (코드베이스 실측 2026-03-16)

에디터 디렉토리 전수 조사 결과, **103개** 에디터 파일이 존재하며 아래와 같이 분류된다.

**등급 분류 요약**:

|     등급     |  개수  | 비율  | 조건                                                 |                 전환 대상                 |
| :----------: | :----: | :---: | ---------------------------------------------------- | :---------------------------------------: |
| **A (단순)** | **75** | 72.8% | Select/Switch/Input/Size/Icon만 사용, childSync 없음 |         ✅ GenericPropertyEditor          |
| **B (중간)** | **8**  | 7.8%  | childSync(부모→자식 동기화) 또는 visibleWhen 필요    | ✅ GenericPropertyEditor + ChildSyncField |
| **C (복잡)** | **20** | 19.4% | Collection 관리, DataBinding, Table 특수 UI          |               ❌ 수동 유지                |

**등급 B 대상 (8개 — childSync 패턴 사용)**:

| 에디터                | 줄수 | childSync 대상                    |
| --------------------- | :--: | --------------------------------- |
| CardEditor.tsx        | 541  | CardHeader → Heading, Description |
| TextFieldEditor.tsx   | 539  | Label, Description, ErrorMessage  |
| CheckboxEditor.tsx    | 352  | Label                             |
| SwitchEditor.tsx      | 325  | Label                             |
| NumberFieldEditor.tsx | 299  | Label, Description, ErrorMessage  |
| SliderEditor.tsx      | 247  | Label                             |
| SearchFieldEditor.tsx | 203  | Label, Description                |
| RadioEditor.tsx       | 124  | Label                             |

**등급 C 대상 (20개 — 수동 유지)**:

| 에디터                      | 줄수 | 수동 유지 이유                    |
| --------------------------- | :--: | --------------------------------- |
| TableEditor.tsx             | 832  | 행/열 동적 추가/삭제, DataBinding |
| ListBoxEditor.tsx           | 788  | ListBoxItem 컬렉션 관리           |
| SelectEditor.tsx            | 703  | SelectItem 컬렉션 + DataBinding   |
| ComboBoxEditor.tsx          | 685  | ComboBoxItem 컬렉션 + DataBinding |
| RadioGroupEditor.tsx        | 604  | Radio 옵션 동적 관리              |
| ButtonEditor.tsx            | 544  | Icon + Link + Form 속성 혼합      |
| TagGroupEditor.tsx          | 469  | Tag 항목 동적 관리                |
| TabsEditor.tsx              | 467  | Tab panel 동적 관리               |
| CheckboxGroupEditor.tsx     | 444  | Checkbox 항목 동적 관리           |
| GridListEditor.tsx          | 433  | GridListItem + DataBinding        |
| ToggleButtonGroupEditor.tsx | 425  | ToggleButton 항목 관리            |
| TableHeaderEditor.tsx       | 358  | Table header 컬럼 정의            |
| ListBoxItemEditor.tsx       | 303  | ListBoxItem 세부 속성             |
| TreeEditor.tsx              | 253  | Tree 재귀 구조 관리               |
| TreeItemEditor.tsx          | 189  | TreeItem 세부 속성                |
| SlotEditor.tsx              | 175  | 복합 상태 로직                    |
| ColumnEditor.tsx            | 164  | Table 컬럼 정의                   |
| TableBodyEditor.tsx         | 155  | Table body 관리                   |
| RowEditor.tsx               | 145  | Table row 관리                    |
| CellEditor.tsx              | 130  | Table cell 관리                   |

**필드 타입 사용 통계** (전체 에디터):

| 필드 컴포넌트      | 총 사용 횟수 | 평균/에디터 |
| ------------------ | :----------: | :---------: |
| PropertyInput      |     ~412     |     4.0     |
| PropertySwitch     |     ~324     |     3.1     |
| PropertySelect     |     ~218     |     2.1     |
| PropertySizeToggle |     ~81      |     0.8     |
| PropertyIconPicker |      ~6      |     0.1     |

> **핵심 발견**: 커스텀 위젯(ColorPicker, ImageUploader 등)을 사용하는 에디터가 **0개**. 등급 C의 복잡성은 커스텀 위젯이 아닌 **컬렉션 항목 동적 관리** 로직에서 발생한다.

### Phase 의존성 그래프

```
Phase 0-pre (103개 에디터 전수 조사)  [완료]
  ↓
Phase 0 (PropertySchema 타입 정의)  [Gate G0]
  ↓
Phase 1 (GenericPropertyEditor + SpecField + CustomFieldRenderer)  [Gate G1]
  ↓
Phase 2 (등급 A 에디터 전환 — 75개)  [Gate G2]
  ↓
Phase 3 (등급 B 에디터 전환 — childSync 8개)  [Gate G3, G4]
  ↓
Phase 4 (기존 에디터 파일 정리 + 롤백 체계)  [Gate G5]
```

### Phase 0: PropertySchema 타입 정의

`packages/specs/src/types/spec.types.ts`에 PropertySchema, SectionDef, FieldDef 타입 추가.
ComponentSpec 인터페이스에 `properties?: PropertySchema` 필드 추가.

### Phase 1: GenericPropertyEditor 구현

- `GenericPropertyEditor.tsx` — schema 기반 동적 렌더링
- `SpecField.tsx` — 필드 타입별 UI 매핑 (variant, size, boolean, enum, string, number, icon)
- `evaluateVisibility()` — 조건부 표시 평가
- `CustomFieldRenderer.tsx` — 커스텀 위젯 등록/해석 메커니즘
- 성능 최적화: 필드별 onChange를 useCallback으로 메모이제이션

#### CustomFieldRenderer 등록 메커니즘

```typescript
// customFieldRegistry.ts
type CustomFieldComponent = React.ComponentType<{
  value: unknown;
  onChange: (value: unknown) => void;
  fieldDef: CustomField;
}>;

const registry = new Map<string, CustomFieldComponent>();

export function registerCustomField(name: string, component: CustomFieldComponent) {
  registry.set(name, component);
}

export function getCustomField(name: string): CustomFieldComponent | undefined {
  return registry.get(name);
}

// CustomFieldRenderer.tsx
function CustomFieldRenderer({ component, value, onChange, fieldDef }: Props) {
  const Component = getCustomField(component);
  if (!Component) {
    console.warn(`Custom field "${component}" not registered`);
    return null;
  }
  return <Component value={value} onChange={onChange} fieldDef={fieldDef} />;
}
```

### Phase 2: 등급 A 에디터 전환 (75개)

variant + size + boolean + enum + string만으로 구성된 단순 에디터를 우선 전환.

**전환 방법 (안전한 롤백)**:

```
1. {Component}Spec에 properties 추가
2. registry.ts에서 Spec properties 우선 확인 분기 추가
3. 기존 {Component}Editor.tsx와 동작 비교 (시각 검증)
4. 검증 통과 → metadata에서 hasCustomEditor: false 변경
5. 실패 시 → registry.ts 분기만 되돌리면 즉시 롤백
6. 최종 확인 후 기존 에디터 파일 삭제
```

**배치 순서** (의존성 없는 것부터):

| 배치 | 대상 수 | 대표 에디터                                                                                                                                                     |
| :--: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   |   ~15   | Badge, Separator, StatusLight, Avatar, Skeleton, Tooltip, Meter, ProgressBar, ProgressCircle, Icon, ColorSwatch, Breadcrumbs, Link, InlineAlert, ContextualHelp |
|  2   |   ~20   | Disclosure, Form, Panel, Group, Pagination, Popover, Dialog, Toast, Calendar, DateField, TimeField                                                              |
|  3   |   ~20   | ColorSlider, ColorArea, ColorWheel, ColorField, ScrollBox, DropZone, FileTrigger, MaskedFrame, Nav                                                              |
|  4   |   ~20   | 나머지 단순 에디터                                                                                                                                              |

### Phase 3: 등급 B 에디터 전환 (8개)

childSync 패턴이 필요한 에디터. GenericPropertyEditor의 ChildSyncField를 통해 처리.

**전환 대상**:

| 에디터            | childSync 대상                          | 예시 properties                                                                            |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| SwitchEditor      | Label                                   | `{ key: "children", type: "string", childSync: { path: ["Label"], propKey: "children" } }` |
| CheckboxEditor    | Label                                   | 동일 패턴                                                                                  |
| RadioEditor       | Label                                   | 동일 패턴                                                                                  |
| SliderEditor      | Label                                   | 동일 패턴                                                                                  |
| TextFieldEditor   | Label + Description + ErrorMessage      | 3개 childSync 필드                                                                         |
| NumberFieldEditor | Label + Description + ErrorMessage      | 3개 childSync 필드                                                                         |
| SearchFieldEditor | Label + Description                     | 2개 childSync 필드                                                                         |
| CardEditor        | Heading + Description (CardHeader 중첩) | `{ path: ["CardHeader", "Heading"], propKey: "children" }`                                 |

### Phase 4: 기존 에디터 파일 정리 + 에디터 레지스트리 전환 전략

#### 에디터 레지스트리 전환 전략

**공존 기간 관리**: registry.ts에서 Spec properties 확인 → 있으면 GenericPropertyEditor, 없으면 기존 lazy import 유지.

```typescript
// registry.ts — 전환 기간 하이브리드 로직
export async function getEditor(type: string) {
  // 1단계: Spec.properties 확인 (GenericPropertyEditor)
  const spec = getSpecByTag(type);
  if (spec?.properties) {
    return (props: PropertyEditorProps) => (
      <GenericPropertyEditor {...props} spec={spec} />
    );
  }

  // 2단계: 기존 커스텀 에디터 (lazy import, 등급 C)
  const metadata = getComponentMeta(type);
  if (metadata?.inspector.hasCustomEditor) {
    return importEditor(metadata.inspector.editorName);
  }

  return null;
}
```

**롤백 전략**:

| 상황                            | 조치                                                                     | 영향 범위    |
| ------------------------------- | ------------------------------------------------------------------------ | ------------ |
| 개별 에디터 동작 오류           | Spec에서 `properties` 필드 제거 → registry가 기존 에디터로 폴백          | 1개 컴포넌트 |
| GenericPropertyEditor 근본 결함 | registry.ts에서 Spec properties 분기 주석 처리 → 모든 에디터가 기존 방식 | 전체         |
| childSync 오류                  | 해당 Spec의 childSync 필드만 제거 → 일반 string 필드로 폴백              | 1개 필드     |

**최종 정리**:

- 전환 완료된 에디터 파일은 `editors/_deprecated/`로 이동 (즉시 삭제 금지)
- 2주간 운영 검증 후 삭제
- 수동 에디터 잔존: 등급 C 20개

### 적용 예시: SelectEditor (등급 C — 하이브리드 접근)

등급 C 에디터도 **Design/Behavior 섹션은 GenericPropertyEditor**, **Content 섹션(컬렉션 관리)만 수동 유지**하는 하이브리드가 가능하다:

```typescript
// SelectEditor.tsx — 하이브리드 예시
function SelectEditor({ elementId, currentProps, onUpdate }: Props) {
  return (
    <>
      {/* Content 섹션: 수동 유지 (SelectItem 컬렉션 동적 관리) */}
      <PropertySection title="Content">
        <SelectItemManager elementId={elementId} />
      </PropertySection>

      {/* Design/Behavior 섹션: Spec properties에서 자동 생성 */}
      <GenericPropertyEditor
        elementId={elementId}
        currentProps={currentProps}
        onUpdate={onUpdate}
        spec={SelectSpec}
        excludeSections={["Content"]} // Content 섹션 제외
      />
    </>
  );
}
```

이 하이브리드 패턴으로 등급 C 20개 에디터도 **50~70% 코드를 자동 생성**할 수 있다.

### 적용 예시: CardEditor (등급 B — 중첩 childSync)

```typescript
// CardSpec.properties
properties: {
  sections: [
    {
      title: "Content",
      fields: [
        {
          key: "heading",
          type: "string",
          label: "Heading",
          childSync: {
            path: ["CardHeader", "Heading"],
            propKey: "children",
          },
        },
        {
          key: "description",
          type: "string",
          label: "Description",
          multiline: true,
          childSync: {
            path: ["CardHeader", "Description"],
            propKey: "children",
          },
        },
      ],
    },
    {
      title: "Design",
      fields: [
        { key: "variant", type: "variant" },
        { key: "size", type: "size" },
        {
          key: "orientation",
          type: "enum",
          label: "Orientation",
          options: [
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
          ],
        },
      ],
    },
    {
      title: "Behavior",
      fields: [
        { key: "isDisabled", type: "boolean", label: "Disabled" },
        { key: "isSelectable", type: "boolean", label: "Selectable" },
      ],
    },
  ],
}
```

### 적용 예시: DatePickerEditor (등급 A — 복잡해 보이지만 단순)

```typescript
// DatePickerSpec.properties
properties: {
  sections: [
    {
      title: "Content",
      fields: [
        { key: "label", type: "string", label: "Label" },
        { key: "description", type: "string", label: "Description" },
        { key: "errorMessage", type: "string", label: "Error Message" },
      ],
    },
    {
      title: "Design",
      fields: [
        { key: "variant", type: "variant" },
        { key: "size", type: "size" },
        {
          key: "granularity",
          type: "enum",
          label: "Granularity",
          options: [
            { value: "day", label: "Day" },
            { value: "hour", label: "Hour" },
            { value: "minute", label: "Minute" },
            { value: "second", label: "Second" },
          ],
        },
      ],
    },
    {
      title: "Behavior",
      fields: [
        { key: "isDisabled", type: "boolean", label: "Disabled" },
        { key: "isReadOnly", type: "boolean", label: "Read Only" },
        { key: "isRequired", type: "boolean", label: "Required" },
        { key: "hideTimeZone", type: "boolean", label: "Hide Time Zone" },
      ],
    },
  ],
}

---

## Metrics / Verification

| 메트릭 | Baseline (실측) | Phase 2 (A 전환) | Phase 3 (B 전환) | Phase 4 (정리) |
|--------|:-:|:-:|:-:|:-:|
| 개별 에디터 파일 | **103개** | ~28개 | ~**20개** | ~**20개** (등급 C) |
| 자동 생성 에디터 | 0개 | 75개 | 83개 | **83개** |
| 신규 컴포넌트 시 | 4개 (Spec+CSS+Editor+Meta) | 3개 | **1개** (Spec만) | **1개** |
| variant 추가 시 | 2곳 (Spec+Editor) | 1곳 | **1곳** (Spec만) | **1곳** |
| 자동화율 | 0% | 72.8% | 80.6% | **80.6%** |

> **산정 기준**: 103개 전체 에디터 중 GenericPropertyEditor 전환 대상 83개(등급 A 75 + 등급 B 8). 등급 C 20개는 수동 유지 (하이브리드 적용 시 코드량 50~70% 감소 가능).

검증:

- [ ] `pnpm type-check` — PropertySchema 타입 에러 0건
- [ ] GenericPropertyEditor 렌더링 성능: React DevTools Profiler로 기존 대비 리렌더 횟수 동등 확인
- [ ] 전환된 에디터: 모든 필드 변경 → Canvas + Preview 동시 반영
- [ ] childSync: 부모 prop 변경 → 자식 prop 동기화 정상 (Switch Label, Card Heading)
- [ ] visibleWhen: 조건부 필드 표시/숨김 정상 (Button iconPosition → iconName 의존)
- [ ] Undo/Redo: 히스토리 기록 정상 (GenericPropertyEditor의 onUpdate 경로)
- [ ] 롤백: Spec properties 제거 → 기존 에디터로 즉시 복원 확인

---

## Consequences

### Positive

1. **Spec 4중 단일 소스**: Skia 렌더링 + CSS(ADR-036) + Editor UI + DOM 속성
2. **에디터 파일 80% 자동화**: 103개 → 83개 자동 + 20개 수동 (하이브리드로 코드량 추가 감소 가능)
3. **새 컴포넌트 추가 비용 감소**: Spec 1개 파일에 properties 추가하면 에디터 자동 생성
4. **variant/size 추가 시 자동 반영**: Spec.variants에 키 추가 → 에디터 옵션 자동 확장
5. **일관된 UI**: 모든 에디터가 동일한 섹션 구조/스타일 보장
6. **등급 C 하이브리드**: 수동 유지 에디터도 Design/Behavior 섹션은 자동 생성 가능 → 코드량 50~70% 절감

### Negative

1. **PropertySchema 설계 투자**: FieldDef 유니온 8개 타입 + visibility + childSync 구현
2. **CustomFieldRenderer 등록 체계**: 향후 커스텀 위젯 필요 시 registry 패턴 구축
3. **기존 에디터 마이그레이션 작업**: 83개 Spec에 properties 추가 (등급 A는 기계적 작업)
4. **디버깅 간접성**: 에디터 문제 시 Schema → GenericEditor → SpecField 체인 추적
5. **등급 C 하이브리드 복잡성**: 일부 섹션만 자동 + 나머지 수동 → 하이브리드 경계 관리 필요

---

## References

- `apps/builder/src/builder/panels/properties/editors/` — 기존 107개 에디터
- `apps/builder/src/builder/inspector/editors/registry.ts` — 에디터 동적 로딩
- `apps/builder/src/builder/components/property/` — PropertyInput/Select/Switch/SizeToggle
- `packages/specs/src/types/spec.types.ts` — ComponentSpec 타입 정의
- `packages/shared/src/components/metadata.ts` — 컴포넌트 메타데이터
- [ADR-036](completed/036-spec-first-single-source.md) — Spec-First Single Source (CSS 자동 생성)
```
