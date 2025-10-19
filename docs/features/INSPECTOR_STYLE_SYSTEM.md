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

4. **직관적인 Flexbox 컨트롤**
   - Alignment 버튼 자동으로 `display: flex` 활성화
   - 3x3 그리드로 빠른 정렬
   - Spacing 버튼으로 공간 배치
   - flex-direction 인식 축 변환

5. **History 통합**
   - 모든 스타일 변경 추적
   - Undo/Redo 완벽 지원

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
