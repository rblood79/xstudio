# Component Refactoring Template (Gold Standard)

**기준 컴포넌트**: Button (빌더), Inspector Property Components
**작성일**: 2025-11-06
**최종 업데이트**: 2025-11-07
**참조**:
- [Button.tsx](../../src/builder/components/Button.tsx), [Button.css](../../src/builder/components/styles/Button.css)
- [Inspector Property Components](../../src/builder/inspector/components/)

이 문서는 컴포넌트 리팩토링 시 따라야 할 Gold Standard 패턴을 정의합니다.

**주요 업데이트 (2025-11-07)**:
- ✅ Inspector Property Component Pattern 섹션 추가
- ✅ 9개 Property 컴포넌트 사용법 가이드
- ✅ Before/After 안티패턴 예시

---

## 🎯 Core Principles

### 1. **tv() from tailwind-variants 사용**
수동 className 조합 대신 `tv()` 사용

### 2. **시멘틱 토큰만 사용**
팔레트 변수(`--color-gray-*`) 직접 참조 금지

### 3. **공통 타입 재사용**
`src/types/componentVariants.ts`의 타입 import

### 4. **composeRenderProps 활용**
React Aria의 render props와 tv() 통합

### 5. **spacing 토큰 활용**
`--spacing-*`, `--text-*` 등 기존 토큰 사용

---

## 📁 File Structure

```
src/builder/components/
├── ComponentName.tsx          # React component
├── styles/
│   └── ComponentName.css      # Styles (semantic tokens only)
└── ...

src/builder/inspector/properties/editors/
└── ComponentNameEditor.tsx    # Property editor

src/types/
└── componentVariants.ts       # Shared types
```

---

## 📝 TypeScript Component Template

### 1. Imports

```typescript
import React from "react";
import {
  ComponentName as AriaComponentName,
  type ComponentNameProps as AriaComponentNameProps,
  composeRenderProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import type { ComponentVariant, ComponentSize } from "../../types/componentVariants";
import "./styles/ComponentName.css";
```

**중요**:
- ✅ `tv` from `tailwind-variants` 필수
- ✅ `composeRenderProps` from `react-aria-components` 필수
- ✅ 공통 타입 import
- ✅ CSS 파일 import

---

### 2. Props Interface

```typescript
export interface ComponentNameProps extends AriaComponentNameProps {
  /**
   * Visual variant of the component
   * @default "default"
   */
  variant?: ComponentVariant;

  /**
   * Size of the component
   * @default "md"
   */
  size?: ComponentSize;
}
```

**중요**:
- ✅ React Aria Props 상속 (`extends AriaComponentNameProps`)
- ✅ JSDoc 주석 포함
- ✅ 기본값 명시
- ❌ 비표준 props 금지 (`isSelected`, `isFocused` 등)

---

### 3. tv() Configuration

```typescript
const componentName = tv({
  base: "react-aria-ComponentName",
  variants: {
    variant: {
      default: "default",
      primary: "primary",
      secondary: "secondary",
    },
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});
```

**중요**:
- ✅ `base` 클래스는 `react-aria-*` 형식
- ✅ `variants` 객체: variant 값 → CSS 클래스명 매핑
- ✅ `defaultVariants` 명시
- ❌ 수동 객체 매핑 금지 (`variantClasses = { ... }`)

---

### 4. Component Function

```typescript
export function ComponentName({
  variant = "default",
  size = "md",
  ...props
}: ComponentNameProps) {
  return (
    <AriaComponentName
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) =>
          componentName({
            ...renderProps,
            variant,
            size,
            className,
          })
      )}
    />
  );
}
```

**중요**:
- ✅ `composeRenderProps` 사용
- ✅ `renderProps` 스프레드 (React Aria 상태 전달)
- ✅ `variant`, `size` props 전달
- ✅ `className` props 병합
- ❌ 수동 className 조합 금지

---

## 🎨 CSS Template

### 1. File Structure

