# CURSOR.md

This file provides guidance for using Cursor IDE's advanced features (especially Composer) when working with this XStudio codebase.

> **Note:** This document is optimized for Cursor IDE's Composer and Chat features. For general coding guidelines and project architecture details, see [CLAUDE.md](./CLAUDE.md).

## Cursor IDE Overview

Cursor IDE provides powerful AI-assisted coding capabilities through two main interfaces:

1. **Composer** - Multi-file editing with plan-based execution
2. **Chat** - Interactive codebase exploration and single-file assistance

This guide focuses on leveraging these features effectively within the XStudio project structure.

## Project Overview

XStudio is a web-based UI builder/design studio built with React 19, TypeScript, React Aria Components, Zustand, Tailwind v4, and Supabase. It enables users to create websites through an intuitive drag-and-drop interface with real-time preview.

**Key Features:**
- Drag-and-drop visual builder with iframe-based real-time preview
- Accessibility-first components using React Aria Components
- Design system with design tokens and theme management
- Real-time collaboration via Supabase
- Undo/redo history with Zustand state management

## Composer Features

### Plan Mode

Composer's Plan Mode allows you to break down complex tasks into manageable steps. When working with XStudio:

**Best Practices:**
- Use Plan Mode for multi-file changes (e.g., adding a new component requires component file, editor, factory, renderer)
- Break down tasks by architectural layers (store → component → editor → factory → preview)
- Let Composer analyze dependencies before execution

**Example Workflow:**
1. Open Composer (Cmd+I)
2. Describe your task: "Add a new ProgressBar component with property editor"
3. Review the generated plan
4. Execute step-by-step, reviewing changes at each stage

### Multi-File Editing

Composer excels at making coordinated changes across multiple files. XStudio's architecture benefits from this:

**Common Multi-File Scenarios:**

1. **Adding a New Component** (5-7 files typically):
   - Component file: `src/builder/components/ComponentName.tsx`
   - CSS file: `src/builder/components/styles/ComponentName.css`
   - Property editor: `src/builder/inspector/properties/editors/ComponentNameEditor.tsx`
   - Factory definition: `src/builder/factories/definitions/...`
   - Preview renderer: `src/canvas/renderers/...`
   - Storybook story: `src/stories/...`
   - Type definitions: `src/types/...`

2. **Store Module Refactoring** (3-5 files):
   - Main store: `src/builder/stores/elements.ts`
   - Utility module: `src/builder/stores/utils/elementAction.ts`
   - History module: `src/builder/stores/history/historyActions.ts`
   - Type definitions: `src/types/...`

3. **Panel System Changes** (multiple panel files):
   - Panel component: `src/builder/panels/panelName/index.tsx`
   - Panel registry: `src/builder/panels/core/PanelRegistry.ts`
   - Panel layout: `src/builder/layout/PanelSlot.tsx`

**Tips:**
- Let Composer analyze the codebase first before making changes
- Review the plan to ensure all related files are included
- Use Composer's file dependency detection

### Step-by-Step Task Breakdown

Composer automatically breaks down tasks into logical steps. For XStudio, common patterns include:

**Component Addition Pattern:**
1. Create component TypeScript file with React Aria integration
2. Create CSS file with `@layer components` wrapper
3. Create property editor with PropertyInput/Select/Switch components
4. Add factory definition for component creation
5. Add preview renderer for canvas runtime
6. Add Storybook story with Controls/Interactions
7. Update type definitions if needed

**Store Module Pattern:**
1. Create factory function in `src/builder/stores/utils/`
2. Import and use in main store file
3. Add history tracking if needed
4. Update types if necessary

## Chat Features

### Codebase Indexing

Cursor automatically indexes your codebase. For XStudio, this means:

**What Gets Indexed:**
- All TypeScript/TSX files
- CSS files
- Configuration files (tsconfig, package.json)
- Documentation files

**Effective Chat Prompts:**

Instead of:
```
"Add a new button component"
```

