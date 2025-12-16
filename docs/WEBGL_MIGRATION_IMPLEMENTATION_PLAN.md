# WebGL Component Migration Implementation Plan

> **Created**: 2025-12-16
> **Based on**: PixiButton, PixiRadio, PixiCheckbox, PixiCheckboxGroup, PixiSlider 분석

## 1. 구현 패턴 분석

### 1.1 컴포넌트 유형별 패턴

분석 결과, 세 가지 주요 구현 패턴이 존재합니다:

| 패턴 | 설명 | 예시 | 사용 시점 |
|------|------|------|----------|
| **Pattern A** | JSX + Graphics.draw() | PixiCheckbox, PixiRadio | 단순 도형 + 텍스트 |
| **Pattern B** | useEffect + @pixi/ui | PixiButton, PixiSlider | @pixi/ui 컴포넌트 활용 |
| **Pattern C** | Group + Children | PixiCheckboxGroup, PixiRadio | 자식 요소 렌더링 |

---

## 2. Pattern A: JSX + Graphics.draw()

### 2.1 구조
```
┌─────────────────────────────────────────────────────────┐
│ pixiContainer (x, y, eventMode)                         │
│ ├── pixiGraphics (draw={drawHitArea}, onPointerDown)   │ ← 투명 히트 영역
│ ├── pixiGraphics (draw={drawVisual}, eventMode="none") │ ← 시각적 요소
│ └── pixiText (text, style, eventMode="none")           │ ← 텍스트 라벨
└─────────────────────────────────────────────────────────┘
```

### 2.2 코드 템플릿
```tsx
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { drawBox, drawCircle } from '../utils';

// ============================================
// Types
// ============================================

export interface PixiComponentProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, value: unknown) => void;
  onClick?: (elementId: string) => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SIZE = 20;
const DEFAULT_PRIMARY_COLOR = 0x3b82f6;
const DEFAULT_TEXT_COLOR = 0x374151;

// ============================================
// Component
// ============================================

export const PixiComponent = memo(function PixiComponent({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiComponentProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 1. 상태 계산 (useMemo)
  const state = useMemo(() => {
    return Boolean(props?.isSelected || props?.checked);
  }, [props]);

  // 2. 스타일 계산
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 3. 시각적 요소 그리기 (useCallback)
  const drawVisual = useCallback(
    (g: PixiGraphics) => {
      drawBox(g, {
        width: DEFAULT_SIZE,
        height: DEFAULT_SIZE,
        backgroundColor: state ? primaryColor : 0xffffff,
        border: { width: 2, color: state ? primaryColor : 0xd1d5db, style: 'solid' },
      });
    },
    [state, primaryColor]
  );

  // 4. 히트 영역 (투명)
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, 100, DEFAULT_SIZE);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    []
  );

  // 5. 이벤트 핸들러
  const handlePointerDown = useCallback(() => {
    onClick?.(element.id);
    onChange?.(element.id, !state);
  }, [element.id, onClick, onChange, state]);

  // 6. 텍스트 스타일
  const textStyle = useMemo(
    () => new TextStyle({ fontSize: 14, fill: textColor }),
    [textColor]
  );

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 투명 히트 영역 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />
      {/* 시각적 요소 */}
      <pixiGraphics draw={drawVisual} eventMode="none" />
      {/* 텍스트 라벨 */}
      <pixiText
        text="Label"
        style={textStyle}
        x={DEFAULT_SIZE + 8}
        y={0}
        eventMode="none"
      />
    </pixiContainer>
  );
});
```

### 2.3 적용 대상 컴포넌트
- [x] PixiCheckbox ✅
- [ ] PixiToggleButton
- [ ] PixiBadge
- [ ] PixiMeter
- [ ] PixiSeparator

---

## 3. Pattern B: useEffect + @pixi/ui

