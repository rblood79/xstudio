# CSS @layer Usage Patterns - Current State

**Date:** 2025-11-08
**Purpose:** Document existing @layer patterns for migration planning

---

## 📊 @layer Declaration Summary

| Layer Name | Usage Count | Files | Purpose |
|------------|-------------|-------|---------|
| `@layer components` | 85 | 85 files | React Aria component styles |
| `@layer utilities` | 2 | 2 files | Utility classes (inspector, preview) |
| `@layer theme` | 1 | 1 file | ⚠️ Inspector-specific tokens (CONFLICT) |

**Total @layer declarations:** 88
**Files WITHOUT @layer:** 17 (main, sidebar, some theme files)

---

## 1️⃣ @layer components (85 files)

**Purpose:** All React Aria Component styles

### Pattern Example:
```css
/* src/builder/components/styles/Button.css */
@layer components {
  .react-aria-Button {
    /* component styles */
  }
}
```

### Files Using This Pattern:
```
src/builder/components/styles/
├── Button.css
├── Card.css
├── Calendar.css
├── Checkbox.css
├── ComboBox.css
├── DatePicker.css
├── Dialog.css
├── Field.css
├── GridList.css
├── ListBox.css
├── Menu.css
├── Radio.css
├── Select.css
├── Slider.css
├── Switch.css
├── Table.css
├── Tabs.css
├── TextField.css
├── ToggleButton.css
├── Tree.css
└── ... (61 total component files)
```

**Also includes:**
- Inspector property editors: `src/builder/inspector/styles/styles.css`
- Theme components: `src/builder/theme/components/ThemePreview.css`
- Data components: `src/builder/inspector/data/data.css`

**✅ Status:** Well-structured, consistent usage

---

## 2️⃣ @layer utilities (2 files)

### File 1: Inspector Utilities
**Location:** `src/builder/inspector/index.css`

```css
@layer utilities {
  .inspector {
    border-left: 1px solid var(--color-border);
    /* ... 700 lines of inspector-specific styles */
  }
}
```

**Contains:**
- Inspector layout (.inspector, .inspector-container)
- Tab system (.inspector-tabs, .inspector-tab-list)
- Section layouts (.properties-section, .style-section, etc.)
- Grid templates for property editors
- React Aria component overrides (within inspector context)

**⚠️ Problem:** This is NOT utilities - it's inspector-specific module CSS
**Should be:** `@layer builder-system` or move to separate module file

---

### File 2: Preview Utilities
**Location:** `src/builder/preview/index.module.css`

```css
@layer utilities {
  .preview {
    width: 100%;
    height: 100%;
    border: 0;
  }
}
```

**Contains:** Only iframe preview container styles (8 lines)

**✅ Status:** Correct usage - these are genuine utilities

---

## 3️⃣ @layer theme (1 file) ⚠️ **CONFLICT**

**Location:** `src/builder/inspector/index.css`

```css
@layer theme {
  :root {
    /* Inspector 전용 크기 토큰 */
    --inspector-control-size: 27px;
    --inspector-label-width: 27px;
  }
}
```

**⚠️ Critical Issue:**
- Layer name `theme` conflicts with proposed `builder-system` architecture
- Should be part of `builder-system` layer, not separate `theme` layer
- Only 2 CSS variables defined here

**Migration Required:**
```css
/* BEFORE (WRONG) */
@layer theme {
  :root {
    --inspector-control-size: 27px;
  }
}

/* AFTER (CORRECT) */
@layer builder-system {
  :root {
    --inspector-control-size: 27px;
    --inspector-label-width: 27px;
  }
}
```

---

## 🔴 Files WITHOUT @layer (17 files)

### Critical Builder System Files (NO @layer)

1. **`src/builder/main/index.css` (517 lines)** ❌
   - Grid layout, header, workspace
   - **Should be:** `@layer builder-system`

2. **`src/builder/sidebar/index.css` (136 lines)** ❌
   - Navigation, tree view
   - **Should be:** `@layer builder-system`

3. **`src/builder/components/theme.css` (658 lines)** ❌
   - **CRITICAL:** Shared by Builder + Preview
   - **Should be split:** `builder-system` + `preview-system` + `shared-tokens`

### Theme Studio Files (NO @layer)