Use:
```
"Add a new Button component following the pattern in src/builder/components/Card.tsx. 
It should use React Aria Components, have a property editor in src/builder/inspector/properties/editors/, 
and follow the Action Token System for variants (primary, secondary, surface)."
```

**Context-Aware Queries:**

Cursor understands XStudio's architecture. You can ask:
- "How does the element store handle undo/redo?"
- "Where are component styles defined?"
- "How does the canvas iframe communicate with the builder?"

### File Navigation and References

**Finding Related Files:**

When working on a component, Cursor can help you find:
- Related editors: `src/builder/inspector/properties/editors/`
- Related factories: `src/builder/factories/definitions/`
- Related renderers: `src/canvas/renderers/`
- Related types: `src/types/`

**Using Chat for Exploration:**

```
"Show me all files related to the ListBox component"
"Where is the element store factory pattern implemented?"
"What files handle iframe postMessage communication?"
```

## Rules System

### .cursor/rules Directory

Cursor IDE uses `.cursor/rules` directory with `.mdc` files for project-specific rules. This is the standard approach for defining project rules.

**To set up rules for XStudio:**

1. Create `.cursor/rules` directory in project root
2. Create `.mdc` files for different rule categories

**Example structure:**
```
.cursor/
└── rules/
    ├── coding-standards.mdc
    ├── architecture-patterns.mdc
    └── component-guidelines.mdc
```

**Recommended `.cursor/rules/coding-standards.mdc` content:**

```markdown
# XStudio Coding Standards

- Always follow patterns in CLAUDE.md
- Use factory pattern for store modules (see src/builder/stores/utils/)
- NO inline Tailwind classes - use semantic classes with tv()
- All CSS in src/builder/components/styles/ with @layer components
- Use CSS variables (--text-sm, --spacing-4, --color-primary-600)
- Follow React Aria className conventions (react-aria-*)
- When adding components, create: component, CSS, editor, factory, renderer, story
- Use PropertyInput/Select/Switch for property editors
- Store modules use factory pattern: createAction(set, get)
```

**Recommended `.cursor/rules/architecture-patterns.mdc` content:**

```markdown
# XStudio Architecture Patterns

## Store Module Pattern
- Use factory pattern: createAction(set, get)
- Modules in src/builder/stores/utils/
- Import StateCreator from zustand for typing

## Component Pattern
- React Aria Components with tv() for className
- CSS in src/builder/components/styles/ComponentName.css
- Use @layer components wrapper
- Property editors in src/builder/inspector/properties/editors/

## Data Flow
- Memory state → iframe postMessage → Supabase (async)
- All updates follow this triple-layer sync pattern
```

### Setting Up Rules for XStudio

**Critical Rules to Include:**

