# ADR-052 구현 분해: S2 Props API 정합성 마이그레이션

> 상위 결정: [ADR-052](../adr/052-s2-props-api-alignment.md)

## 변경 패턴 분류

| 패턴               | 설명                        |   Phase   |
| ------------------ | --------------------------- | :-------: |
| A. 이름만 변경     | 기능 동일, S2 네이밍 통일   |     1     |
| B. 기능 통합       | 여러 props → 하나의 S2 prop |     2     |
| C. 기능 변경       | S2에서 의미/타입이 바뀜     |     3     |
| ~~D. 구조 재설계~~ | ~~TableView 이벤트 모델~~   | 범위 제외 |

## Phase 1: 패턴 A — 이름만 변경 (4건)

### 대상

| 컴포넌트        | 현재            | S2                 | 변경 유형           |
| --------------- | --------------- | ------------------ | ------------------- |
| Dialog          | `isDismissable` | `isDismissible`    | 철자 수정           |
| DatePicker      | `visibleMonths` | `maxVisibleMonths` | 이름 변경           |
| DateRangePicker | `visibleMonths` | `maxVisibleMonths` | 이름 변경           |
| Popover         | `showArrow`     | `hideArrow`        | 이름 + boolean 반전 |

### 실제 참조 범위 (Codex 리뷰 반영)

**Dialog.isDismissable → isDismissible**:

- `packages/specs/src/components/Dialog.spec.ts` — interface + field + shapes
- `packages/shared/src/components/Dialog.tsx:39,45,61` — prop 정의 + 사용
- `packages/shared/src/renderers/LayoutRenderers.tsx:773` — `element.props.isDismissable`
- `apps/builder/src/builder/factories/definitions/OverlayComponents.ts:33` — **이미 `isDismissible` 저장** (불일치 선행 존재)

> **주의**: factory는 이미 S2 철자(`isDismissible`)를 사용하나, 나머지는 구 철자(`isDismissable`). 이 불일치를 Phase 1에서 `isDismissible`로 통일.

**DatePicker.visibleMonths → maxVisibleMonths**:

- `packages/specs/src/components/DatePicker.spec.ts` — interface + field + propagation
- `packages/shared/src/components/DatePicker.tsx:88,122,242,243,261` — prop 정의 + Calendar 전달
- `packages/shared/src/renderers/DateRenderers.tsx:83,108` — `element.props.visibleMonths`
- `packages/shared/src/components/Calendar.tsx:48,64,111,123` — 내부 prop (Calendar 자체도 변경 필요)
- `packages/shared/src/components/RangeCalendar.tsx:35,50,90,102` — 동일

**DateRangePicker.visibleMonths → maxVisibleMonths**:

- `packages/specs/src/components/DateRangePicker.spec.ts` — interface + field + propagation
- `packages/shared/src/components/DateRangePicker.tsx:74,108,228,229,247` — prop 정의 + Calendar 전달
- `packages/shared/src/renderers/DateRenderers.tsx:207-209` — `element.props.visibleMonths`

**Popover.showArrow → hideArrow**:

- `packages/specs/src/components/Popover.spec.ts` — interface (field 없음)
- `packages/shared/src/components/Popover.tsx:24,75,87` — prop 정의 + 조건부 렌더링
- boolean 반전: `showArrow={true}` → `hideArrow={false}` (기본값 변경)

### 변경 체크리스트 (prop별)

1. Spec Props 인터페이스 필드명 변경
2. Spec `properties.sections.fields` key 변경
3. Spec `render.shapes()` 내부 `props.X` 참조 변경
4. Spec propagation rules `parentProp`/`childProp` 변경
5. shared 컴포넌트 prop 정의 + 사용처 변경
6. renderer `element.props.X` 참조 변경
7. factory 초기값 키 변경
8. preview 컴포넌트 (해당 시)
9. canvas layout utils (해당 시)
10. defaultValue 확인
11. type-check + build 통과

### 데이터 normalization

기존 저장 데이터에 `isDismissable`, `visibleMonths`, `showArrow`가 있을 수 있으므로:

```typescript
// 런타임 normalization (로드 시 1회)
if ("isDismissable" in props && !("isDismissible" in props)) {
  props.isDismissible = props.isDismissable;
  delete props.isDismissable;
}
if ("visibleMonths" in props && !("maxVisibleMonths" in props)) {
  props.maxVisibleMonths = props.visibleMonths;
  delete props.visibleMonths;
}
if ("showArrow" in props && !("hideArrow" in props)) {
  props.hideArrow = !props.showArrow;
  delete props.showArrow;
}
```

## Phase 2: 패턴 B — 기능 통합 (4컴포넌트, -7 props)

### 대상

| 컴포넌트    | 제거 props                                                                                                        | 통합 대상                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| NumberField | formatStyle, currency, notation, decimals, minimumFractionDigits, maximumFractionDigits, showGroupSeparator (7개) | `formatOptions: Intl.NumberFormatOptions` |
| Meter       | valueFormat (1개)                                                                                                 | `formatOptions`                           |
| ProgressBar | valueFormat (1개)                                                                                                 | `formatOptions`                           |
| Slider      | valueFormat, unit (2개)                                                                                           | `formatOptions`                           |

### 현재 상태 (Codex 리뷰 반영)

NumberField.tsx는 **이미 formatOptions를 내부 지원** 중:

```typescript
// packages/shared/src/components/NumberField.tsx:81
formatOptions?: Intl.NumberFormatOptions;

// 내부에서 개별 props → formatOptions 합성
const formatOptions = { style: formatStyle, ... };
Object.assign(formatOptions, formatOptionsOverride);
```