4. `src/builder/theme/styles/ThemeStudio.css` ❌
5. `src/builder/theme/styles/ThemeEditor.css` ❌
6. `src/builder/theme/styles/TokenEditor.css` ❌
7. `src/builder/theme/styles/AIThemeGenerator.css` ❌
8. `src/builder/theme/styles/DarkModeGenerator.css` ❌
9. `src/builder/theme/styles/FigmaImporter.css` ❌
10. `src/builder/theme/styles/FigmaPluginExporter.css` ❌
11. `src/builder/theme/styles/ThemeExporter.css` ❌

**Pattern:** Most ThemeStudio files DO use `@layer components`, but some don't

---

## 📋 Proposed @layer Architecture

### New Layer Order (ITCSS-based)

```css
/* 1. Builder System Layer (NEW) */
@layer builder-system {
  /* Builder UI: header, sidebar, inspector */
  /* Builder-specific colors, spacing, tokens */
  /* Dark mode for Builder */
}

/* 2. Preview System Layer (NEW) */
@layer preview-system {
  /* Preview iframe component tokens */
  /* User-customizable theme variables */
  /* Preview dark mode */
}

/* 3. Shared Tokens (NEW) */
@layer shared-tokens {
  /* Typography scale (--text-xs, --text-sm, etc.) */
  /* Spacing scale (--spacing-sm, --spacing-md, etc.) */
  /* Border radius (--radius-sm, --radius-md, etc.) */
  /* Neutral colors (--color-neutral-*) */
}

/* 4. Base Layer (NEW) */
@layer base {
  /* CSS reset */
  /* Default element styles */
  /* Animations */
}

/* 5. Components Layer (EXISTING) */
@layer components {
  /* All React Aria components */
  /* 85 existing files */
}

/* 6. Utilities Layer (EXISTING) */
@layer utilities {
  /* Layout utilities (.flex-col-sm) */
  /* Spacing utilities */
  /* Helper classes */
}
```

---

## 🔄 Migration Strategy

### Phase 1: Fix Layer Conflicts

**Step 1:** Rename `@layer theme` to `@layer builder-system`
```diff
- @layer theme {
+ @layer builder-system {
    :root {
      --inspector-control-size: 27px;
    }
  }
```

**Step 2:** Move inspector utilities to builder-system
```diff
- @layer utilities {
+ @layer builder-system {
    .inspector {
      /* ... */
    }
  }
```

### Phase 2: Add Missing @layer Declarations

**File:** `src/builder/main/index.css`
```diff
+ @layer builder-system {
    .app {
      /* ... 517 lines */
    }
+ }
```

**File:** `src/builder/sidebar/index.css`
```diff
+ @layer builder-system {
    :root {
      --hover-bg: var(--builder-hover-bg);
    }
    .sidebar-nav {
      /* ... 136 lines */
    }
+ }
```

### Phase 3: Split theme.css

**Create 3 new files:**
1. `builder-system.css` - Builder UI tokens
2. `preview-system.css` - Preview component tokens
3. `shared-tokens.css` - Typography, spacing, radius

---

## 📊 Layer Order Enforcement

### PostCSS Configuration (vite.config.ts)

**Current:** ✅ Already configured
```typescript
css: {
  postcss: {
    plugins: [
      postcssImport(),  // Resolve @import
      postcssNested(),  // Nested selectors
    ],
  },
}
```

**Future (if needed):**
```typescript
import postcssLayerOrder from 'postcss-layer-order';

plugins: [
  postcssImport(),
  postcssLayerOrder({
    order: [
      'builder-system',
      'preview-system',
      'shared-tokens',
      'base',
      'components',
      'utilities'
    ]
  }),
  postcssNested(),
]
```

---

## ✅ Migration Checklist

### Phase 0.3 Tasks
- [x] Document all @layer usage
- [x] Identify conflicts (`@layer theme`)
- [x] List files without @layer (17 files)
- [x] Design new layer architecture
- [x] Create migration strategy

### Next: Phase 1 Tasks
- [ ] Split `theme.css` into 3 files
- [ ] Add `@layer builder-system` to main/sidebar
- [ ] Rename `@layer theme` → `@layer builder-system`
- [ ] Move inspector utilities to builder-system
- [ ] Create shared-tokens.css
- [ ] Test layer cascade order

---

**Status:** Phase 0.3 Complete ✅
**Next Step:** Phase 1 - Theme Separation
