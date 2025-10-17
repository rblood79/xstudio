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

- **elements.ts** - Page elements, hierarchy, CRUD operations, undo/redo
- **selection.ts** - Currently selected element tracking
- **history.ts** - Undo/redo history management
- **theme.ts** - Design tokens and theme state
- **saveMode.ts** - Auto-save vs manual save mode

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

### React Aria Components

- All UI components must use React Aria for accessibility
- Proper ARIA attributes, roles, and keyboard interactions
- Use `tv()` from `tailwind-variants` for semantic class generation
- Ship with `.stories.tsx` and `.test.tsx` for every new component

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

The `reorderElements()` function in `elements.ts` handles automatic re-sequencing after operations.

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
// Update props
await updateElementProps(elementId, { newProp: 'value' });

// Update entire element (including dataBinding)
await updateElement(elementId, { props: {...}, dataBinding: {...} });

// Remove element (cascades to children)
await removeElement(elementId);
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
