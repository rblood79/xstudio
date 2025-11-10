# CLAUDE.md

This file provides guidance to AI coding assistants (Claude Code, Cursor AI, GitHub Copilot) when working with code in this repository.

> **Note:** This document is optimized for Claude Code but also serves as guidelines for other AI assistants like Cursor AI and GitHub Copilot.

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

### Testing & Storybook
```bash
# Run tests (Vitest)
npm run test

# Run E2E tests (Playwright)
npm run test:e2e

# Start Storybook (port 6006)
npm run storybook
```

## Architecture Overview

### Core Builder System

The builder consists of four main areas:

1. **BuilderHeader** - Top toolbar with save/undo/redo controls
2. **Sidebar** - Page tree and element hierarchy navigation
3. **Preview** - iframe-based real-time preview of the page
4. **Inspector** - Property editor for selected elements with inline style management

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
See `src/builder/stores/elements.ts` for implementation. Key benefits:
- **Separation of concerns** - Each module has a single responsibility
- **Testability** - Functions can be tested in isolation
- **Reusability** - Factory pattern allows flexible composition
- **Maintainability** - 88.5% reduction in main store file size (1,851 → 213 lines)

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
- **Collects computed styles** from DOM elements and sends to Inspector

### Inspector Style Management System

The Inspector provides a comprehensive inline style editor with bidirectional synchronization.

**Key Features:**
- **Inline Styles** - Direct React `style` prop manipulation (not CSS variables)
- **Computed Styles** - Reads actual browser-rendered styles from Preview iframe
- **Style Priority** - Displays inline > computed > default values
- **Bidirectional Sync** - Changes in Inspector update Preview, selections in Preview update Inspector
- **History Integration** - All style changes tracked for undo/redo

**Architecture** (`src/builder/inspector/`):
- **useInspectorState.ts** - Manages local Inspector state
- **useSyncWithBuilder.ts** - Syncs Inspector changes to Builder store
- **StyleSection.tsx** - Main style editor UI with Flexbox controls
- **types.ts** - Extended with `style` and `computedStyle` properties

### API Service Layer

Structured API services in `src/services/api/`:

- **BaseApiService.ts** - Rate limiting, validation, error handling
- **ElementsApiService.ts** - Element CRUD operations
- **PagesApiService.ts** - Page management
- **ProjectsApiService.ts** - Project management
- **ErrorHandler.ts** - Centralized error classification and logging

### Mock Data API Endpoints

The project includes a comprehensive Mock Data API system for component testing and development.

**Base URL**: `MOCK_DATA`

**Available Endpoints** (20+ endpoints):
- **Geography**: `/countries`, `/cities`, `/timezones`
- **E-commerce**: `/categories`, `/products`
- **Status/Priority**: `/status`, `/priorities`, `/tags`
- **Internationalization**: `/languages`, `/currencies`
- **Tree Structures**: `/component-tree`, `/engine-summary`, `/engines`, `/components`
- **Users/Organizations**: `/users`, `/departments`, `/projects`, `/roles`, `/permissions`

**Usage:**
```json
{
  "baseUrl": "MOCK_DATA",
  "endpoint": "/countries",
  "dataMapping": {
    "idField": "id",
    "labelField": "name"
  }
}
```

**Full Documentation:** See `src/services/api/index.ts` for all available endpoints, data structures, and implementation details.

## Critical Coding Rules

### CSS Architecture

**Component CSS Organization:**

All component CSS files are organized in `src/builder/components/styles/`:

```
src/builder/components/
├── components.css          # Main compiled styles (do not edit directly)
├── index.css               # Entry point (imports from styles/)
├── theme.css               # Design tokens
└── styles/                 # 61 component CSS files
    ├── Button.css
    ├── Calendar.css
    └── ... (all component styles)
```

**CSS Layering Pattern:**

All component CSS files MUST use the `@layer components` wrapper:

```css
/* src/builder/components/styles/Button.css */
@import './base.css';

@layer components {
  .react-aria-Button {
    /* component styles */
  }
}
```

**IMPORTANT - Tailwind v4 Constraints:**

⚠️ **Tailwind v4.1.3 does NOT support the `@apply` directive.**

```css
/* ❌ WRONG - @apply is NOT supported in Tailwind v4 */
.button {
  @apply px-4 py-2 rounded transition-colors;
}

/* ✅ CORRECT - Use standard CSS with CSS variables */
.button {
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
  padding-top: var(--spacing);
  padding-bottom: var(--spacing);
  border-radius: var(--radius-md);
  transition: colors 200ms;
}
```

**CSS Variables Usage:**

Always use CSS variables for consistency. Common variables:

```css
/* Typography */
font-size: var(--text-xs);      /* 12px */
font-size: var(--text-sm);      /* 14px */
font-size: var(--text-base);    /* 16px */
font-size: var(--text-lg);      /* 18px */

/* Spacing */
padding: var(--spacing-sm);      /* 8px */
padding: var(--spacing-md);      /* 12px */
padding: var(--spacing-lg);      /* 16px */
gap: var(--spacing-md);

/* Colors */
color: var(--color-primary-600);
background: var(--color-gray-100);
border-color: var(--color-border);

/* Borders & Radius */
border-radius: var(--radius-sm);
border-radius: var(--radius-md);
border-radius: var(--radius-lg);
```

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
      primary: 'primary',
      secondary: 'secondary',
    }
  }
});

