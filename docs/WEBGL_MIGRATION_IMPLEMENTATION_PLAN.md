# WebGL Component Migration Implementation Plan

> **Created**: 2025-12-16
> **Updated**: 2025-12-16
> **Status**: In Progress

---

## 1. 핵심 목적

### 1.1 Goal: iframe Preview ≡ WebGL Canvas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CSS Stylesheet (Single Source of Truth)          │
│                                                                         │
│   src/shared/components/styles/Button.css                               │
│   src/shared/components/styles/Checkbox.css                             │
│   src/builder/styles/1-theme/shared-tokens.css                          │
│                                                                         │
│   Variables: --primary, --text-sm, --spacing-md, --border-radius, etc.  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│     iframe Preview        │  ≡  │      WebGL Canvas         │
│   (React Aria Components) │     │    (PixiJS Components)    │
│                           │     │                           │
│ - CSS 직접 적용           │     │ - cssVariableReader로     │
│ - 브라우저 렌더링         │     │   CSS 변수 읽어서 적용    │
│                           │     │ - PixiJS Graphics로 렌더링│
└───────────────────────────┘     └───────────────────────────┘
                │                               │
                └───────────── 동일 ────────────┘
```

### 1.2 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Single Source of Truth** | 모든 스타일 값은 CSS 파일에서 정의 |
| **No Hardcoding** | WebGL 컴포넌트에 색상/크기 하드코딩 금지 |
| **Dynamic Reading** | `cssVariableReader.ts`를 통해 런타임에 CSS 변수 읽기 |
| **Visual Parity** | 스타일시트 변경 시 양쪽 모두 동일하게 반영 |

### 1.3 성공 기준

- [ ] CSS 변수 변경 시 iframe과 WebGL이 동일하게 업데이트
- [ ] variant (primary, secondary, etc.) 적용 시 동일한 색상
- [ ] size (sm, md, lg) 적용 시 동일한 크기
- [ ] hover, pressed, disabled 상태 시 동일한 시각적 피드백

---

## 2. CSS 동기화 시스템 (핵심)

### 2.1 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    cssVariableReader.ts                         │
│               (src/builder/workspace/canvas/utils/)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ getCSSVariable()│  │ parseCSSValue() │  │ getVariant     │  │
│  │                 │  │                 │  │ Colors()       │  │
│  │ CSS 변수 읽기   │  │ rem→px 변환    │  │ M3 색상 조회   │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                   │            │
│           └────────────────────┼───────────────────┘            │
│                                │                                │
│  ┌─────────────────────────────▼─────────────────────────────┐  │
│  │              Component-specific Preset Functions           │  │
│  │                                                            │  │
│  │  getSizePreset()          → Button 크기                    │  │
│  │  getCheckboxSizePreset()  → Checkbox 크기                  │  │
│  │  getSliderSizePreset()    → Slider 크기 (예정)             │  │
│  │  getRadioSizePreset()     → Radio 크기 (예정)              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 CSS 변수 → WebGL 매핑

#### M3 Color Variables

| CSS Variable | 용도 | WebGL 함수 |
|--------------|------|------------|
| `--primary` | Primary 배경색 | `getVariantColors('primary').bg` |
| `--primary-hover` | Primary hover 색상 | `getVariantColors('primary').bgHover` |
| `--primary-pressed` | Primary pressed 색상 | `getVariantColors('primary').bgPressed` |
| `--on-primary` | Primary 텍스트 색상 | `getVariantColors('primary').text` |
| `--secondary`, `--tertiary`, `--error`, `--surface` | 동일 패턴 | 동일 패턴 |

#### Size/Spacing Variables

| CSS Variable | 값 (px) | WebGL 함수 |
|--------------|---------|------------|
| `--text-2xs` | 10px | `parseCSSValue()` |
| `--text-sm` | 14px | `parseCSSValue()` |
| `--text-base` | 16px | `parseCSSValue()` |
| `--text-lg` | 18px | `parseCSSValue()` |
| `--text-xl` | 20px | `parseCSSValue()` |
| `--spacing` | 8px | `parseCSSValue()` |
| `--spacing-sm` | 8px | `parseCSSValue()` |
| `--spacing-md` | 12px | `parseCSSValue()` |
| `--spacing-lg` | 16px | `parseCSSValue()` |
| `--border-radius` | 6px | `parseCSSValue()` |

### 2.3 컴포넌트별 CSS 파일 매핑

| React Aria CSS | WebGL 컴포넌트 | CSS 동기화 상태 |
|----------------|----------------|-----------------|
| `Button.css` | `PixiButton.tsx` | ✅ Color + Size |
| `Checkbox.css` | `PixiCheckbox.tsx` | ✅ Color + Size |
| `CheckboxGroup.css` | `PixiCheckboxGroup.tsx` | ✅ Color |
| `Radio.css` | `PixiRadio.tsx` | ✅ Color |
| `Slider.css` | `PixiSlider.tsx` | ✅ Color |
| `ProgressBar.css` | `PixiProgressBar.tsx` | ✅ Color |
| `Select.css` | `PixiSelect.tsx` | ⬜ 예정 |
| `Input.css` | `PixiInput.tsx` | ⬜ 예정 |
| `ToggleButton.css` | `PixiToggleButton.tsx` | ⬜ 미구현 |
| `ListBox.css` | `PixiListBox.tsx` | ⬜ 미구현 |
| `Menu.css` | `PixiMenu.tsx` | ⬜ 미구현 |
| `Tabs.css` | `PixiTabs.tsx` | ⬜ 미구현 |

---

## 3. 구현 워크플로우

### 3.1 새 컴포넌트 마이그레이션 단계

```
Step 1: CSS 파일 분석
────────────────────
src/shared/components/styles/{Component}.css 분석
  - variant 클래스 (.primary, .secondary, etc.)
  - size 클래스 (.sm, .md, .lg)
  - 사용된 CSS 변수 목록 추출

