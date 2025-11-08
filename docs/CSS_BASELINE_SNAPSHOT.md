# CSS Baseline Snapshot - Pre-Refactoring

**Date:** 2025-11-08
**Purpose:** Document current CSS state before refactoring
**Total CSS Files:** 105
**Total Lines:** 15,716
**@layer Declarations:** 89

---

## 📊 File Distribution

### Builder System Files (20 files)
- `src/builder/main/index.css` - 517 lines (grid layout, header, workspace)
- `src/builder/sidebar/index.css` - 136 lines (navigation, tree view)
- `src/builder/inspector/index.css` - 700 lines (property editor, tabs)
- `src/builder/theme/index.css` + 7 sub-files - 2,723 lines (ThemeStudio)
- `src/builder/preview/index.module.css` - 8 lines (iframe preview)

### Component Styles (85 files)
- `src/builder/components/theme.css` - 658 lines (⚠️ SHARED by Builder + Preview)
- `src/builder/components/components.css` - Compiled output
- `src/builder/components/index.css` - Entry point
- `src/builder/components/styles/` - 61 component CSS files (9,424 lines)

---

## 🔴 Critical Issues Identified

### 1. Hardcoded Colors (27 instances)

#### `src/builder/main/index.css` (10 hardcoded colors)
```css
Line 315: background: #ffffff;
Line 339: background-color: var(--color-sky-500);
Line 439: background-color: #fee2e2;
Line 440: border: 1px solid #fecaca;
Line 441: color: #dc2626;
Line 461: color: #dc2626;
Line 480: background-color: rgba(0, 0, 0, 0.5);
Line 488: background-color: white;
Line 501: border: 2px solid #f3f3f3;
Line 502: border-top: 2px solid #3498db;
```

#### `src/builder/sidebar/index.css` (3 hardcoded colors)
```css
Line 2: --hover-bg: #f5f5f5;
Line 33: background-color: #fff;
Line 178: background: rgba(255, 255, 255, 0.1);
```

#### Other files (14 hardcoded colors)
- Inspector styles
- Theme Studio components
- Preview module

### 2. @layer Usage Inconsistency

**Current @layer declarations (89 total):**
- `@layer components` - 85 files ✅
- `@layer utilities` - 2 files
- `@layer theme` - 1 file (⚠️ Conflicts with proposed `builder-system`)

**Files WITHOUT @layer (20 files):**
- `src/builder/main/index.css` ❌
- `src/builder/sidebar/index.css` ❌
- Several theme studio files ❌

### 3. @import Dependencies (13 files)

**Files using @import:**
```
src/builder/inspector/index.css
src/builder/components/styles/Radio.css
src/builder/components/styles/collections.css
src/builder/components/styles/ListBox.css
src/builder/components/styles/Field.css
src/builder/components/styles/ComponentSearch.css
src/builder/components/styles/index.css
src/builder/components/styles/GridList.css
src/builder/components/styles/Card.css
src/builder/components/index.css
src/builder/components/styles/overlays.css
src/builder/components/styles/forms.css
src/builder/components/styles/Content.css
```

**Risk:** Circular import potential, undefined import order

### 4. Duplicate Code (425 instances)

**Most common duplicates:**
```css
/* Repeated 18 times in inspector/index.css */
display: flex;
flex-direction: column;
gap: var(--spacing-sm);

/* Repeated 12 times */
.react-aria-Input {
  background-color: transparent;
  border: 1px solid transparent;
  ...
}

/* Repeated 9 times */
.react-aria-Select {
  width: 100%;
  min-width: 0;
  ...
}
```

---

## 📁 Current File Structure

```
src/builder/
├── main/
│   └── index.css (517 lines) ❌ No @layer
├── sidebar/
│   └── index.css (136 lines) ❌ No @layer
├── inspector/
│   ├── index.css (700 lines) ✅ @layer utilities
│   ├── styles/styles.css
│   ├── data/data.css
│   └── events/events.css
├── theme/
│   ├── index.css ✅ @layer components
│   ├── components/ThemePreview.css
│   └── styles/ (7 files)
├── preview/
│   └── index.module.css ✅ @layer utilities
└── components/
    ├── theme.css (658 lines) ⚠️ SHARED
    ├── components.css (compiled)
    ├── index.css (entry)
    └── styles/ (61 files, 9,424 lines)
```

---

## 🎯 Refactoring Targets

### High Priority
1. **Split `theme.css`** into builder-system.css + preview-system.css
2. **Replace 27 hardcoded colors** with CSS variables
3. **Add @layer to main/sidebar** files
4. **Fix @layer theme conflict** in inspector/index.css

### Medium Priority
5. **Extract 425 duplicate declarations** to utilities
6. **Consolidate @import chain** into single entry point
7. **Add Builder dark mode** support
8. **Add forced-colors** accessibility support

### Low Priority
9. **Optimize bundle size** (target: 30% reduction)
10. **Add responsive breakpoints** for mobile/tablet

---

## 📈 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total Files | 105 | 80 (-24%) |
| Total Lines | 15,716 | 11,000 (-30%) |
| Hardcoded Colors | 27 | 0 (-100%) |
| Duplicate Code | 425 | 35 (-92%) |
| @layer Coverage | 85% | 100% |
| Dark Mode Support | Preview only | Builder + Preview |
| Accessibility | 50% | 100% |

---

## ⚠️ Migration Risks

1. **Visual Regression** - 61 React Aria components may break
2. **Build Failures** - PostCSS plugin order critical
3. **Inspector Grid Layouts** - Complex nested grids (700 lines)
4. **Preview Theme Contamination** - Builder styles leaking into Preview

---

## 🧪 Testing Checklist

- [ ] All 61 React Aria components render correctly
- [ ] Builder header/sidebar/inspector maintain styling
- [ ] Preview iframe isolation maintained
- [ ] Dark mode toggle works (Builder + Preview independent)
- [ ] High contrast mode (forced-colors) works
- [ ] No console errors for missing CSS variables
- [ ] Build succeeds in production mode
- [ ] Bundle size reduced by 30%

---

**Next Step:** Phase 0.3 - Document existing @layer usage patterns
