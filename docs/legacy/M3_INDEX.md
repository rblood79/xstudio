# Material Design 3 (M3) Migration - Complete Documentation Index

**Last Updated**: 2025-11-19
**Status**: Phase 0 Complete ✅ | Ready for Phase 1 🚀

---

## 📚 Documentation Overview

This index provides a complete overview of all Material Design 3 migration documentation for XStudio. Use this as your central navigation point for all M3-related guides, templates, and references.

---

## 🎯 Quick Start

**New to M3 Migration?** Start here:

1. **Read**: [M3 Phase 0 Complete Summary](./M3_PHASE_0_COMPLETE.md) - Overview of preparation phase
2. **Understand**: [M3 Palette Mapping Guide](./M3_PALETTE_MAPPING.md) - How brand colors map to M3 roles
3. **Use**: [M3 Component Template](./M3_COMPONENT_TEMPLATE.css) - Your starting point for migration
4. **Follow**: [M3 Migration Checklist](./M3_MIGRATION_CHECKLIST.md) - Step-by-step verification (150+ items)
5. **Reference**: [Component Variants Types](../src/types/componentVariants.ts) - TypeScript type definitions

---

## 📋 Core Documentation

### 1. Phase 0 Completion Summary ✅
**File**: [`M3_PHASE_0_COMPLETE.md`](./M3_PHASE_0_COMPLETE.md)

**What's Inside**:
- Complete deliverables list (5 files)
- Phase 1 preparation checklist
- Migration progress tracking (12/74 components complete)
- Risk management and success factors
- Next actions and timeline (13 weeks total)

**When to Use**:
- Project status overview
- Team kickoff preparation
- Timeline planning

---

### 2. Palette Mapping Guide
**File**: [`M3_PALETTE_MAPPING.md`](./M3_PALETTE_MAPPING.md)

**What's Inside**:
- Complete M3 Color Roles mapping (20 roles)
- Light Mode mapping table (primary-600 → --primary)
- Dark Mode mapping table (primary-400 → --primary)
- Hover/Pressed state calculation rules
- Theme Studio workflow (AI/Figma/Manual)
- M3 Color System Guide implementation (real-time visualization)

**When to Use**:
- Understanding how brand colors become M3 tokens
- Setting up new themes in Theme Studio
- Debugging color role mappings
- Verifying Light/Dark mode consistency

**Key Mappings**:
```css
/* Light Mode */
--primary: var(--color-primary-600)           /* 600 shade */
--primary-container: var(--color-primary-100)  /* 100 shade */
--on-primary: var(--color-white)               /* White text */

/* Dark Mode */
--primary: var(--color-primary-400)           /* 400 shade (brighter) */
--primary-container: var(--color-primary-800)  /* 800 shade (darker) */
--on-primary: var(--color-primary-900)        /* Dark text */
```

---

## 🛠️ Templates & Guides

### 3. Component CSS Template
**File**: [`M3_COMPONENT_TEMPLATE.css`](./M3_COMPONENT_TEMPLATE.css) (280 lines)

**What's Inside**:
- Complete CSS structure for any component
- 5 M3 color variants (primary, secondary, tertiary, error, surface)
- 3 size variants (sm, md, lg)
- All interactive states (hover, pressed, focus, disabled, invalid)
- Browser fallback with `@supports`
- Parent-controlled pattern example
- Dark mode automatic handling

**How to Use**:
```bash
# Copy template
cp docs/M3_COMPONENT_TEMPLATE.css src/builder/components/styles/YourComponent.css

# Replace all instances
# Find: Component
# Replace: YourComponent

# Remove unused sections (e.g., parent-controlled pattern if not needed)
```

**Key Patterns**:
```css
/* Base component */
.react-aria-Component {
  color: var(--on-surface);
  background: var(--surface-container-high);
}

/* Primary variant */
.react-aria-Component.primary {
  background: var(--primary);
  color: var(--on-primary);

  &[data-hovered] {
    background: var(--primary-hover);
  }
}

/* Browser fallback */
@supports not (color: color-mix(in srgb, red 50%, blue)) {
  .react-aria-Component.primary[data-hovered] {
    background: var(--color-primary-700, #5443a3);
  }
}
```

---

### 4. Migration Checklist
**File**: [`M3_MIGRATION_CHECKLIST.md`](./M3_MIGRATION_CHECKLIST.md) (500+ lines)