Step 2: cssVariableReader.ts 확장
─────────────────────────────────
  - 필요한 경우 새 프리셋 함수 추가
  - CSS 변수 매핑 정의
  - TypeScript 인터페이스 정의

Step 3: PixiComponent 구현
──────────────────────────
  - 프리셋 함수 import
  - useMemo로 동적 스타일 계산
  - Graphics.draw()에서 계산된 값 사용

Step 4: 검증
────────────
  - iframe과 WebGL 시각적 비교
  - CSS 변수 변경 후 양쪽 동일 반영 확인
  - 모든 variant/size 조합 테스트
```

### 3.2 구현 예시: Button

**Step 1: Button.css 분석**
```css
/* src/shared/components/styles/Button.css */
.react-aria-Button {
  font-size: var(--text-sm);
  padding: var(--spacing) var(--spacing-md);
  border-radius: var(--border-radius);
}

.react-aria-Button.primary {
  background: var(--primary);
  color: var(--on-primary);
}

.react-aria-Button.sm {
  padding: var(--spacing) var(--spacing-md);
  font-size: var(--text-sm);
}

.react-aria-Button.md {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-base);
}
```

**Step 2: cssVariableReader.ts 매핑**
```typescript
// src/builder/workspace/canvas/utils/cssVariableReader.ts

const SIZE_CSS_MAPPING = {
  sm: {
    fontSize: '--text-sm',      // var(--text-sm)
    paddingY: '--spacing',      // var(--spacing)
    paddingX: '--spacing-md',   // var(--spacing-md)
    borderRadius: '--radius-sm'
  },
  md: {
    fontSize: '--text-base',    // var(--text-base)
    paddingY: '--spacing-sm',   // var(--spacing-sm)
    paddingX: '--spacing-xl',   // var(--spacing-xl)
    borderRadius: '--radius-md'
  },
  // ...
};

export function getSizePreset(size: string): SizePreset {
  const mapping = SIZE_CSS_MAPPING[size];
  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback),
    paddingX: parseCSSValue(getCSSVariable(mapping.paddingX), fallback),
    paddingY: parseCSSValue(getCSSVariable(mapping.paddingY), fallback),
    borderRadius: parseCSSValue(getCSSVariable(mapping.borderRadius), fallback),
  };
}
```

**Step 3: PixiButton.tsx 사용**
```typescript
// src/builder/workspace/canvas/ui/PixiButton.tsx
import { getSizePreset, getVariantColors } from '../utils/cssVariableReader';

const sizePreset = getSizePreset(size);        // CSS에서 동적으로
const variantColors = getVariantColors(variant); // CSS에서 동적으로

