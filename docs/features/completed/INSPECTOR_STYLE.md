# Inspector Style Management System

## 개요

Inspector에 inline styles 기반 스타일 편집 시스템을 구현하고, Preview iframe으로부터 computed styles를 수집하여 양방향 동기화를 완성했습니다.

## 배경

기존 Inspector는 CSS 변수 기반으로 스타일을 관리했으나, 다음과 같은 한계가 있었습니다:
- CSS 변수는 실제 적용된 값을 확인하기 어려움
- 브라우저가 계산한 computed styles를 볼 수 없음
- Preview에서 선택한 요소의 실제 스타일을 Inspector에 표시 불가

## 해결 방법

### 1. Inline Styles 전환

**변경 전 (CSS 변수):**
```typescript
// ❌ CSS 변수 기반
props: {
  cssVariables: {
    '--width': '100px',
    '--color': '#FF0000'
  }
}
```

**변경 후 (React style prop):**
```typescript
// ✅ Inline styles
props: {
  style: {
    width: '100px',
    color: '#FF0000'
  }
}
```

### 2. Computed Styles 수집

Preview iframe에서 DOM 요소의 computed styles 수집:

**구현 위치**: `src/builder/preview/index.tsx:189-246`

```typescript
const collectComputedStyle = (domElement: Element): Record<string, string> => {
  const computed = window.getComputedStyle(domElement);

  return {
    // Layout
    display: computed.display,
    width: computed.width,
    height: computed.height,
    position: computed.position,

    // Flexbox
    flexDirection: computed.flexDirection,
    justifyContent: computed.justifyContent,
    alignItems: computed.alignItems,
    gap: computed.gap,

    // Typography
    color: computed.color,
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily,
    fontWeight: computed.fontWeight,
    lineHeight: computed.lineHeight,

    // Spacing
    padding: computed.padding,
    margin: computed.margin,

    // Colors & Borders
    backgroundColor: computed.backgroundColor,
    borderColor: computed.borderColor,
    borderWidth: computed.borderWidth,
    borderStyle: computed.borderStyle,
    borderRadius: computed.borderRadius,
  };
};
```

### 3. 스타일 우선순위

`getStyleValue()` helper로 우선순위 구현:

**구현 위치**: `src/builder/inspector/sections/StyleSection.tsx:42-57`

```typescript
function getStyleValue(
  element: SelectedElement,
  property: keyof React.CSSProperties,
  defaultValue: string
): string {
  // Priority 1: Inline style (user explicitly set)
  if (element.style && element.style[property] !== undefined) {
    return String(element.style[property]);
  }

  // Priority 2: Computed style (browser calculated)
  if (element.computedStyle && element.computedStyle[property] !== undefined) {
    return String(element.computedStyle[property]);
  }

  // Priority 3: Default value
  return defaultValue;
}
```

### 4. 양방향 동기화

**Inspector → Builder**: `useSyncWithBuilder.ts`
```typescript
// Inspector 변경 감지
useEffect(() => {
  if (!selectedElement || isSyncingToBuilder) return;

  // 변경사항 비교 (JSON stringify)
  if (inspectorElementJson !== storeElementJson) {
    // Builder store에 동기화
    updateElement(elementId, {
      props: { ...properties, style },
      dataBinding
    });
  }
}, [selectedElement]);
```

**Builder → Inspector**: Element selection 시 자동 업데이트
```typescript
// Preview에서 element 선택 시
setSelectedElement(elementId, props, style, computedStyle);
```

### 5. Flexbox 컨트롤

직관적인 Flexbox 편집 UI 구현:

**구현 위치**: `src/builder/inspector/sections/StyleSection.tsx`

#### Vertical Alignment (alignItems)
```typescript
<ToggleButtonGroup
  selectedKeys={getVerticalAlignmentKeys(element)}
  onSelectionChange={(keys) => {
    const value = Array.from(keys)[0];
    updateInlineStyles({
      display: "flex",
      alignItems: alignItemsMap[value] // flex-start, center, flex-end
    });
  }}
>
```