**What's Inside**:
- **Pre-Migration**: Preparation, analysis (19 items)
- **CSS Migration**: File structure, variants, states, fallbacks (50+ items)
- **TypeScript Migration**: Props, tv(), type safety (12 items)
- **Storybook Migration**: Stories, variants, dark mode (15 items)
- **Inspector Editor**: Controls, labels (8 items)
- **Testing**: Visual, accessibility, browser, integration, performance (30+ items)
- **Documentation**: Comments, metadata, factory (5 items)
- **Deployment**: Pre-deployment, git, changelog (10 items)
- **Sign-Off**: Developer, reviewer, designer, QA

**Total**: 150+ verification items per component

**How to Use**:
1. Print or open checklist alongside your work
2. Check off items as you complete them
3. Don't skip any sections (they catch common mistakes)
4. Get sign-off before marking component complete

**Critical Checkpoints**:
- [ ] All 5 M3 variants implemented
- [ ] WCAG AA contrast verified (4.5:1 minimum)
- [ ] Browser fallback tested on Safari 15.6
- [ ] All Storybook stories created
- [ ] Inspector editor updated
- [ ] TypeScript: 0 errors

---

### 5. Storybook Template
**File**: [`M3_STORYBOOK_TEMPLATE.tsx`](./M3_STORYBOOK_TEMPLATE.tsx) (400+ lines)

**What's Inside**:
- Meta configuration with argTypes
- 10+ story examples:
  - Default
  - AllVariants (5 variants side-by-side)
  - AllSizes (3 sizes)
  - InteractiveStates
  - DarkMode
  - DarkModeAllVariants
  - InvalidState
  - VariantSizeMatrix
  - AccessibilityContrast (documented ratios)
  - DisabledStates

**How to Use**:
```bash
# Copy template
cp docs/M3_STORYBOOK_TEMPLATE.tsx src/stories/YourComponent.stories.tsx

# Replace all instances
# Find: Component
# Replace: YourComponent

# Update import path to your component
import { YourComponent } from '../builder/components/YourComponent';
```

**Key Story**:
```typescript
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Component variant="primary">Primary</Component>
      <Component variant="secondary">Secondary</Component>
      <Component variant="tertiary">Tertiary</Component>
      <Component variant="error">Error</Component>
      <Component variant="surface">Surface</Component>
    </div>
  ),
};
```

---

### 6. Browser Compatibility Guide
**File**: [`M3_BROWSER_COMPATIBILITY.md`](./M3_BROWSER_COMPATIBILITY.md) (400+ lines)

**What's Inside**:
- Browser support matrix (92% global coverage)
- 3 fallback strategies:
  1. **CSS @supports** with pre-calculated colors (recommended)
  2. **Opacity overlay** (simpler)
  3. **Pre-calculated palette** (comprehensive)
- Testing procedures (manual + automated)
- Fallback color calculation formulas
- Known issues and workarounds

**Browser Support**:
| Browser | Version | Support | Notes |
|---------|---------|---------|-------|
| Chrome | 111+ | ✅ Full | Released March 2023 |
| Firefox | 113+ | ✅ Full | Released May 2023 |
| Safari | 16.2+ | ✅ Full | Released December 2022 |
| Safari | < 16.2 | ❌ Fallback | Requires @supports |

**Recommended Strategy** (Strategy 1):
```css
@supports not (color: color-mix(in srgb, red 50%, blue)) {
  .react-aria-Button.primary[data-hovered] {
    /* Pre-calculated hover color for Safari < 16.2 */
    background: var(--color-primary-700, #5443a3);
  }

  [data-theme="dark"] .react-aria-Button.primary[data-hovered] {
    /* Dark mode fallback */
    background: var(--color-primary-300);
  }
}
```

---

### 7. TypeScript Type Definitions
**File**: [`../src/types/componentVariants.ts`](../src/types/componentVariants.ts) (280 lines)

**What's Inside**:
- Universal types: `M3Variant`, `ComponentSize`
- Component-specific variants for all 74 components
- Interface helpers: `M3VariantProps`, `ComponentSizeProps`, `M3ComponentProps`
- Type guards: `isM3Variant()`, `isComponentSize()`
- Conversion utilities: `normalizeSize()`, `getDefaultVariant()`, `getDefaultSize()`

