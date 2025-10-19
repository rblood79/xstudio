# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XStudio is a web-based UI builder/design studio built with React 19, TypeScript, React Aria Components, Zustand, Tailwind v4, and Supabase. It enables users to create websites through an intuitive drag-and-drop interface with real-time preview.

**Key Features:**
- Drag-and-drop visual builder with iframe-based real-time preview
- Accessibility-first components using React Aria Components
- Design system with design tokens and theme management
- Real-time collaboration via Supabase
- Undo/redo history with Zustand state management

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

### Testing
```bash
# Run tests (Vitest)
npm run test

# Run E2E tests (Playwright)
npm run test:e2e
```

### Storybook
```bash
# Start Storybook (port 6006)
npm run storybook

# Build Storybook
npm run build-storybook
```

## Architecture Overview

### Core Builder System

The builder consists of four main areas:

1. **BuilderHeader** - Top toolbar with save/undo/redo controls
2. **Sidebar** - Page tree and element hierarchy navigation
3. **Preview** - iframe-based real-time preview of the page
4. **Inspector** - Property editor for selected elements

### State Management (Zustand)

The application uses Zustand stores located in `src/builder/stores/`:

- **elements.ts** - Main element store (213 lines, refactored with factory pattern - 88.5% reduction)
- **selection.ts** - Currently selected element tracking
- **history.ts** - Undo/redo history management
- **theme.ts** - Design tokens and theme state
- **saveMode.ts** - Auto-save vs manual save mode

#### Store Module Architecture

The `elements.ts` store has been refactored into focused, reusable modules using the factory pattern:

**Utility Modules** (`src/builder/stores/utils/`):
- **elementHelpers.ts** - Core helper functions (`findElementById`, `createCompleteProps`)
- **elementSanitizer.ts** - Safe serialization (removes Immer proxies for postMessage/DB)
- **elementReorder.ts** - Automatic order_num re-sequencing with special sorting logic (391 lines)
- **elementRemoval.ts** - Element deletion with cascade logic (393 lines)
- **elementCreation.ts** - Element creation logic (`addElement`, `addComplexElement`) (202 lines)
- **elementUpdate.ts** - Element update logic (`updateElementProps`, `updateElement`) (160 lines)

**History Modules** (`src/builder/stores/history/`):
- **historyActions.ts** - Undo/redo factory functions (570 lines)

**Factory Pattern Example:**
```typescript
// Factory functions receive Zustand's set/get
export const createAddElementAction = (set: SetState, get: GetState) => async (element: Element) => {
  // 1. Memory state update
  // 2. iframe postMessage
  // 3. Supabase save
  // 4. order_num reordering
};

// Main store uses factories
export const createElementsSlice: StateCreator<ElementsState> = (set, get) => {
  const undo = createUndoAction(set, get);
  const redo = createRedoAction(set, get);
  const removeElement = createRemoveElementAction(set, get);
  const addElement = createAddElementAction(set, get);
  const addComplexElement = createAddComplexElementAction(set, get);
  const updateElementProps = createUpdateElementPropsAction(set, get);
  const updateElement = createUpdateElementAction(set, get);

  return {
    elements: [],
    undo,
    redo,
    removeElement,
    addElement,
    addComplexElement,
    updateElementProps,
    updateElement,
    // ... other methods
  };
};
```

This architecture provides:
- **Separation of concerns** - Each module has a single responsibility
- **Testability** - Functions can be tested in isolation
- **Reusability** - Factory pattern allows flexible composition
- **Maintainability** - 88.5% reduction in main store file size (1,851 → 213 lines)

**Module Dependency Graph:**
```
elements.ts (213 lines) ⭐ 88.5% reduction
├── utils/
│   ├── elementHelpers.ts      → Core utilities (20 lines)
│   ├── elementSanitizer.ts    → Safe serialization (36 lines)
│   ├── elementReorder.ts      → Order management (391 lines)
│   ├── elementRemoval.ts      → Deletion logic (393 lines)
│   ├── elementCreation.ts     → Creation logic (202 lines)
│   └── elementUpdate.ts       → Update logic (160 lines)
└── history/
    └── historyActions.ts      → Undo/redo (570 lines)
```

### Data Flow

```
User Action → Zustand Store → Supabase API → Real-time Update
                    ↓
         iframe Preview Sync (postMessage)
```