```css
@import "../theme.css";

@layer components {
  .react-aria-ComponentName {
    /* Base styles */
    /* Variant styles */
    /* Size styles */
    /* State styles */
  }
}
```

---

### 2. Base Styles

```css
.react-aria-ComponentName {
  /* Layout */
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  /* Typography */
  font-size: var(--text-base);
  color: var(--text-color);

  /* Background & Border */
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);

  /* Spacing */
  padding: var(--spacing-sm) var(--spacing-lg);

  /* Interaction */
  cursor: pointer;
  outline: none;
  transition: all 150ms ease;

  /* States */
  &:hover {
    border-color: var(--border-color-hover);
  }

  &[data-focus-visible] {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
  }

  &[data-pressed] {
    box-shadow: var(--inset-shadow-sm);
  }

  &[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

**중요**:
- ✅ 시멘틱 토큰만 사용
- ✅ `var(--spacing-*)` for spacing
- ✅ `var(--text-*)` for font-size
- ✅ React Aria 상태 선택자 (`[data-*]`)
- ❌ 팔레트 변수 직접 참조 금지 (`--color-gray-300` 등)

---

### 3. Variant Styles

```css
/* ===================================
   Variant Styles
   =================================== */

&.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border);

  &:hover {
    border-color: var(--button-primary-border-hover);
  }
}

&.secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border-color: var(--button-secondary-border);
}

&.outline {
  background: transparent;
  color: var(--button-outline-text);
  border-color: var(--button-outline-border);
}

&.ghost {
  background: transparent;
  color: var(--button-ghost-text);
  border-color: transparent;
}
```

**중요**:
- ✅ 각 variant마다 전용 시멘틱 토큰 사용
- ✅ variant별 hover 상태 정의
- ❌ 하드코딩 금지 (`#3b82f6`, `rgb(...)` 등)

---

### 4. Size Styles

```css
/* ===================================
   Size Styles
   =================================== */

&.xs {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  gap: var(--spacing-2xs);
}

&.sm {
  padding: var(--spacing) var(--spacing-md);
  font-size: var(--text-sm);
  gap: var(--spacing-xs);
}

&.md {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-base);
  gap: var(--spacing-sm);
}

&.lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-lg);
  gap: var(--spacing-md);
}

&.xl {
  padding: var(--spacing-lg) var(--spacing-2xl);
  font-size: var(--text-xl);
  gap: var(--spacing-lg);
}
```

**중요**:
- ✅ spacing 토큰만 사용
- ✅ text 토큰만 사용
- ❌ `height` 하드코딩 금지 (padding이 높이 결정)
- ❌ 픽셀 값 하드코딩 금지 (`16px`, `1rem` 등)

---

## 🔧 Property Editor Template

### File: `ComponentNameEditor.tsx`

```typescript
import React from "react";
import { PropertySelect } from "../controls/PropertySelect";
import type { ComponentNameProps } from "../../../components/ComponentName";

export function ComponentNameEditor() {
  const { currentProps, updateProp } = usePropertyEditor<ComponentNameProps>();

  return (
    <>
      {/* Variant selector */}
      <PropertySelect
        label="Variant"
        value={String(currentProps.variant || 'default')}
        onChange={(value) => updateProp('variant', value)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'outline', label: 'Outline' },
          { value: 'ghost', label: 'Ghost' },
        ]}
      />

      {/* Size selector */}
      <PropertySelect
        label="Size"
        value={String(currentProps.size || 'md')}
        onChange={(value) => updateProp('size', value)}
        options={[
          { value: 'xs', label: 'Extra Small' },
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
          { value: 'xl', label: 'Extra Large' },
        ]}
      />

      {/* Other props... */}
    </>
  );
}
```

**중요**:
- ✅ `PropertySelect` 컴포넌트 사용
- ✅ `updateProp` 함수로 props 업데이트
- ✅ 기본값과 컴포넌트 기본값 일치 (`'md'`)
- ✅ 모든 variant/size 옵션 포함

---

## ✅ Do's and Don'ts

### ✅ DO