#### Horizontal Alignment (justifyContent)
```typescript
<ToggleButtonGroup
  selectedKeys={getHorizontalAlignmentKeys(element)}
  onSelectionChange={(keys) => {
    const value = Array.from(keys)[0];
    updateInlineStyles({
      display: "flex",
      justifyContent: justifyContentMap[value] // flex-start, center, flex-end
    });
  }}
>
```

#### 3x3 Grid Alignment (조합)
```typescript
<ToggleButtonGroup
  selectedKeys={getFlexAlignmentKeys(element)}
  onSelectionChange={(keys) => {
    // flex-direction에 따라 축 변환
    if (flexDirection === "column") {
      updateInlineStyles({
        display: "flex",
        justifyContent: position.vertical,
        alignItems: position.horizontal,
      });
    } else {
      updateInlineStyles({
        display: "flex",
        justifyContent: position.horizontal,
        alignItems: position.vertical,
      });
    }
  }}
>
```

#### Spacing Controls (mutually exclusive)
```typescript
<ToggleButtonGroup
  selectedKeys={getJustifyContentSpacingKeys(element)}
  onSelectionChange={(keys) => {
    const value = Array.from(keys)[0]; // space-around, space-between, space-evenly
    updateInlineStyles({
      display: "flex",
      justifyContent: value
    });
  }}
>
```

## 핵심 구현 세부사항

### 1. Mutually Exclusive Groups

3x3 그리드와 spacing 버튼은 서로 배타적:
- `getFlexAlignmentKeys()`: spacing 값일 때 빈 배열 반환
- `getJustifyContentSpacingKeys()`: flex-start/center/flex-end일 때 빈 배열 반환
- ToggleButtonGroup의 `selectedKeys`가 `[]`이면 indicator 자동 숨김

### 2. flex-direction 인식

3x3 그리드는 `flex-direction`에 따라 축 매핑 변경:
- **row**: 가로 = justifyContent, 세로 = alignItems
- **column**: 가로 = alignItems, 세로 = justifyContent

### 3. History Integration

모든 스타일 변경은 undo/redo history에 자동 추적:
```typescript
// useSyncWithBuilder.ts에서 자동으로 updateElement 호출
// updateElement는 history에 변경사항 기록
```

### 4. 중복 History 방지

Inspector와 Builder의 상태를 JSON으로 비교하여 실제 변경된 경우만 동기화:
```typescript
const inspectorJson = JSON.stringify({
  properties: selectedElement.properties,
  style: selectedElement.style
});

const storeJson = JSON.stringify({
  properties: storeProps,
  style: storeStyle
});

if (inspectorJson !== storeJson) {
  // 실제로 변경된 경우만 동기화
}
```

## 데이터 흐름

```
1. Element Selection (Preview)
   → collectComputedStyle(domElement)
   → postMessage to Builder

2. Builder receives selection
   → setSelectedElement(id, props, style, computedStyle)

3. Inspector updates
   → useInspectorState receives new element
   → Display values with priority (inline > computed > default)

4. User edits style
   → updateInlineStyle(property, value)
   → Set isSyncingToBuilder flag

5. Sync to Builder
   → useSyncWithBuilder detects change
   → updateElement(id, { props: {..., style} })

6. Builder updates store
   → addHistoryEntry (for undo/redo)
   → postMessage to Preview iframe

7. Preview re-renders
   → Apply new inline styles
   → Cycle complete
```

## UI/UX 개선사항 (2025-10)

### 1. 컴팩트한 레이아웃

여러 관련 컨트롤을 한 줄로 배치하여 공간 효율성 향상:

