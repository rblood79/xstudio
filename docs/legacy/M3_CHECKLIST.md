# Material Design 3 Migration Checklist

## Component: _________________

**Migrated by**: _________________
**Date**: _________________
**Phase**: _________________

---

## 📋 Pre-Migration Checklist

### Preparation
- [ ] Read M3 Color Roles documentation (https://m3.material.io/styles/color/roles)
- [ ] Review M3_COMPONENT_TEMPLATE.css
- [ ] Review similar migrated components (Button, Card, Checkbox)
- [ ] Identify component category (Form, Collection, Overlay, etc.)
- [ ] Determine appropriate variants for this component

### Analysis
- [ ] Current component uses legacy tokens (--action-*, hardcoded colors)
- [ ] Component has interactive states (hover, pressed, focus)
- [ ] Component has size variants (sm, md, lg)
- [ ] Component has disabled state
- [ ] Component has invalid/error state
- [ ] Component is parent-controlled (like Radio/RadioGroup)

---

## 🎨 CSS Migration Checklist

### 1. File Structure
- [ ] Add M3 comment header at top of file
- [ ] Ensure `@layer components` wrapper exists
- [ ] Import base.css if needed

### 2. Default Styles (Base Component)
- [ ] Replace hardcoded colors with M3 tokens
  - [ ] `color: var(--on-surface)` (text)
  - [ ] `background: var(--surface-container-high)` (background)
  - [ ] `border-color: var(--outline-variant)` (border)
- [ ] Add transition for smooth interactions (`transition: all 200ms ease`)

### 3. Interactive States
- [ ] **Hover State** `[data-hovered]`
  - [ ] Use `color-mix(in srgb, var(--surface-container-high) 92%, black)`
  - [ ] Update border-color to `var(--outline)`
- [ ] **Pressed State** `[data-pressed]`
  - [ ] Use `color-mix(in srgb, var(--surface-container-high) 88%, black)`
  - [ ] Add `box-shadow: var(--inset-shadow-sm)`
- [ ] **Focus State** `[data-focus-visible]`
  - [ ] Use `outline: 2px solid var(--primary)`
  - [ ] Add `outline-offset: 2px`
- [ ] **Disabled State** `[data-disabled]`
  - [ ] Background: `color-mix(in srgb, var(--on-surface) 12%, transparent)`
  - [ ] Color: `color-mix(in srgb, var(--on-surface) 38%, transparent)`
  - [ ] Opacity: `0.38`
- [ ] **Invalid State** `[data-invalid]`
  - [ ] Border: `var(--error)`
  - [ ] Outline: `var(--error)` (on focus)

### 4. M3 Variants (5 variants)
- [ ] **Primary Variant** `.primary`
  - [ ] Background: `var(--primary)`
  - [ ] Color: `var(--on-primary)`
  - [ ] Border: `var(--primary)`
  - [ ] Hover: `var(--primary-hover)`
  - [ ] Pressed: `var(--primary-pressed)`
- [ ] **Secondary Variant** `.secondary`
  - [ ] Same pattern with `--secondary` tokens
- [ ] **Tertiary Variant** `.tertiary`
  - [ ] Same pattern with `--tertiary` tokens
- [ ] **Error Variant** `.error`
  - [ ] Same pattern with `--error` tokens
- [ ] **Surface Variant** `.surface`
  - [ ] Background: `var(--surface-container-highest)`
  - [ ] Color: `var(--on-surface)`
  - [ ] Use `color-mix()` for hover/pressed

### 5. Size Variants (3 sizes)
- [ ] **Small Size** `.sm`
  - [ ] Reduce padding, font-size, gap
- [ ] **Medium Size** `.md` (default)
  - [ ] Standard sizing
- [ ] **Large Size** `.lg`
  - [ ] Increase padding, font-size, gap

### 6. Invalid State Override
- [ ] Add override for all variants when `[data-invalid]`
  - [ ] Border: `var(--error)`
  - [ ] Outline: `var(--error)`

### 7. Browser Fallbacks
- [ ] Add `@supports not (color: color-mix(...))` fallback
- [ ] Test in Safari < 16.2 (if supporting)

### 8. Parent-Controlled Pattern (if applicable)
- [ ] Add parent group styles (e.g., `.react-aria-ComponentGroup`)
- [ ] Add `[data-component-variant="primary"]` selectors
- [ ] Repeat for all variants

---

## 💻 TypeScript Migration Checklist

### 1. Props Interface
- [ ] Import types from `componentVariants.ts`
  ```typescript
  import type { ComponentSize } from '../../types/componentVariants';
  ```
- [ ] Add variant prop
  ```typescript
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';
  ```
- [ ] Add size prop
  ```typescript
  size?: ComponentSize;
  ```

### 2. tv() Implementation
- [ ] Import `tv` from `tailwind-variants`
  ```typescript
  import { tv } from 'tailwind-variants';
  ```
- [ ] Create styles object
  ```typescript
  const componentStyles = tv({
    base: 'react-aria-Component',
    variants: {
      variant: {
        primary: 'primary',
        secondary: 'secondary',
        tertiary: 'tertiary',
        error: 'error',
        surface: 'surface',
      },
      size: {
        sm: 'sm',
        md: 'md',
        lg: 'lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  });
  ```

### 3. Component Implementation
- [ ] Import `composeRenderProps` from React Aria
  ```typescript
  import { composeRenderProps } from 'react-aria-components';
  ```
- [ ] Apply styles with `composeRenderProps`
  ```typescript
  className={composeRenderProps(
    props.className,
    (className, renderProps) => {
      return componentStyles({
        ...renderProps,
        variant: props.variant,
        size: props.size,
        className,
      });
    }
  )}
  ```

### 4. Type Safety
- [ ] No `any` types
- [ ] Explicit return types
- [ ] Proper generics for React Aria components

---

## 🎭 Storybook Migration Checklist

### 1. Story File Creation
- [ ] Create/update `Component.stories.tsx`
- [ ] Import component and types
- [ ] Set up Meta configuration

### 2. All Variants Story
- [ ] Create story showcasing all 5 variants side-by-side
  ```typescript
  export const AllVariants: Story = {
    render: () => (
      <>
        <Component variant="primary">Primary</Component>
        <Component variant="secondary">Secondary</Component>
        <Component variant="tertiary">Tertiary</Component>
        <Component variant="error">Error</Component>
        <Component variant="surface">Surface</Component>
      </>
    ),
  };
  ```

### 3. All Sizes Story
- [ ] Create story showcasing all 3 sizes
  ```typescript
  export const AllSizes: Story = {
    render: () => (
      <>
        <Component size="sm">Small</Component>
        <Component size="md">Medium</Component>
        <Component size="lg">Large</Component>
      </>
    ),
  };
  ```

### 4. Dark Mode Story
- [ ] Create story with dark mode wrapper
  ```typescript
  export const DarkMode: Story = {
    decorators: [
      (Story) => (
        <div data-theme="dark">
          <Story />
        </div>
      ),
    ],
  };
  ```

### 5. Invalid State Story
- [ ] Create story showing invalid/error state
  ```typescript
  export const InvalidState: Story = {
    args: {
      isInvalid: true,
    },
  };
  ```

### 6. Interactive States Story
- [ ] Show hover, pressed, focus, disabled states
- [ ] Use Storybook interactions addon (optional)

---

## 🎨 Inspector Editor Checklist

### 1. Editor File
- [ ] Create/update `ComponentEditor.tsx`
- [ ] Import Property components
  ```typescript
  import { PropertySelect, PropertyInput } from '../../components';
  ```

### 2. Variant Control
- [ ] Add PropertySelect for variant
  ```typescript
  <PropertySelect
    label={PROPERTY_LABELS.VARIANT}
    value={String(currentProps.variant || 'primary')}
    onChange={(value) => updateProp('variant', value)}
    options={[
      { value: 'primary', label: 'Primary' },
      { value: 'secondary', label: 'Secondary' },
      { value: 'tertiary', label: 'Tertiary' },
      { value: 'error', label: 'Error' },
      { value: 'surface', label: 'Surface' },
    ]}
    icon={Layout}
  />
  ```

### 3. Size Control
- [ ] Add PropertySelect for size
  ```typescript
  <PropertySelect
    label={PROPERTY_LABELS.SIZE}
    value={String(currentProps.size || 'md')}
    onChange={(value) => updateProp('size', value)}
    options={[
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ]}
  />
  ```

### 4. Labels
- [ ] Add labels to `src/utils/labels.ts`
  ```typescript
  COMPONENT_VARIANT_PRIMARY: 'Primary',
  COMPONENT_VARIANT_SECONDARY: 'Secondary',
  // etc...
  ```

---

## ✅ Testing Checklist

### 1. Visual Testing
- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] All 5 variants display correct colors
- [ ] All 3 sizes display correct dimensions
- [ ] Hover states work correctly
- [ ] Pressed states work correctly
- [ ] Focus states work correctly
- [ ] Disabled states work correctly
- [ ] Invalid states work correctly

