# ADR-041: Spec-Driven Property Editor — Spec 기반 프로퍼티 에디터 자동 생성

## Status

Proposed

## Date

2026-03-13

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-036](036-spec-first-single-source.md): Spec-First Single Source (CSS 자동 생성)

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

### Phase 의존성 그래프

```
Phase 0 (PropertySchema 타입 정의)
  ↓
Phase 1 (GenericPropertyEditor + SpecField 구현)
  ↓
Phase 2 (등급 A 에디터 전환 — 단순 컴포넌트 ~50개)
  ↓
Phase 3 (등급 B 에디터 전환 — childSync/visibleWhen ~40개)
  ↓
Phase 4 (기존 에디터 파일 정리)
```

### Phase 0: PropertySchema 타입 정의

`packages/specs/src/types/spec.types.ts`에 PropertySchema, SectionDef, FieldDef 타입 추가.
ComponentSpec 인터페이스에 `properties?: PropertySchema` 필드 추가.

### Phase 1: GenericPropertyEditor 구현

- `GenericPropertyEditor.tsx` — schema 기반 동적 렌더링
- `SpecField.tsx` — 필드 타입별 UI 매핑
- `evaluateVisibility()` — 조건부 표시 평가
- 성능 최적화: 필드별 onChange를 useCallback으로 메모이제이션

### Phase 2: 등급 A 에디터 전환 (~50개)

variant + size + boolean만으로 구성된 단순 에디터를 우선 전환.

대상: Badge, Separator, StatusLight, Avatar, Divider, Skeleton, Tooltip, IllustratedMessage, InlineAlert, ContextualHelp, ColorSwatch, Chip, Meter, ProgressBar, ProgressCircle 등

전환 방법:

```
1. {Component}Spec에 properties 추가
2. metadata에서 hasCustomEditor: false로 변경
3. 기존 {Component}Editor.tsx와 동작 비교
4. 통과 → 기존 에디터 파일 삭제
```

### Phase 3: 등급 B 에디터 전환 (~40개)

childSync, visibleWhen, enum 필드가 필요한 에디터.

대상: Button, Switch, Checkbox, Radio, TextField, NumberField, Select, ComboBox, Tabs, Card, Calendar 등

### Phase 4: 기존 에디터 파일 정리

- 전환 완료된 에디터 파일 삭제
- registry.ts에서 Spec properties 우선 로딩으로 변경
- 수동 에디터 잔존: Table, ColorPicker 등 (~10개)

---

## Metrics / Verification

| 메트릭                          | 현재                       | Phase 2 | Phase 3          |
| ------------------------------- | -------------------------- | ------- | ---------------- |
| 개별 에디터 파일                | 107개                      | ~57개   | ~**10개**        |
| 신규 컴포넌트 추가 시 생성 파일 | 4개 (Spec+CSS+Editor+Meta) | 3개     | **1개** (Spec만) |
| variant 추가 시 수정            | 2곳 (Spec+Editor)          | 1곳     | **1곳** (Spec만) |

검증:

- [ ] GenericPropertyEditor 렌더링 성능: 기존 대비 리렌더 횟수 동등
- [ ] 전환된 에디터: 모든 필드 변경 → Canvas + Preview 동시 반영
- [ ] childSync: 부모 prop 변경 → 자식 prop 동기화 정상
- [ ] visibleWhen: 조건부 필드 표시/숨김 정상
- [ ] Undo/Redo: 히스토리 기록 정상

---

## Consequences

### Positive

1. **Spec 4중 단일 소스**: Skia 렌더링 + CSS(ADR-036) + Editor UI + DOM 속성
2. **에디터 파일 90% 감소**: 107개 → ~10개 (커스텀만 잔존)
3. **새 컴포넌트 추가 비용 감소**: Spec 1개 파일에 properties 추가하면 에디터 자동 생성
4. **variant/size 추가 시 자동 반영**: Spec.variants에 키 추가 → 에디터 옵션 자동 확장
5. **일관된 UI**: 모든 에디터가 동일한 섹션 구조/스타일 보장

### Negative

1. **PropertySchema 설계 투자**: FieldDef 유니온 + visibility + childSync 구현
2. **커스텀 위젯 확장 체계 필요**: ColorPicker, ImageUploader 등 특수 UI
3. **기존 에디터 마이그레이션 작업**: 107개 Spec에 properties 추가
4. **디버깅 간접성**: 에디터 문제 시 Schema → GenericEditor → SpecField 체인 추적

---

## References

- `apps/builder/src/builder/panels/properties/editors/` — 기존 107개 에디터
- `apps/builder/src/builder/inspector/editors/registry.ts` — 에디터 동적 로딩
- `apps/builder/src/builder/components/property/` — PropertyInput/Select/Switch/SizeToggle
- `packages/specs/src/types/spec.types.ts` — ComponentSpec 타입 정의
- `packages/shared/src/components/metadata.ts` — 컴포넌트 메타데이터
- [ADR-036](036-spec-first-single-source.md) — Spec-First Single Source (CSS 자동 생성)
