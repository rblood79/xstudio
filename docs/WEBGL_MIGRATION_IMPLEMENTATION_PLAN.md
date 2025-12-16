# WebGL Component Migration Implementation Plan

> **Created**: 2025-12-16
> **Updated**: 2025-12-16
> **Status**: In Progress

---

## 1. 핵심 목적

### 1.1 왜 동일해야 하는가? (WYSIWYG)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   빌더 (편집)                          퍼블리싱 (배포)                  │
│   ━━━━━━━━━━━━                         ━━━━━━━━━━━━━━                   │
│   WebGL Canvas                         iframe Preview → 실제 웹사이트  │
│   (PixiJS 렌더링)                      (React Aria + CSS)              │
│                                                                         │
│                         ⚠️ 달라지면 안됨!                               │
│                                                                         │
│   사용자가 빌더에서 본 것 = 배포된 결과물                               │
│                                                                         │
│   예시:                                                                 │
│   ❌ 빌더에서 버튼이 파란색 → 배포하면 다른 색                          │
│   ❌ 빌더에서 패딩이 8px → 배포하면 12px                                │
│   ❌ 빌더에서 폰트 14px → 배포하면 16px                                 │
│                                                                         │
│   ✅ 빌더에서 보이는 것 = 배포 결과 (WYSIWYG)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Goal: iframe Preview ≡ WebGL Canvas

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

### 1.3 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Single Source of Truth** | 모든 스타일 값은 CSS 파일에서 정의 |
| **No Hardcoding** | WebGL 컴포넌트에 색상/크기 하드코딩 금지 |
| **Dynamic Reading** | `cssVariableReader.ts`를 통해 런타임에 CSS 변수 읽기 |
| **Visual Parity** | 스타일시트 변경 시 양쪽 모두 동일하게 반영 |

### 1.4 성공 기준

- [ ] CSS 변수 변경 시 iframe과 WebGL이 동일하게 업데이트
- [ ] variant (primary, secondary, etc.) 적용 시 동일한 색상
- [ ] size (sm, md, lg) 적용 시 동일한 크기
- [ ] hover, pressed, disabled 상태 시 동일한 시각적 피드백

### 1.5 iframe 컴포넌트 렌더링 구조

#### 컴포넌트 파일 구조

```
src/shared/components/
├── Button.tsx              # React Aria + tv() 래퍼
├── Checkbox.tsx
├── Slider.tsx
├── ...
└── styles/
    ├── Button.css          # 컴포넌트 CSS (CSS 변수 사용)
    ├── Checkbox.css
    └── ...
```

#### tv() (tailwind-variants) 패턴

모든 컴포넌트는 `tv()`를 사용하여 className을 동적으로 생성:

```typescript
// src/shared/components/Button.tsx
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'react-aria-Button',      // 기본 클래스
  variants: {
    variant: {
      default: '',
      primary: 'primary',         // 추가 클래스
      secondary: 'secondary',
      // ...
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'sm',
  },
});

// 사용
className={button({ variant: 'primary', size: 'md' })}
// 결과: "react-aria-Button primary md"
```