### 3.1 구조
```
┌─────────────────────────────────────────────────────────┐
│ pixiContainer (ref, x, y)                               │
│ ├── [useEffect에서 생성] @pixi/ui Component            │
│ │   ├── defaultView (Graphics)                         │
│ │   ├── hoverView (Graphics)                           │
│ │   └── pressedView (Graphics)                         │
│ └── pixiGraphics (투명 히트 영역 for modifier keys)     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 코드 템플릿
```tsx
import { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import { Container as PixiContainer, Graphics as PixiGraphicsClass } from 'pixi.js';
import { FancyButton, Slider, Input } from '@pixi/ui';
import type { Element } from '../../../../types/core/store.types';

export interface PixiUIComponentProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export const PixiUIComponent = memo(function PixiUIComponent({
  element,
  onClick,
  onChange,
}: PixiUIComponentProps) {
  const containerRef = useRef<PixiContainer | null>(null);
  const componentRef = useRef<FancyButton | Slider | null>(null);

  const style = element.props?.style as Record<string, unknown> | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 1. 레이아웃 계산 (useMemo)
  const layout = useMemo(() => ({
    x: Number(style?.left || 0),
    y: Number(style?.top || 0),
    width: Number(style?.width || 200),
    height: Number(style?.height || 40),
  }), [style]);

  // 2. @pixi/ui 컴포넌트 생성 (useEffect)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 기존 요소 정리
    if (componentRef.current) {
      container.removeChild(componentRef.current);
      componentRef.current.destroy();
      componentRef.current = null;
    }

    // Graphics 생성
    const defaultView = createGraphics(layout.width, layout.height, 0x3b82f6);
    const hoverView = createGraphics(layout.width, layout.height, 0x2563eb);
    const pressedView = createGraphics(layout.width, layout.height, 0x1d4ed8);

    // @pixi/ui 컴포넌트 생성
    const component = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      anchor: 0.5,
    });

    component.x = layout.width / 2;
    component.y = layout.height / 2;
    component.eventMode = 'none'; // 이벤트는 히트 영역에서 처리

    container.addChild(component);
    componentRef.current = component;

    return () => {
      if (componentRef.current && container.children.includes(componentRef.current)) {
        container.removeChild(componentRef.current);
        componentRef.current.destroy();
        componentRef.current = null;
      }
    };
  }, [layout]);

  // 3. 투명 히트 영역 (modifier 키 감지)
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, layout.width, layout.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [layout.width, layout.height]
  );

  // 4. 클릭 핸들러 (modifier 키 전달)
  const handleClick = useCallback(
    (e: unknown) => {
      const pixiEvent = e as { metaKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean };
      onClick?.(element.id, {
        metaKey: pixiEvent?.metaKey ?? false,
        shiftKey: pixiEvent?.shiftKey ?? false,
        ctrlKey: pixiEvent?.ctrlKey ?? false,
      });
    },
    [element.id, onClick]
  );

  return (
    <pixiContainer
      x={layout.x}
      y={layout.y}
      ref={(c: PixiContainer | null) => { containerRef.current = c; }}
    >
      {/* @pixi/ui 컴포넌트는 useEffect에서 추가됨 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

// Helper: Graphics 생성
function createGraphics(width: number, height: number, color: number): PixiGraphicsClass {
  const g = new PixiGraphicsClass();
  g.roundRect(0, 0, width, height, 6);
  g.fill({ color, alpha: 1 });
  return g;
}
```

### 3.3 적용 대상 컴포넌트
- [x] PixiButton ✅
- [x] PixiSlider ✅
- [x] PixiInput ✅
- [x] PixiSelect ✅
- [ ] PixiNumberField
- [ ] PixiSearchField

---

## 4. Pattern C: Group + Children (Store 연동)

### 4.1 구조
```
┌─────────────────────────────────────────────────────────────┐
│ pixiContainer (group)                                       │
│ ├── pixiText (그룹 라벨)                                    │
│ └── {options.map()} → ItemComponent                        │
│     ├── pixiGraphics (아이템 시각적 요소)                   │
│     └── pixiText (아이템 라벨)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 코드 템플릿
```tsx
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { useStore } from '../../../stores';

// ============================================
// Types
// ============================================

interface Option {
  value: string;
  label: string;
  checked?: boolean;
}

export interface PixiGroupComponentProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, selectedValues: string[]) => void;
  onClick?: (elementId: string) => void;
}

// ============================================
// Sub-Component: Item
// ============================================

interface ItemProps {
  option: Option;
  isOptionSelected: boolean;
  x: number;
  y: number;
  onSelect: (value: string) => void;
  // ... style props
}

const Item = memo(function Item({ option, isOptionSelected, x, y, onSelect }: ItemProps) {
  const drawItem = useCallback((g: PixiGraphics) => {
    // 아이템 시각적 요소 그리기
  }, [isOptionSelected]);

  const handlePointerDown = useCallback(() => {
    onSelect(option.value);
  }, [option.value, onSelect]);

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawItem} eventMode="static" cursor="pointer" onPointerDown={handlePointerDown} />
      <pixiText text={option.label} x={24} y={0} />
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export const PixiGroupComponent = memo(function PixiGroupComponent({
  element,
  onChange,
  onClick,
}: PixiGroupComponentProps) {
  // 1. Store에서 자식 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements.filter((el) => el.parent_id === element.id && el.tag === 'ItemTag');
  }, [elements, element.id]);

  // 2. 옵션 파싱 (자식 요소 > props.options > 기본값)
  const options = useMemo(() => {
    // 자식 요소 우선
    if (childItems.length > 0) {
      return childItems.map((item) => ({
        value: String(item.props?.value || item.id),
        label: String(item.props?.children || item.props?.label || ''),
      }));
    }
    // props.options
    if (Array.isArray(element.props?.options)) {
      return element.props.options.map((opt: unknown) => ({
        value: String((opt as Record<string, unknown>).value || ''),
        label: String((opt as Record<string, unknown>).label || ''),
      }));
    }
    // 기본값
    return [{ value: 'option1', label: 'Option 1' }];
  }, [childItems, element.props]);

  // 3. 선택 상태 계산
  const selectedValues = useMemo(() => {
    // ... 선택 상태 로직
    return [];
  }, [element.props, childItems]);

  // 4. 이벤트 핸들러
  const handleOptionSelect = useCallback((optionValue: string) => {
    onClick?.(element.id);
    // 선택 로직 (single/multiple)
    onChange?.(element.id, [...selectedValues, optionValue]);
  }, [element.id, onClick, onChange, selectedValues]);

  // 5. 레이아웃 계산
  const isHorizontal = element.props?.style?.flexDirection === 'row';

  return (
    <pixiContainer x={0} y={0}>
      {/* 그룹 라벨 */}
      {element.props?.label && (
        <pixiText text={String(element.props.label)} x={0} y={0} />
      )}

      {/* 아이템들 */}
      {options.map((option, index) => {
        const itemX = isHorizontal ? index * 120 : 0;
        const itemY = isHorizontal ? 0 : index * 32;

        return (
          <Item
            key={option.value}
            option={option}
            isOptionSelected={selectedValues.includes(option.value)}
            x={itemX}
            y={itemY}
            onSelect={handleOptionSelect}
          />
        );
      })}
    </pixiContainer>
  );
});
```

### 4.3 적용 대상 컴포넌트
- [x] PixiCheckboxGroup ✅
- [x] PixiRadio (RadioGroup) ✅
- [ ] PixiToggleButtonGroup
- [ ] PixiListBox
- [ ] PixiMenu
- [ ] PixiTabs

---

## 5. 핵심 유틸리티 함수

### 5.1 Drawing Utilities (`src/builder/workspace/canvas/utils/`)

```typescript
// drawBox: 사각형 (border-box 방식)
drawBox(g, {
  width: 100,
  height: 40,
  backgroundColor: 0x3b82f6,
  backgroundAlpha: 1,
  borderRadius: 6,
  border: {
    width: 2,
    color: 0x000000,
    alpha: 1,
    style: 'solid', // 'solid' | 'dashed' | 'dotted' | 'double'
    radius: 6,
  },
});