// Graphics 렌더링에 사용
drawBox(g, {
  width: calculatedWidth,
  height: sizePreset.paddingY * 2 + sizePreset.fontSize,
  backgroundColor: variantColors.bg,
  borderRadius: sizePreset.borderRadius,
});
```

---

## 4. 검증 체크리스트

### 4.1 시각적 동일성 검증

각 컴포넌트에 대해 다음 항목을 검증:

| 검증 항목 | iframe | WebGL | 동일 |
|-----------|--------|-------|------|
| **Default 상태** | | | ☐ |
| **Hover 상태** | | | ☐ |
| **Pressed 상태** | | | ☐ |
| **Disabled 상태** | | | ☐ |
| **Primary variant** | | | ☐ |
| **Secondary variant** | | | ☐ |
| **Size: sm** | | | ☐ |
| **Size: md** | | | ☐ |
| **Size: lg** | | | ☐ |

### 4.2 동적 변경 검증

```bash
# 테스트 시나리오
1. shared-tokens.css에서 --text-sm 값 변경 (14px → 16px)
2. iframe Preview 확인: 변경 반영됨
3. WebGL Canvas 확인: 변경 반영됨 (동일해야 함)
4. 원복
```

### 4.3 자동화 테스트 (향후)

```typescript
// 시각적 회귀 테스트 예시
describe('Visual Parity', () => {
  it('Button should look identical in iframe and WebGL', async () => {
    const iframeSnapshot = await captureIframeButton();
    const webglSnapshot = await captureWebGLButton();
    expect(iframeSnapshot).toMatchVisually(webglSnapshot);
  });
});
```

---

## 5. 구현 패턴

### 5.1 패턴 요약

| 패턴 | 설명 | 사용 컴포넌트 |
|------|------|---------------|
| **Pattern A** | JSX + Graphics.draw() | Checkbox, Radio, Badge, Meter |
| **Pattern B** | useEffect + @pixi/ui | Button, Slider, Input, Select |
| **Pattern C** | Group + Children (Store) | CheckboxGroup, RadioGroup, ListBox |

### 5.2 Pattern A: JSX + Graphics.draw()

단순한 도형 + 텍스트 조합의 컴포넌트

```tsx
// 핵심: CSS 변수에서 스타일 읽기
const sizePreset = useMemo(() => getComponentSizePreset(size), [size]);
const variantColors = getVariantColors(variant);

const drawVisual = useCallback((g: PixiGraphics) => {
  drawBox(g, {
    width: sizePreset.boxSize,
    height: sizePreset.boxSize,
    backgroundColor: isSelected ? variantColors.bg : 0xffffff,
    border: { width: 2, color: variantColors.bg },
  });
}, [sizePreset, variantColors, isSelected]);
```

### 5.3 Pattern B: useEffect + @pixi/ui

@pixi/ui 컴포넌트 활용

```tsx
// 핵심: CSS 변수에서 스타일 읽기
const sizePreset = useMemo(() => getSizePreset(size), [size]);
const variantColors = getVariantColors(variant);

useEffect(() => {
  const defaultView = createGraphics(width, height, variantColors.bg);
  const hoverView = createGraphics(width, height, variantColors.bgHover);
  const pressedView = createGraphics(width, height, variantColors.bgPressed);

  const button = new FancyButton({ defaultView, hoverView, pressedView });
  // ...
}, [variantColors, sizePreset]);
```

### 5.4 Pattern C: Group + Children

Store에서 자식 요소를 읽어 렌더링

```tsx
// 핵심: 그룹의 variant/size를 자식에게 전달
const groupVariant = element.props?.variant || 'default';
const groupSize = element.props?.size || 'md';

