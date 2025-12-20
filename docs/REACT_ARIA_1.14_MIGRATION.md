# React Aria 1.14.0 마이그레이션 & 스타일 시스템 최적화

## 개요

**문서 버전**: 2025-12-20
**현재 버전**: react-aria-components ^1.13.0
**목표 버전**: react-aria-components ^1.14.0

### 목표

1. **React Aria 1.14.0 업그레이드** - 최신 기능 활용
2. **React Spectrum 패턴 전환** - data-* 속성 기반 스타일링
3. **StyleValues 분할 최적화** - 스타일 패널 성능 75% 개선

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Element Store                                 │
├─────────────────────────────────┬───────────────────────────────────┤
│          props (컴포넌트)        │          style (CSS)              │
│  { variant, size, children }    │  { width, height, backgroundColor }│
└─────────────────────────────────┴───────────────────────────────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────────────────┐  ┌───────────────────────────────────┐
│   작업 A: React Spectrum 패턴   │  │   작업 B: StyleValues 분할         │
│   (data-* 속성 전환)            │  │   (섹션별 훅 분리)                 │
├─────────────────────────────────┤  ├───────────────────────────────────┤
│ 영향: 컴포넌트 TSX + CSS        │  │ 영향: 스타일 패널 훅               │
│ 파일: 86개 (TSX 43 + CSS 43)   │  │ 파일: 4개 (새 훅 생성)            │
└─────────────────────────────────┘  └───────────────────────────────────┘
              │                                    │
              │          ✅ 독립적 영역            │
              └────────────────────────────────────┘
```

---

## Part 1: React Aria 1.14.0 업그레이드

### 1.1 현재 버전 상태

| 패키지 | 현재 버전 | 목표 버전 | 변경 필요 |
|--------|-----------|-----------|-----------|
| `react-aria-components` | ^1.13.0 | ^1.14.0 | ❌ 없음 |
| `@react-aria/focus` | ^3.21.2 | 최신 | ❌ 없음 |
| `@react-aria/i18n` | ^3.12.13 | 최신 | ❌ 없음 |
| `@react-aria/utils` | ^3.31.0 | 최신 | ❌ 없음 |
| `react-stately` | ^3.42.0 | 최신 | ❌ 없음 |

### 1.2 v1.14.0 주요 변경사항

| 변경 유형 | 내용 |
|-----------|------|
| 새 기능 | Tab 애니메이션 전환 지원 |
| 새 기능 | Spectrum 2 안정화 버전 출시 |
| 문서 | 새로운 웹사이트 및 문서 재설계 |
| Deprecated | `Section` → `ListBoxSection`, `MenuSection`, `SelectSection` 분리 |

### 1.3 마이그레이션 필요 항목

#### ⚠️ Deprecated `Section` 사용 (1개 파일)

**파일**: `src/stories/Select.stories.tsx`

```tsx
// Before (deprecated)
import { Form, Section, Header } from 'react-aria-components';

<Section>
  <Header>과일</Header>
  <SelectItem id="apple">사과</SelectItem>
</Section>

// After (v1.14.0 권장)
import { Form, ListBoxSection, Header } from 'react-aria-components';

<ListBoxSection>
  <Header>과일</Header>
  <SelectItem id="apple">사과</SelectItem>
</ListBoxSection>
```

### 1.4 업그레이드 명령

```bash
pnpm update react-aria-components@^1.14.0
```

### 1.5 검증 체크리스트

- [ ] 빌드 성공 확인
- [ ] Storybook 정상 동작 확인
- [ ] 기존 컴포넌트 동작 테스트

---

## Part 2: React Spectrum 패턴 전환 (data-* 속성)

### 2.1 현재 패턴 vs 목표 패턴

#### 현재 (Class 기반)

```tsx
// Button.tsx
const button = tv({
  variants: {
    variant: { primary: 'primary', secondary: 'secondary' },
    size: { sm: 'sm', md: 'md' },
  },
});

<RACButton className={button({ variant, size })} />
// 결과: class="react-aria-Button primary sm"
```

```css
/* Button.css */
.react-aria-Button.primary { background: var(--primary); }
.react-aria-Button.sm { padding: var(--spacing); }
```

#### 목표 (data-* 속성 기반)

```tsx
// Button.tsx
<RACButton
  data-variant={variant}
  data-size={size}
  className="react-aria-Button"