<button className={buttonStyles({ variant: 'primary' })}>Click</button>
```

Then define styles in CSS files (located in `styles/` folder):

```css
/* src/builder/components/styles/Button.css */
@layer components {
  .button {
    padding-left: var(--spacing-sm);
    padding-right: var(--spacing-sm);
    padding-top: var(--spacing);
    padding-bottom: var(--spacing);
    border-radius: var(--radius-md);
    transition: colors 200ms;
  }

  .button-primary {
    background: var(--color-primary-500);
    color: var(--color-white);
  }

  .button-primary:hover {
    background: var(--color-primary-600);
  }
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

#### Component Editor Development

**Creating Inspector Property Editors for React Aria Components**

When creating property editors for components that use React Aria features (internationalization, date/time handling, number formatting), follow these patterns to expose all features in the builder UI.

**Core Principles:**
- All React Aria props should be configurable via Inspector UI
- Use consistent Property components (PropertyInput, PropertySelect, PropertySwitch)
- Group related properties into logical fieldsets
- Add visual icons from lucide-react for clarity

**Standard Editor Structure:**

```typescript
import { /* icons */ Globe, DollarSign, CalendarDays } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function ComponentEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    // Update prop helper
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = { ...currentProps, [key]: value };
        onUpdate(updatedProps);
    };

    // Update customId helper
    const updateCustomId = (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    // Number prop helper (for numeric inputs)
    const updateNumberProp = (key: string, value: string, defaultValue?: number) => {
        const numericValue = value === '' ? undefined : (Number(value) || defaultValue);
        updateProp(key, numericValue);
    };

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="component_1"
            />

            {/* Add property fieldsets here */}
        </div>
    );
}
```

**Property Component Patterns:**

| Feature Type | Component | Pattern | Example |
|--------------|-----------|---------|---------|
| **Text Input** | PropertyInput | Simple text/string values | Timezone, locale, date strings |
| **Dropdown** | PropertySelect | Enum/choice values | Value format, hour cycle, variants |
| **Toggle** | PropertySwitch | Boolean values | Show value, default to today, disabled |
| **Number Input** | PropertyInput | Numeric values (use updateNumberProp) | Min/max values, step |

**Common Property Sections:**

```typescript
// 1. Internationalization Section (Date/Time Components)
<fieldset className="properties-group">
  <legend>Internationalization</legend>

  <PropertyInput
    label="Timezone"
    value={String(currentProps.timezone || '')}
    onChange={(value) => updateProp('timezone', value || undefined)}
    placeholder="Asia/Seoul, America/New_York"
    icon={Globe}
  />

  <PropertySwitch
    label="Default to Today"
    isSelected={Boolean(currentProps.defaultToday)}
    onChange={(checked) => updateProp('defaultToday', checked)}
    icon={CalendarDays}
  />

  <PropertyInput
    label="Min Date"
    value={String(currentProps.minDate || '')}
    onChange={(value) => updateProp('minDate', value || undefined)}
    placeholder="2024-01-01"
  />

  <PropertyInput
    label="Max Date"
    value={String(currentProps.maxDate || '')}
    onChange={(value) => updateProp('maxDate', value || undefined)}
    placeholder="2024-12-31"
  />
</fieldset>

// 2. Number Formatting Section (Number Display Components)
<fieldset className="properties-group">
  <legend>Number Formatting</legend>

  <PropertyInput
    label="Locale"
    value={String(currentProps.locale || '')}
    onChange={(value) => updateProp('locale', value || undefined)}
    placeholder="ko-KR, en-US, ja-JP"
    icon={Globe}
  />

  <PropertySelect
    label="Value Format"
    value={String(currentProps.valueFormat || 'number')}
    onChange={(value) => updateProp('valueFormat', value)}
    options={[
      { value: 'number', label: 'Number' },
      { value: 'percent', label: 'Percent' },
      { value: 'unit', label: 'Unit' },
      { value: 'custom', label: 'Custom' }
    ]}
    icon={DollarSign}
  />

  {/* Conditional props based on valueFormat */}
  {currentProps.valueFormat === 'unit' && (
    <PropertyInput
      label="Unit"
      value={String(currentProps.unit || '')}
      onChange={(value) => updateProp('unit', value || undefined)}
      placeholder="kilometer, celsius, meter"
      icon={Type}
    />
  )}

  <PropertySwitch
    label="Show Value"
    isSelected={currentProps.showValue !== false}
    onChange={(checked) => updateProp('showValue', checked)}
    icon={NotebookTabs}
  />
</fieldset>
```

**Icon Usage Guidelines:**

| Property Type | Icon | Import |
|---------------|------|--------|
| Locale/Timezone | Globe | `lucide-react` |
| Value Format | DollarSign | `lucide-react` |
| Date Controls | CalendarDays | `lucide-react` |
| Time Controls | Clock | `lucide-react` |
| Min/Max Values | ArrowDown/ArrowUp | `lucide-react` |
| Generic Input | Type | `lucide-react` |
| Toggle/Boolean | Check, ToggleLeft | `lucide-react` |
| Number Display | NotebookTabs, BarChart3, Gauge | `lucide-react` |

**Conditional Property Rendering:**

Some properties depend on other values. Use conditional rendering:

```typescript
{/* Only show unit input when valueFormat is 'unit' */}
{currentProps.valueFormat === 'unit' && (
  <PropertyInput
    label="Unit"
    value={String(currentProps.unit || '')}
    onChange={(value) => updateProp('unit', value || undefined)}
    placeholder="kilometer, celsius, meter"
  />
)}

{/* Only show variant/size when NOT a child of parent group */}
{!isChildOfGroup && (
  <fieldset className="properties-design">
    <PropertySelect
      label={PROPERTY_LABELS.VARIANT}
      value={String(currentProps.variant || 'default')}
      onChange={(value) => updateProp('variant', value)}
      options={[...]}
    />
  </fieldset>
)}
```

**Value Handling:**

```typescript
// String props
onChange={(value) => updateProp('timezone', value || undefined)}

// Number props
onChange={(value) => updateNumberProp('minValue', value, 0)}

// Boolean props
onChange={(checked) => updateProp('isDisabled', checked)}

// Enum props
onChange={(value) => updateProp('valueFormat', value)}
```

**Placeholder Best Practices:**

- **Dates**: Use ISO format (YYYY-MM-DD)
- **Locales**: Show examples (ko-KR, en-US, ja-JP)
- **Timezones**: Show common examples (Asia/Seoul, America/New_York)
- **Units**: Show common units (kilometer, celsius, meter)
- **Numbers**: Show typical values (0, 100, 50)

**Example Editors:**

Reference implementations in `src/builder/inspector/properties/editors/`:
- **CalendarEditor.tsx** - Timezone, defaultToday, minDate, maxDate
- **SliderEditor.tsx** - Locale, valueFormat, unit, showValue (with conditional unit input)
- **MeterEditor.tsx** - Locale, valueFormat, showValue
- **ProgressBarEditor.tsx** - Locale, valueFormat, showValue
- **TimeFieldEditor.tsx** - hourCycle control
- **DatePickerEditor.tsx** - Timezone, date range constraints
- **NumberFieldEditor.tsx** - Locale, formatStyle, currency, unit, notation

**Testing Editor Changes:**

After creating/updating an editor:
1. **Visual Test**: Add component in builder, verify all controls appear
2. **Functional Test**: Change each property, verify Preview updates
3. **Type Safety**: Ensure TypeScript has no errors
4. **Persistence Test**: Save/reload, verify properties persist

**Future Enhancements:**

When React Aria adds new features, follow this checklist:
- [ ] Identify which components support the new feature
- [ ] Add property controls to relevant editors
- [ ] Choose appropriate Property component (Input/Select/Switch)
- [ ] Add icon for visual clarity
- [ ] Test in Builder Preview
- [ ] Update `REACT_ARIA_INTEGRATION.md` documentation
- [ ] Add to component Storybook stories

#### Action Token System and Component Variants

**Overview**

All interactive components use the Action Token System for consistent theming across variants. This system uses semantic CSS variables and the `tv()` (tailwind-variants) API for type-safe variant composition.

**Action Token CSS Variables:**

```css
/* Primary Action Colors */
--action-primary-bg: var(--color-primary-600);
--action-primary-bg-pressed: var(--color-primary-700);

/* Secondary Action Colors */
--action-secondary-bg: var(--color-secondary-600);
--action-secondary-bg-pressed: var(--color-secondary-700);

/* Surface Action Colors */
--action-surface-bg: var(--color-surface-600);
--action-surface-bg-pressed: var(--color-surface-700);
```

**Component Styling Patterns**

Components follow three distinct patterns based on their usage context:

1. **Standalone Components** - Always used independently
   - Examples: Button, Slider, Card, Separator, ProgressBar, Meter
   - Have their own variant and size props
   - Use `tv()` for className composition: `.react-aria-Component.variant`

2. **Parent-Controlled Components** - Child styling controlled by parent
   - Examples: Radio/RadioGroup, TagGroup/Tag
   - Radio never used standalone (always in RadioGroup)
   - Parent sets CSS data attributes: `data-radio-variant`, `data-radio-size`
   - CSS targets: `.react-aria-RadioGroup[data-radio-variant="primary"] .react-aria-Radio`

3. **Dual-Mode Components** - Support both standalone and parent-controlled
   - Examples: Checkbox/CheckboxGroup, ToggleButton/ToggleButtonGroup
   - Work standalone OR in parent group
   - CSS includes BOTH patterns:
     - Standalone: `.react-aria-ToggleButton.primary`
     - Group-controlled: `.react-aria-ToggleButtonGroup[data-togglebutton-variant="primary"] .react-aria-ToggleButton`
   - Property editor conditionally shows variant/size (hidden when child of group)

**Migrated Components (tv() + Action Tokens):**

| Component | Pattern | Variants | Sizes | File Location |
|-----------|---------|----------|-------|---------------|
| Button | Standalone | default, primary, secondary, surface | sm, md, lg | `components/Button.tsx` |
| Card | Standalone | default, outlined, elevated | N/A | `components/Card.tsx` |
| Separator | Standalone | default, primary, secondary, surface | N/A | `components/Separator.tsx` |
| TagGroup | Parent-controlled | default, primary, secondary, surface | sm, md, lg | `components/TagGroup.tsx` |
| Tag | Parent-controlled | (inherited from TagGroup) | (inherited) | `components/Tag.tsx` |
| ProgressBar | Standalone | default, primary, secondary, surface | sm, md, lg | `components/ProgressBar.tsx` |
| Meter | Standalone | default, primary, secondary, surface | sm, md, lg | `components/Meter.tsx` |
| CheckboxGroup | Parent-controlled | default, primary, secondary, surface | sm, md, lg | `components/CheckboxGroup.tsx` |
| Checkbox | Dual-mode | default, primary, secondary, surface | sm, md, lg | `components/Checkbox.tsx` |
| RadioGroup | Parent-controlled | default, primary, secondary, surface | sm, md, lg | `components/RadioGroup.tsx` |
| Radio | Parent-controlled | (inherited from RadioGroup) | (inherited) | `components/Radio.tsx` |
| Slider | Standalone | default, primary, secondary, surface | sm, md, lg | `components/Slider.tsx` |
| ToggleButtonGroup | Parent-controlled | default, primary, secondary, surface | sm, md, lg | `components/ToggleButtonGroup.tsx` |
| ToggleButton | Dual-mode | default, primary, secondary, surface | sm, md, lg | `components/ToggleButton.tsx` |

**Migration Pattern Example (Dual-Mode):**

```tsx
// 1. Component with tv() - src/builder/components/ToggleButton.tsx
import { tv } from 'tailwind-variants';

const toggleButtonStyles = tv({
  base: 'react-aria-ToggleButton',
  variants: {
    variant: {
      default: '',
      primary: 'primary',
      secondary: 'secondary',
      surface: 'surface',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export function ToggleButton({ variant = 'default', size = 'md', ...props }: ToggleButtonExtendedProps) {
  const toggleButtonClassName = composeRenderProps(
    props.className,
    (className) => toggleButtonStyles({ variant, size, className })
  );

  return <RACToggleButton {...props} className={toggleButtonClassName} />;
}
```

```css
/* 2. Dual-mode CSS - src/builder/components/styles/ToggleButton.css */
@layer components {
  /* Base styles */
  .react-aria-ToggleButton {
    color: var(--text-color);
    background: var(--button-background);
    border: 1px solid var(--border-color);
  }

  /* Parent-controlled variant (when in ToggleButtonGroup) */
  .react-aria-ToggleButtonGroup[data-togglebutton-variant="primary"] .react-aria-ToggleButton {
    &[data-selected] {
      background: var(--action-primary-bg);
      border-color: var(--action-primary-bg);
      color: white;
      &[data-pressed] {
        background: var(--action-primary-bg-pressed);
      }
    }
  }

  /* Standalone variant (NOT in group) */
  .react-aria-ToggleButton.primary {
    &[data-selected] {
      background: var(--action-primary-bg);
      border-color: var(--action-primary-bg);
      color: white;
      &[data-pressed] {
        background: var(--action-primary-bg-pressed);
      }
    }
  }
}
```

```tsx
// 3. Conditional Property Editor - src/builder/inspector/properties/editors/ToggleButtonEditor.tsx
const parentElement = useStore((state) =>
    state.elements.find((el) => el.id === element?.parent_id)
);
const isChildOfToggleButtonGroup = parentElement?.tag === 'ToggleButtonGroup';

// Only show variant/size controls if NOT a child of ToggleButtonGroup
{!isChildOfToggleButtonGroup && (
    <fieldset className="properties-design">
        <PropertySelect
            label={PROPERTY_LABELS.VARIANT}
            value={String(currentProps.variant || 'default')}
            onChange={(value) => updateProp('variant', value)}
            options={[
                { value: 'default', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_DEFAULT },
                { value: 'primary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_PRIMARY },
                { value: 'secondary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SECONDARY },
                { value: 'surface', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SURFACE }
            ]}
            icon={Layout}
        />
    </fieldset>
)}
```

**Key Rules:**
- All variants use Action Token System CSS variables
- Use `tv()` from `tailwind-variants` for className composition
- Always use `composeRenderProps()` to preserve user-provided className
- Dual-mode components require CSS for BOTH standalone and parent-controlled patterns
- Property editors should conditionally hide variant/size when child of parent group

#### Key Component Patterns

**ToggleButtonGroup with Indicator**

The `ToggleButtonGroup` component supports an animated indicator for selected buttons. See `src/builder/components/ToggleButtonGroup.tsx:47-68` for implementation. Key feature: Indicator fades out when no button is selected (essential for mutually exclusive groups).

**Tree Component with DataBinding**

The `Tree` component supports hierarchical data display with DataBinding for dynamic content loading. Features:
- **Static Mode**: Manually add TreeItem children in Builder
- **DataBinding Mode**: Automatically load hierarchical data from API
- **Recursive Rendering**: Automatically renders nested `children` arrays
- **MOCK_DATA Support**: Built-in support for mock tree endpoints (e.g., `/component-tree`)

See `src/builder/components/Tree.tsx` for implementation.

**Field Component (DataField) - Dynamic Data Display**

The `Field` component is a type-aware data display component used within Collection components (ListBox, GridList, Menu, etc.).

**Key Features:**
- **Type-aware rendering** - Automatically formats data based on type (email, url, image, date, number, boolean, string)
- **Shortened className pattern** - Uses `react-aria-DataField` with concise child classes (`.label`, `.value`, `.value-email`)
- **Collection-ready** - Designed for use within ListBoxItem, GridListItem, MenuItem, etc.

**Usage:**
```tsx
<ListBoxItem>
  <Field fieldKey="name" label="Name" type="string" value={item.name} />
  <Field fieldKey="email" label="Email" type="email" value={item.email} />
  <Field fieldKey="avatar" type="image" value={item.avatar} showLabel={false} />
</ListBoxItem>
```

See `src/builder/components/Field.tsx` and `src/builder/components/styles/Field.css` for implementation.

#### Collection Components + Field Pattern

Collection components (ListBox, GridList, Select, ComboBox, Menu, Tree) support dynamic data rendering using the **Item + Field** pattern.

**Architecture - 3 Layers:**

1. **Data Loading Layer** - `useCollectionData` Hook (`src/builder/hooks/useCollectionData.ts`)
2. **Rendering Layer** - Item + Field combination in Preview renderer
3. **Management Layer** - ItemEditor with Field Management UI

**ItemEditor Pattern:**

Each Collection's ItemEditor (e.g., `ListBoxItemEditor`, `GridListItemEditor`) automatically detects Field children and provides Field management UI. Key features:
- **No component duplication** - Reuses FieldEditor for Field editing
- **No code duplication** - Edit button calls `setSelectedElement()` to navigate to FieldEditor
- **Layer Tree integration** - Selecting Field in Inspector also selects in Layer Tree

See `src/builder/inspector/properties/editors/ListBoxItemEditor.tsx` for reference implementation.

**Applicable to All Collection Components:**
- ✅ **ListBox + ListBoxItem** (implemented)
- ✅ **GridList + GridListItem** (implemented)
- ✅ **Select + SelectItem** (implemented)
- ✅ **ComboBox + ComboBoxItem** (implemented, with textValue for filtering)
- ✅ **TagGroup + Tag** (implemented, with removedItemIds for item removal tracking)
- 🔄 **Menu + MenuItem** (same pattern)
- 🔄 **Tree + TreeItem** (same pattern)

**Initial Component Creation Pattern:**
All collection components create only **1 initial child item** as a template for dynamic data rendering. See `src/builder/factories/definitions/SelectionComponents.ts`.

#### ComboBox Filtering with textValue

ComboBox requires `textValue` prop on each ComboBoxItem for React Aria's auto-complete filtering to work. When using Field-based rendering, the renderer must calculate textValue from visible Field values.

**Implementation:** See `src/builder/preview/renderers/SelectionRenderers.tsx:719-741`

**How it works:**
- Concatenates all visible Field values into a single searchable string
- User types "John" → matches items with "John" in any visible field
- Supports partial matching across multiple fields

#### TagGroup with ColumnMapping and Item Removal

TagGroup supports columnMapping for dynamic data rendering, plus a special `removedItemIds` feature for tracking removed items without modifying the source data.

**Key Features:**
- **ColumnMapping Mode**: Renders Tag for each data item with Field children
- **removedItemIds**: Array of item IDs that should be hidden from display
- **Restore Function**: Inspector UI to restore all removed items

**Implementation:** See:
- `src/builder/components/TagGroup.tsx:42-43, 131-151`
- `src/builder/preview/renderers/CollectionRenderers.tsx:321-365`
- `src/builder/inspector/properties/editors/TagGroupEditor.tsx:197-214`

**Key Benefits:**
- **Non-destructive**: Original data (REST API/MOCK_DATA) unchanged
- **Persistent**: removedItemIds saved to database, survives refresh
- **Undo-friendly**: Changes tracked in history system
- **Restorable**: Simple UI to restore all removed items at once

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

The `reorderElements()` function in `src/builder/stores/utils/elementReorder.ts` handles automatic re-sequencing after operations.

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

Use CSF3 format with Controls and Interactions. See existing stories in `src/stories/` for examples.

## Common Patterns

### Adding a Complex Component

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
await addComplexElement(parentElement, childElements);

// Update props only
// Implementation: src/builder/stores/utils/elementUpdate.ts
await updateElementProps(elementId, { newProp: 'value' });

// Update entire element (including dataBinding)
await updateElement(elementId, { props: {...}, dataBinding: {...} });

// Remove element (cascades to children)
// Implementation: src/builder/stores/utils/elementRemoval.ts
await removeElement(elementId);
```

**Element Creation:**

The `addElement` and `addComplexElement` functions follow a consistent triple-layer synchronization pattern:

1. **Memory state update** (immediate UI reflection)
2. **iframe postMessage** (preview synchronization)
3. **Supabase save** (async, failures don't break memory state)
4. **order_num reordering** (automatic sequencing)

**Element Update:**

Two update methods with different scopes:
- **`updateElementProps`** - Updates only the `props` field, triggers history tracking
- **`updateElement`** - Updates any element fields (`props`, `dataBinding`, etc.)

Both methods update memory state first, track changes in history, and delegate iframe/DB sync to external callers (prevents infinite loops).

**Element Removal:**

The `removeElement` function handles complex cascade logic:
- Recursively removes all child elements
- **Table Column/Cell sync:** Deleting a Column removes all related Cells; deleting a Cell removes the Column
- **Tab/Panel pairs:** Deleting a Tab removes its paired Panel (matched by `tabId`)
- **Collection items:** Defers order_num reordering until after undo to prevent visual jumps
- Triple-layer sync: memory → iframe → Supabase

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

## AI Coding Assistant Guidelines

### Core Principles for All AI Assistants

**Critical Rules:**
1. NO inline Tailwind classes in .tsx files - use semantic classes with tv()
2. NO @apply directive - Tailwind v4 doesn't support it
3. All CSS in src/builder/components/styles/ with @layer components
4. Use CSS variables (--text-sm, --spacing-4, --color-primary-600, etc.)
5. Follow React Aria className conventions (react-aria-*)

**Key Patterns:**
- **Store modules**: Use factory pattern with `createAction(set, get)`
- **Element updates**: Use `addElement()`, `addComplexElement()`, `updateElementProps()`, `updateElement()`, `removeElement()`
- **Collection components**: Support Static and API Collection modes
- **Initial creation**: Only 1 child item as template (Select: 1 SelectItem, ComboBox: 1 ComboBoxItem)
- **ComboBox filtering**: Calculate textValue from visible Field values
- **TagGroup removal**: Use removedItemIds array for non-destructive item tracking
- **Field component**: Type-aware data display with react-aria-DataField className
- **ItemEditor**: Detect Field children, Edit button → setSelectedElement() to navigate to FieldEditor

### Common Anti-Patterns to Reject

❌ **Inline Tailwind in TSX:**
```tsx
<div className="flex items-center gap-4 px-6">  // REJECT THIS
```

❌ **@apply in CSS:**
```css
.button {
  @apply px-4 py-2 bg-blue-500;  // REJECT - Not supported in Tailwind v4
}
```

❌ **BEM naming for React Aria components:**
```tsx
<ComboBox className="property-input__combobox">  // REJECT - Use react-aria-ComboBox
```

❌ **Hardcoded colors/sizes:**
```css
.component {
  color: #3b82f6;        // REJECT - Use var(--color-primary-600)
  padding: 16px;         // REJECT - Use var(--spacing-4)
}
```

❌ **Direct Zustand set/get in store files without factory pattern:**
```tsx
// REJECT - Missing factory pattern
export const elementStore = create((set, get) => ({
  addElement: async (element) => { /* ... */ }
}));
```

### Quick Reference for AI Assistants

| Task | Correct Approach | File Location |
|------|------------------|---------------|
| Add component styles | Create/edit in `styles/` with `@layer components` | `src/builder/components/styles/` |
| Style component in TSX | Use `tv()` with semantic class names | Import from `tailwind-variants` |
| Create store action | Factory pattern with `createAction(set, get)` | `src/builder/stores/utils/` |
| Update element | Use `updateElementProps()` or `updateElement()` | From Zustand store |
| Add CSS value | Use CSS variable `var(--token-name)` | Defined in `theme.css` |
| Name React Aria class | Use `react-aria-ComponentName` prefix | Follow existing patterns |
| Add DataBinding to component | Add `dataBinding?: DataBinding` prop, implement useState/useEffect | Component file (see `ListBox.tsx`, `Select.tsx`, `Tree.tsx`) |
| Pass DataBinding in renderer | Add `dataBinding={element.dataBinding}` prop | Renderer file in `src/builder/preview/renderers/` |
| Test with mock data | Use `baseUrl: "MOCK_DATA"` with available endpoints | See `src/services/api/index.ts` |
| Display dynamic data in Collection | Use Field component inside ListBoxItem/GridListItem/MenuItem | `src/builder/components/Field.tsx` |
| Add Field management to ItemEditor | Detect Field children, Edit → setSelectedElement() | Follow `ListBoxItemEditor.tsx` pattern |
| Edit Field properties | Click Edit button → Navigate to FieldEditor (reuse, NO custom UI) | Field auto-selected in Layer Tree + Inspector |
| Add ComboBox filtering | Calculate textValue from visible Field values, join with spaces | `SelectionRenderers.tsx:719-741` |
| Create initial component | Only 1 child item as template | `SelectionComponents.ts` |
| Implement TagGroup removal | Use `removedItemIds` array to track hidden items non-destructively | `TagGroup.tsx:131-151`, `CollectionRenderers.tsx:321-365` |
| Restore removed TagGroup items | Inspector button: `updateProp('removedItemIds', [])` | `TagGroupEditor.tsx:197-214` |

### For Cursor AI

When using Cursor, reference this file with `@CLAUDE.md`. Key commands:
- Check `styles/` folder before creating CSS
- Follow factory pattern from existing modules in `src/builder/stores/utils/`
- Check existing implementations: `ListBox.tsx`, `Select.tsx`, `Tree.tsx`, `ListBoxItemEditor.tsx`

### For GitHub Copilot

Copilot learns from code patterns. Tips:
1. **Start with imports:** Write imports first, Copilot will suggest matching patterns
2. **Comment your intent:** Add comments before code blocks
3. **Use consistent naming:** `ComponentName.css` in styles/, `elementAction.ts`, `createActionName(set, get)`
4. **CSS Variables:** Start typing `var(--` and Copilot will suggest available tokens

---

## 🚧 Component Migration Status (Phase 0 - In Progress)

### ✅ Completed (2025-11-07)

**Phase 0.1: Semantic Tokens** ✅
- 50+ semantic tokens already exist in `src/builder/components/theme.css`
- Fallback pattern: `var(--semantic-name, var(--palette-fallback))`
- Example: `--button-primary-bg: var(--color-button-primary-bg, var(--color-primary-600))`

**Phase 0.2: Component Variant Types** ✅
- Created: `src/types/componentVariants.ts` (197 lines)
- Button.tsx updated to use `ButtonVariant` and `ComponentSize`
- Type guards and conversion utilities included

**Phase 0.4: Inspector Property Components** ✅
- 9 Property components created in `src/builder/inspector/components/`
- Events Tab refactored (commit 2114448)
- Pattern: PropertyInput, PropertySelect, PropertyCheckbox

**Phase 1: Component TSX Refactoring** ✅
- Phase 1.1: Card.tsx - tv() pattern, shared types, removed anti-patterns
- Phase 1.2: Panel.tsx - tv() pattern, PanelVariant type
- Both use `tv()` + `composeRenderProps`, removed manual className concatenation

**Phase 2: Button.css Semantic Token Migration** ✅
- Phase 2.1: Added 14 Action tokens to theme.css (Light + Dark modes)
- Phase 2.2: Replaced 8 palette references in Button.css with semantic tokens
- Phase 2.3: Renamed `--button-*` → `--action-*` for reusability
  - Action tokens used by: Button, Tag, Badge, MenuItem, Table ColumnGroup
  - Legacy `--button-*` aliases maintained (deprecated, v2.0 removal)

**Phase 3: Card Component Complete Migration** ✅
- Phase 3.1: CardEditor.tsx - Added Action variants (primary/secondary/surface), standardized sizes (sm/md/lg)
- Phase 3.2: Card.css - Added Action variant styles, fixed text color inheritance with `color: inherit`
- Phase 3.3: Card.stories.tsx - Updated variants and added Primary/Secondary/Surface stories
- Phase 3.4: componentVariants.ts - Updated CardVariant type with Action variants

**Phase 4: Action Token Hover/Pressed States** ✅
- Phase 4.1: Added 58 hover/pressed state tokens to theme.css (29 Light + 29 Dark)
  - Primary: `--action-primary-bg-hover`, `--action-primary-bg-pressed`, `--action-primary-border-hover`, `--action-primary-border-pressed`
  - Secondary: Same pattern with `--action-secondary-*`
  - Surface: Same pattern with `--action-surface-*`
  - Outline: Includes `bg-hover`, `bg-pressed`, `text-hover`, `border-hover`, `border-pressed`
  - Ghost: Includes `bg-hover`, `bg-pressed`, `text-hover`
- Phase 4.2: Button.css - Applied hover/pressed states to all variants using `[data-hovered]` and `[data-pressed]`
- Phase 4.3: Card.css - Applied hover/pressed states to primary/secondary/surface variants

**Phase 5: Separator Component Complete Migration** ✅
- Phase 5.1: Separator.tsx - Refactored to tv() pattern with composeRenderProps
- Phase 5.2: Separator.css - Updated from data-* attributes to semantic class names (.dashed, .dotted, .sm, .md, .lg)
- Phase 5.3: SeparatorEditor.tsx - Created Property Editor with variant/size/orientation controls
- Phase 5.4: Separator.stories.tsx - Created comprehensive Storybook stories with all variants
- Phase 5.5: labels.ts - Added SEPARATOR_VARIANT_* labels (Solid, Dashed, Dotted)

**Phase 6: Tag Component Action Token Migration** ✅
- Phase 6.1: TagGroup.tsx - Added variant and size props to Tag component (primary/secondary/surface, sm/md/lg)
- Phase 6.2: TagGroup.css - Applied Action tokens with hover/pressed states to all variants
- Phase 6.3: TagEditor.tsx - Added variant and size controls to Property Editor
- Phase 6.4: componentVariants.ts - Added TagVariant type with Action variants
- Phase 6.5: TagGroup.stories.tsx - Added variant and size showcase stories
- Phase 6.6: labels.ts - Added TAG_VARIANT_* labels

### 📋 Component Refactoring Checklist (Button Pattern)

When refactoring components, follow the **Button.tsx** pattern:

**1. Imports**
```typescript
import { tv } from "tailwind-variants";
import { composeRenderProps } from "react-aria-components";
import type { ButtonVariant, ComponentSize } from "../../types/componentVariants";
```

**2. Props Interface**
```typescript
export interface ComponentProps extends AriaComponentProps {
  variant?: ButtonVariant;  // Use shared types
  size?: ComponentSize;
}
```

**3. tv() Configuration**
```typescript
const component = tv({
  base: "react-aria-ComponentName",
  variants: {
    variant: {
      primary: "primary",    // Maps to CSS class
      secondary: "secondary",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },
  },
  defaultVariants: {
    size: "md",
  },
});
```

**4. Component Implementation**
```typescript
export function Component(props: ComponentProps) {
  return (
    <AriaComponent
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return component({
            ...renderProps,
            variant: props.variant,
            size: props.size,
            className,
          });
        }
      )}
    >
      {props.children}
    </AriaComponent>
  );
}
```

**5. CSS (styles/ComponentName.css)**
```css
@layer components {
  .react-aria-ComponentName {
    /* Base styles with semantic tokens */
    background: var(--button-background);
    color: var(--text-color);
  }

  .react-aria-ComponentName.primary {
    background: var(--button-primary-bg);
    color: var(--button-primary-text);
  }

  .react-aria-ComponentName.sm {
    padding: var(--spacing) var(--spacing-md);
    font-size: var(--text-sm);
  }
}
```

### ❌ Anti-Patterns to Avoid

**DON'T:**
```typescript
// ❌ Manual className concatenation
const variantClasses = { primary: "btn-primary" };
const className = `${baseClasses} ${variantClasses[variant]}`;