따라서 Phase 2는 **"신규 도입"이 아니라 "이중 계약 정리"**:

1. Spec Props에서 개별 props 제거, `formatOptions`만 유지
2. Spec properties.fields에서 개별 field 제거, formatOptions 서브필드 에디터로 대체
3. shared 컴포넌트에서 개별 props 인터페이스 제거 (내부 합성 로직도 제거)
4. 기존 데이터 normalization: 개별 props → formatOptions 변환

### 참조 범위

**NumberField**:

- `packages/specs/src/components/NumberField.spec.ts` — interface + 7개 field
- `packages/shared/src/components/NumberField.tsx:49-81` — 개별 props + formatOptions
- `packages/shared/src/renderers/FormRenderers.tsx:206` — element.props 전달
- `apps/builder/src/types/builder/unified.types.ts:855` — 타입 정의

**Meter/ProgressBar/Slider**:

- 각 Spec의 `valueFormat` field + Props
- `render.shapes()` 내부에서 `props.valueFormat` 참조 (Meter, ProgressBar)
- shared 컴포넌트 내부 formatOptions 전달

### 프로퍼티 패널 UI

`FormatOptionsEditor` 커스텀 필드 컴포넌트:

```
[Style    ▾ decimal ]
[Currency ▾ KRW     ]  ← style="currency" 일 때만 표시
[Unit     ___       ]  ← style="unit" 일 때만 표시
[Notation ▾ standard]
[Min Digits  ___    ]
[Max Digits  ___    ]
[Group Sep   ☐     ]
```

### 데이터 normalization

```typescript
function normalizeFormatProps(props) {
  if (props.formatStyle && !props.formatOptions) {
    props.formatOptions = {
      style: props.formatStyle,
      currency: props.currency,
      notation: props.notation,
      minimumFractionDigits: props.decimals ?? props.minimumFractionDigits,
      maximumFractionDigits: props.decimals ?? props.maximumFractionDigits,
      useGrouping: props.showGroupSeparator,
    };
    delete props.formatStyle;
    delete props.currency;
    // ... 개별 props 정리
  }
  if (props.valueFormat && !props.formatOptions) {
    props.formatOptions = { style: props.valueFormat };
    if (props.unit) {
      props.formatOptions.unit = props.unit;
    }
    delete props.valueFormat;
    delete props.unit;
  }
}
```

## Phase 3: 패턴 C — 기능 변경 (4건)

### 대상

| 컴포넌트    | 현재                   | S2                           | 변경 유형      |
| ----------- | ---------------------- | ---------------------------- | -------------- |
| Meter       | `showValue: boolean`   | `valueLabel: ReactNode`      | 의미+타입 변경 |
| ProgressBar | `showValue: boolean`   | `valueLabel: ReactNode`      | 의미+타입 변경 |
| Slider      | `showValue: boolean`   | `valueLabel: ReactNode`      | 의미+타입 변경 |
| TextField   | `autoCorrect: boolean` | `autoCorrect: "on" \| "off"` | 타입 변경      |

### 참조 범위 — showValue (Codex 리뷰 반영)

`showValue`는 shapes뿐 아니라 **6개+ 경로**에서 참조됨:

- `packages/specs/src/components/Slider.spec.ts:348` — shapes
- `packages/shared/src/components/Slider.tsx:60,88,135` — prop 정의 + 조건부 렌더링
- `packages/shared/src/renderers/LayoutRenderers.tsx:879,933` — element.props.showValue
- `packages/shared/src/renderers/SelectionRenderers.tsx:1265` — element.props.showValue
- `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:1243-1323` — Label/Output 필터링 (6곳+)
- `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts:1672-1690` — 높이 계산

### valueLabel 설계

S2에서 `valueLabel`은 ReactNode (표시할 내용 자체를 전달). XStudio 빌더에서는:

- **기본**: `valueLabel: true` → 자동 포맷된 값 표시 (현재 showValue=true와 동일)
- **숨김**: `valueLabel: false` → 값 미표시
- **커스텀**: `valueLabel: string` → 사용자 지정 텍스트 (예: "{value}%")

프로퍼티 패널: enum 타입 (Auto / Hidden / Custom) + 조건부 텍스트 입력.

### autoCorrect 설계

- 현재: `autoCorrect: boolean` (true/false)
- S2: `autoCorrect: string` ("on"/"off")
- 프로퍼티 패널: boolean field → enum field ("on"/"off")

### 데이터 normalization

```typescript
// showValue → valueLabel
if ("showValue" in props && !("valueLabel" in props)) {
  props.valueLabel = props.showValue;
  delete props.showValue;
}
// autoCorrect boolean → string
if (typeof props.autoCorrect === "boolean") {
  props.autoCorrect = props.autoCorrect ? "on" : "off";
}
```

## 범위 제외: TableView 구조 재설계

다음 항목은 이 ADR 범위에서 제외:

| 현재                              | S2                       | 제외 사유                                                                                                       |
| --------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `TableView.allowsSorting`         | `Column.allowsSorting`   | Column Spec 레벨 이동. shared Table은 이미 Column `enableResizing`을 사용 중이므로 Spec↔shared 정합성 별도 작업 |
| `TableView.allowsResizingColumns` | `onResize`/`onResizeEnd` | 이벤트 모델 재설계. `TableEditor.tsx`가 column props를 직접 읽는 구조를 함께 변경해야 함                        |

별도 ADR 또는 작업 단위로 분리.