/>
// 결과: data-variant="primary" data-size="sm" class="react-aria-Button"
```

```css
/* Button.css */
.react-aria-Button[data-variant="primary"] { background: var(--primary); }
.react-aria-Button[data-size="sm"] { padding: var(--spacing); }
```

### 2.2 전환 이점

| 기준 | Class 방식 (현재) | data-* 방식 (Spectrum) |
|------|-------------------|------------------------|
| **충돌 가능성** | ⚠️ `.sm` 클래스 충돌 가능 | ✅ 충돌 없음 |
| **일관성** | React Aria 상태와 다른 패턴 | ✅ `data-pressed`, `data-hovered`와 통일 |
| **DevTools** | `class="... primary sm"` | `data-variant="primary"` 명확 |
| **tailwind-variants** | ✅ 필요 | ❌ 제거 가능 |

### 2.3 전환 대상 파일 (86개)

#### TSX 파일 (43개)

| 컴포넌트 그룹 | 파일 수 | 예시 |
|---------------|---------|------|
| **Form 컴포넌트** | 15 | Button, TextField, Select, ComboBox, Checkbox... |
| **Date 컴포넌트** | 5 | Calendar, DatePicker, DateField, TimeField... |
| **Layout 컴포넌트** | 8 | Card, Dialog, Modal, Popover, Tabs... |
| **Collection 컴포넌트** | 8 | ListBox, Menu, GridList, Table, Tree... |
| **기타** | 7 | Badge, Link, Separator, ProgressBar... |

#### CSS 파일 (43개)

| 위치 | 파일 수 |
|------|---------|
| `src/shared/components/styles/` | 43 |

### 2.4 전환 변환 규칙

```
TSX 변환:
  className={tv({ variant, size })}
  →
  data-variant={variant} data-size={size} className="react-aria-Button"

CSS 변환:
  .react-aria-Button.primary → .react-aria-Button[data-variant="primary"]
  .react-aria-Button.sm → .react-aria-Button[data-size="sm"]
```

### 2.5 연계 지점 분석

| 영역 | 파일 수 | 전환 영향 |
|------|---------|-----------|
| **Property Editors** | 47 | ❌ 없음 (props 저장 방식 동일) |
| **Styles Panel** | 5 | ❌ 없음 (CSS 스타일만 다룸) |
| **React Components (TSX)** | 43 | ✅ 수정 필요 |
| **Pixi Canvas UI** | 56 | ❌ 없음 (props에서 읽음) |
| **CSS Files** | 43 | ✅ 수정 필요 |

### 2.6 전환 전략

#### Option A: 자동화 스크립트 (권장)

```bash
# 1. TSX 변환 스크립트
# className={tv({ variant, size })} → data-variant={variant} data-size={size}

# 2. CSS 변환 스크립트
# .react-aria-Button.primary → .react-aria-Button[data-variant="primary"]
```

#### Option B: 점진적 전환

1. Button 컴포넌트 먼저 테스트
2. 검증 후 나머지 컴포넌트 일괄 적용

---

## Part 3: StyleValues 분할 최적화

> **참조**: [STYLE_PANEL_PARSING_OPTIMIZATION.md](research/STYLE_PANEL_PARSING_OPTIMIZATION.md)

### 3.1 현재 문제

- `useStyleValues()` 훅이 28개 속성을 한 번에 계산
- 단일 속성 변경 시에도 전체 재계산 발생
- 4개 섹션 모두 리렌더링

### 3.2 최적화 목표

| 시나리오 | Before | After | 개선 |
|---------|--------|-------|------|
| width 변경 | 28개 속성 재계산 | 4개 속성 재계산 | 86% 감소 |
| backgroundColor 변경 | 28개 속성 재계산 | 5개 속성 재계산 | 82% 감소 |
| fontSize 변경 | 28개 속성 재계산 | 11개 속성 재계산 | 61% 감소 |

### 3.3 섹션별 훅 분리

```typescript
// 신규 훅 구조
export function useTransformValues(selectedElement): TransformStyleValues | null
export function useLayoutValues(selectedElement): LayoutStyleValues | null
export function useAppearanceValues(selectedElement): AppearanceStyleValues | null
export function useTypographyValues(selectedElement): TypographyStyleValues | null
```

| Section | 속성 | 개수 |
|---------|------|------|
| **Transform** | width, height, top, left | 4개 |
| **Layout** | display, flexDirection, alignItems, justifyContent, gap, padding*, margin*, flexWrap | 15개 |
| **Appearance** | backgroundColor, borderColor, borderWidth, borderRadius, borderStyle | 5개 |
| **Typography** | fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, color, textAlign, textDecoration, textTransform, verticalAlign | 11개 |

### 3.4 colord 도입

**목적**: 색상 파싱/변환 안정화

**설치**:
```bash
pnpm add colord
```

**적용 위치**:
- `src/builder/panels/styles/` - 스타일 패널
- `src/builder/workspace/canvas/utils/cssVariableReader.ts` - Pixi Canvas

```typescript
// Before
function cssColorToHex(color: string, fallback: number): number {
  // 직접 파싱 로직
}