**Critical:** All store updates follow this pattern:
1. Update memory state first (immediate UI update)
2. Send postMessage to iframe (for preview sync)
3. Save to Supabase (async, failures don't break memory state)

### Preview System (iframe)

The preview runs in an isolated iframe (`src/builder/preview/index.tsx`):

- Receives element updates via `postMessage` with origin validation
- Queues messages until `PREVIEW_READY` state
- Renders React Aria Components dynamically based on element tree
- Handles component-specific rendering (Tabs, Tables, Collections, etc.)

### API Service Layer

Structured API services in `src/services/api/`:

- **BaseApiService.ts** - Rate limiting, validation, error handling
- **ElementsApiService.ts** - Element CRUD operations
- **PagesApiService.ts** - Page management
- **ProjectsApiService.ts** - Project management
- **ErrorHandler.ts** - Centralized error classification and logging

All API calls use the service layer pattern with proper error handling.

## Critical Coding Rules

### Styling: NO Inline Tailwind

**NEVER use inline Tailwind classes in .tsx files.** This is the most important rule.

```tsx
// ❌ WRONG - Do not do this
<button className="px-4 py-2 bg-blue-500 text-white rounded">Click</button>

// ✅ CORRECT - Use semantic classes with tv()
import { tv } from 'tailwind-variants';

const buttonStyles = tv({
  base: 'button',
  variants: {
    variant: {
      primary: 'button-primary',
      secondary: 'button-secondary',
    }
  }
});

<button className={buttonStyles({ variant: 'primary' })}>Click</button>
```

Then define styles in CSS using `@apply`:

```css
/* component.css */
.button {
  @apply px-4 py-2 rounded transition-colors;
}

.button-primary {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}
```

**Exception:** Runtime customization via `props.className` from Property Editor is allowed.

### TypeScript

- **Strict typing:** No `any` types, explicit return types
- **DTOs location:** Type definitions go in `src/types/`
- **Import paths:** Use absolute imports (configured in tsconfig)
- Keep components and hooks thin, delegate logic to services/utilities

**Store Module Pattern:**

When creating new store modules or utilities, follow the factory pattern:

```typescript
// 1. Import StateCreator from zustand for proper typing
import type { StateCreator } from "zustand";
import type { YourStoreState } from "../yourStore";

// 2. Extract set/get types from StateCreator
type SetState = Parameters<StateCreator<YourStoreState>>[0];
type GetState = Parameters<StateCreator<YourStoreState>>[1];

// 3. Create factory function that receives set/get
export const createYourAction = (set: SetState, get: GetState) => async () => {
  // Your logic here using set() and get()
  set({ someField: newValue });
  const currentState = get();
};

// 4. Use in main store
export const createYourStoreSlice: StateCreator<YourStoreState> = (set, get) => {
  const yourAction = createYourAction(set, get);

  return {
    // state
    someField: initialValue,
    // actions
    yourAction,
  };
};
```

This pattern enables:
- Proper type inference for Zustand's set/get functions
- Modular, testable code
- Separation of concerns while maintaining store access

### React Aria Components

- All UI components must use React Aria for accessibility
- Proper ARIA attributes, roles, and keyboard interactions
- Use `tv()` from `tailwind-variants` for semantic class generation
- Ship with `.stories.tsx` and `.test.tsx` for every new component

#### CSS Class Naming Rules (CRITICAL)

**ALWAYS follow React Aria standard class naming conventions:**

1. **Use `react-aria-*` prefix for React Aria components:**
   ```tsx
   // ✅ CORRECT
   <AriaComboBox className="react-aria-ComboBox react-aria-UnitComboBox">
   <Input className="react-aria-Input" />
   <Button className="react-aria-Button" />

   // ❌ WRONG - Do not create custom prefixes
   <AriaComboBox className="property-unit-input__combobox">
   <Input className="property-unit-input__input" />
   ```

2. **Before creating new CSS classes, ALWAYS check existing patterns:**
   - Read similar components in `src/builder/components/`
   - Search for existing CSS in `src/builder/components/components.css`
   - Reuse existing class names (e.g., `combobox-container`, `control-label`)

3. **Workflow for new Inspector components:**
   ```
   Step 1: Find the closest React Aria component (ComboBox, Select, Input, etc.)
   Step 2: Read its implementation in src/builder/components/
   Step 3: Copy its className structure exactly
   Step 4: Only add variant classes if needed (e.g., react-aria-UnitComboBox)
   Step 5: Reuse existing CSS - avoid creating new CSS files
   ```

4. **Example - Correct Pattern:**
   ```tsx
   // Based on ComboBox.tsx structure
   <AriaComboBox className="react-aria-ComboBox">
     <div className="combobox-container">  {/* Existing class */}
       <Input className="react-aria-Input" />
       <Button className="react-aria-Button">
         <ChevronDown />
       </Button>
     </div>
   </AriaComboBox>
   ```

5. **When to create custom classes:**
   - Only for component-specific variants (e.g., `react-aria-UnitComboBox`)
   - Use existing base styles, add minimal overrides
   - Never replace standard React Aria class names

**Rule of thumb:** If you find yourself creating `component-name__element` BEM classes for React Aria components, you're doing it wrong. Use `react-aria-*` instead.

### Supabase

- **Always use Row Level Security (RLS)**
- Never expose secrets in client code
- Use service modules (`src/services/api/*`) for all database operations
- Use hooks for reactive queries (not direct Supabase calls in components)

### Component Development

When adding a new component:

1. Create React Aria component in `src/builder/components/`
2. Create property editor in `src/builder/inspector/properties/editors/`
3. Create Storybook story in `src/stories/`
4. Write tests (Vitest for unit, Playwright for E2E)

#### Inspector Property Components - Step-by-Step Workflow

When adding a new Inspector property component (e.g., PropertyUnitInput, PropertyColorPicker):

**Step 1: Identify the base React Aria component pattern**

| Use Case | Base Component | Example File |
|----------|----------------|--------------|
| Value + unit inputs | ComboBox | `src/builder/components/ComboBox.tsx` |
| Dropdowns/Lists | Select | `src/builder/inspector/components/PropertySelect.tsx` |
| Text inputs | Input | `src/builder/inspector/components/PropertyInput.tsx` |
| Toggles | Switch/Checkbox | React Aria Switch |
| Color selection | ColorPicker | Custom with Popover |

**Step 2: Read the existing implementation**

```bash
# Example: Creating a unit input component
cat src/builder/components/ComboBox.tsx  # Read component structure
grep "combobox-container" src/builder/components/components.css  # Check existing CSS
grep "react-aria-ComboBox" src/builder/components/components.css  # Check React Aria styles
```

**Step 3: Copy the structure exactly**

```tsx
// ✅ CORRECT - Copy from ComboBox.tsx
<AriaComboBox className="react-aria-ComboBox react-aria-UnitComboBox">
  <div className="combobox-container">  {/* Reuse existing class */}
    <Input className="react-aria-Input" />
    <Button className="react-aria-Button">
      <ChevronDown size={16} />
    </Button>
  </div>
  <Popover className="react-aria-Popover">
    <ListBox className="react-aria-ListBox">
      {/* items */}
    </ListBox>
  </Popover>
</AriaComboBox>

// ❌ WRONG - Creating new structure
<div className="property-unit-input__wrapper">
  <input className="property-unit-input__field" />
  <button className="property-unit-input__dropdown" />
</div>
```

**Step 4: Add minimal component-specific styles only if needed**

- Only add variant classes (e.g., `react-aria-UnitComboBox`)
- Use existing base styles from `components.css`
- Avoid creating new CSS files for simple variants

**Step 5: Anti-patterns to avoid**

❌ **DO NOT:**
- Create new CSS files for simple component variants
- Use BEM naming (`component__element`) for React Aria components
- Duplicate existing CSS styles
- Ignore existing component patterns in `src/builder/components/`
- Add custom container classes when standard ones exist

✅ **DO:**
- Reuse `react-aria-*` class names
- Reuse container classes (`combobox-container`, `control-label`, etc.)
- Follow existing patterns from `src/builder/components/`
- Check existing CSS before writing new styles
- Import existing CSS files instead of creating new ones

### Preview iframe Communication

**Always validate postMessage origins:**

```tsx
window.addEventListener('message', (event) => {
  // Validate origin in production
  if (event.data.type === 'YOUR_MESSAGE_TYPE') {
    // Handle message
  }
});
```

**Queue messages until preview is ready:**

```tsx
if (!previewReady) {
  messageQueue.push(message);
} else {
  window.parent.postMessage(message, '*');
}
```

### Design Tokens

Use CSS variables for theming, never hardcode colors:

```css
/* ✅ CORRECT */
.my-component {
  color: var(--color-primary-600);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
}

/* ❌ WRONG */
.my-component {
  color: #3b82f6;
  border-radius: 8px;
  padding: 1rem;
}
```

## Database Schema (Supabase)

Key tables:

- **projects** - User projects (id, name, created_by, domain)
- **pages** - Pages within projects (id, project_id, title, slug, order_num)
- **elements** - UI elements with tree structure (id, page_id, parent_id, tag, props, order_num)
- **design_tokens** - Design token definitions (id, project_id, theme_id, name, type, value, scope)
- **design_themes** - Theme configurations (id, project_id, name, status, version)

## Element Order Management

Elements have an `order_num` field for rendering order. Special sorting rules apply:

- **Tabs component:** Tab/Panel pairs are sorted by `tabId`, ensuring Tab followed by its Panel
- **Collection components** (ListBox, GridList, Menu, ComboBox, Select, Tree, ToggleButtonGroup): Items sorted by `order_num` then by text content
- **Table components:** ColumnGroup and Column elements sorted by `order_num` then by label

The `reorderElements()` function in `src/builder/stores/utils/elementReorder.ts` handles automatic re-sequencing after operations. This module:
- Groups elements by parent and page
- Applies component-specific sorting logic
- Batch updates to Supabase for performance
- Includes detailed logging for debugging

**Key Implementation Detail:**
```typescript
// Located in: src/builder/stores/utils/elementReorder.ts
export const reorderElements = async (
  elements: Element[],
  pageId: string,
  updateElementOrder: (elementId: string, orderNum: number) => void
): Promise<void> => {
  // Groups elements by parent
  // Applies special sorting for Tabs, Collections, Tables
  // Updates both memory state and database
};
```

## Testing Strategy

### Unit Tests (Vitest)

```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

Focus on full builder workflows and real-time collaboration features.

### Storybook

Use CSF3 format with Controls and Interactions:

```tsx
// MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Builder/Components/MyComponent',
  component: MyComponent,
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

## Common Patterns

### Adding a Complex Component (e.g., Tabs with Tab/Panel pairs)

Use `addComplexElement` for components with required children:

```tsx
const parentElement = {
  id: generateId(),
  tag: 'Tabs',
  props: {},
  parent_id: null,
  page_id: currentPageId,
  order_num: getNextOrderNum(),
};

const childElements = [
  { id: generateId(), tag: 'Tab', props: { tabId, title: 'Tab 1' }, parent_id: parentElement.id, ... },
  { id: generateId(), tag: 'Panel', props: { tabId, children: 'Content' }, parent_id: parentElement.id, ... },
];

await store.addComplexElement(parentElement, childElements);
```

### Handling Element Updates

Always use store methods for element modifications:

```tsx
// Add single element
// Implementation: src/builder/stores/utils/elementCreation.ts
await addElement(element);

// Add complex element (parent + children)
// Implementation: src/builder/stores/utils/elementCreation.ts
await addComplexElement(parentElement, childElements);

// Update props only
// Implementation: src/builder/stores/utils/elementUpdate.ts
await updateElementProps(elementId, { newProp: 'value' });

// Update entire element (including dataBinding)
// Implementation: src/builder/stores/utils/elementUpdate.ts
await updateElement(elementId, { props: {...}, dataBinding: {...} });

// Remove element (cascades to children)
// Implementation: src/builder/stores/utils/elementRemoval.ts
await removeElement(elementId);
```

**Element Creation (`elementCreation.ts`):**

The `addElement` and `addComplexElement` functions follow a consistent triple-layer synchronization pattern:

1. **Memory state update** (immediate UI reflection)
2. **iframe postMessage** (preview synchronization)
3. **Supabase save** (async, failures don't break memory state)
4. **order_num reordering** (automatic sequencing)

```typescript
// Single element addition
await addElement({
  id: generateId(),
  tag: 'Button',
  props: { children: 'Click me' },
  page_id: currentPageId,
  parent_id: null,
  order_num: getNextOrderNum(),
});

// Complex element (Tabs with Tab+Panel pairs)
await addComplexElement(parentElement, [tab1, panel1, tab2, panel2]);
```

**Element Update (`elementUpdate.ts`):**

Two update methods with different scopes:

- **`updateElementProps`** - Updates only the `props` field, triggers history tracking
- **`updateElement`** - Updates any element fields (`props`, `dataBinding`, etc.)

Both methods:
- Update memory state first (immediate UI)
- Track changes in history (for undo/redo)
- Delegate iframe/DB sync to external callers (prevents infinite loops)

```typescript
// Update props only
await updateElementProps('element-id', {
  children: 'New text',
  variant: 'primary'
});

// Update with data binding
await updateElement('element-id', {
  props: { children: 'Dynamic content' },
  dataBinding: { source: 'api', path: 'data.title' }
});
```

**Element Removal (`elementRemoval.ts`):**

The `removeElement` function handles complex cascade logic:
- Recursively removes all child elements
- **Table Column/Cell sync:** Deleting a Column removes all related Cells; deleting a Cell removes the Column
- **Tab/Panel pairs:** Deleting a Tab removes its paired Panel (matched by `tabId`)
- **Collection items:** Defers order_num reordering until after undo to prevent visual jumps
- Triple-layer sync: memory → iframe → Supabase

```typescript
// Example: Deleting a Tab automatically removes its Panel
const tab = { id: 'tab1', tag: 'Tab', props: { tabId: 'unique-id' } };
const panel = { id: 'panel1', tag: 'Panel', props: { tabId: 'unique-id' } };

await removeElement('tab1'); // Also removes 'panel1' automatically
```

### Save Service

Use `saveService` from `src/services/save/` for manual saves:

```tsx
import { saveService } from '../../services/save';

// Trigger save
await saveService.saveElements(elements, projectId);
```

## Environment Variables

Required in `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
VITE_ENABLE_DEBUG_LOGS=true
```

## Commit Message Format

Follow conventional commits:

```bash
feat: Add new Calendar component
fix: Resolve TabPanel selection bug
refactor: Optimize useElementCreator hook
docs: Update API documentation
test: Add tests for Table component
style: Update button hover states
```