#### className → CSS 매칭

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Button.tsx                                                             │
│  button({ variant: 'primary', size: 'md' })                            │
│  → className="react-aria-Button primary md"                            │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Button.css                                                             │
│                                                                         │
│  .react-aria-Button {              ← base 스타일                        │
│    font-size: var(--text-sm);                                          │
│    padding: var(--spacing) var(--spacing-md);                          │
│  }                                                                      │
│                                                                         │
│  .react-aria-Button.primary {      ← variant 스타일                     │
│    background: var(--primary);                                         │
│    color: var(--on-primary);                                           │
│  }                                                                      │
│                                                                         │
│  .react-aria-Button.md {           ← size 스타일                        │
│    padding: var(--spacing-sm) var(--spacing-xl);                       │
│    font-size: var(--text-base);                                        │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### WebGL 컴포넌트가 해야 할 일

iframe에서 CSS가 자동으로 적용하는 것을 WebGL에서는 수동으로 구현해야 함:

| iframe (자동) | WebGL (수동 구현) |
|---------------|-------------------|
| `.primary { background: var(--primary) }` | `getVariantColors('primary').bg` |
| `.md { font-size: var(--text-base) }` | `getSizePreset('md').fontSize` |
| `.md { padding: var(--spacing-sm) }` | `getSizePreset('md').paddingY` |
| `:hover { background: var(--primary-hover) }` | `onPointerEnter` → `variantColors.bgHover` |

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

---

## 10. 구현 완료 내역

### 10.1 2025-12-16: CSS 동기화 시스템 구축

#### 핵심 유틸리티 구현

**파일**: `src/builder/workspace/canvas/utils/cssVariableReader.ts`

| 함수 | 설명 | 상태 |
|------|------|------|
| `getCSSVariable(varName)` | CSS 변수 값 읽기 | ✅ |
| `parseCSSValue(value, fallback)` | rem/px → 숫자 변환 | ✅ |
| `getVariantColors(variant)` | M3 색상 프리셋 | ✅ |
| `getSizePreset(size)` | Button 크기 프리셋 | ✅ |
| `getCheckboxSizePreset(size)` | Checkbox 크기 프리셋 | ✅ |

#### PixiButton 업데이트

**파일**: `src/builder/workspace/canvas/ui/PixiButton.tsx`

- ❌ 기존: 하드코딩된 `SIZE_PRESETS` 상수
- ✅ 변경: `getSizePreset(size)` 사용으로 CSS 변수 동적 읽기

```typescript
// Before (하드코딩)
const SIZE_PRESETS = {
  sm: { fontSize: 14, paddingX: 12, paddingY: 8 },
  md: { fontSize: 16, paddingX: 20, paddingY: 10 },
};

// After (CSS 변수 동적 읽기)
const sizePreset = getSizePreset(size);
```

#### PixiCheckbox 업데이트

**파일**: `src/builder/workspace/canvas/ui/PixiCheckbox.tsx`

- ❌ 기존: 하드코딩된 boxSize 계산
- ✅ 변경: `getCheckboxSizePreset(size)` 사용

```typescript
// Before (하드코딩)
if (size === 'sm') return 16;
if (size === 'md') return 20;
if (size === 'lg') return 24;

// After (CSS 변수 동적 읽기)
const sizePreset = getCheckboxSizePreset(size);
const boxSize = sizePreset.boxSize;
```

### 10.2 CSS 변수 매핑 테이블

#### Button Size 매핑

| Size | fontSize | paddingY | paddingX | borderRadius |
|------|----------|----------|----------|--------------|
| xs | `--text-2xs` | `--spacing-2xs` | `--spacing-sm` | `--radius-sm` |
| sm | `--text-sm` | `--spacing` | `--spacing-md` | `--radius-sm` |
| md | `--text-base` | `--spacing-sm` | `--spacing-xl` | `--radius-md` |
| lg | `--text-lg` | `--spacing-md` | `--spacing-2xl` | `--radius-lg` |
| xl | `--text-xl` | `--spacing-lg` | `--spacing-3xl` | `--radius-lg` |

#### Checkbox Size 매핑

| Size | boxSize | fontSize | gap | strokeWidth |
|------|---------|----------|-----|-------------|
| sm | 16px | `--text-sm` | 6px | 2px |
| md | 20px | `--text-base` | 8px | 2.5px |
| lg | 24px | `--text-lg` | 10px | 3px |

### 10.3 검증 결과

- [x] TypeScript 컴파일 성공 (`npx tsc --noEmit`)
- [x] PixiButton: CSS 변수에서 동적으로 크기 읽기 확인
- [x] PixiCheckbox: CSS 변수에서 동적으로 크기 읽기 확인
- [ ] 시각적 동일성 테스트 (iframe vs WebGL) - 수동 검증 필요

### 10.4 Git 커밋 기록

| 커밋 | 메시지 |
|------|--------|
| `be9f4d8` | feat(canvas): implement dynamic CSS variable reading for WebGL component sizes |
| `2642f9e` | docs: restructure WebGL migration plan with core objective |
| `8cdccd9` | docs: add iframe component rendering structure to migration plan |
| `44807b5` | docs: add WYSIWYG rationale to migration plan |

---

## 11. 마스터 플랜: 최종 완료까지의 로드맵

### 11.0 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WebGL Component Migration                            │
│                              Master Plan                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 0: 기반 시스템                                                        │
│  ━━━━━━━━━━━━━━━━━━━                                                        │
│  cssVariableReader.ts 완성 (모든 컴포넌트용 프리셋 함수)                      │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 1: 기존 컴포넌트 동기화                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                  │
│  Slider, Radio, ProgressBar, Input, Select 등 Size 동기화                   │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 2: 신규 컴포넌트 (Selection)                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                            │
│  ToggleButton, ToggleButtonGroup, ListBox, GridList                         │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 3: 신규 컴포넌트 (Layout)                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                               │
│  Tabs, Menu, Breadcrumbs                                                    │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 4: 고급 컴포넌트                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━                                                       │
│  Tree, Table, ComboBox, DatePicker                                          │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 5: 검증 및 최적화                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━                                                     │
│  시각적 동일성 테스트, 성능 최적화, 문서화                                    │
│                          │                                                  │
│                          ▼                                                  │
│  ✅ 완료: WYSIWYG 달성                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.1 Phase 0: 기반 시스템 완성

> **목표**: cssVariableReader.ts를 모든 컴포넌트가 사용할 수 있도록 확장

#### 작업 내역

| 작업 | 설명 | 상태 |
|------|------|------|
| `getCSSVariable()` | CSS 변수 읽기 기본 함수 | ✅ 완료 |
| `parseCSSValue()` | rem/px → 숫자 변환 | ✅ 완료 |
| `getVariantColors()` | M3 색상 프리셋 | ✅ 완료 |
| `getSizePreset()` | Button 크기 | ✅ 완료 |
| `getCheckboxSizePreset()` | Checkbox 크기 | ✅ 완료 |
| `getSliderSizePreset()` | Slider 크기 | ⬜ 예정 |
| `getRadioSizePreset()` | Radio 크기 | ⬜ 예정 |
| `getProgressBarSizePreset()` | ProgressBar 크기 | ⬜ 예정 |
| `getInputSizePreset()` | Input 크기 | ⬜ 예정 |
| `getToggleButtonSizePreset()` | ToggleButton 크기 | ⬜ 예정 |

#### 완료 조건

- [ ] 모든 프리셋 함수가 해당 CSS 파일의 변수와 1:1 매핑
- [ ] TypeScript 타입 정의 완료
- [ ] 단위 테스트 (선택적)

---

### 11.2 Phase 1: 기존 컴포넌트 CSS 동기화

> **목표**: 이미 구현된 WebGL 컴포넌트들의 하드코딩 제거, CSS 동기화 완성

#### 대상 컴포넌트

| 컴포넌트 | Color | Size | 작업 내용 |
|----------|-------|------|-----------|
| PixiButton | ✅ | ✅ | 완료 |
| PixiCheckbox | ✅ | ✅ | 완료 |
| PixiCheckboxGroup | ✅ | ⬜ | Size 프리셋 적용 |
| PixiRadio | ✅ | ⬜ | Size 프리셋 적용 |
| PixiSlider | ✅ | ⬜ | Size 프리셋 적용 |
| PixiProgressBar | ✅ | ⬜ | Size 프리셋 적용 |
| PixiInput | ⬜ | ⬜ | Color + Size 프리셋 적용 |
| PixiSelect | ⬜ | ⬜ | Color + Size 프리셋 적용 |

#### 각 컴포넌트 작업 순서

```
1. CSS 파일 분석 (src/shared/components/styles/{Component}.css)
2. cssVariableReader.ts에 프리셋 함수 추가
3. PixiComponent에서 프리셋 사용하도록 수정
4. 하드코딩된 값 제거
5. TypeScript 컴파일 확인
```

#### 완료 조건

- [ ] 모든 기존 컴포넌트에서 하드코딩된 색상/크기 값 제거
- [ ] 모든 variant/size 조합이 CSS 변수에서 동적으로 읽힘

---

### 11.3 Phase 2: Selection 컴포넌트 마이그레이션

> **목표**: 선택 관련 신규 컴포넌트 구현

#### 대상 컴포넌트

| 컴포넌트 | 패턴 | CSS 파일 | 복잡도 |
|----------|------|----------|--------|
| PixiToggleButton | A | ToggleButton.css | 낮음 |
| PixiToggleButtonGroup | C | ToggleButton.css | 중간 |
| PixiListBox | C | ListBox.css | 중간 |
| PixiGridList | C | GridList.css | 중간 |

#### 구현 순서

```
1. ToggleButton (Pattern A - 가장 단순)
   ├── CSS 분석
   ├── getToggleButtonSizePreset() 추가
   ├── PixiToggleButton.tsx 생성
   └── ElementSprite.tsx에 등록

2. ToggleButtonGroup (Pattern C - ToggleButton 기반)
   ├── Store에서 자식 요소 읽기
   ├── ToggleButton 자식 렌더링
   └── 그룹 variant/size 전달

3. ListBox (Pattern C - 스크롤 필요)
   ├── ScrollBox 연동
   ├── ListBoxItem 렌더링
   └── 선택 상태 관리

4. GridList (ListBox 확장)
   ├── 그리드 레이아웃 계산
   └── columns prop 지원
```

#### 완료 조건

- [ ] 모든 Selection 컴포넌트가 iframe과 동일하게 렌더링
- [ ] 선택/해제 상태가 정상 동작
- [ ] 그룹 컴포넌트의 자식 렌더링 정상

---

### 11.4 Phase 3: Layout 컴포넌트 마이그레이션

> **목표**: 레이아웃/네비게이션 컴포넌트 구현

#### 대상 컴포넌트

| 컴포넌트 | 패턴 | CSS 파일 | 복잡도 |
|----------|------|----------|--------|
| PixiTabs | C | Tabs.css | 높음 |
| PixiMenu | C | Menu.css | 높음 |
| PixiBreadcrumbs | C | Breadcrumbs.css | 중간 |

#### 구현 순서

```
1. Breadcrumbs (가장 단순한 Layout)
   ├── 아이템 가로 배열
   ├── 구분자 (/) 렌더링
   └── 현재 위치 표시

2. Menu (중첩 구조)
   ├── MenuItem 렌더링
   ├── 하위 메뉴 지원
   └── hover/선택 상태

3. Tabs (가장 복잡)
   ├── TabList (탭 버튼들)
   ├── TabPanel (콘텐츠 영역)
   ├── Tab-Panel 매칭 (tabId)
   └── 선택된 탭만 Panel 표시
```

#### 완료 조건

- [ ] Tab 선택 시 해당 Panel 표시
- [ ] Menu 아이템 클릭 정상 동작
- [ ] Breadcrumbs 네비게이션 정상

---

### 11.5 Phase 4: 고급 컴포넌트 마이그레이션

> **목표**: 복잡한 고급 컴포넌트 구현

#### 대상 컴포넌트

| 컴포넌트 | 패턴 | CSS 파일 | 복잡도 |
|----------|------|----------|--------|
| PixiTree | C + 재귀 | Tree.css | 높음 |
| PixiTable | C + 복잡 | Table.css | 매우 높음 |
| PixiComboBox | B + C | ComboBox.css | 높음 |
| PixiDatePicker | B + C | DatePicker.css | 매우 높음 |

#### 구현 순서

```
1. Tree (재귀 렌더링)
   ├── TreeItem 재귀 렌더링
   ├── 펼침/접기 상태
   ├── 들여쓰기 계산
   └── 화살표 아이콘

2. Table (가장 복잡)
   ├── Column 헤더 렌더링
   ├── Row/Cell 렌더링
   ├── 정렬/필터 상태
   └── 가상 스크롤 (선택적)

3. ComboBox (입력 + 드롭다운)
   ├── Input 컴포넌트 연동
   ├── ListBox 드롭다운
   └── 필터링 로직

4. DatePicker (최고 복잡도)
   ├── Calendar 그리드
   ├── 월/년 네비게이션
   └── 날짜 선택 로직
```

#### 완료 조건

- [ ] Tree 펼침/접기 정상
- [ ] Table 데이터 렌더링 및 정렬
- [ ] ComboBox 필터링 및 선택
- [ ] DatePicker 날짜 선택

---

### 11.6 Phase 5: 검증 및 최적화

> **목표**: 시각적 동일성 검증, 성능 최적화, 문서화

#### 5.1 시각적 동일성 검증

```
각 컴포넌트에 대해:
┌─────────────────────────────────────────────────────────┐
│  1. iframe에서 렌더링                                   │
│  2. WebGL에서 렌더링                                    │
│  3. 스크린샷 비교                                       │
│  4. 차이점 수정                                         │
│  5. 모든 variant/size 조합 테스트                       │
└─────────────────────────────────────────────────────────┘
```

| 검증 항목 | 체크리스트 |
|-----------|-----------|
| 색상 동일성 | ☐ default, primary, secondary, surface 등 |
| 크기 동일성 | ☐ xs, sm, md, lg, xl |
| 상태 동일성 | ☐ hover, pressed, disabled, selected |
| 간격 동일성 | ☐ padding, margin, gap |
| 폰트 동일성 | ☐ fontSize, fontWeight, lineHeight |
| 테두리 동일성 | ☐ borderWidth, borderColor, borderRadius |

#### 5.2 성능 최적화

| 최적화 항목 | 목표 |
|-------------|------|
| 60fps 유지 | 100개 컴포넌트 렌더링 시 |
| 메모리 누수 없음 | cleanup 함수 확인 |
| 불필요한 리렌더링 없음 | useMemo/useCallback 최적화 |

#### 5.3 문서화

- [ ] 각 컴포넌트별 CSS 매핑 테이블 완성
- [ ] 신규 컴포넌트 추가 가이드
- [ ] 트러블슈팅 가이드

---

### 11.7 전체 진행률 추적

```
Phase 0: 기반 시스템      [████████░░] 80%  (5/6 함수)
Phase 1: 기존 동기화      [████░░░░░░] 40%  (2/5 컴포넌트)
Phase 2: Selection        [░░░░░░░░░░] 0%   (0/4 컴포넌트)
Phase 3: Layout           [░░░░░░░░░░] 0%   (0/3 컴포넌트)
Phase 4: 고급             [░░░░░░░░░░] 0%   (0/4 컴포넌트)
Phase 5: 검증             [░░░░░░░░░░] 0%   (대기)
─────────────────────────────────────────────────────────
전체 진행률              [██░░░░░░░░] 20%
```

---

### 11.8 다음 즉시 실행 항목

**우선순위 1**: Phase 0 완성
```
1. Slider.css 분석 → getSliderSizePreset() 구현
2. Radio.css 분석 → getRadioSizePreset() 구현
3. ProgressBar.css 분석 → getProgressBarSizePreset() 구현
```

**우선순위 2**: Phase 1 완성
```
4. PixiSlider에 Size 프리셋 적용
5. PixiRadio에 Size 프리셋 적용
6. PixiProgressBar에 Size 프리셋 적용
```

**우선순위 3**: Phase 2 시작
```
7. PixiToggleButton 구현
8. PixiToggleButtonGroup 구현
```