// After
import { colord } from 'colord';

function cssColorToHex(color: string, fallback: number): number {
  const parsed = colord(color);
  if (!parsed.isValid()) return fallback;
  return parseInt(parsed.toHex().slice(1), 16);
}
```

---

## Part 4: 실행 계획

### 4.1 의존성 분석

```
Part 1 (v1.14.0 업그레이드) ─────────────────────┐
                                                  │
Part 2 (data-* 패턴 전환) ────────┐               │ 독립
                                  │               │
Part 3 (StyleValues 최적화) ──────┴───────────────┘
```

**결론**: 세 작업은 **독립적**으로 병렬 진행 가능

### 4.2 권장 실행 순서

| 순서 | 작업 | 예상 규모 | 이유 |
|------|------|-----------|------|
| 1 | Part 1: v1.14.0 업그레이드 | 1개 파일 | 즉시 적용 가능 |
| 2 | Part 3: StyleValues 최적화 | 4개 훅 생성 | 성능 75% 개선, 독립적 |
| 2 | Part 3-2: colord 도입 | 2개 파일 수정 | 색상 파싱 통합 |
| 3 | Part 2: data-* 패턴 전환 | 86개 파일 | 대규모, 스크립트 필요 |

### 4.3 Phase별 상세 계획

#### Phase 1: 즉시 적용 (1일)

```bash
# 1. React Aria 업그레이드
pnpm update react-aria-components@^1.14.0

# 2. Section → ListBoxSection 수정 (1개 파일)
# src/stories/Select.stories.tsx

