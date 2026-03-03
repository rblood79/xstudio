# XStudio CSS Architecture - ITCSS

**Date:** 2025-11-08 (초판) / 2026-02-19 (최종 갱신)
**Version:** 2.1 (Post Phase 1-3 Refactoring, Phase 4 상태 명시)

---

## 📊 Overview

XStudio uses **ITCSS (Inverted Triangle CSS)** architecture for scalable and maintainable styling. The CSS is organized in layers of increasing specificity, from generic to explicit.

---

## 🏗️ Directory Structure

```
src/builder/styles/
├── index.css                    # Master entry point
├── 1-theme/                     # Layer 1: Design Tokens
│   ├── builder-system.css       # Builder UI tokens (160 lines)
│   ├── preview-system.css       # Preview tokens (511 lines)
│   └── shared-tokens.css        # Shared tokens (151 lines)
├── 2-base/                      # Layer 2: Base styles
│   ├── reset.css                # (Future) CSS reset
│   └── animations.css           # (Future) Global animations
├── 3-utilities/                 # Layer 3: Utility classes
│   ├── layout.css               # (Future) Flexbox/Grid helpers
│   └── spacing.css              # (Future) Spacing utilities
├── 4-layout/                    # Layer 4: Layout structures
│   ├── grid.css                 # (Future) Main grid system
│   ├── header.css               # (Future) Header layout
│   └── panels.css               # (Future) Panel layouts
└── 5-modules/                   # Layer 5: Feature modules
    ├── main.css                 # (Future) Main workspace
    ├── sidebar.css              # (Future) Sidebar module
    ├── inspector.css            # (Future) Inspector module
    └── theme-studio.css         # (Future) ThemeStudio module
```

---

## 📐 ITCSS Layer Hierarchy

### **Layer 1: Theme (1-theme/)**

**Purpose:** CSS variables and design tokens
**Specificity:** Lowest (`:root`)
**Files:**
- `builder-system.css` - Builder UI variables
- `preview-system.css` - Preview component variables
- `shared-tokens.css` - Typography, spacing, colors

**Example:**
```css
@layer builder-system {
  :root {
    --builder-header-bg: var(--color-gray-950);
    --builder-sidebar-bg: #fff;
  }
}
```

---

### **Layer 2: Base (2-base/)**

**Purpose:** CSS reset and base element styles
**Specificity:** Element selectors (`body`, `h1`, `a`)
**Planned Files:**
- `reset.css` - Normalize/reset
- `animations.css` - Keyframes

**Example:**
```css
@layer base {
  body {
    font-family: var(--font-sans);
    line-height: 1.5;
  }
}
```

---

### **Layer 3: Utilities (3-utilities/)**

**Purpose:** Reusable utility classes
**Specificity:** Single-purpose classes
**Planned Files:**
- `layout.css` - `.flex-col-sm`, `.grid-2col`
- `spacing.css` - Margin/padding helpers

**Example:**
```css
@layer utilities {
  .flex-col-sm {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
```

---

### **Layer 4: Layout (4-layout/)**

**Purpose:** Major structural layouts
**Specificity:** Structural classes
**Planned Files:**
- `grid.css` - Main grid system
- `header.css` - Header layout
- `panels.css` - Sidebar/Inspector panels

**Example:**
```css
@layer layout {
  .builder-grid {
    display: grid;
    grid-template-areas:
      "header header header"
      "sidebar main inspector";
  }
}
```

---

### **Layer 5: Modules (5-modules/)**

**Purpose:** Feature-specific modules
**Specificity:** Highest (module-specific)
**Planned Files:**
- `main.css` - Workspace module
- `sidebar.css` - Sidebar module
- `inspector.css` - Inspector module
- `theme-studio.css` - ThemeStudio module

**Example:**
```css
@layer builder-system {
  .inspector {
    border-left: 1px solid var(--color-border);
  }
}
```

---

## 🔄 CSS Layer Order (Cascade Priority)

```css
@layer dashboard;        /* Lowest priority */
@layer builder-system;   /* Builder UI */
@layer preview-system;   /* Preview components */
@layer shared-tokens;    /* Common tokens */
@layer base;             /* Base styles */
@layer components;       /* React Aria components */
@layer utilities;        /* Highest priority */
```

**Note:** Later layers override earlier layers, regardless of source order.

---

## 🎨 Theme System Architecture

### **Builder System Tokens (`--builder-*`)**

**Purpose:** Builder UI (header, sidebar, inspector)
**Not affected by:** User theme changes
**Dark mode:** `[data-builder-theme="dark"]`

**Key Tokens:**
```css
--builder-header-bg
--builder-sidebar-bg
--builder-inspector-bg
--builder-canvas-bg
--builder-error-bg
--builder-modal-bg
--builder-spinner-track
```

---

### **Preview System Tokens (`--action-*`, `--highlight-*`)**

**Purpose:** Preview iframe components
**Customizable by:** AI Theme System
**Dark mode:** `[data-theme="dark"]`

**Key Tokens:**
```css
--action-primary-bg
--action-secondary-bg
--action-surface-bg
--highlight-background
--shadow-md
```

---