return (
  <pixiContainer>
    {childItems.map((item) => (
      <ChildComponent
        key={item.id}
        variant={groupVariant}  // 그룹에서 상속
        size={groupSize}        // 그룹에서 상속
      />
    ))}
  </pixiContainer>
);
```

---

## 6. 컴포넌트별 CSS 매핑 상세

### 6.1 Button

**CSS 파일**: `src/shared/components/styles/Button.css`

| CSS 속성 | CSS 변수 | WebGL 매핑 |
|----------|----------|------------|
| `font-size` | `--text-sm` ~ `--text-xl` | `sizePreset.fontSize` |
| `padding` | `--spacing` ~ `--spacing-3xl` | `sizePreset.paddingX/Y` |
| `border-radius` | `--border-radius` | `sizePreset.borderRadius` |
| `background` | `--primary`, `--secondary`, etc. | `variantColors.bg` |
| `color` | `--on-primary`, etc. | `variantColors.text` |

### 6.2 Checkbox

**CSS 파일**: `src/shared/components/styles/Checkbox.css`

| CSS 속성 | CSS 변수 | WebGL 매핑 |
|----------|----------|------------|
| `width/height (.checkbox)` | `--cb-box-size` → `--text-lg` ~ `--text-2xl` | `sizePreset.boxSize` |
| `font-size` | `--cb-font-size` → `--text-sm` ~ `--text-lg` | `sizePreset.fontSize` |
| `gap` | `--gap` | `sizePreset.gap` |
| `background (selected)` | `--selected-color` → `--primary`, etc. | `variantColors.bg` |
| `stroke (checkmark)` | `--checkmark-color` → `--on-primary` | `variantColors.text` |

### 6.3 Slider (예정)

**CSS 파일**: `src/shared/components/styles/Slider.css`

| CSS 속성 | CSS 변수 | WebGL 매핑 (예정) |
|----------|----------|------------------|
| `height (track)` | `--track-height` | `sliderPreset.trackHeight` |
| `width/height (thumb)` | `--thumb-size` | `sliderPreset.thumbSize` |
| `background (track)` | `--surface-container` | `variantColors.trackBg` |
| `background (fill)` | `--primary` | `variantColors.fillBg` |

---

## 7. 구현 우선순위

### 7.1 Phase 1: CSS 동기화 완성 (현재)

이미 구현된 컴포넌트의 CSS 동기화 완성

| 컴포넌트 | Color | Size | 상태 |
|----------|-------|------|------|
| PixiButton | ✅ | ✅ | 완료 |
| PixiCheckbox | ✅ | ✅ | 완료 |
| PixiSlider | ✅ | ⬜ | Size 추가 필요 |
| PixiRadio | ✅ | ⬜ | Size 추가 필요 |
| PixiProgressBar | ✅ | ⬜ | Size 추가 필요 |

### 7.2 Phase 2: 신규 컴포넌트 (CSS 동기화 필수)

새로 마이그레이션할 컴포넌트

| 컴포넌트 | 복잡도 | CSS 파일 | 우선순위 |
|----------|--------|----------|----------|
| PixiToggleButton | 낮음 | ToggleButton.css | 🔴 1순위 |
| PixiToggleButtonGroup | 중간 | ToggleButton.css | 🔴 1순위 |
| PixiListBox | 중간 | ListBox.css | 🔴 1순위 |
| PixiMeter | 낮음 | Meter.css | 🟡 2순위 |
| PixiMenu | 높음 | Menu.css | 🟡 2순위 |
| PixiTabs | 높음 | Tabs.css | 🟢 3순위 |

### 7.3 Phase 3: 고급 컴포넌트

| 컴포넌트 | 복잡도 | CSS 파일 | 우선순위 |
|----------|--------|----------|----------|
| PixiTree | 높음 | Tree.css | 🟢 3순위 |
| PixiTable | 높음 | Table.css | 🟢 3순위 |
| PixiComboBox | 높음 | ComboBox.css | 🟢 3순위 |

---

## 8. 파일 구조

```
src/builder/workspace/canvas/
├── utils/
│   └── cssVariableReader.ts    # 🔑 CSS 동기화 핵심
│       ├── getCSSVariable()
│       ├── parseCSSValue()
│       ├── getVariantColors()
│       ├── getSizePreset()          # Button
│       ├── getCheckboxSizePreset()  # Checkbox
│       ├── getSliderSizePreset()    # (예정)
│       └── getRadioSizePreset()     # (예정)
│
├── ui/
│   ├── PixiButton.tsx          # ✅ CSS 동기화 완료
│   ├── PixiCheckbox.tsx        # ✅ CSS 동기화 완료
│   ├── PixiCheckboxGroup.tsx
│   ├── PixiRadio.tsx
│   ├── PixiSlider.tsx
│   └── ...
│
└── sprites/
    └── styleConverter.ts       # CSS 값 파싱 유틸리티
```

---

## 9. 참고 자료

### CSS 파일 위치
- **React Aria 컴포넌트 CSS**: `src/shared/components/styles/`
- **공통 토큰**: `src/builder/styles/1-theme/shared-tokens.css`
- **M3 색상**: `src/builder/styles/1-theme/m3-tokens.css`

### WebGL 구현체
- **PixiJS 컴포넌트**: `src/builder/workspace/canvas/ui/`
- **CSS 변수 리더**: `src/builder/workspace/canvas/utils/cssVariableReader.ts`
- **Drawing 유틸**: `src/builder/workspace/canvas/utils/graphicsUtils.ts`

### @pixi/ui 문서
- [FancyButton](https://pixijs.io/ui/storybook/?path=/story/fancybutton--simple)
- [Slider](https://pixijs.io/ui/storybook/?path=/story/slider--single)
- [Input](https://pixijs.io/ui/storybook/?path=/story/input--single)
