# ADR-052 구현 분해: S2 Props API 정합성 마이그레이션

> 상위 결정: [ADR-052](../adr/052-s2-props-api-alignment.md)

## 변경 대상 전수 목록

### Phase 1: 단순 이름 변경 (4건)

| 컴포넌트        | 현재            | S2                 | 참조 위치                  |
| --------------- | --------------- | ------------------ | -------------------------- |
| Dialog          | `isDismissable` | `isDismissible`    | shapes                     |
| DatePicker      | `visibleMonths` | `maxVisibleMonths` | propagation                |
| DateRangePicker | `visibleMonths` | `maxVisibleMonths` | propagation                |
| Popover         | `showArrow`     | `hideArrow`        | interface만 (boolean 반전) |

### Phase 2: 타입 변경 — showValue → valueLabel (3건)

| 컴포넌트    | 현재                 | S2                      | 참조 위치 |
| ----------- | -------------------- | ----------------------- | --------- |
| Meter       | `showValue: boolean` | `valueLabel: ReactNode` | shapes    |
| ProgressBar | `showValue: boolean` | `valueLabel: ReactNode` | shapes    |
| Slider      | `showValue: boolean` | `valueLabel: ReactNode` | shapes    |

XStudio 빌더 특성상 ReactNode를 직접 입력할 수 없으므로, `valueLabel: boolean`(표시/숨김)으로 단순화하되 prop 이름은 S2에 맞춤.

### Phase 3: Props 통합 — formatOptions (4컴포넌트, -7 props)

| 컴포넌트    | 제거 props                                                                                                  | 통합 대상                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| NumberField | formatStyle, currency, notation, decimals, minimumFractionDigits, maximumFractionDigits, showGroupSeparator | `formatOptions: Intl.NumberFormatOptions` |
| Meter       | valueFormat                                                                                                 | `formatOptions`                           |
| ProgressBar | valueFormat                                                                                                 | `formatOptions`                           |
| Slider      | valueFormat, unit                                                                                           | `formatOptions`                           |

프로퍼티 패널: `formatOptions` 전용 서브필드 에디터 (style 드롭다운 + currency/unit 조건부 표시).

### Phase 4: 구조 이동 — TableView (2건)

| 현재                              | S2                       | 변경                 |
| --------------------------------- | ------------------------ | -------------------- |
| `TableView.allowsSorting`         | `Column.allowsSorting`   | Column Spec으로 이동 |
| `TableView.allowsResizingColumns` | `onResize`/`onResizeEnd` | 핸들러 패턴 전환     |

### Phase 5: 타입 변경 — autoCorrect (1건)

| 컴포넌트  | 현재                   | S2                                 |
| --------- | ---------------------- | ---------------------------------- |
| TextField | `autoCorrect: boolean` | `autoCorrect: string` ("on"/"off") |

## Phase별 변경 체크리스트

각 prop 변경 시:

1. Props 인터페이스 필드명/타입 변경
2. `properties.sections.fields` key/type/defaultValue 변경
3. `render.shapes()` 내부 `props.X` 참조 변경
4. propagation rules `parentProp`/`childProp` 변경
5. type-check + build 통과

## Phase 3 상세: formatOptions 통합

### NumberField (7 → 1)

**현재 개별 props**:

```typescript
formatStyle?: "decimal" | "currency" | "percent" | "unit";
currency?: string;
notation?: string;
decimals?: number;
minimumFractionDigits?: number;
maximumFractionDigits?: number;
showGroupSeparator?: boolean;
```

**S2 통합 후**:

```typescript
formatOptions?: Intl.NumberFormatOptions;
// { style, currency, notation, minimumFractionDigits, maximumFractionDigits, useGrouping }
```

**프로퍼티 패널 UI**: `FormatOptionsEditor` 커스텀 필드 컴포넌트

```
[Style    ▾ decimal ]
[Currency ▾ KRW     ]  ← style="currency" 일 때만 표시
[Notation ▾ standard]
[Min Digits  ___    ]
[Max Digits  ___    ]
[Group Sep   ☐     ]
```

### 데이터 마이그레이션

저장된 element props 변환 예시:

```javascript
// Before
{ formatStyle: "currency", currency: "KRW", decimals: 2 }

// After
{ formatOptions: { style: "currency", currency: "KRW", minimumFractionDigits: 2, maximumFractionDigits: 2 } }
```

런타임 호환 레이어 (마이그레이션 전환기):

```typescript
function normalizeNumberFieldProps(props) {
  if (props.formatStyle && !props.formatOptions) {
    props.formatOptions = {
      style: props.formatStyle,
      currency: props.currency,
      notation: props.notation,
      minimumFractionDigits: props.decimals ?? props.minimumFractionDigits,
      maximumFractionDigits: props.decimals ?? props.maximumFractionDigits,
      useGrouping: props.showGroupSeparator,
    };
  }
  return props;
}
```
