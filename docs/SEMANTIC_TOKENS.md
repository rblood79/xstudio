# Semantic Tokens Reference

**Last Updated**: 2025-11-06
**Related**: [Component Migration Plan](./implementation/COMPONENT_MIGRATION_PLAN.md)

This document provides a comprehensive reference for all semantic tokens in the XStudio design system.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Existing Tokens](#existing-tokens)
- [New Tokens (Phase 0)](#new-tokens-phase-0)
- [Fallback Pattern](#fallback-pattern)
- [Usage Guidelines](#usage-guidelines)
- [Palette to Semantic Mapping](#palette-to-semantic-mapping)
- [Examples](#examples)

---

## Overview

### What are Semantic Tokens?

Semantic tokens provide **meaning-based abstraction** over palette colors. Instead of referencing `--color-gray-300` directly, components use `--border-color`, which can be customized via the Design Token System.

### Benefits

- ✅ **Theme Independence**: Components work with any color palette
- ✅ **Centralized Control**: Change theme colors without touching component CSS
- ✅ **Dark Mode Support**: Automatic color switching via `[data-theme="dark"]`
- ✅ **AI Theme Generation**: ThemeStudio can generate complete themes

### Architecture

```
Design Token Database (Supabase)
         ↓
    cssVars.ts (Token Injection)
         ↓
    :root { --semantic-token: value }
         ↓
    Component CSS (uses semantic tokens)
```

---

## Existing Tokens

### Text Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--text-color` | `--color-gray-900` | `--color-gray-100` | Primary text |
| `--text-color-base` | `--color-gray-900` | `--color-gray-100` | Base text color |
| `--text-color-hover` | `--color-gray-950` | `--color-gray-50` | Text on hover |
| `--text-color-disabled` | `--color-gray-500` | `--color-gray-500` | Disabled text |
| `--text-color-placeholder` | `--color-gray-700` | `--color-gray-400` | Placeholder text |

**Example**:
```css
.my-component {
  color: var(--text-color);
}

.my-component[data-disabled] {
  color: var(--text-color-disabled);
}
```

---

### Border Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--border-color` | `--color-gray-300` | `--color-gray-700` | Default border |
| `--border-color-hover` | `--color-gray-400` | `--color-gray-600` | Border on hover |
| `--border-color-pressed` | `--color-gray-500` | `--color-gray-500` | Border when pressed |
| `--border-color-disabled` | `--color-gray-100` | `--color-gray-800` | Border when disabled |

**Example**:
```css
.my-input {
  border: 1px solid var(--border-color);
}

.my-input:hover {
  border-color: var(--border-color-hover);
}
```

---

### Link Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--link-color` | `--color-sky-500` | `--color-sky-400` | Link text |
| `--link-color-secondary` | `--color-gray-900` | `--color-gray-100` | Secondary link |
| `--link-color-pressed` | `--color-sky-600` | `--color-sky-300` | Link when pressed |

---

### Button Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--button-background` | `--color-gray-50` | `--color-gray-800` | Default button bg |
| `--button-background-pressed` | `--color-gray-100` | `--color-gray-700` | Pressed state bg |
| `--button-primary-bg` | `--color-primary-600` | `--color-primary-500` | Primary button bg |
| `--button-primary-text` | `--color-white` | `--color-gray-900` | Primary button text |
| `--button-secondary-bg` | `--color-secondary-600` | `--color-secondary-500` | Secondary button bg |
| `--button-secondary-text` | `--color-white` | `--color-gray-900` | Secondary button text |

---

### Field/Input Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--field-background` | `--color-gray-50` | `--color-gray-800` | Input background |
| `--field-text-color` | `--color-gray-900` | `--color-gray-100` | Input text |

---

### Highlight/Selection Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--highlight-background` | `--color-primary-600` | `--color-primary-500` | Selected item bg |
| `--highlight-background-pressed` | `--color-primary-700` | `--color-primary-400` | Pressed selected bg |
| `--highlight-background-invalid` | `--color-red-600` | `--color-red-500` | Invalid selection |
| `--highlight-foreground` | `--color-white` | `--color-gray-900` | Selected text |
| `--highlight-foreground-pressed` | `--color-gray-100` | `--color-gray-800` | Pressed selected text |

---

### Overlay/Surface Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--background-color` | `--color-white` | `--color-gray-900` | Base background |
| `--overlay-background` | `--color-gray-50` | `--color-gray-800` | Overlay background |

---

### Validation Tokens

| Token | Light Mode Default | Dark Mode Default | Usage |
|-------|-------------------|-------------------|-------|
| `--focus-ring-color` | `--color-purple-400` | `--color-purple-400` | Focus ring |
| `--invalid-color` | `--color-red-400` | `--color-red-400` | Invalid state |
| `--invalid-color-pressed` | `--color-red-500` | `--color-red-500` | Invalid pressed |

---

## New Tokens (Phase 0)

These tokens will be added in Phase 0.1 of the migration.

### Button Variant Tokens

| Token | Light Mode Fallback | Dark Mode Override | Usage |
|-------|--------------------|--------------------|-------|
| `--button-primary-border` | `--color-primary-600` | None | Primary button border |
| `--button-primary-border-hover` | `--color-primary-700` | None | Primary border hover |
| `--button-secondary-border` | `--color-secondary-600` | None | Secondary button border |
| `--button-secondary-border-hover` | `--color-secondary-700` | None | Secondary border hover |
| `--button-surface-bg` | `--color-surface-500` | None | Surface button bg |
| `--button-surface-text` | `--color-white` | `--color-gray-900` | Surface button text |
| `--button-surface-border` | `--color-surface-600` | None | Surface button border |
| `--button-outline-text` | `--color-gray-800` | `--color-gray-100` | Outline button text |
| `--button-outline-border` | `--color-gray-300` | None | Outline button border |
| `--button-ghost-text` | `--color-gray-800` | `--color-gray-100` | Ghost button text |

**Example**:
```css
.react-aria-Button.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border);  /* NEW */
}

.react-aria-Button.primary:hover {
  border-color: var(--button-primary-border-hover);  /* NEW */
}
```

---

### Field Variant Tokens

| Token | Light Mode Fallback | Dark Mode Override | Usage |
|-------|--------------------|--------------------|-------|
| `--field-border` | `--color-gray-300` | None | Field border |
| `--field-border-hover` | `--color-gray-400` | None | Field border hover |
| `--field-border-focus` | `--color-primary-500` | None | Field border focus |
| `--field-background-filled` | `--color-gray-100` | `--color-gray-800` | Filled variant bg |
| `--field-text-filled` | `--color-gray-900` | `--color-gray-100` | Filled variant text |

**Example**:
```css
.react-aria-TextField input {
  border: 1px solid var(--field-border);  /* NEW */
}

.react-aria-TextField input:hover {
  border-color: var(--field-border-hover);  /* NEW */
}

.react-aria-TextField input:focus {
  border-color: var(--field-border-focus);  /* NEW */
  box-shadow: var(--focus-ring-shadow);
}

.react-aria-TextField.filled input {
  background: var(--field-background-filled);  /* NEW */
  color: var(--field-text-filled);  /* NEW */
  border-color: transparent;
}
```

---

### Interactive State Tokens

| Token | Light Mode Fallback | Dark Mode Override | Usage |
|-------|--------------------|--------------------|-------|
| `--hover-background` | `--color-gray-100` | `--color-gray-800` | Hover background |
| `--hover-border` | `--color-primary-300` | None | Hover border |
| `--active-background` | `--color-primary-50` | `--color-primary-900` | Active/selected bg |
| `--active-border` | `--color-primary-500` | None | Active/selected border |
| `--focus-ring-shadow` | `0 0 0 3px var(--color-primary-100)` | None | Focus ring shadow |
| `--focus-border` | `--color-primary-500` | None | Focus border |

**Example**:
```css
.react-aria-MenuItem {
  background: transparent;
}

.react-aria-MenuItem:hover {
  background: var(--hover-background);  /* NEW */
}

.react-aria-MenuItem[data-selected] {
  background: var(--active-background);  /* NEW */
  border-color: var(--active-border);  /* NEW */
}

.react-aria-MenuItem[data-focus-visible] {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  box-shadow: var(--focus-ring-shadow);  /* NEW */
}
```

---

### Utility Tokens

| Token | Light Mode Fallback | Dark Mode Override | Usage |
|-------|--------------------|--------------------|-------|
| `--icon-primary` | `--color-gray-600` | `--color-gray-400` | Primary icon color |
| `--icon-secondary` | `--color-gray-400` | `--color-gray-500` | Secondary icon color |
| `--icon-disabled` | `--color-gray-300` | `--color-gray-600` | Disabled icon color |
| `--divider-color` | `--color-gray-200` | `--color-gray-700` | Divider line |
| `--divider-strong` | `--color-gray-300` | `--color-gray-600` | Strong divider |
| `--text-on-primary` | `--color-white` | None | Text on primary bg |
| `--text-on-secondary` | `--color-white` | None | Text on secondary bg |

**Example**:
```css
.icon {
  color: var(--icon-primary);  /* NEW */
}

.icon[data-disabled] {
  color: var(--icon-disabled);  /* NEW */
}

.divider {
  border-bottom: 1px solid var(--divider-color);  /* NEW */
}

.button-primary {
  background: var(--button-primary-bg);
  color: var(--text-on-primary);  /* NEW */
}
```

---

## Fallback Pattern

### Two-Layer System

All semantic tokens use a **two-layer fallback pattern**:

```css
--semantic-name: var(--db-token-name, var(--palette-fallback));
```

**How it works**:
1. **First try**: `--db-token-name` (from Design Token Database)
2. **Fallback**: `--palette-fallback` (hardcoded in theme.css)

### Example

```css
/* theme.css */
:root {
  --button-primary-bg: var(--color-button-primary-bg, var(--color-primary-600));
  /*                   ^^^^^^^^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^
   *                   DB token (if exists)            Fallback (always exists)
   */
}
```

**When no DB token exists**:
```css
/* Resolves to: */
--button-primary-bg: var(--color-primary-600);
```

**When DB token is defined**:
```css
/* cssVars.ts injects: */
:root {
  --color-button-primary-bg: #1e40af;  /* User-defined color */
}

/* Resolves to: */
--button-primary-bg: #1e40af;
```

### Why This Pattern?

- ✅ **Graceful Degradation**: Works even without database tokens
- ✅ **User Customization**: Database tokens override defaults
- ✅ **Type Safety**: Fallback ensures valid values
- ✅ **Migration Path**: Can add DB tokens incrementally

---

## Usage Guidelines

### ✅ DO

**Use semantic tokens in component CSS**:
```css
.my-component {
  background: var(--background-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}
```

**Use spacing tokens for sizes**:
```css
.my-component.sm {
  padding: var(--spacing) var(--spacing-md);
  font-size: var(--text-sm);
}
```

**Use state-specific tokens**:
```css
.my-component:hover {
  background: var(--hover-background);
  border-color: var(--hover-border);
}
```

---

### ❌ DON'T

**Don't reference palette variables directly**:
```css
/* ❌ WRONG */
.my-component {
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-300);
}

/* ✅ CORRECT */
.my-component {
  background: var(--background-color);
  border: 1px solid var(--border-color);
}
```

**Don't hardcode colors**:
```css
/* ❌ WRONG */
.my-component {
  background: #f9fafb;
  color: #111827;
}

/* ✅ CORRECT */
.my-component {
  background: var(--background-color);
  color: var(--text-color);
}
```

**Don't use palette variables in fallbacks**:
```css
/* ❌ WRONG */
.my-component {
  color: var(--custom-token, #3b82f6);
}

/* ✅ CORRECT */
.my-component {
  color: var(--custom-token, var(--text-color));
}
```

---

## Palette to Semantic Mapping

This table shows the recommended migration path from palette variables to semantic tokens.

### Interactive States

| Palette Variable | Semantic Token | Context |
|-----------------|----------------|---------|
| `--color-primary-50` | `--active-background` | Subtle selected background |
| `--color-primary-100` | `--focus-ring-shadow` | Focus ring shadow |
| `--color-primary-300` | `--hover-border` | Hover border states |
| `--color-primary-500` | `--active-border` | Active/selected borders |
| `--color-primary-600` | `--button-primary-bg` | Button backgrounds |
| `--color-primary-700` | `--button-primary-border-hover` | Button border hover |

### Neutral Scale

| Palette Variable | Semantic Token | Context |
|-----------------|----------------|---------|
| `--color-gray-50` | `--background-color`, `--field-background` | Backgrounds |
| `--color-gray-100` | `--hover-background` | Hover states |
| `--color-gray-200` | `--divider-color` | Dividers, subtle borders |
| `--color-gray-300` | `--border-color`, `--button-outline-border` | Default borders |
| `--color-gray-400` | `--icon-secondary`, `--field-border-hover` | Icons, hover borders |
| `--color-gray-500` | `--text-color-disabled` | Disabled text |
| `--color-gray-600` | `--icon-primary` | Primary icons |
| `--color-gray-700` | `--text-color-placeholder` | Placeholder text |
| `--color-gray-800` | `--button-outline-text` | Alternative text |
| `--color-gray-900` | `--text-color` | Primary text |

### Utility Colors

| Palette Variable | Semantic Token | Context |
|-----------------|----------------|---------|
| `--color-white` | `--text-on-primary`, `--text-on-secondary` | Text on colored backgrounds |
| `--color-surface-500` | `--button-surface-bg` | Surface button background |
| `--color-surface-600` | `--button-surface-border` | Surface button border |

---

## Examples

### Example 1: Migrating Button.css

**Before** (Palette references):
```css
.react-aria-Button.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--color-primary-600);  /* ❌ Palette */
}

.react-aria-Button.surface {
  background: var(--color-surface-500);  /* ❌ Palette */
  color: var(--color-white);              /* ❌ Palette */
  border-color: var(--color-surface-600); /* ❌ Palette */
}

.react-aria-Button.outline {
  background: transparent;
  color: var(--color-gray-800);       /* ❌ Palette */
  border-color: var(--color-gray-300); /* ❌ Palette */
}
```

**After** (Semantic tokens):
```css
.react-aria-Button.primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border);  /* ✅ Semantic */
}

.react-aria-Button.surface {
  background: var(--button-surface-bg);     /* ✅ Semantic */
  color: var(--button-surface-text);         /* ✅ Semantic */
  border-color: var(--button-surface-border); /* ✅ Semantic */
}

.react-aria-Button.outline {
  background: transparent;
  color: var(--button-outline-text);   /* ✅ Semantic */
  border-color: var(--button-outline-border); /* ✅ Semantic */
}
```

---

### Example 2: TextField Variants

**CSS**:
```css
.react-aria-TextField input {
  /* Base styles - semantic tokens */
  background: var(--field-background);
  color: var(--field-text-color);
  border: 1px solid var(--field-border);  /* NEW token */
}

.react-aria-TextField input:hover {
  border-color: var(--field-border-hover);  /* NEW token */
}

.react-aria-TextField input:focus {
  border-color: var(--field-border-focus);  /* NEW token */
  box-shadow: var(--focus-ring-shadow);     /* NEW token */
}

/* Filled variant */
.react-aria-TextField.filled input {
  background: var(--field-background-filled);  /* NEW token */
  color: var(--field-text-filled);             /* NEW token */
  border-color: transparent;
}

/* Outlined variant */
.react-aria-TextField.outlined input {
  background: transparent;
  border-width: 2px;
  border-color: var(--field-border);
}
```

---

### Example 3: Menu with Interactive States

**CSS**:
```css
.react-aria-Menu {
  background: var(--overlay-background);
  border: 1px solid var(--border-color);
}

.react-aria-MenuItem {
  color: var(--text-color);
  background: transparent;
}

.react-aria-MenuItem:hover {
  background: var(--hover-background);  /* NEW token */
}

.react-aria-MenuItem[data-selected] {
  background: var(--active-background);  /* NEW token */
  color: var(--highlight-foreground);
}

.react-aria-MenuItem[data-focused] {
  border-color: var(--active-border);  /* NEW token */
}

.react-aria-MenuItem[data-disabled] {
  color: var(--text-color-disabled);
  opacity: 0.5;
}
```

---

## 📚 Related Documents

- [Migration Plan](./implementation/COMPONENT_MIGRATION_PLAN.md)
- [Detailed Steps](./implementation/MIGRATION_DETAILED_STEPS.md)
- [Refactoring Template](./implementation/COMPONENT_REFACTORING_TEMPLATE.md)
- [Validation Report](./implementation/VALIDATION_REPORT.md)
- [Theme System Integration](./THEME_SYSTEM_INTEGRATION.md)

---

**Last Updated**: 2025-11-06
**Status**: ✅ Ready for Phase 0 Implementation