# 3. 빌드 및 테스트
pnpm build && pnpm test
```

#### Phase 2: StyleValues 최적화 (2-3일)

**생성할 파일**:
```
src/builder/panels/styles/hooks/
├── useTransformValues.ts   (신규)
├── useLayoutValues.ts      (신규)
├── useAppearanceValues.ts  (신규)
├── useTypographyValues.ts  (신규)
└── useStyleValues.ts       (기존 - 호환성 유지)
```

**수정할 파일**:
```
src/builder/panels/styles/sections/
├── TransformSection.tsx    (새 훅 사용)
├── LayoutSection.tsx       (새 훅 사용)
├── AppearanceSection.tsx   (새 훅 사용)
└── TypographySection.tsx   (새 훅 사용)
```

#### Phase 3: colord 도입 (1일)

```bash
pnpm add colord
```

**수정할 파일**:
- `src/builder/panels/styles/utils/colorParser.ts` (신규 또는 기존 수정)
- `src/builder/workspace/canvas/utils/cssVariableReader.ts`

#### Phase 4: data-* 패턴 전환 (3-5일)

**자동화 스크립트 작성**:
```
scripts/
├── migrate-tsx-to-data-attrs.ts
└── migrate-css-to-data-attrs.ts
```

**전환 순서**:
1. Button 컴포넌트 수동 전환 및 테스트
2. 자동화 스크립트 작성 및 검증
3. 나머지 42개 컴포넌트 일괄 전환
4. CSS 파일 일괄 전환
5. 전체 테스트

---

## Part 5: 기존 1.13 업데이트 작업 상태

> **참조**: [REACT_ARIA_1.13_UPDATE.md](REACT_ARIA_1.13_UPDATE.md)

### 5.1 완료된 작업

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 3 | Select Multi-Selection | ✅ 완료 |
| Phase 5 | ListBox Filtering | ✅ 완료 |

### 5.2 진행 중/예정 작업

| Phase | 내용 | 상태 | 영향 |
|-------|------|------|------|
| Phase 1 | CSS 애니메이션 | ⏳ 예정 | data-* 전환과 무관 |
| Phase 2 | Props 확장 | ⏳ 예정 | data-* 전환과 무관 |
| Phase 4 | SelectionIndicator | ⏳ 예정 | data-* 전환 후 진행 권장 |
| Phase 6 | Property 컴포넌트 | ⏳ 예정 | data-* 전환과 무관 |

---

## Part 6: 검증 체크리스트

### 6.1 v1.14.0 업그레이드

- [ ] `pnpm update react-aria-components@^1.14.0` 실행
- [ ] 빌드 성공 확인
- [ ] `Section` → `ListBoxSection` 수정 (Select.stories.tsx)
- [ ] Storybook 정상 동작 확인

### 6.2 StyleValues 최적화

- [ ] 4개 섹션별 훅 생성
- [ ] 각 Section 컴포넌트에서 새 훅 사용
- [ ] 스타일 패널 성능 측정 (DevTools Profiler)
- [ ] 기존 동작 regression 없음 확인

### 6.3 colord 도입

- [ ] colord 설치 (`pnpm add colord`)
- [ ] 스타일 패널 색상 파싱 적용
- [ ] Pixi Canvas 색상 파싱 적용
- [ ] 색상 변환 정확성 테스트

### 6.4 data-* 패턴 전환

- [ ] Button 컴포넌트 수동 전환 및 테스트
- [ ] 자동화 스크립트 작성
- [ ] TSX 43개 파일 전환
- [ ] CSS 43개 파일 전환
- [ ] tailwind-variants 의존성 제거 검토
- [ ] 전체 Storybook 테스트
- [ ] Pixi Canvas 정상 동작 확인
- [ ] Property Editor 정상 동작 확인

---

## Part 7: 세부 구현 명세

### 7.1 Button 컴포넌트 변환 예시 (대표 사례)

#### Before: Button.tsx (현재)

```tsx
import { tv } from "tailwind-variants";

const button = tv({
  base: "react-aria-Button",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      // ...
    },
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      // ...
    },
  },
});

<RACButton
  className={composeRenderProps(
    props.className,
    (className, renderProps) => {
      return button({
        ...renderProps,
        variant: props.variant,
        size,
        className,
      });
    }
  )}
>
```

#### After: Button.tsx (전환 후)

```tsx
// tailwind-variants import 제거

<RACButton
  data-variant={variant || "default"}
  data-size={size || "sm"}
  className={composeRenderProps(
    props.className,
    (className) => `react-aria-Button ${className || ""}`
  )}
>
```

#### Before: Button.css (현재)

```css
.react-aria-Button {
  /* 기본 스타일 */
}

/* Class 기반 variant */
&.primary {
  background: var(--primary);
  color: var(--on-primary);
}

&.secondary {
  background: var(--secondary);
  color: var(--on-secondary);
}

/* Class 기반 size */
&.sm {
  padding: var(--spacing) var(--spacing-md);
  font-size: var(--text-sm);
}

&.md {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-base);
}
```

#### After: Button.css (전환 후)

```css
.react-aria-Button {
  /* 기본 스타일 - 동일 */
}

/* data-* 속성 기반 variant */
&[data-variant="primary"] {
  background: var(--primary);
  color: var(--on-primary);
}

&[data-variant="secondary"] {
  background: var(--secondary);
  color: var(--on-secondary);
}

/* data-* 속성 기반 size */
&[data-size="sm"] {
  padding: var(--spacing) var(--spacing-md);
  font-size: var(--text-sm);
}

