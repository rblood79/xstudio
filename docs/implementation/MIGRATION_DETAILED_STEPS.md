# XStudio 컴포넌트 마이그레이션 세부 실행 단계

**작성일**: 2025-11-06
**참조**: [COMPONENT_MIGRATION_PLAN.md](./COMPONENT_MIGRATION_PLAN.md)

이 문서는 각 Phase의 Step-by-Step 실행 가이드입니다.

---

## 📋 목차

- [Phase 0: 기반 인프라 구축](#phase-0-기반-인프라-구축)
- [Phase 1: 안티패턴 제거](#phase-1-안티패턴-제거)
- [Phase 2: Button 시멘틱 토큰 마이그레이션](#phase-2-button-시멘틱-토큰-마이그레이션)
- [Phase 3: Tier 1 Form 컴포넌트](#phase-3-tier-1-form-컴포넌트)
- [Phase 4-6: 나머지 컴포넌트](#phase-4-6-나머지-컴포넌트)
- [Phase 7: 검증 및 문서화](#phase-7-검증-및-문서화)

---

# Phase 0: 기반 인프라 구축

**예상 시간**: 3-4시간

## Phase 0.1: 시멘틱 토큰 확장 (1.5-2시간)

### 📝 작업 파일
`/Users/admin/work/xstudio/src/builder/components/theme.css`

### 🎯 목표
기존 50개 시멘틱 토큰에 25개 추가 → 총 75개

### 📋 Step-by-Step

#### Step 1: 파일 백업 (2분)

```bash
cd /Users/admin/work/xstudio
cp src/builder/components/theme.css src/builder/components/theme.css.backup
```

#### Step 2: 기존 토큰 패턴 분석 (10분)

**확인할 사항**:
- Line 58-118: 기존 시멘틱 토큰 구조
- Fallback 패턴: `var(--semantic-name, var(--palette-fallback))`
- 네이밍 규칙: `--button-*`, `--field-*`, `--text-*`

**예시**:
```css
--button-primary-bg: var(--color-button-primary-bg, var(--color-primary-600));
--text-color: var(--color-text-primary, var(--color-gray-900));
```

#### Step 3: 버튼 변형 토큰 추가 (20분)

**theme.css의 `:root` 섹션 끝에 추가**:

```css
/* ===================================
   Button Variant Tokens (NEW)
   =================================== */

/* Primary button borders */
--button-primary-border: var(--color-button-primary-border, var(--color-primary-600));
--button-primary-border-hover: var(--color-button-primary-border-hover, var(--color-primary-700));

/* Secondary button borders */
--button-secondary-border: var(--color-button-secondary-border, var(--color-secondary-600));
--button-secondary-border-hover: var(--color-button-secondary-border-hover, var(--color-secondary-700));

/* Surface button (all properties) */
--button-surface-bg: var(--color-button-surface-bg, var(--color-surface-500));
--button-surface-text: var(--color-button-surface-text, var(--color-white));
--button-surface-border: var(--color-button-surface-border, var(--color-surface-600));

/* Outline button */
--button-outline-text: var(--color-button-outline-text, var(--color-gray-800));
--button-outline-border: var(--color-button-outline-border, var(--color-gray-300));

/* Ghost button */
--button-ghost-text: var(--color-button-ghost-text, var(--color-gray-800));
```

#### Step 4: 필드/입력 변형 토큰 추가 (15분)

```css
/* ===================================
   Field/Input Variant Tokens (NEW)
   =================================== */

/* Field borders */
--field-border: var(--color-field-border, var(--color-gray-300));
--field-border-hover: var(--color-field-border-hover, var(--color-gray-400));
--field-border-focus: var(--color-field-border-focus, var(--color-primary-500));

/* Filled variant */
--field-background-filled: var(--color-field-background-filled, var(--color-gray-100));
--field-text-filled: var(--color-field-text-filled, var(--color-gray-900));
```

#### Step 5: 인터랙티브 상태 토큰 추가 (15분)

```css
/* ===================================
   Interactive State Tokens (NEW)
   =================================== */

/* Hover states */
--hover-background: var(--color-hover-background, var(--color-gray-100));
--hover-border: var(--color-hover-border, var(--color-primary-300));

/* Active/Selected states */
--active-background: var(--color-active-background, var(--color-primary-50));
--active-border: var(--color-active-border, var(--color-primary-500));

/* Focus states */
--focus-ring-shadow: var(--color-focus-ring-shadow, 0 0 0 3px var(--color-primary-100));
--focus-border: var(--color-focus-border, var(--color-primary-500));
```

#### Step 6: 유틸리티 토큰 추가 (15분)

```css
/* ===================================
   Utility Tokens (NEW)
   =================================== */

/* Icon colors */
--icon-primary: var(--color-icon-primary, var(--color-gray-600));
--icon-secondary: var(--color-icon-secondary, var(--color-gray-400));
--icon-disabled: var(--color-icon-disabled, var(--color-gray-300));

/* Dividers */
--divider-color: var(--color-divider, var(--color-gray-200));
--divider-strong: var(--color-divider-strong, var(--color-gray-300));

/* High contrast text */
--text-on-primary: var(--color-text-on-primary, var(--color-white));
--text-on-secondary: var(--color-text-on-secondary, var(--color-white));
```

#### Step 7: 다크모드 오버라이드 추가 (20min)

**`[data-theme="dark"]` 섹션에 추가**:

```css
[data-theme="dark"] {
  /* ===================================
     Dark Mode Overrides for New Tokens
     =================================== */

  /* Button dark mode */
  --button-surface-text: var(--color-button-surface-text, var(--color-gray-900));
  --button-outline-text: var(--color-button-outline-text, var(--color-gray-100));
  --button-ghost-text: var(--color-button-ghost-text, var(--color-gray-100));

  /* Field dark mode */
  --field-background-filled: var(--color-field-background-filled, var(--color-gray-800));
  --field-text-filled: var(--color-field-text-filled, var(--color-gray-100));

  /* Interactive states dark mode */
  --hover-background: var(--color-hover-background, var(--color-gray-800));
  --active-background: var(--color-active-background, var(--color-primary-900));

  /* Icon dark mode */
  --icon-primary: var(--color-icon-primary, var(--color-gray-400));
  --icon-secondary: var(--color-icon-secondary, var(--color-gray-500));
  --icon-disabled: var(--color-icon-disabled, var(--color-gray-600));

  /* Dividers dark mode */
  --divider-color: var(--color-divider, var(--color-gray-700));
  --divider-strong: var(--color-divider-strong, var(--color-gray-600));
}
```

#### Step 8: 검증 (10min)

**브라우저 개발자 도구에서 확인**:

```bash
# 개발 서버 실행
npm run dev
```

1. 브라우저 열기: http://localhost:5173
2. 개발자 도구 → Elements → Computed 탭
3. `:root` 선택 → CSS Variables 확인
4. 새로 추가한 25개 토큰 모두 존재하는지 확인
5. 다크모드 토글: `document.documentElement.dataset.theme = "dark"`
6. 다크모드에서 토큰 값 변경 확인

**CLI 검증**:
```bash
# 새 토큰이 정의되었는지 확인
grep -E "(--button-|--field-|--hover-|--active-|--focus-|--icon-|--divider-|--text-on-)" src/builder/components/theme.css | wc -l
# 예상 결과: 50+ (25개 × 2 (라이트 + 다크))
```

### ✅ 완료 조건

- [ ] theme.css에 25개 시멘틱 토큰 추가
- [ ] 모든 토큰이 fallback 패턴 사용
- [ ] 다크모드 오버라이드 정의 완료
- [ ] 브라우저에서 토큰 변수 확인됨
- [ ] grep 검증 통과

---

## Phase 0.2: 공통 타입 정의 생성 (30-40분)

### 📝 작업 파일
`/Users/admin/work/xstudio/src/types/componentVariants.ts` (신규)

### 🎯 목표
모든 컴포넌트가 공유할 variant/size 타입 정의

### 📋 Step-by-Step

#### Step 1: 파일 생성 (2min)

```bash
touch /Users/admin/work/xstudio/src/types/componentVariants.ts
```

#### Step 2: 파일 헤더 및 Size 타입 작성 (10min)

```typescript
/**
 * Component Variant and Size Type Definitions
 *
 * This file contains shared types for component variants and sizes
 * used across the XStudio component library.
 *
 * @see COMPONENT_MIGRATION_PLAN.md
 */

/* ===================================
   Size Types
   =================================== */

/**
 * Standard 5-level component size scale
 * Used by most interactive components (Button, TextField, Select, etc.)
 */
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * 3-level size scale subset
 * Used by components with fewer size options (Separator, Card, etc.)
 */
export type ComponentSizeSubset = "sm" | "md" | "lg";

/**
 * Density-based size scale for collection components
 * Used by ListBox, GridList, Menu, Tree, Table
 */
export type DensitySize = "compact" | "comfortable" | "relaxed" | "spacious";
```

#### Step 3: Button Variant 타입 (5min)

```typescript
/* ===================================
   Button Component Variants
   =================================== */

/**
 * Button component variants
 *
 * - default: Standard button with default styling
 * - primary: Primary action button (emphasized)
 * - secondary: Secondary action button
 * - surface: Surface-colored button
 * - outline: Outlined button with transparent background
 * - ghost: Minimal button with no border or background
 */
export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface"
  | "outline"
  | "ghost";

/**
 * ToggleButton uses the same variants as Button
 */
export type ToggleButtonVariant = ButtonVariant;
```

#### Step 4: Form Component Variant 타입 (5min)

```typescript
/* ===================================
   Form Component Variants
   =================================== */

/**
 * Field component variants
 * Used by TextField, Select, ComboBox, NumberField, SearchField
 *
 * - default: Standard field with border
 * - filled: Filled background with no border
 * - outlined: Prominent 2px border
 */
export type FieldVariant =
  | "default"
  | "filled"
  | "outlined";
```

#### Step 5: Layout Component Variant 타입 (10min)

```typescript
/* ===================================
   Layout Component Variants
   =================================== */

/**
 * Card component variants
 */
export type CardVariant =
  | "default"
  | "elevated"
  | "outlined";

/**
 * Panel component variants
 */
export type PanelVariant =
  | "default"
  | "tab"
  | "sidebar"
  | "card"
  | "modal";

/**
 * Separator component variants
 */
export type SeparatorVariant =
  | "default"
  | "dashed"
  | "dotted";
```

#### Step 6: Navigation Component Variant 타입 (5min)

```typescript
/* ===================================
   Navigation Component Variants
   =================================== */

/**
 * Menu component variants
 */
export type MenuVariant =
  | "default"
  | "contextual";

/**
 * Tabs component variants
 */
export type TabsVariant =
  | "default"
  | "pills"
  | "underline"
  | "minimal";

/**
 * Breadcrumbs component variants
 */
export type BreadcrumbsVariant =
  | "default"
  | "slash"
  | "chevron";
```

#### Step 7: Feedback Component Variant 타입 (5min)

```typescript
/* ===================================
   Feedback Component Variants
   =================================== */

/**
 * Dialog/Modal component variants
 */
export type DialogVariant =
  | "default"
  | "alert"
  | "confirmation";

/**
 * Feedback component variants
 * Used by ProgressBar, Meter, Tooltip
 */
export type FeedbackVariant =
  | "default"
  | "success"
  | "warning"
  | "error";
```

#### Step 8: TypeScript 검증 (3min)

```bash
npm run type-check
```

**예상 출력**: 에러 없음 (새 파일이므로 아직 사용처 없음)

### ✅ 완료 조건

- [ ] componentVariants.ts 파일 생성 완료
- [ ] 모든 타입 정의 export됨
- [ ] JSDoc 주석 포함
- [ ] TypeScript 컴파일 오류 없음

---

## Phase 0.3: Gold Standard 문서화 (30min)

### 📝 작업 내용
Button 패턴 분석 및 템플릿 작성

### 🎯 목표
다른 컴포넌트 리팩토링 시 참조할 Gold Standard 확립

### 📋 Step-by-Step

#### Step 1: Button 구현 분석 (10min)

**파일 읽기**:
1. `src/builder/components/Button.tsx` (라인 14-37: tv() 사용법)
2. `src/builder/components/styles/Button.css` (variant/size 클래스)
3. `src/builder/inspector/properties/editors/ButtonEditor.tsx`

**분석 포인트**:
- tv() 설정 구조
- composeRenderProps 사용법
- CSS 클래스 명명 규칙
- Inspector 통합 방법

#### Step 2: CLAUDE.md 임시 노트 추가 (5min)

**파일**: `/Users/admin/work/xstudio/CLAUDE.md`

**섹션 추가** (파일 끝):

```markdown
---

## 🚧 MIGRATION IN PROGRESS

**시작일**: 2025-11-06
**현재 Phase**: Phase 0 - 기반 인프라 구축

### 완료된 작업

#### Phase 0.1 ✅
- theme.css에 25개 시멘틱 토큰 추가
- 라이트/다크 모드 fallback 패턴 적용

#### Phase 0.2 ✅
- src/types/componentVariants.ts 생성
- 공통 variant/size 타입 정의

#### Phase 0.3 (진행 중)
- Gold Standard 문서화

### 다음 단계
Phase 1: Card/Panel 안티패턴 제거

### 참조 문서
- [마이그레이션 계획](./docs/implementation/COMPONENT_MIGRATION_PLAN.md)
- [세부 실행 단계](./docs/implementation/MIGRATION_DETAILED_STEPS.md)
- [리팩토링 템플릿](./docs/implementation/COMPONENT_REFACTORING_TEMPLATE.md)
```

#### Step 3: 검증 (5min)

```bash
# Phase 0 완료 확인
ls -la src/builder/components/theme.css.backup  # 백업 존재
grep -c "button-primary-border" src/builder/components/theme.css  # > 0
ls -la src/types/componentVariants.ts  # 파일 존재
```

### ✅ 완료 조건

- [ ] Button 패턴 완전히 이해
- [ ] CLAUDE.md 임시 노트 추가
- [ ] Phase 0 완료 체크리스트 작성

---

# Phase 1: 안티패턴 제거

**예상 시간**: 3-4시간

## Phase 1.1: Card.tsx 완전 리팩토링 (2-2.5시간)

### 📝 작업 파일
- `src/builder/components/Card.tsx`
- `src/builder/components/styles/Card.css`
- `src/builder/inspector/properties/editors/CardEditor.tsx`

### 🎯 목표
Card 컴포넌트의 5가지 안티패턴 모두 제거

### 📋 Step-by-Step

#### Step 1: 파일 백업 (2min)

```bash
cp src/builder/components/Card.tsx src/builder/components/Card.tsx.backup
cp src/builder/components/styles/Card.css src/builder/components/styles/Card.css.backup
```

#### Step 2: Card.tsx import 수정 (5min)

**추가할 imports**:

```typescript
import { composeRenderProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import type { CardVariant, ComponentSizeSubset } from "../../types/componentVariants";
import './styles/Card.css';
```

#### Step 3: CardProps 인터페이스 수정 (10min)

**Before** (라인 4-18):
```typescript
export interface CardProps {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "elevated" | "outlined";  // ❌
  size?: "small" | "medium" | "large";            // ❌
  isQuiet?: boolean;
  isSelected?: boolean;  // ❌ 제거
  isDisabled?: boolean;
  isFocused?: boolean;   // ❌ 제거
  onClick?: () => void;
  title?: string;
  description?: string;
}
```

**After**:
```typescript
export interface CardProps {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: CardVariant;          // ✅ 공통 타입
  size?: ComponentSizeSubset;     // ✅ 표준 사이즈
  isQuiet?: boolean;
  isDisabled?: boolean;
  // isSelected, isFocused 제거 ✅
  onClick?: () => void;
  title?: string;
  description?: string;
}
```

#### Step 4: tv() 설정 추가 (15min)

**라인 20-35 교체** (variantClasses, sizeClasses 삭제):

```typescript
const card = tv({
  base: "react-aria-Card",
  variants: {
    variant: {
      default: "",
      elevated: "elevated",
      outlined: "outlined",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});
```

#### Step 5: Card 컴포넌트 함수 리팩토링 (20min)

**Before** (라인 20-91):
```typescript
export function Card({
  id,
  children,
  title = "Title",
  description = "This is a card description.",
  className = "",
  style,
  variant = "default",
  size = "medium",  // ❌
  isQuiet = false,
  isSelected = false,  // ❌
  isDisabled = false,
  isFocused = false,   // ❌
  onClick,
  ...props
}: CardProps) {
  const baseClasses = "react-aria-Card";

  const variantClasses = { ... };  // ❌
  const sizeClasses = { ... };     // ❌
  const stateClasses = [ ... ];    // ❌

  const finalClassName = [ ... ].join(" ");  // ❌

  return (
    <div
      className={finalClassName}
      // ...
    />
  );
}
```

**After**:
```typescript
export function Card({
  id,
  children,
  title = "Title",
  description = "This is a card description.",
  className,
  style,
  variant = "default",
  size = "md",          // ✅
  isQuiet = false,
  isDisabled = false,
  // isSelected, isFocused 제거 ✅
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      id={id}
      className={card({ variant, size, className })}  // ✅ tv() 사용
      style={style}
      onClick={onClick}
      data-quiet={isQuiet || undefined}
      data-disabled={isDisabled || undefined}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      {...props}
    >
      {title && (
        <div className="card-header">
          <div className="card-title">{title}</div>
        </div>
      )}
      <div className="card-content">
        {description && <div className="card-description">{description}</div>}
        {children}
      </div>
    </div>
  );
}
```

#### Step 6: Card.css 시멘틱 토큰 전환 (30min)

**파일 전체 재작성**:

```css
@import "../theme.css";

@layer components {
  .react-aria-Card {
    /* Base styles - semantic tokens */
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    color: var(--text-color);
    cursor: pointer;
    transition: all 150ms ease;

    /* Hover state */
    &:hover {
      border-color: var(--border-color-hover);
      box-shadow: var(--shadow-sm);
    }

    /* Focus state */
    &:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }

    /* ===================================
       Variant Styles
       =================================== */

    /* Elevated variant */
    &.elevated {
      box-shadow: var(--shadow-md);
      border-color: transparent;

      &:hover {
        box-shadow: var(--shadow-lg);
      }
    }

    /* Outlined variant */
    &.outlined {
      box-shadow: none;
      border-width: 2px;
      border-color: var(--border-color);

      &:hover {
        border-color: var(--border-color-hover);
      }
    }

    /* ===================================
       Size Styles
       =================================== */

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

    /* ===================================
       State Modifiers
       =================================== */

    &[data-quiet] {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    &[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  /* ===================================
     Card Sub-components
     =================================== */

  .card-header {
    margin-bottom: var(--spacing-sm);
  }

  .card-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-color);
  }

  .card-description {
    color: var(--text-color-placeholder);
    margin-bottom: var(--spacing-sm);
  }

  .card-content {
    display: flex;
    flex-direction: column;
  }
}
```

#### Step 7: Card 사용처 전체 수정 (30min)

**사용처 검색**:
```bash
grep -r '<Card' src/ --include="*.tsx" -n
```

**모든 사용처에서 size prop 값 변경**:

```typescript
// ❌ BEFORE
<Card size="small" />
<Card size="medium" />
<Card size="large" />

// ✅ AFTER
<Card size="sm" />
<Card size="md" />
<Card size="lg" />
```

**isSelected, isFocused 제거**:
```typescript
// ❌ BEFORE
<Card isSelected={true} isFocused={false} />

// ✅ AFTER
<Card />  // props 제거
```

#### Step 8: CardEditor 업데이트 (15min)

**파일**: `src/builder/inspector/properties/editors/CardEditor.tsx`

**Size 옵션 수정**:

```typescript
// ❌ BEFORE
<PropertySelect
  label="Size"
  value={String(currentProps.size || 'medium')}
  onChange={(value) => updateProp('size', value)}
  options={[
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ]}
/>

// ✅ AFTER
<PropertySelect
  label="Size"
  value={String(currentProps.size || 'md')}
  onChange={(value) => updateProp('size', value)}
  options={[
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
  ]}
/>
```

**isSelected, isFocused controls 제거** (있다면)

#### Step 9: 검증 (10min)

```bash
# TypeScript 검증
npm run type-check

# 개발 서버 실행
npm run dev
```

**테스트 체크리스트**:
1. Card 컴포넌트 렌더링 확인
2. variant 변경 (default/elevated/outlined)
3. size 변경 (sm/md/lg)
4. 라이트 모드 스타일 확인
5. 다크 모드 전환: `document.documentElement.dataset.theme = "dark"`
6. 다크 모드 스타일 확인
7. Hover 상태 확인
8. Focus 상태 확인 (Tab 키)
9. Disabled 상태 확인

### ✅ 완료 조건

- [ ] variantClasses, sizeClasses 제거됨
- [ ] tv() 패턴 적용 완료
- [ ] size 값이 sm/md/lg로 통일됨
- [ ] isSelected, isFocused 제거됨
- [ ] Card.css가 시멘틱 토큰 사용
- [ ] 모든 사용처 업데이트 완료
- [ ] TypeScript 에러 없음
- [ ] 시각적 회귀 없음

---

## Phase 1.2: Panel.tsx 리팩토링 (1-1.5시간)

**동일한 패턴으로 진행**:

1. 파일 백업
2. import 수정 (tv, PanelVariant)
3. Props 타입 수정
4. tv() 설정 추가
5. 컴포넌트 함수 리팩토링
6. 검증

**세부 단계는 Card와 유사하므로 생략**

---

# Phase 2: Button.css 시멘틱 토큰 마이그레이션

**예상 시간**: 1-1.5시간

## 팔레트 참조 제거

### 📝 작업 파일
`src/builder/components/styles/Button.css`

### 🎯 목표
7개 팔레트 변수 → 7개 시멘틱 토큰

### 📋 Step-by-Step

#### Step 1: 파일 백업 (2min)

```bash
cp src/builder/components/styles/Button.css src/builder/components/styles/Button.css.backup
```

#### Step 2: Primary variant 수정 (10min)

**Line 34-38 수정**:

```css
/* ❌ BEFORE */
&.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--color-primary-600);  /* 팔레트 참조 */
}

/* ✅ AFTER */
&.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border);  /* 시멘틱 토큰 */
}

/* Hover state 추가 */
&.primary:hover {
  border-color: var(--button-primary-border-hover);
}
```

#### Step 3: Secondary variant 수정 (10min)

```css
/* ❌ BEFORE */
&.secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border-color: var(--color-secondary-600);
}

/* ✅ AFTER */
&.secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border-color: var(--button-secondary-border);
}

&.secondary:hover {
  border-color: var(--button-secondary-border-hover);
}
```

#### Step 4: Surface variant 수정 (10min)

```css
/* ❌ BEFORE */
&.surface {
  background: var(--color-surface-500);
  color: var(--color-white);
  border-color: var(--color-surface-600);
}

/* ✅ AFTER */
&.surface {
  background: var(--button-surface-bg);
  color: var(--button-surface-text);
  border-color: var(--button-surface-border);
}
```

#### Step 5: Outline variant 수정 (10min)

```css
/* ❌ BEFORE */
&.outline {
  background: transparent;
  color: var(--color-gray-800);
  border-color: var(--color-gray-300);
}

/* ✅ AFTER */
&.outline {
  background: transparent;
  color: var(--button-outline-text);
  border-color: var(--button-outline-border);
}
```

#### Step 6: Ghost variant 수정 (10min)

```css
/* ❌ BEFORE */
&.ghost {
  background: transparent;
  color: var(--color-gray-800);
  border-color: transparent;
}

/* ✅ AFTER */
&.ghost {
  background: transparent;
  color: var(--button-ghost-text);
  border-color: transparent;
}
```

#### Step 7: 팔레트 참조 완전 제거 확인 (5min)

```bash
# Button.css에서 팔레트 변수 검색 (결과가 0이어야 함)
grep -E "(--color-primary-|--color-secondary-|--color-surface-|--color-gray-|--color-white)" src/builder/components/styles/Button.css

# 예상 결과: (아무것도 출력되지 않음)
```

#### Step 8: 검증 (15min)

```bash
npm run dev
```

**테스트 매트릭스** (5 variants × 5 sizes = 25 combinations):

| Variant | xs | sm | md | lg | xl |
|---------|----|----|----|----|---|
| default | ✓ | ✓ | ✓ | ✓ | ✓ |
| primary | ✓ | ✓ | ✓ | ✓ | ✓ |
| secondary | ✓ | ✓ | ✓ | ✓ | ✓ |
| surface | ✓ | ✓ | ✓ | ✓ | ✓ |
| outline | ✓ | ✓ | ✓ | ✓ | ✓ |
| ghost | ✓ | ✓ | ✓ | ✓ | ✓ |

**상태 테스트**:
- [ ] Default 상태
- [ ] Hover 상태
- [ ] Pressed 상태 ([data-pressed])
- [ ] Focus 상태 ([data-focus-visible])
- [ ] Disabled 상태 ([data-disabled])

**다크 모드 테스트**:
```javascript
// 콘솔에서 실행
document.documentElement.dataset.theme = "dark"
// 모든 variant 다시 확인
```

### ✅ 완료 조건

- [ ] 7개 팔레트 변수 모두 제거
- [ ] 7개 시멘틱 토큰으로 교체
- [ ] grep 검색 결과 0개
- [ ] 25개 조합 모두 정상 작동
- [ ] 라이트/다크 모드 모두 확인
- [ ] 모든 상태 정상 작동

---

# Phase 3: Tier 1 Form 컴포넌트

**예상 시간**: 10-14시간

## 공통 패턴

모든 Form 컴포넌트는 동일한 패턴을 따릅니다:

1. **import 추가** (tv, types)
2. **Props 확장** (variant, size)
3. **tv() 설정**
4. **composeRenderProps 적용**
5. **CSS 파일 작성**
6. **Editor 업데이트**
7. **검증**

## Phase 3.1: TextField 예시 (2-2.5시간)

### 📋 Quick Steps

```bash
# 1. 백업
cp src/builder/components/TextField.tsx src/builder/components/TextField.tsx.backup

# 2. CSS 파일 생성 (없으면)
touch src/builder/components/styles/TextField.css
```

### TypeScript 수정

**imports**:
```typescript
import { tv } from "tailwind-variants";
import type { FieldVariant, ComponentSize } from "../../types/componentVariants";
```

**Props**:
```typescript
export interface TextFieldProps extends AriaTextFieldProps {
  variant?: FieldVariant;
  size?: ComponentSize;
}
```

**tv() 설정**:
```typescript
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
```

**컴포넌트**:
```typescript
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

### CSS 작성

**전체 TextField.css** (약 120줄):

```css
@import "../theme.css";

@layer components {
  .react-aria-TextField {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);

    /* Label */
    & label {
      color: var(--text-color);
      font-size: var(--text-sm);
      font-weight: 500;
    }

    /* Input base */
    & input {
      width: 100%;
      background: var(--field-background);
      color: var(--field-text-color);
      border: 1px solid var(--field-border);
      border-radius: var(--border-radius);
      outline: none;
      transition: all 150ms;

      &::placeholder {
        color: var(--text-color-placeholder);
      }

      &:hover {
        border-color: var(--field-border-hover);
      }

      &:focus {
        border-color: var(--field-border-focus);
        box-shadow: var(--focus-ring-shadow);
      }

      &[data-disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Variant: filled */
    &.filled input {
      background: var(--field-background-filled);
      border-color: transparent;

      &:hover {
        background: var(--hover-background);
      }

      &:focus {
        background: var(--field-background);
        border-color: var(--field-border-focus);
      }
    }

    /* Variant: outlined */
    &.outlined input {
      background: transparent;
      border-width: 2px;
    }

    /* Size: xs */
    &.xs input {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--text-xs);
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

    /* Size: lg */
    &.lg input {
      padding: var(--spacing-md) var(--spacing-xl);
      font-size: var(--text-lg);
    }

    /* Size: xl */
    &.xl input {
      padding: var(--spacing-lg) var(--spacing-2xl);
      font-size: var(--text-xl);
    }
  }
}
```

### Editor 업데이트

**TextFieldEditor.tsx**:

```typescript
<PropertySelect
  label="Variant"
  value={String(currentProps.variant || 'default')}
  onChange={(value) => updateProp('variant', value)}
  options={[
    { value: 'default', label: 'Default' },
    { value: 'filled', label: 'Filled' },
    { value: 'outlined', label: 'Outlined' },
  ]}
/>

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
```

### 검증

```bash
npm run type-check
npm run dev
```

**테스트**: 3 variants × 5 sizes = 15 combinations

### ✅ 완료 조건

- [ ] variant/size props 추가
- [ ] tv() 패턴 적용
- [ ] TextField.css 작성 (시멘틱 토큰만)
- [ ] Editor 업데이트
- [ ] 15개 조합 테스트
- [ ] 라이트/다크 모드 확인

---

## Phase 3.2-3.6: 나머지 컴포넌트

**동일한 패턴 반복**:

- **Select** (2-2.5시간)
- **ComboBox** (2-2.5시간)
- **Checkbox** (2시간) - size만
- **Radio** (2시간) - size만
- **Switch** (2시간) - size만

각 컴포넌트마다 위의 TextField 패턴 적용

---

# Phase 4-6: 나머지 컴포넌트

**동일한 패턴을 계속 반복**

생략 (자세한 내용은 COMPONENT_REFACTORING_TEMPLATE.md 참조)

---

# Phase 7: 검증 및 문서화

**예상 시간**: 3-4시간

## 7.1 통합 테스트 (1.5시간)

### 팔레트 참조 완전 제거 확인

```bash
# 모든 CSS 파일에서 팔레트 변수 검색
grep -r "color-gray-\|color-primary-\|color-secondary-\|color-surface-\|color-white" \
  src/builder/components/styles/ \
  --include="*.css"

# 예상 결과: 주석이나 fallback에만 존재, 실제 사용 없음
```

### TypeScript 검증

```bash
npm run type-check
# 예상 결과: 에러 0개
```

### 시각적 회귀 테스트

```bash
# 개발 서버
npm run dev

# Storybook
npm run storybook
```

**테스트 체크리스트**:
- [ ] 모든 컴포넌트 렌더링 확인
- [ ] 모든 variant 조합 확인
- [ ] 모든 size 조합 확인
- [ ] 라이트 모드 정상
- [ ] 다크 모드 정상
- [ ] Hover/Focus/Pressed 상태
- [ ] Disabled 상태

## 7.2 Storybook 업데이트 (1시간)

**각 컴포넌트 Story에 controls 추가**:

```typescript
export default {
  title: 'Components/TextField',
  component: TextField,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outlined'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};
```

## 7.3 CLAUDE.md 업데이트 (30min)

**Component Variant/Size System 섹션 작성**

## 7.4 마이그레이션 가이드 작성 (1시간)

**docs/implementation/MIGRATION_COMPLETE.md** 생성

---

## 🎯 전체 완료 체크리스트

### Phase 0: 기반 인프라 ✅
- [ ] theme.css에 25개 시멘틱 토큰
- [ ] componentVariants.ts 생성
- [ ] Gold Standard 문서화

### Phase 1: 안티패턴 제거 ✅
- [ ] Card.tsx 리팩토링
- [ ] Panel.tsx 리팩토링

### Phase 2: Button ✅
- [ ] Button.css 시멘틱 토큰

### Phase 3: Tier 1 Form ✅
- [ ] TextField, Select, ComboBox
- [ ] Checkbox, Radio, Switch

### Phase 4: Navigation ✅
- [ ] Menu, Tabs, Dialog, Breadcrumbs

### Phase 5: CSS ✅
- [ ] 19개 CSS 파일 마이그레이션

### Phase 6: 나머지 ✅
- [ ] Collection, Feedback, Input

### Phase 7: 검증 ✅
- [ ] 통합 테스트
- [ ] Storybook
- [ ] 문서

---

**총 예상 시간: 39-52시간**

**다음 문서**: [COMPONENT_REFACTORING_TEMPLATE.md](./COMPONENT_REFACTORING_TEMPLATE.md)