**TypeScript**:
- ✅ `tv()` 사용
- ✅ `composeRenderProps` 사용
- ✅ 공통 타입 import
- ✅ React Aria Props 상속
- ✅ JSDoc 주석 작성

**CSS**:
- ✅ 시멘틱 토큰만 사용
- ✅ `@layer components` 사용
- ✅ `@import "../theme.css"` 필수
- ✅ React Aria 상태 선택자 (`[data-*]`)
- ✅ spacing/text 토큰 활용

**Naming**:
- ✅ `react-aria-*` 클래스 접두사
- ✅ variant 값 = CSS 클래스명
- ✅ size 값 = 축약형 (`xs`, `sm`, `md`, `lg`, `xl`)

---

### ❌ DON'T

**TypeScript**:
- ❌ 수동 className 조합 (`variantClasses = { ... }`)
- ❌ 복수형 객체명 (`sizeClasses`, `stateClasses`)
- ❌ 비표준 props (`isSelected`, `isFocused`)
- ❌ inline string literals (타입 정의 없이)

**CSS**:
- ❌ 팔레트 변수 직접 참조 (`--color-gray-300`)
- ❌ 하드코딩 (`#3b82f6`, `16px`, `1rem`)
- ❌ `@apply` 디렉티브 (Tailwind v4 미지원)
- ❌ BEM 네이밍 (`component__element--modifier`)

**Naming**:
- ❌ 전체 단어 size 값 (`"small"`, `"medium"`, `"large"`)
- ❌ 커스텀 접두사 (`property-input__combobox`)

---

## 📋 Refactoring Checklist

컴포넌트 리팩토링 시 이 체크리스트를 따르세요:

### Phase 1: 준비
- [ ] 파일 백업 (`.tsx`, `.css`)
- [ ] 기존 구현 분석
- [ ] 필요한 시멘틱 토큰 확인

### Phase 2: TypeScript
- [ ] `tv`, `composeRenderProps` import
- [ ] 공통 타입 import
- [ ] Props 인터페이스 확장
- [ ] tv() 설정 작성
- [ ] 컴포넌트 함수 리팩토링
- [ ] 수동 className 조합 제거

### Phase 3: CSS
- [ ] `@import "../theme.css"` 추가
- [ ] `@layer components` 사용
- [ ] Base 스타일 작성 (시멘틱 토큰)
- [ ] Variant 스타일 작성
- [ ] Size 스타일 작성
- [ ] 팔레트 참조 완전 제거

### Phase 4: Editor
- [ ] variant PropertySelect 추가
- [ ] size PropertySelect 추가
- [ ] 기본값 확인

### Phase 5: 검증
- [ ] TypeScript 에러 없음 (`npm run type-check`)
- [ ] 시각적 회귀 없음
- [ ] 모든 variant 조합 테스트
- [ ] 모든 size 조합 테스트
- [ ] 라이트/다크 모드 확인
- [ ] React Aria 상태 확인 (hover, focus, pressed, disabled)

### Phase 6: 정리
- [ ] 주석 제거 (불필요한)
- [ ] import 정렬
- [ ] 코드 포맷팅
- [ ] 백업 파일 삭제 (검증 완료 후)

---

## 🔍 Examples

### Example 1: Simple Component (Checkbox)

**Checkbox는 size만 필요 (variant 없음)**:

```typescript
// Checkbox.tsx
import { tv } from "tailwind-variants";
import type { ComponentSize } from "../../types/componentVariants";

export interface CheckboxProps extends AriaCheckboxProps {
  size?: ComponentSize;
}

const checkbox = tv({
  base: "react-aria-Checkbox",
  variants: {
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function Checkbox({ size = "md", ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) =>
          checkbox({ ...renderProps, size, className })
      )}
    />
  );
}
```