&[data-size="md"] {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-base);
}
```

---

### 7.2 전체 컴포넌트 변환 목록

#### Form 컴포넌트 (15개)

| 파일 | variant 옵션 | size 옵션 |
|------|--------------|-----------|
| `Button.tsx` | default, primary, secondary, tertiary, error, surface, outline, ghost | xs, sm, md, lg, xl |
| `TextField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `Select.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `ComboBox.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `Checkbox.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `CheckboxGroup.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `Radio.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `RadioGroup.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `Switch.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `Slider.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `NumberField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `SearchField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `ToggleButton.tsx` | default, primary, secondary, tertiary, error, surface | xs, sm, md, lg, xl |
| `ToggleButtonGroup.tsx` | default, primary, secondary, tertiary, error, surface | xs, sm, md, lg, xl |
| `Link.tsx` | primary, secondary, tertiary | sm, md, lg |

#### Date 컴포넌트 (5개)

| 파일 | variant 옵션 | size 옵션 |
|------|--------------|-----------|
| `Calendar.tsx` | primary | sm, md, lg |
| `DateField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `DatePicker.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `DateRangePicker.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |
| `TimeField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |

#### Layout 컴포넌트 (8개)

| 파일 | variant 옵션 | size 옵션 |
|------|--------------|-----------|
| `Card.tsx` | elevated, filled, outlined | sm, md, lg |
| `Dialog.tsx` | - | sm, md, lg, xl |
| `Modal.tsx` | - | sm, md, lg, xl |
| `Popover.tsx` | - | - |
| `Tooltip.tsx` | - | - |
| `Tabs.tsx` | primary, secondary | sm, md, lg |
| `Panel.tsx` | - | - |
| `Group.tsx` | - | - |

#### Collection 컴포넌트 (8개)

| 파일 | variant 옵션 | size 옵션 |
|------|--------------|-----------|
| `ListBox.tsx` | - | sm, md, lg |
| `Menu.tsx` | - | sm, md, lg |
| `GridList.tsx` | - | sm, md, lg |
| `Table.tsx` | - | sm, md, lg |
| `Tree.tsx` | - | sm, md, lg |
| `Breadcrumbs.tsx` | - | sm, md, lg |
| `TagGroup.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `Disclosure.tsx` | - | - |

#### 기타 컴포넌트 (7개)

| 파일 | variant 옵션 | size 옵션 |
|------|--------------|-----------|
| `Badge.tsx` | primary, secondary, tertiary, error, success, warning | sm, md, lg |
| `Separator.tsx` | - | - |
| `ProgressBar.tsx` | primary, secondary, tertiary, error | sm, md, lg |
| `Meter.tsx` | primary, secondary, tertiary, error, success, warning | sm, md, lg |
| `Skeleton.tsx` | - | sm, md, lg |
| `ColorPicker.tsx` | - | sm, md, lg |
| `ColorField.tsx` | primary, secondary, tertiary, error, filled | sm, md, lg |

---

### 7.3 CSS 선택자 변환 규칙

```
변환 패턴:
1. &.variant → &[data-variant="variant"]
2. &.size → &[data-size="size"]
3. 중첩 선택자도 동일하게 변환

예시:
  &.primary → &[data-variant="primary"]
  &.sm → &[data-size="sm"]
  &.primary[data-hovered] → &[data-variant="primary"][data-hovered]
```

#### 변환 스크립트 (scripts/migrate-css-to-data-attrs.ts)

```typescript
// CSS 변환 로직
const VARIANTS = [
  'default', 'primary', 'secondary', 'tertiary', 'error',
  'surface', 'outline', 'ghost', 'elevated', 'filled',
  'outlined', 'success', 'warning'
];
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];

function transformCSS(css: string): string {
  let result = css;

  // variant 변환: &.primary → &[data-variant="primary"]
  VARIANTS.forEach(variant => {
    result = result.replace(
      new RegExp(`&\\.${variant}(?![\\w-])`, 'g'),
      `&[data-variant="${variant}"]`
    );
  });

  // size 변환: &.sm → &[data-size="sm"]
  SIZES.forEach(size => {
    result = result.replace(
      new RegExp(`&\\.${size}(?![\\w-])`, 'g'),
      `&[data-size="${size}"]`
    );
  });

  return result;
}
```

---

### 7.4 StyleValues 분할 훅 상세 구현

#### useTransformValues.ts (신규)

```typescript
import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface TransformStyleValues {
  width: string;
  height: string;
  top: string;
  left: string;
}