### 2. Accessibility Testing
- [ ] **Color Contrast** (WCAG AA: 4.5:1 for text, 3:1 for UI)
  - [ ] Light mode: Primary variant contrast ≥ 4.5:1
  - [ ] Light mode: Secondary variant contrast ≥ 4.5:1
  - [ ] Light mode: Error variant contrast ≥ 4.5:1
  - [ ] Dark mode: Primary variant contrast ≥ 4.5:1
  - [ ] Dark mode: Secondary variant contrast ≥ 4.5:1
  - [ ] Dark mode: Error variant contrast ≥ 4.5:1
  - [ ] Use tools: Chrome DevTools, WebAIM Contrast Checker
- [ ] **Keyboard Navigation**
  - [ ] Tab key focuses component
  - [ ] Enter/Space activates component
  - [ ] Focus indicator visible (2px outline)
- [ ] **Screen Reader**
  - [ ] Component announces correctly
  - [ ] States announced (disabled, invalid)

### 3. Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Safari 16.2+ (color-mix support)
- [ ] Safari < 16.2 (fallback works)

### 4. Integration Testing
- [ ] AI Theme Studio changes apply instantly
- [ ] Dark mode toggle works correctly
- [ ] Inspector variant/size controls work
- [ ] Component works within Builder Preview iframe
- [ ] Component works with DataBinding (if applicable)