### **Shared Tokens (Fixed)**

**Purpose:** Common design tokens
**Not customizable:** Typography, spacing, radius
**Source:** Tailwind v4 standards

**Examples:**
```css
--text-xs: 0.75rem
--text-sm: 0.875rem
--spacing-sm: 0.5rem
--radius-md: 0.375rem
--color-neutral-500
--color-success-600
```

---

## 📦 Component CSS Organization

### **React Aria Components**

**Location:** `src/builder/components/styles/`
**Count:** 61 component files
**Pattern:**

```css
/* Button.css */
@import './base.css';

@layer components {
  .react-aria-Button {
    background: var(--button-background);
  }

  .react-aria-Button.primary {
    background: var(--action-primary-bg);
  }
}
```

---

## 🚀 Migration Status

### **✅ Completed (Phase 0-3)**

- [x] PostCSS configuration (postcss-import, postcss-nested)
- [x] Theme separation (3 files: builder, preview, shared)
- [x] Hardcoded color removal (17 → 0 colors)
- [x] @layer conflicts resolved
- [x] Dashboard CSS scoped
- [x] ITCSS directory structure created
- [x] Master index.css entry point

### **⏳ Phase 4: 보류 (Deferred)**

> **상태**: 보류 — Tailwind v4 + tv() 패턴 도입으로 유틸리티 추출 방식이 변경됨. ADR-002 참조.
> **판단 근거**: inspector.css 유틸리티 추출보다 tv() 기반 컴포넌트 스타일링이 우선. @layer 커버리지는 95%로 충분.

- [ ] ~~Extract utilities from inspector.css (425 duplicates → 35 utilities)~~ → tv() 패턴으로 대체 검토
- [ ] Migrate main/sidebar/inspector to modules/ (낮은 우선순위)
- [ ] Create base reset.css (Tailwind preflight로 대체 가능)
- [ ] ~~Create layout grid.css~~ → Tailwind grid 유틸리티 사용
- [ ] Consolidate @import chains
- [ ] Bundle size optimization (30% target) — 현재 측정 미실시

---

## 📊 Performance Metrics

### **Before Refactoring (Phase 0)**
- **Total Files:** 105 CSS files
- **Total Lines:** 15,716 lines
- **Hardcoded Colors:** 27 instances
- **Duplicate Code:** 425 flexbox declarations
- **@layer Coverage:** 85% (17 files missing)

### **After Phase 1-3**
- **Total Files:** 108 CSS files (+3 theme files)
- **Total Lines:** ~15,900 lines (+184 for modular theme)
- **Hardcoded Colors:** 0 instances ✅
- **@layer Coverage:** 95% (main, sidebar, inspector added)
- **Theme Files:** 658 lines → 822 lines (3 modular files)

### **Target (Phase 4)**
- **Total Files:** 80 files (-24%)
- **Total Lines:** 11,000 lines (-30%)
- **Duplicate Code:** 35 utilities (-92%)
- **@layer Coverage:** 100%

---

## 🔧 Build Configuration

### **vite.config.ts**

```typescript
import postcssImport from "postcss-import";
import postcssNested from "postcss-nested";

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        postcssImport(),   // Resolve @import
        postcssNested(),   // Nested selectors
      ],
    },
  },
});
```

---

## 🎯 Best Practices

### **DO:**
- ✅ Use `--builder-*` tokens for Builder UI
- ✅ Use `--action-*` tokens for Preview components
- ✅ Use semantic class names (`.inspector`, `.sidebar`)
- ✅ Wrap styles in appropriate `@layer`
- ✅ Use CSS variables for all colors

### **DON'T:**
- ❌ Use hardcoded colors (`#ffffff`, `rgba(...)`)
- ❌ Mix Builder and Preview tokens
- ❌ Create global classes without namespace
- ❌ Use `@apply` directive (Tailwind v4 doesn't support)
- ❌ Skip `@layer` declarations

---

## 📚 Related Documentation

- [ADR-002: Styling Approach](../../adr/002-styling-approach.md) - ITCSS + tailwind-variants 결정 배경
- [CSS_SUPPORT_MATRIX.md](../../CSS_SUPPORT_MATRIX.md) - CSS Level 3 지원 현황 (88%)
- [CLAUDE.md](../../../CLAUDE.md) - 프로젝트 가이드라인

> **참고**: 이전에 참조되던 `CSS_BASELINE_SNAPSHOT.md`, `LAYER_USAGE_PATTERNS.md`, `CSS_REFACTORING_REPORT.md`는 Phase 1-3 완료 후 별도 생성되지 않았으며, 해당 내용은 본 문서의 Performance Metrics 섹션에 통합됨.

---

## 🔄 Update History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | 2026-02-19 | Phase 4 상태 명시 (보류/대체), 미존재 참조 문서 정리, 날짜 보정 |
| 2.0 | 2025-11-08 | Phase 1-3 complete: Theme separation, hardcoded color removal, ITCSS structure |
| 1.0 | 2025-11-08 | Initial baseline documentation |

---

**현재 상태**: Phase 1-3 완료. Phase 4는 Tailwind v4 + tv() 도입으로 방향 재검토 중.