1. NO inline Tailwind classes in .tsx files
2. NO @apply directive (Tailwind v4 doesn't support it)
3. All CSS in `src/builder/components/styles/` with `@layer components`
4. Use CSS variables for theming
5. Follow React Aria className conventions (`react-aria-*`)

**Integration with CLAUDE.md:**

The `.cursor/rules` files should reference and complement `CLAUDE.md`. Use rules files for:
- Quick reference patterns that Cursor AI can easily access
- Project-specific conventions
- Common workflows and shortcuts

For detailed guidelines, architecture patterns, and comprehensive documentation, always refer to `CLAUDE.md`.

## Project Structure Guide

### Directory Structure

Understanding XStudio's structure helps Composer make better decisions:

```
src/
├── builder/                  # Core builder system
│   ├── components/          # React Aria components (61 components)
│   │   └── styles/          # Component CSS files
│   ├── stores/              # Zustand state management
│   │   ├── utils/           # Store utility modules (factory pattern)
│   │   └── history/         # Undo/redo history modules
│   ├── inspector/           # Property editor system
│   │   ├── properties/      # Component property editors
│   │   ├── events/          # Event system (21 action editors)
│   │   └── sections/        # Reusable sections
│   ├── panels/              # Panel system (9 modular panels)
│   ├── canvas/              # Canvas runtime (iframe)
│   └── hooks/               # Builder-specific hooks
├── canvas/                  # Preview runtime (separate React app)
├── services/               # Service layer
│   ├── api/                 # API services
│   └── save/                # Save service
└── types/                   # TypeScript type definitions
```

### Key File Locations

**Component Files:**
- Components: `src/builder/components/ComponentName.tsx`
- Component CSS: `src/builder/components/styles/ComponentName.css`
- Property Editors: `src/builder/inspector/properties/editors/ComponentNameEditor.tsx`
- Factories: `src/builder/factories/definitions/...`
- Preview Renderers: `src/canvas/renderers/...`

**Store Files:**
- Main stores: `src/builder/stores/storeName.ts`
- Store utilities: `src/builder/stores/utils/actionName.ts`
- History: `src/builder/stores/history/historyActions.ts`

**Panel Files:**
- Panel components: `src/builder/panels/panelName/index.tsx`
- Panel registry: `src/builder/panels/core/PanelRegistry.ts`

### Architecture Patterns

**Factory Pattern (Store Modules):**
```typescript
// src/builder/stores/utils/elementAction.ts
import type { StateCreator } from "zustand";

type SetState = Parameters<StateCreator<StoreState>>[0];
type GetState = Parameters<StateCreator<StoreState>>[1];

export const createElementAction = (set: SetState, get: GetState) => async () => {
  // Action logic here
};
```

**Component Pattern:**
```typescript
// Component with tv() for className composition
import { tv } from 'tailwind-variants';

const componentStyles = tv({
  base: 'react-aria-ComponentName',
  variants: { /* ... */ }
});
```

## Composer Usage Examples

### Example 1: Adding a New Component

**Task:** "Add a new Badge component with primary/secondary/surface variants"

**Composer Plan (auto-generated):**
1. Create `src/builder/components/Badge.tsx` with React Aria integration
2. Create `src/builder/components/styles/Badge.css` with Action Token System
3. Create `src/builder/inspector/properties/editors/BadgeEditor.tsx`
4. Add factory definition in `src/builder/factories/definitions/...`
5. Add preview renderer in `src/canvas/renderers/...`
6. Create Storybook story in `src/stories/...`

**Execution:**
- Composer will create all files following existing patterns
- Review each file before accepting changes
- Ensure CSS uses `@layer components` wrapper
- Verify property editor uses PropertyInput/Select/Switch

### Example 2: Refactoring Store Module

**Task:** "Extract element validation logic into a separate utility module"

**Composer Plan:**
1. Create `src/builder/stores/utils/elementValidation.ts` with factory pattern
2. Update `src/builder/stores/elements.ts` to use new module
3. Update type definitions if needed
4. Ensure history tracking still works

**Execution:**
- Composer understands factory pattern from existing modules
- Will maintain proper TypeScript types
- Preserves existing functionality

### Example 3: Multi-File Style Update

**Task:** "Update all component CSS files to use new spacing tokens"

**Composer Plan:**
1. Identify all CSS files in `src/builder/components/styles/`
2. Update spacing values to use new CSS variables
3. Ensure consistency across all components

**Execution:**
- Composer can update multiple files simultaneously
- Review changes to ensure consistency
- Test in Storybook to verify visual changes

## Cursor Optimization Tips

### Effective Prompt Writing

**Do:**
- Reference specific files or patterns: "Follow the pattern in Card.tsx"
- Mention architectural layers: "Add store module, component, and editor"
- Specify requirements: "Use Action Token System for variants"
- Reference CLAUDE.md: "Follow guidelines in CLAUDE.md"

**Don't:**
- Use vague requests: "Make it better"
- Ignore existing patterns: "Create a new way to do X"
- Skip architectural layers: "Just add the component"

### Context Provision

**Provide Context:**
- Current file you're working on
- Related files that need changes
- Architectural constraints (e.g., "must use factory pattern")
- Design system requirements (e.g., "use Action Token System")

**Example Good Prompt:**
```
"Add a new Slider component. It should:
- Follow the pattern in src/builder/components/ProgressBar.tsx
- Use Action Token System for variants (primary, secondary, surface)
- Have a property editor in src/builder/inspector/properties/editors/
- Support locale and valueFormat props like Meter component
- Include Storybook story with Controls"
```

### Codebase Indexing Utilization

**Let Cursor Index:**
- Don't manually search for files - ask Chat to find them
- Use Chat to understand relationships between files
- Ask about architectural patterns before making changes

**Example Queries:**
```
"Show me how other components handle variant styling"
"Where is the factory pattern used for store modules?"
"How do property editors handle number formatting?"
```

### Composer Best Practices

1. **Start with Plan Mode:**
   - Always review the plan before execution
   - Ensure all related files are included
   - Check that architectural patterns are followed

2. **Execute Incrementally:**
   - Don't accept all changes at once
   - Review each step before proceeding
   - Test after each major step

3. **Use Chat for Exploration:**
   - Understand the codebase before making changes
   - Find related files and patterns
   - Ask about architectural decisions

4. **Leverage Codebase Context:**
   - Cursor understands XStudio's architecture
   - Reference existing patterns in prompts
   - Let Composer learn from existing code

## CLAUDE.md Integration

### When to Use CURSOR.md vs CLAUDE.md

**Use CURSOR.md for:**
- Understanding how to use Cursor IDE features with XStudio
- Composer workflow guidance
- Chat feature optimization
- Multi-file editing strategies

**Use CLAUDE.md for:**
- Detailed coding guidelines and rules
- Architecture deep-dives
- Component development patterns
- TypeScript patterns and anti-patterns
- CSS architecture details
- Store module patterns

### Cross-Reference

Both documents complement each other:

- **CURSOR.md** tells you *how* to use Cursor IDE effectively
- **CLAUDE.md** tells you *what* patterns and rules to follow

**Example Workflow:**
1. Read CURSOR.md to understand Composer workflow
2. Use Composer to make changes
3. Reference CLAUDE.md for specific patterns (factory pattern, CSS rules, etc.)
4. Let Composer apply patterns from CLAUDE.md

### Quick Reference

| Task | Document | Section |
|------|----------|---------|
| How to use Composer | CURSOR.md | Composer Features |
| Component CSS rules | CLAUDE.md | CSS Architecture |
| Store module pattern | CLAUDE.md | Store Module Architecture |
| Multi-file editing | CURSOR.md | Composer Usage Examples |
| React Aria patterns | CLAUDE.md | React Aria Components |
| Chat optimization | CURSOR.md | Cursor Optimization Tips |

## Development Commands

### Essential Commands
```bash
# Development server (hot reload enabled)
npm run dev

# Build for production
npm run build

# Type checking (run before committing)
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview
```

### Testing & Storybook
```bash
# Run tests (Vitest)
npm run test

# Run E2E tests (Playwright)
npm run test:e2e

# Start Storybook (port 6006)
npm run storybook
```

## Quick Reference for Cursor Users

| Task | Cursor Feature | Example Prompt |
|------|---------------|----------------|
| Add new component | Composer | "Add Badge component following Card.tsx pattern" |
| Refactor store module | Composer | "Extract validation logic into utility module" |
| Find related files | Chat | "Show me all files related to ListBox component" |
| Understand architecture | Chat | "How does the element store handle undo/redo?" |
| Multi-file update | Composer | "Update all CSS files to use new spacing tokens" |
| Explore codebase | Chat | "Where is the factory pattern implemented?" |

## Remember

- **Composer** is best for multi-file changes and complex refactoring
- **Chat** is best for exploration, understanding, and single-file assistance
- Always review Composer's plan before execution
- Reference CLAUDE.md for specific patterns and rules
- Let Cursor's codebase indexing work for you - ask questions instead of searching manually

---

**For detailed coding guidelines, architecture patterns, and anti-patterns, see [CLAUDE.md](./CLAUDE.md).**