**Usage Example**:
```typescript
import type { TextFieldVariant, ComponentSize } from '../../types/componentVariants';
import { tv } from 'tailwind-variants';

interface TextFieldProps {
  variant?: TextFieldVariant;  // 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled'
  size?: ComponentSize;        // 'sm' | 'md' | 'lg'
}

const textFieldStyles = tv({
  base: 'react-aria-TextField',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
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

---

## 📊 Progress Tracking

### Current Status (2025-11-19)

**Overall Progress**: 16.2% (12/74 components)

### ✅ Already Migrated (12 components)
1. **Button** - 7 variants (default, primary, secondary, tertiary, error, surface, outline, ghost)
2. **Card** - 6 variants (default, outlined, elevated, primary, secondary, surface)
3. **Separator** - 6 variants (solid, dashed, dotted, primary, secondary, surface)
4. **Checkbox** - 4 variants (parent-controlled via CheckboxGroup)
5. **Radio** - 4 variants (parent-controlled via RadioGroup)
6. **Switch** - 4 variants
7. **Slider** - 4 variants
8. **ProgressBar** - 6 variants
9. **Meter** - 4 variants
10. **TagGroup** - 4 variants (parent-controlled)
11. **Tag** - 4 variants
12. **ToggleButton** - 4 variants

### 🔄 Remaining (62 components)

**Phase 1: Form Components** (6 components, 8 days)
- TextField, NumberField, DateField, TimeField, SearchField, Select, ComboBox

**Phase 2: Collection Components** (4 components, 8 days)
- ListBox, GridList, Menu, Table

**Phase 3: Overlay Components** (4 components, 8 days)
- Dialog, Popover, Tooltip, Modal

**Phase 4: Navigation Components** (3 components, 5 days)
- Tabs, Breadcrumbs, Link

**Phase 5: Feedback Components** (6 components, 9 days)
- Badge, Toast, Snackbar, Alert, Banner, EmptyState

**Phase 6: Date/Time Components** (9 components, 14 days)
- Calendar, DatePicker, DateRangePicker, TimeField, RangeCalendar

**Phase 7: Color Components** (4 components, 6 days)
- ColorField, ColorPicker, ColorArea, ColorWheel

**Phase 8: Layout Components** (2 components, 3 days)
- GridLayout, StackLayout

**Phase 9: Builder Components** (20 components, 12 days)
- PropertyEditor, Inspector panels, etc.

**Phase 10: Finalization** (7 days)
- Documentation, accessibility audit, performance optimization

**Total Timeline**: 13 weeks (77 days)

---

## 🎨 Design System Integration

### Theme Studio Workflow

**1. AI Theme Generation**
```typescript
// ThemeGenerationService.ts generates full palette
{
  primary: { 50: "...", 100: "...", ..., 900: "..." },
  secondary: { ... },
  surface: { ... }
}
```

**2. Automatic M3 Mapping**
```css
/* preview-system.css automatically maps palette to M3 roles */
:root {
  --primary: var(--color-primary-600);
  --on-primary: var(--color-white);
  --primary-container: var(--color-primary-100);
}

[data-theme="dark"] {
  --primary: var(--color-primary-400);
  --on-primary: var(--color-primary-900);
  --primary-container: var(--color-primary-800);
}
```

**3. M3 Color System Guide**
- **Location**: Theme Studio right panel
- **Features**:
  - Real-time M3 diagram with actual theme colors
  - 20 M3 Color Roles visualization
  - Light/Dark Mode automatic switching
  - Role name, Shade name, Hex value display
  - Automatic text contrast (Luminance-based)

**4. Component Usage**
```tsx
// Components use M3 tokens automatically
<Button variant="primary">
  {/* Uses --primary, --on-primary, --primary-hover automatically */}