```typescript
// Font Size + Line Height를 한 줄로
<div className="text-size">
  <PropertyUnitInput label="Font Size" />
  <PropertyUnitInput label="Line Height" />
  <div className="fieldset-actions">...</div>
</div>

// Text Align + Vertical Align을 한 줄로
<div className="text-alignment">
  <fieldset>Text Align</fieldset>
  <fieldset>Vertical Align</fieldset>
  <div className="fieldset-actions">...</div>
</div>
```

### 2. 아이콘 기반 컨트롤

텍스트 버튼을 아이콘으로 교체하여 시각적 일관성 및 공간 절약:

#### Text Alignment
```typescript
<ToggleButtonGroup indicator>
  <ToggleButton id="left"><AlignLeft /></ToggleButton>
  <ToggleButton id="center"><AlignCenter /></ToggleButton>
  <ToggleButton id="right"><AlignRight /></ToggleButton>
</ToggleButtonGroup>
```

#### Text Decoration
```typescript
<ToggleButtonGroup indicator>
  <ToggleButton id="none"><RemoveFormatting /></ToggleButton>
  <ToggleButton id="underline"><Underline /></ToggleButton>
  <ToggleButton id="line-through"><Strikethrough /></ToggleButton>
</ToggleButtonGroup>
```

#### Font Style
```typescript
<ToggleButtonGroup indicator>
  <ToggleButton id="normal"><RemoveFormatting /></ToggleButton>
  <ToggleButton id="italic"><Italic /></ToggleButton>
  <ToggleButton id="oblique"><Type style={{ transform: 'skewX(-10deg)' }} /></ToggleButton>
</ToggleButtonGroup>
```

#### Text Transform
```typescript
<ToggleButtonGroup indicator>
  <ToggleButton id="none"><RemoveFormatting /></ToggleButton>
  <ToggleButton id="uppercase"><CaseUpper /></ToggleButton>
  <ToggleButton id="lowercase"><CaseLower /></ToggleButton>
  <ToggleButton id="capitalize"><CaseSensitive /></ToggleButton>
</ToggleButtonGroup>
```

### 3. Auto 옵션으로 스타일 초기화

모든 스타일 속성에 "auto" 옵션 추가하여 inline style 제거 및 class 스타일로 폴백:

```typescript
// PropertyUnitInput - "auto" 선택 시 빈 문자열 전달
const handleUnitChange = (selectedUnit: string) => {
  if (selectedUnit === "auto") {
    onChange(""); // inline style 제거
  } else {
    onChange(selectedUnit);
  }
};

// PropertySelect - "auto" 선택 시 빈 문자열 전달
const handleChange = (key: React.Key | null) => {
  const selectedValue = key as string;
  if (selectedValue === "auto") {
    onChange(""); // inline style 제거
  } else {
    onChange(selectedValue);
  }
};

// useInspectorState - 빈 문자열이면 속성 제거
updateInlineStyle: (property, value) => {
  const currentStyle = { ...state.selectedElement.style };

  if (value === "" || value === null || value === undefined) {
    delete currentStyle[property]; // 속성 제거 → class로 폴백
  } else {
    currentStyle[property] = value;
  }
}
```

**적용된 속성들:**
- Width, Height, Left, Top, Gap, Padding, Margin
- Border Width, Border Radius, Border Style
- Font Size, Line Height, Font Family, Font Weight, Letter Spacing

### 4. 입력 컨트롤 개선

#### 즉시 입력 vs Blur 입력
```typescript
// 입력 중: 로컬 상태만 업데이트
const handleInputChange = (newValue: string) => {
  setInputValue(newValue);
};

// Blur/Enter 시: 실제 스타일 변경 적용
const handleInputBlur = () => {
  const num = parseFloat(inputValue);
  if (!isNaN(num) && num >= min && num <= max) {
    onChange(`${num}${unit}`);
  }
};
```

#### PropertySelect ellipsis 처리
```typescript
// CSS - SelectValue 너비 제한
.react-aria-SelectValue {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

// CSS - 부모 Button flex 레이아웃
.react-aria-Button {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}
```