// ❌ Inline Tailwind classes
<button className="px-4 py-2 bg-blue-500">

// ❌ Palette variables in CSS
.button { background: var(--color-primary-600); }

// ❌ Non-standard size values
size?: "small" | "medium" | "large"  // Use ComponentSize instead
```

**DO:**
```typescript
// ✅ Use tv() from tailwind-variants
const button = tv({ variants: { ... } });

// ✅ Use semantic CSS classes
<button className={button({ variant: "primary" })}>

// ✅ Use semantic tokens in CSS
.button { background: var(--button-primary-bg); }

// ✅ Use shared types
size?: ComponentSize  // "xs" | "sm" | "md" | "lg" | "xl"
```

### 🔗 Reference Files

- **Gold Standard**: `src/builder/components/Button.tsx` (tv() pattern)
- **Type Definitions**: `src/types/componentVariants.ts`
- **CSS Architecture Guide**: `docs/CSS_ARCHITECTURE.md`
- **CSS Refactoring Summary**: `docs/CSS_REFACTORING_SUMMARY.md`

---

## 🎨 CSS Architecture & Theme System (Completed 2025-11-09)

### ✅ Major CSS Refactoring Achievements

**Duration:** 2 days (2025-11-07 to 2025-11-09)
**Status:** ✅ **Phase 0-4.7 Complete - Builder/Preview Full Isolation Achieved**

#### Key Accomplishments

**1. Theme System Isolation** ✅
- **Builder UI** and **Preview Components** completely separated
- Builder uses `--builder-*` tokens with independent dark mode `[data-builder-theme="dark"]`
- Preview uses `--action-*` tokens with user-controlled theme `[data-theme="dark"]`
- **Zero interference** - User theme changes don't affect Builder UI

**2. Zero Hardcoded Colors** ✅
- Removed **27 hardcoded colors** (#ffffff, #dc2626, rgba(...))
- Removed **320 palette variable references** from Builder files
- **100% CSS variables** throughout Builder system
- Full dark mode support for both Builder and Preview

**3. ITCSS Architecture** ✅
```
src/builder/styles/
├── index.css              # Master entry point
├── 1-theme/              # Design tokens (3 files)
│   ├── builder-system.css    # Builder UI tokens (160 lines)
│   ├── preview-system.css    # Preview tokens (511 lines)
│   └── shared-tokens.css     # Common tokens (151 lines)
├── 2-base/               # Base styles
├── 3-utilities/          # Utilities
├── 4-layout/             # Layouts
└── 5-modules/            # Modules
```

**4. CSS Layer Hierarchy** ✅
```css
@layer dashboard           # Lowest priority
@layer builder-system      # Builder UI (Header, Sidebar, Inspector, Footer)
@layer preview-system      # Preview Components
@layer shared-tokens       # Common tokens
@layer components          # React Aria Components (61 files)
@layer utilities           # Highest priority
```

**5. Complete Builder UI Independence** ✅
- **Phase 4.5:** Inspector palette variables removed (19 instances)
- **Phase 4.6:** All Builder files cleaned (301 palette variables removed)
- **Phase 4.7:** React Aria component overrides in Inspector (17 components, 327 lines)
- **Footer/Monitor:** Fully converted to Builder tokens (23 instances)

#### Results Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Hardcoded Colors** | 27 | **0** | **-100%** ✅ |
| **Builder Palette Vars** | 320 | **0** | **-100%** ✅ |
| **@layer Coverage** | 85% | **95%** | **+10%** ✅ |
| **Theme Files** | 1 (658 lines) | 3 (970 lines) | **Modular** ✅ |
| **Builder Tokens** | 35 | **70** | **+100%** ✅ |
| **CSS Conflicts** | 1 | **0** | **Fixed** ✅ |

#### Documentation

- **Architecture Guide:** [docs/CSS_ARCHITECTURE.md](docs/CSS_ARCHITECTURE.md) - ITCSS structure, theme system, best practices
- **Refactoring Summary:** [docs/CSS_REFACTORING_SUMMARY.md](docs/CSS_REFACTORING_SUMMARY.md) - Complete changelog and metrics
- **API Endpoints:** [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) - Mock Data API reference

#### Key Features

1. **Independent Dark Modes:**
   - Builder: `[data-builder-theme="dark"]`
   - Preview: `[data-theme="dark"]`

2. **Accessibility:**
   - Full `forced-colors` support
   - High contrast mode ready

3. **Performance:**
   - CSS import optimization (56% reduction: 170 → 74)
   - Dev server startup: 88ms
   - Zero CSS errors

4. **Maintainability:**
   - Modular theme files (3 separate files)
   - Clear layer hierarchy
   - Comprehensive documentation

---

**Remember:** This project prioritizes accessibility (React Aria), maintainability (CSS variables, semantic classes), and type safety (strict TypeScript). AI suggestions should align with these values.