### 5. Performance Testing
- [ ] No layout shifts on variant change
- [ ] No janky animations
- [ ] Smooth transitions (60fps)
- [ ] CSS bundle size increase acceptable (<5KB)

---

## 📝 Documentation Checklist

### 1. Code Comments
- [ ] M3 variant comments added
- [ ] Complex selectors explained
- [ ] Usage notes for developers

### 2. Component Metadata
- [ ] Update `src/builder/components/metadata.ts`
  ```typescript
  Component: {
    displayName: "Component",
    description: "...",
    category: "...",
    inspector: {
      groups: ["general"],
      variants: ["primary", "secondary", "tertiary", "error", "surface"],
      sizes: ["sm", "md", "lg"],
    },
  },
  ```

### 3. Factory Definition
- [ ] Update component factory if needed
- [ ] Add default variant/size to factory

---

## 🚀 Deployment Checklist

### 1. Pre-Deployment
- [ ] All tests passing
- [ ] Storybook builds successfully
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Team code review approved
- [ ] Designer review approved (if applicable)

### 2. Git
- [ ] Commit with descriptive message
  ```
  feat: Migrate Component to M3 Color System

  - Add 5 M3 color variants (primary, secondary, tertiary, error, surface)
  - Add 3 size variants (sm, md, lg)
  - Update Storybook stories
  - Update Inspector editor
  - Add accessibility improvements

  Closes #XXX
  ```
- [ ] Create git tag (if end of phase)
  ```
  git tag -a phase-X-complete -m "Phase X: Component migration complete"
  ```

### 3. Documentation
- [ ] Update CHANGELOG.md
- [ ] Update component usage guide (if exists)
- [ ] Update migration progress tracker

---

## 📊 Migration Metrics

**Component**: _________________
**Lines of CSS Changed**: _________________
**Lines of TypeScript Changed**: _________________
**Storybook Stories Added**: _________________
**Time Spent**: _________ hours

**Before Migration**:
- Variants: _________
- Sizes: _________
- M3 Compliance: ❌

**After Migration**:
- Variants: 5 (primary, secondary, tertiary, error, surface)
- Sizes: 3 (sm, md, lg)
- M3 Compliance: ✅

---

## 🎯 Sign-Off

- [ ] Developer: _________________ (Date: _________)
- [ ] Code Reviewer: _________________ (Date: _________)
- [ ] Designer (if applicable): _________________ (Date: _________)
- [ ] QA (if applicable): _________________ (Date: _________)

---

## 📚 References

- [M3 Color Roles](https://m3.material.io/styles/color/roles)
- [M3 Component Template](./M3_COMPONENT_TEMPLATE.css)
- [M3 Storybook Template](./M3_STORYBOOK_TEMPLATE.tsx)
- [M3 Browser Compatibility](./M3_BROWSER_COMPATIBILITY.md)
- [XStudio CLAUDE.md](../CLAUDE.md)