### 5. 동기화 개선

#### Element 전환 시 스타일 업데이트
```typescript
// Inspector/index.tsx - style, computedStyle 비교 추가
const currentStyleJson = JSON.stringify(
  selectedElement.style,
  Object.keys(selectedElement.style || {}).sort()
);
const newStyleJson = JSON.stringify(
  mappedElement.style,
  Object.keys(mappedElement.style || {}).sort()
);

if (currentStyleJson !== newStyleJson ||
    currentComputedStyleJson !== newComputedStyleJson) {
  setSelectedElement(mappedElement); // 스타일 변경 감지 및 업데이트
}
```

#### 빈 객체도 Builder로 전달
```typescript
// elementMapper.ts - 스타일 제거 반영
export function mapSelectedToElementUpdate(selected: SelectedElement) {
  return {
    props: {
      ...selected.properties,
      // style이 undefined가 아니면 항상 포함 (빈 객체 {} 도 포함)
      ...(selected.style !== undefined ? { style: selected.style } : {}),
    }
  };
}

// 초기화 시 빈 객체로 설정
export function mapElementToSelected(element: Element) {
  return {
    style: (style as React.CSSProperties) || {}, // undefined 방지
  };
}
```

## 결과

### ✅ 구현 완료

1. **Inline styles 기반 스타일 관리**
   - CSS 변수에서 React style prop으로 전환
   - 직접적이고 예측 가능한 스타일 적용

2. **Computed styles 수집 및 표시**
   - Preview iframe에서 브라우저 계산 스타일 수집
   - 실제 렌더링된 스타일 값 확인 가능

3. **양방향 동기화**
   - Inspector ↔ Builder 완전 동기화
   - 중복 history 방지 로직
   - Element 전환 시 style/computedStyle 비교 및 업데이트

4. **직관적인 Flexbox 컨트롤**
   - Alignment 버튼 자동으로 `display: flex` 활성화
   - 3x3 그리드로 빠른 정렬
   - Spacing 버튼으로 공간 배치
   - flex-direction 인식 축 변환

5. **History 통합**
   - 모든 스타일 변경 추적
   - Undo/Redo 완벽 지원

6. **개선된 UI/UX (2025-10)**
   - 컴팩트한 한 줄 레이아웃 (Font Size/Line Height, Text Align/Vertical Align 등)
   - 아이콘 기반 컨트롤로 일관성 향상
   - "auto" 옵션으로 inline style 제거 및 class 폴백
   - PropertySelect ellipsis 처리로 긴 텍스트 대응
   - 즉시 입력 vs Blur 입력 분리

### 📊 성능 개선

- **Debounced sync**: 100ms 딜레이로 불필요한 업데이트 방지
- **JSON comparison**: 실제 변경된 경우만 동기화
- **Flag-based sync**: `isSyncingToBuilder`로 무한 루프 방지

## 관련 파일

### Core Files
- `src/builder/inspector/hooks/useInspectorState.ts` - Inspector 상태 관리
- `src/builder/inspector/hooks/useSyncWithBuilder.ts` - 양방향 동기화
- `src/builder/inspector/sections/StyleSection.tsx` - 스타일 편집 UI
- `src/builder/inspector/types.ts` - 타입 정의 (style, computedStyle 추가)

### Preview
- `src/builder/preview/index.tsx` - Computed styles 수집 (line 189-246)

### Store
- `src/builder/stores/elements.ts` - setSelectedElement 시그니처 업데이트

### Utils
- `src/builder/inspector/utils/elementMapper.ts` - Element 매핑 (style 처리)

### Types
- `src/types/unified.ts` - BaseElementProps에 computedStyle 추가

## 참고 자료

- [CLAUDE.md - Inspector Style Management System](../../CLAUDE.md#inspector-style-management-system)
- [React: style prop documentation](https://react.dev/reference/react-dom/components/common#applying-css-styles)
- [MDN: getComputedStyle()](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