// drawCircle: 원형 (border-box 방식)
drawCircle(g, {
  x: 10,
  y: 10,
  radius: 10,
  backgroundColor: 0x3b82f6,
  border: { width: 2, color: 0x000000, alpha: 1 },
});
```

### 5.2 Style Conversion (`src/builder/workspace/canvas/sprites/styleConverter.ts`)

```typescript
// CSS 색상 → PixiJS hex
cssColorToHex('#3b82f6')           // 0x3b82f6
cssColorToHex('rgb(59, 130, 246)') // 0x3b82f6

// CSS 크기 → 숫자
parseCSSSize('100px', undefined, 0) // 100
parseCSSSize('50%', 200, 0)         // 100
parseCSSSize(undefined, undefined, 50) // 50 (default)
```

### 5.3 Theme Colors (`src/builder/workspace/canvas/hooks/useThemeColors.ts`)

```typescript
const themeColors = useThemeColors();
const variantColors = getVariantColors('primary', themeColors);
// { bg: 0x3b82f6, bgHover: 0x2563eb, bgPressed: 0x1d4ed8, text: 0xffffff }
```

---

## 6. 컴포넌트별 상세 구현 계획

### 6.1 Phase 1: Selection Components (높은 우선순위)

#### PixiToggleButton
- **패턴**: Pattern A (JSX + Graphics)
- **참고**: PixiCheckbox
- **핵심 로직**:
  ```typescript
  // selected 상태에 따른 배경색 변경
  const backgroundColor = isSelected ? primaryColor : 0xffffff;
  const textColor = isSelected ? 0xffffff : 0x374151;
  ```

#### PixiToggleButtonGroup
- **패턴**: Pattern C (Group + Children)
- **참고**: PixiCheckboxGroup, PixiRadio
- **핵심 로직**:
  - selectionMode: 'single' | 'multiple'
  - orientation: 'horizontal' | 'vertical'
  - indicator 애니메이션 (선택적)

#### PixiListBox
- **패턴**: Pattern C + Pattern B (ScrollBox 연동)
- **참고**: PixiRadio (옵션 렌더링), PixiScrollBox
- **구조**:
  ```
  PixiListBox
  ├── pixiContainer (wrapper)
  │   └── {items.map()} → ListBoxItem
  │       ├── pixiGraphics (배경 + hover)
  │       └── pixiText (라벨)
  ```

#### PixiGridList
- **패턴**: Pattern C + Grid Layout
- **참고**: PixiListBox
- **핵심 로직**:
  - columns prop으로 그리드 열 수 지정
  - 아이템 위치 계산: `x = (index % columns) * itemWidth`

### 6.2 Phase 2: Layout Components

#### PixiTabs
- **패턴**: Pattern C (복잡)
- **구조**:
  ```
  PixiTabs
  ├── TabList (가로 배열)
  │   └── {tabs.map()} → Tab
  │       ├── pixiGraphics (탭 배경)
  │       ├── pixiText (탭 제목)
  │       └── indicator (선택된 탭 표시)
  └── TabPanels
      └── {panels.map()} → Panel (visible={selectedTabId === panel.tabId})
  ```
- **핵심 로직**:
  - Tab과 Panel의 tabId 매칭
  - 선택된 탭만 Panel 렌더링

#### PixiTree
- **패턴**: Pattern C + 재귀 렌더링
- **구조**:
  ```
  PixiTree
  └── {items.map()} → TreeItem (재귀)
      ├── pixiGraphics (들여쓰기 + 화살표)
      ├── pixiText (라벨)
      └── {item.children?.map()} → TreeItem (재귀)
  ```
- **핵심 로직**:
  - depth에 따른 들여쓰기
  - 펼침/접기 상태 관리

### 6.3 Phase 3: Form Components

#### PixiNumberField
- **패턴**: Pattern B (@pixi/ui Input 확장)
- **참고**: PixiInput
- **구조**:
  ```
  PixiNumberField
  ├── Input (숫자 입력)
  └── Stepper
      ├── pixiGraphics (+ 버튼)
      └── pixiGraphics (- 버튼)
  ```

#### PixiMeter
- **패턴**: Pattern A (Graphics)
- **구조**:
  ```
  PixiMeter
  ├── pixiGraphics (배경 트랙)
  ├── pixiGraphics (채우기 - value에 따라 너비 계산)
  └── pixiText (값 표시, showValue=true일 때)
  ```
- **핵심 로직**:
  ```typescript
  const fillWidth = (value / max) * trackWidth;
  ```

---

## 7. 테스트 체크리스트

### 7.1 각 컴포넌트 테스트 항목

- [ ] **렌더링**: 기본 렌더링 확인
- [ ] **스타일 적용**: CSS style prop 반영 확인
- [ ] **이벤트**: onClick, onChange 동작 확인
- [ ] **선택 상태**: isSelected 시각적 피드백
- [ ] **비활성화**: isDisabled 상태 처리
- [ ] **자식 요소**: Store에서 자식 요소 읽기/렌더링
- [ ] **Modifier 키**: Cmd+Click, Shift+Click 동작

### 7.2 성능 테스트

- [ ] 100개 아이템 렌더링 시 60fps 유지
- [ ] 메모리 누수 없음 (cleanup 확인)
- [ ] 불필요한 리렌더링 없음 (React DevTools)

---

## 8. 파일 명명 규칙

```
src/builder/workspace/canvas/ui/
├── Pixi{ComponentName}.tsx    # 컴포넌트 파일
├── index.ts                   # export 모듈
└── types.ts                   # 공통 타입 (선택적)
```

### export 추가 예시 (index.ts)
```typescript
export { PixiToggleButton, type PixiToggleButtonProps } from './PixiToggleButton';
export { PixiToggleButtonGroup, type PixiToggleButtonGroupProps } from './PixiToggleButtonGroup';
```

### ElementSprite.tsx 등록 예시
```typescript
// 1. Tag Set 추가
const UI_TOGGLEBUTTON_TAGS = new Set(['ToggleButton']);
const UI_TOGGLEBUTTONGROUP_TAGS = new Set(['ToggleButtonGroup']);