```css
/* Checkbox.css */
@layer components {
  .react-aria-Checkbox {
    /* Base styles */

    /* Size variants */
    &.sm {
      font-size: var(--text-sm);
      gap: var(--spacing-xs);

      & .checkbox {
        width: 16px;
        height: 16px;
      }
    }

    &.md {
      font-size: var(--text-base);
      gap: var(--spacing-sm);

      & .checkbox {
        width: 20px;
        height: 20px;
      }
    }

    &.lg {
      font-size: var(--text-lg);
      gap: var(--spacing-md);

      & .checkbox {
        width: 24px;
        height: 24px;
      }
    }
  }
}
```

---

### Example 2: Field Component (TextField)

**TextField는 variant + size 모두 필요**:

```typescript
// TextField.tsx
import { tv } from "tailwind-variants";
import type { FieldVariant, ComponentSize } from "../../types/componentVariants";

export interface TextFieldProps extends AriaTextFieldProps {
  variant?: FieldVariant;
  size?: ComponentSize;
}

const textField = tv({
  base: "react-aria-TextField",
  variants: {
    variant: {
      default: "default",
      filled: "filled",
      outlined: "outlined",
    },
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export function TextField({
  variant = "default",
  size = "md",
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) =>
          textField({ ...renderProps, variant, size, className })
      )}
    />
  );
}
```

```css
/* TextField.css */
@layer components {
  .react-aria-TextField {
    /* Base styles */
    & input {
      background: var(--field-background);
      border: 1px solid var(--field-border);
      /* ... */
    }

    /* Variant: filled */
    &.filled input {
      background: var(--field-background-filled);
      border-color: transparent;
    }

    /* Variant: outlined */
    &.outlined input {
      background: transparent;
      border-width: 2px;
    }

    /* Size: sm */
    &.sm input {
      padding: var(--spacing) var(--spacing-md);
      font-size: var(--text-sm);
    }

    /* Size: md */
    &.md input {
      padding: var(--spacing-sm) var(--spacing-lg);
      font-size: var(--text-base);
    }
  }
}
```

---

## 🧩 Inspector Property Component Pattern (2025-11-07 추가)

**상태**: ✅ 완료됨 (commit 2114448)

Inspector UI는 별도의 패턴을 사용합니다. 빌더 컴포넌트(Button, TextField 등)와는 독립적입니다.

### Inspector 컴포넌트 패턴

#### ❌ 안티패턴 (Before)

```typescript
// ❌ WRONG - Inline components, custom inputs
import { TextField, Select, SelectItem } from "../../components/list";

function EventEditor() {
  return (
    <>
      <TextField label="Path" value={path} onChange={setPath} />

      <select value={type} onChange={(e) => setType(e.target.value)}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>

      <label>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>
    </>
  );
}
```

#### ✅ 올바른 패턴 (After)

```typescript
// ✅ CORRECT - Use Property components from inspector/components
import { PropertyInput, PropertySelect, PropertyCheckbox } from "../components";

function EventEditor() {
  return (
    <>
      <PropertyInput
        label="Path / URL"
        value={path}
        onChange={setPath}
      />

      <PropertySelect
        label="Action Type"
        value={type}
        onChange={setType}
        options={[
          { value: "navigate", label: "Navigate" },
          { value: "update_state", label: "Update State" },
        ]}
      />

      <PropertyCheckbox
        label="Enabled"
        isSelected={enabled}
        onChange={setEnabled}
      />
    </>
  );
}
```

### Inspector 컴포넌트 라이브러리 (9개)

#### 1. PropertyInput
```typescript
<PropertyInput
  label="대상 요소 ID"
  value={target}
  onChange={setTarget}
  type="text"        // or "number", "color"
  multiline={false}  // true for textarea
  disabled={false}
  min={0}           // for number type
  max={100}
/>
```

#### 2. PropertySelect
```typescript
<PropertySelect
  label="액션 타입"
  value={selectedType}
  onChange={setSelectedType}
  options={[
    { value: "navigate", label: "Navigate" },
    { value: "show_modal", label: "Show Modal" },
  ]}
  icon={Settings}    // optional
/>
```