export function useTransformValues(
  selectedElement: SelectedElement | null
): TransformStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      width: getStyleValue(selectedElement, 'width', ''),
      height: getStyleValue(selectedElement, 'height', ''),
      top: getStyleValue(selectedElement, 'top', ''),
      left: getStyleValue(selectedElement, 'left', ''),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.width,
    selectedElement?.style?.height,
    selectedElement?.style?.top,
    selectedElement?.style?.left,
  ]);
}
```

#### useLayoutValues.ts (신규)

```typescript
import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface LayoutStyleValues {
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  flexWrap: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

export function useLayoutValues(
  selectedElement: SelectedElement | null
): LayoutStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      display: getStyleValue(selectedElement, 'display', 'block'),
      flexDirection: getStyleValue(selectedElement, 'flexDirection', 'row'),
      alignItems: getStyleValue(selectedElement, 'alignItems', 'stretch'),
      justifyContent: getStyleValue(selectedElement, 'justifyContent', 'flex-start'),
      gap: getStyleValue(selectedElement, 'gap', ''),
      flexWrap: getStyleValue(selectedElement, 'flexWrap', 'nowrap'),
      paddingTop: getStyleValue(selectedElement, 'paddingTop', ''),
      paddingRight: getStyleValue(selectedElement, 'paddingRight', ''),
      paddingBottom: getStyleValue(selectedElement, 'paddingBottom', ''),
      paddingLeft: getStyleValue(selectedElement, 'paddingLeft', ''),
      marginTop: getStyleValue(selectedElement, 'marginTop', ''),
      marginRight: getStyleValue(selectedElement, 'marginRight', ''),
      marginBottom: getStyleValue(selectedElement, 'marginBottom', ''),
      marginLeft: getStyleValue(selectedElement, 'marginLeft', ''),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.display,
    selectedElement?.style?.flexDirection,
    // ... 나머지 의존성
  ]);
}
```

#### useAppearanceValues.ts (신규)

```typescript
import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface AppearanceStyleValues {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
  opacity: string;
  boxShadow: string;
}

export function useAppearanceValues(
  selectedElement: SelectedElement | null
): AppearanceStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      backgroundColor: getStyleValue(selectedElement, 'backgroundColor', ''),
      borderColor: getStyleValue(selectedElement, 'borderColor', ''),
      borderWidth: getStyleValue(selectedElement, 'borderWidth', ''),
      borderRadius: getStyleValue(selectedElement, 'borderRadius', ''),
      borderStyle: getStyleValue(selectedElement, 'borderStyle', 'none'),
      opacity: getStyleValue(selectedElement, 'opacity', '1'),
      boxShadow: getStyleValue(selectedElement, 'boxShadow', ''),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.backgroundColor,
    selectedElement?.style?.borderColor,
    // ... 나머지 의존성
  ]);
}
```

#### useTypographyValues.ts (신규)

```typescript
import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
}

export function useTypographyValues(
  selectedElement: SelectedElement | null
): TypographyStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      fontFamily: getStyleValue(selectedElement, 'fontFamily', ''),
      fontSize: getStyleValue(selectedElement, 'fontSize', ''),
      fontWeight: getStyleValue(selectedElement, 'fontWeight', ''),
      fontStyle: getStyleValue(selectedElement, 'fontStyle', 'normal'),
      lineHeight: getStyleValue(selectedElement, 'lineHeight', ''),
      letterSpacing: getStyleValue(selectedElement, 'letterSpacing', ''),
      color: getStyleValue(selectedElement, 'color', ''),
      textAlign: getStyleValue(selectedElement, 'textAlign', 'left'),
      textDecoration: getStyleValue(selectedElement, 'textDecoration', 'none'),
      textTransform: getStyleValue(selectedElement, 'textTransform', 'none'),
      verticalAlign: getStyleValue(selectedElement, 'verticalAlign', 'baseline'),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.fontFamily,
    selectedElement?.style?.fontSize,
    // ... 나머지 의존성
  ]);
}
```

---

### 7.5 Section 컴포넌트 수정 예시

#### TransformSection.tsx 수정

```tsx
// Before
import { useStyleValues } from '../hooks/useStyleValues';