// 2. SpriteType 추가
type SpriteType = ... | 'toggleButton' | 'toggleButtonGroup';

// 3. getSpriteType 분기 추가
if (UI_TOGGLEBUTTON_TAGS.has(tag)) return 'toggleButton';
if (UI_TOGGLEBUTTONGROUP_TAGS.has(tag)) return 'toggleButtonGroup';

// 4. switch 문 추가
case 'toggleButton':
  return <PixiToggleButton element={effectiveElement} ... />;
case 'toggleButtonGroup':
  return <PixiToggleButtonGroup element={effectiveElement} ... />;
```

---

## 9. 구현 우선순위 매트릭스

| 컴포넌트 | 복잡도 | 사용 빈도 | 우선순위 | 예상 시간 |
|----------|--------|----------|----------|-----------|
| PixiToggleButton | 낮음 | 높음 | 🔴 1순위 | 2시간 |
| PixiToggleButtonGroup | 중간 | 높음 | 🔴 1순위 | 3시간 |
| PixiListBox | 중간 | 높음 | 🔴 1순위 | 4시간 |
| PixiGridList | 중간 | 중간 | 🟡 2순위 | 4시간 |
| PixiTabs | 높음 | 높음 | 🟡 2순위 | 6시간 |
| PixiMenu | 높음 | 중간 | 🟡 2순위 | 5시간 |
| PixiTree | 높음 | 낮음 | 🟢 3순위 | 6시간 |
| PixiMeter | 낮음 | 낮음 | 🟢 3순위 | 2시간 |
| PixiBadge | 낮음 | 낮음 | 🟢 3순위 | 1시간 |
| PixiSeparator | 낮음 | 낮음 | 🟢 3순위 | 1시간 |

---

## 10. 참고 자료

### 소스 코드 위치
- **기존 구현체**: `src/builder/workspace/canvas/ui/`
- **Drawing 유틸**: `src/builder/workspace/canvas/utils/graphicsUtils.ts`
- **스타일 변환**: `src/builder/workspace/canvas/sprites/styleConverter.ts`
- **테마 색상**: `src/builder/workspace/canvas/hooks/useThemeColors.ts`
- **ElementSprite**: `src/builder/workspace/canvas/sprites/ElementSprite.tsx`

### @pixi/ui 문서
- [FancyButton](https://pixijs.io/ui/storybook/?path=/story/fancybutton--simple)
- [Slider](https://pixijs.io/ui/storybook/?path=/story/slider--single)
- [Input](https://pixijs.io/ui/storybook/?path=/story/input--single)
- [ScrollBox](https://pixijs.io/ui/storybook/?path=/story/scrollbox--single)