</Button>
```

---

## 🧪 Testing Strategy

### Required Tests Per Component

**1. Visual Testing**
- [ ] Light mode: All variants render correctly
- [ ] Dark mode: All variants render correctly
- [ ] All sizes display correct dimensions
- [ ] All interactive states work (hover, pressed, focus, disabled)

**2. Accessibility Testing**
- [ ] **Color Contrast**: WCAG AA minimum (4.5:1 text, 3:1 UI)
  - Use Chrome DevTools or WebAIM Contrast Checker
  - Primary variant: ≥ 7:1 (AAA achieved)
  - Error variant: ≥ 5:1 (AA+ achieved)
- [ ] **Keyboard Navigation**: Tab, Enter, Space work correctly
- [ ] **Screen Reader**: States announced correctly

**3. Browser Testing**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari 16.2+ (color-mix support)
- [ ] Safari 15.6 (fallback verification)

**4. Integration Testing**
- [ ] Theme Studio changes apply instantly
- [ ] Dark mode toggle works
- [ ] Inspector controls update component
- [ ] Builder Preview iframe renders correctly

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Forgetting Browser Fallback
**Problem**: Components break on Safari < 16.2
**Solution**: Add `@supports` block from template

### Pitfall 2: Hardcoded Colors
**Problem**: Colors don't change with theme
**Solution**: Always use CSS variables (`var(--primary)`)

### Pitfall 3: Wrong Size Type
**Problem**: Using legacy sizes (`"small"`, `"medium"`, `"large"`)
**Solution**: Use `ComponentSize` type (`"sm"`, `"md"`, `"lg"`)

### Pitfall 4: Missing Dark Mode Test
**Problem**: Components look broken in dark mode
**Solution**: Always test with `[data-theme="dark"]` toggle

### Pitfall 5: Contrast Ratio Failure
**Problem**: Text unreadable on colored backgrounds
**Solution**: Use `--on-primary`, `--on-secondary` (not hardcoded white/black)

### Pitfall 6: Incomplete Storybook
**Problem**: Missing variants/states in documentation
**Solution**: Use template's 10+ story examples

### Pitfall 7: Parent-Controlled Pattern Confusion
**Problem**: CheckboxGroup/RadioGroup variants not working
**Solution**: Read template's parent-controlled pattern section

---

## 📚 External References

### Material Design 3
- [M3 Color System](https://m3.material.io/styles/color/system/overview)
- [M3 Color Roles](https://m3.material.io/styles/color/roles)
- [M3 Components](https://m3.material.io/components)

### Web Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
- [Can I Use: color-mix()](https://caniuse.com/mdn-css_types_color_color-mix)

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Mixer Calculator](https://colordesigner.io/color-mixer)
- [Design Tokens Standard](https://www.w3.org/community/design-tokens/)

---

## 🎯 Next Steps

### For Developers Starting Phase 1

1. **Read Documentation** (30 min)
   - [ ] M3_PHASE_0_COMPLETE.md
   - [ ] M3_PALETTE_MAPPING.md
   - [ ] M3_COMPONENT_TEMPLATE.css

2. **Set Up Environment** (15 min)
   - [ ] Pull latest code
   - [ ] Verify TypeScript: `npm run type-check`
   - [ ] Verify Storybook: `npm run storybook`

3. **Pick First Component** (TextField recommended)
   - [ ] Copy M3_COMPONENT_TEMPLATE.css
   - [ ] Open M3_MIGRATION_CHECKLIST.md
   - [ ] Start migration following checklist

4. **Quality Checks**
   - [ ] 150+ checklist items complete
   - [ ] TypeScript: 0 errors
   - [ ] Storybook: 10+ stories
   - [ ] Accessibility: WCAG AA minimum
   - [ ] Browser: Safari 15.6 fallback works

5. **Code Review**
   - [ ] Submit PR with checklist
   - [ ] Get designer sign-off
   - [ ] Merge to main

---

## 📞 Support

### Questions?

**M3 Migration Team**: m3-migration@xstudio.dev

**Common Questions**:
- "Which variant should I use for X?" → See M3_PALETTE_MAPPING.md
- "How do I handle hover states?" → See M3_COMPONENT_TEMPLATE.css line 31
- "Safari fallback not working?" → See M3_BROWSER_COMPATIBILITY.md Strategy 1
- "What TypeScript types to use?" → See componentVariants.ts
- "Missing checklist item?" → Submit issue to update M3_MIGRATION_CHECKLIST.md

---

## 📝 Document Changelog

**2025-11-19**: Initial index created
- Phase 0 complete summary
- All templates and guides linked
- Component variants type definitions added
- M3 Color System Guide documentation added

---

**Last Updated**: 2025-11-19
**Maintained by**: M3 Migration Team
**Status**: Phase 0 Complete ✅ | Ready for Phase 1 🚀