#### 3. PropertyCheckbox
```typescript
<PropertyCheckbox
  label="활성화"
  isSelected={enabled}      // Note: isSelected, not checked
  onChange={setEnabled}     // Note: receives boolean directly
  icon={CheckCircle}        // optional
/>
```

#### 4. PropertySwitch
```typescript
<PropertySwitch
  label="Dark Mode"
  isSelected={darkMode}
  onChange={setDarkMode}
/>
```

#### 5. PropertySlider
```typescript
<PropertySlider
  label="Opacity"
  value={opacity}
  onChange={setOpacity}
  min={0}
  max={100}
  step={1}
/>
```

#### 6. PropertyUnitInput
```typescript
<PropertyUnitInput
  label="Width"
  value={width}
  onChange={setWidth}
  units={["px", "%", "rem", "em"]}  // available units
/>
```

#### 7. PropertyColor
```typescript
<PropertyColor
  label="Background Color"
  value={bgColor}
  onChange={setBgColor}
/>
```

#### 8. PropertyCustomId
```typescript
<PropertyCustomId
  label="Element ID"
  value={customId}
  onChange={setCustomId}
/>
```

#### 9. PropertyFieldset (Layout Wrapper)
```typescript
<PropertyFieldset legend="Advanced Options" icon={Settings}>
  <PropertyInput label="Custom CSS" value={css} onChange={setCss} multiline />
  <PropertyCheckbox label="Important" isSelected={important} onChange={setImportant} />
</PropertyFieldset>
```

### Key Differences: Inspector vs Builder Components

| Aspect | Inspector Components | Builder Components (Button, TextField) |
|--------|---------------------|----------------------------------------|
| **Purpose** | Property editor UI | User-facing UI components |
| **Pattern** | Simple props (label, value, onChange) | tv() variants, composeRenderProps |
| **Styling** | Consistent Inspector theme | Semantic tokens, variant/size |
| **Location** | `src/builder/inspector/components/` | `src/builder/components/` |
| **Import** | `from "../components"` | `from "react-aria-components"` |
| **Debouncing** | Built-in (blur/enter to save) | Manual control |

### Inspector 리팩토링 체크리스트

- [ ] `TextField` → `PropertyInput`
- [ ] Inline `<select>` → `PropertySelect`
- [ ] Inline `<input type="checkbox">` → `PropertyCheckbox`
- [ ] React import 추가 (`import React from "react"`)
- [ ] `onChange` 핸들러 타입 확인 (PropertyCheckbox는 boolean 직접 전달)
- [ ] PropertySelect의 `options` 배열 형식 확인 (`{ value, label }[]`)
- [ ] TypeScript 에러 없음
- [ ] 저장 동작 확인 (blur/enter시 저장)

### 참고 예시

**완성된 리팩토링 예시**: [src/builder/inspector/events/index.tsx](../../src/builder/inspector/events/index.tsx)

---

## 🚀 Quick Start Guide

**새 컴포넌트 또는 기존 컴포넌트 리팩토링**:

1. **이 템플릿 복사**
2. **"ComponentName" 검색 후 실제 이름으로 교체**
3. **variant/size에 맞게 조정**
4. **CSS 작성 (시멘틱 토큰만)**
5. **Editor 업데이트**
6. **검증 (type-check + 시각 테스트)**

**Inspector 컴포넌트 사용 시**:
1. **Property 컴포넌트 import**: `from "../components"`
2. **TextField → PropertyInput** 전환
3. **Inline select/checkbox → Property 컴포넌트** 전환
4. **React import 추가**
5. **검증 (TypeScript 에러 + 저장 동작)**

---

## 📚 Related Documents

- [Migration Plan](./COMPONENT_MIGRATION_PLAN.md)
- [Detailed Steps](./MIGRATION_DETAILED_STEPS.md)
- [Semantic Tokens Reference](../SEMANTIC_TOKENS.md)
- [Validation Report](./VALIDATION_REPORT.md)

---

**마지막 업데이트**: 2025-11-07
**상태**: ✅ 검증 완료, Inspector Pattern 추가