export function TransformSection({ selectedElement, styleValues }: Props) {
  // styleValues는 부모에서 전달받음 (28개 속성 전체)
  const { width, height, top, left } = styleValues;
  // ...
}

// After
import { useTransformValues } from '../hooks/useTransformValues';

export function TransformSection({ selectedElement }: Props) {
  // 4개 속성만 계산 (86% 성능 개선)
  const transformValues = useTransformValues(selectedElement);

  if (!transformValues) return null;

  const { width, height, top, left } = transformValues;
  // ...
}
```

---

### 7.6 colord 통합 상세

#### cssVariableReader.ts 수정

```typescript
// Before: 직접 파싱 (150+ 라인)
function cssColorToHex(color: string, fallback: number): number {
  if (!color) return fallback;

  // #hex 형식
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const expanded = hex.split('').map((c) => c + c).join('');
      return parseInt(expanded, 16);
    }
    return parseInt(hex, 16);
  }

  // rgb()/rgba() 형식
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return (r << 16) | (g << 8) | b;
  }

  // hsl() 형식... (추가 로직)
  // color-mix() 형식... (추가 로직)

  return fallback;
}

// After: colord 사용 (10 라인)
import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';

extend([mixPlugin]);

function cssColorToHex(color: string, fallback: number): number {
  if (!color) return fallback;

  const parsed = colord(color);
  if (!parsed.isValid()) return fallback;

  const hex = parsed.toHex();
  return parseInt(hex.slice(1), 16);
}
```

#### 지원 색상 형식 비교

| 형식 | 직접 파싱 (현재) | colord |
|------|-----------------|--------|
| `#rgb` | ✅ | ✅ |
| `#rrggbb` | ✅ | ✅ |
| `#rrggbbaa` | ⚠️ 부분 | ✅ |
| `rgb()` | ✅ | ✅ |
| `rgba()` | ✅ | ✅ |
| `hsl()` | ⚠️ 부분 | ✅ |
| `hsla()` | ⚠️ 부분 | ✅ |
| `hwb()` | ❌ | ✅ |
| `lab()` | ❌ | ✅ |
| `lch()` | ❌ | ✅ |
| `oklch()` | ❌ | ✅ (플러그인) |
| `color-mix()` | ❌ | ✅ (플러그인) |
| Named colors | ⚠️ 부분 | ✅ |

---

### 7.7 테스트 계획

#### Unit 테스트

```typescript
// __tests__/components/Button.test.tsx
describe('Button data-* attributes', () => {
  it('renders with data-variant attribute', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary');
  });

  it('renders with data-size attribute', () => {
    render(<Button size="md">Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it('applies default values when props not provided', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
  });
});
```

#### Visual 테스트 (Storybook)

```typescript
// stories/Button.stories.tsx
export const AllVariants = () => (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    {['default', 'primary', 'secondary', 'tertiary', 'error', 'surface', 'outline', 'ghost'].map(variant => (
      <Button key={variant} variant={variant as ButtonVariant}>
        {variant}
      </Button>
    ))}
  </div>
);

export const AllSizes = () => (
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    {['xs', 'sm', 'md', 'lg', 'xl'].map(size => (
      <Button key={size} size={size as ComponentSize}>
        {size}
      </Button>
    ))}
  </div>
);
```

#### 성능 테스트

```typescript
// __tests__/hooks/useStyleValues.perf.test.ts
describe('StyleValues performance', () => {
  it('useTransformValues only recalculates on transform changes', () => {
    const renderCount = { transform: 0, layout: 0 };

    // width 변경 시 TransformSection만 리렌더링
    // LayoutSection은 리렌더링 안됨

    expect(renderCount.transform).toBe(1);
    expect(renderCount.layout).toBe(0);
  });
});
```

---

## Sources

- [React Aria v1.14.0 Release Notes](https://react-aria.adobe.com/releases/v1-14-0)
- [React Spectrum Styling](https://react-spectrum.adobe.com/react-spectrum/styling.html)
- [React Aria Styling](https://react-spectrum.adobe.com/react-aria/styling.html)
- [Spectrum 2 Styling (Beta)](https://react-spectrum.adobe.com/beta/s2/styling.html)
- [colord](https://github.com/omgovich/colord)
