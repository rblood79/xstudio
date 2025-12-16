# CLAUDE.md

This file provides guidance to AI coding assistants (Claude Code, Cursor AI, GitHub Copilot) when working with code in this repository.

> **Note:** This document is optimized for Claude Code but also serves as guidelines for other AI assistants like Cursor AI and GitHub Copilot.

## Project Overview

XStudio is a web-based UI builder/design studio built with React 19, TypeScript, React Aria Components, Zustand, Tailwind v4, and Supabase. It enables users to create websites through an intuitive drag-and-drop interface with real-time preview.

**Key Features:**
- Drag-and-drop visual builder with dual canvas system (PixiJS WebGL + iframe Preview)
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
3. **Canvas** - Dual canvas system: PixiJS/WebGL for editing, iframe for preview
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

### Builder Canvas (PixiJS/WebGL)

> **Status:** ✅ Phase 1-8 Complete (2025-12-16) - **62 WebGL Components**

The builder uses a PixiJS/WebGL-based canvas for high-performance editing with Feature Flag toggle support.

**Location:** `src/builder/workspace/canvas/`

**Technology Stack:**
- `pixi.js` v8.14.3 - WebGL rendering
- `@pixi/react` v8.0.5 - React integration
- `@pixi/ui` v2.3.2 - UI components
- `yoga-layout` v3.2.1 - Flexbox layout engine

**Architecture:**
```
canvas/
├── BuilderCanvas.tsx              # Main entry (Yoga init, Application setup)
├── pixiSetup.ts                   # PIXI_COMPONENTS catalog + useExtend
├── canvasSync.ts                  # Zustand sync state management
├── layout/
│   ├── LayoutEngine.ts            # Yoga v3 Flexbox engine (455 lines)
│   └── GridLayout.tsx             # CSS Grid manual implementation
├── sprites/
│   ├── ElementSprite.tsx          # Element type router/dispatcher (62 component types)
│   ├── BoxSprite.tsx              # Container rendering + borderStyle
│   ├── TextSprite.tsx             # Text + decoration/transform
│   ├── ImageSprite.tsx            # Image + loading states
│   ├── styleConverter.ts          # CSS → PixiJS style conversion
│   └── paddingUtils.ts            # Padding parsing utilities
├── ui/                            # 62 WebGL component wrappers
│   ├── PixiButton.tsx             # Button component
│   ├── PixiSlider.tsx             # Slider component
│   ├── PixiInput.tsx              # Input component
│   ├── PixiSelect.tsx             # Select component
│   └── ... (58 more - see Component List below)
├── selection/                     # Selection system
│   ├── SelectionLayer.tsx
│   └── LassoSelection.tsx
├── viewport/                      # Pan/Zoom control
│   ├── useViewportControl.ts
│   └── ViewportControlBridge.tsx
└── grid/, layers/, utils/
```

**Feature Flag:**
```bash
# .env.local
VITE_USE_WEBGL_CANVAS=true   # Enable PixiJS canvas
VITE_USE_WEBGL_CANVAS=false  # Use iframe canvas (default)
```

**Rendering Pipeline:**
```
BuilderCanvas.tsx
  │
  ├─→ initYoga()                    (Yoga WASM initialization)
  │
  ├─→ calculateLayout()             (Flexbox layout calculation)
  │   └─→ Yoga.Node tree build
  │   └─→ calculateLayout() call
  │   └─→ positions Map return
  │
  ├─→ ElementsLayer                 (Element rendering)
  │   └─→ ElementSprite (per element)
  │       └─→ BoxSprite / TextSprite / ImageSprite / PixiButton / ...
  │
  ├─→ SelectionLayer                (Selection UI)
  │   └─→ SelectionBox + ResizeHandles
  │
  └─→ TextEditOverlay (HTML)        (Text editing)
```

**Supported CSS Properties (via Yoga):**
- **Display:** `flex`, `grid` (manual), `position: absolute`
- **Sizing:** `width`, `height`, `min/maxWidth`, `min/maxHeight`
- **Spacing:** `margin*`, `padding*`, `gap`, `rowGap`, `columnGap`
- **Flexbox:** `flexDirection`, `flexWrap`, `justifyContent`, `alignItems`, `alignContent`
- **Border:** `borderRadius`, `borderWidth`, `borderColor`, `borderStyle` (solid/dashed/dotted/double)
- **Text:** `fontStyle`, `letterSpacing`, `lineHeight`, `textDecoration`, `textTransform`

**WebGL Components (62 total):**

| Phase | Components | Count |
|-------|------------|-------|
| **Base** | Button, FancyButton, Checkbox, CheckboxGroup, CheckboxItem, Radio, RadioItem, Slider, Input, Select, ProgressBar, Switcher, ScrollBox, List, MaskedFrame | 15 |
| **P1** | ToggleButton, ToggleButtonGroup, ListBox, Badge, Meter | 5 |
| **P2** | Separator, Link, Breadcrumbs, Card, Menu, Tabs | 6 |
| **P3** | NumberField, SearchField, ComboBox | 3 |
| **P4** | GridList, TagGroup, Tree, Table | 4 |
| **P5** | Disclosure, DisclosureGroup, Tooltip, Popover, Dialog | 5 |
| **P6** | ColorSwatch, ColorSlider, TimeField, DateField, ColorArea, Calendar, ColorWheel, DatePicker, ColorPicker, DateRangePicker | 10 |
| **P7** | TextField, Switch, TextArea, Form, Toolbar, FileTrigger, DropZone, Skeleton | 8 |
| **P8** | Toast, Pagination, ColorField, ColorSwatchPicker, Group, Slot | 6 |

**Group Component Pattern (CheckboxGroup/RadioGroup):**
- Parent component (PixiCheckboxGroup/PixiRadio) handles visual rendering
- Child items (PixiCheckboxItem/PixiRadioItem) render as transparent hit areas for selection
- LayoutEngine calculates child positions via `calculateCheckboxItemPositions()`/`calculateRadioItemPositions()`
- Selected state reads from: group props → child item `isSelected`/`checked` → options `checked`

**Key Implementation Patterns:**

1. **Yoga Integration:**
```typescript
// LayoutEngine.ts
import { loadYoga } from 'yoga-layout/load';
import { setYoga } from '@pixi/layout';

export async function initYoga(): Promise<YogaInstance> {
  const yogaInstance = await loadYoga();
  setYoga(yogaInstance);  // For @pixi/layout
  return yogaInstance;
}
```

2. **Padding Utilities:**
```typescript
// paddingUtils.ts
parsePadding(style)           // CSS shorthand → {top, right, bottom, left}
getContentBounds(w, h, pad)   // Container → content area
```

3. **@pixi/ui Imperative Pattern:**
```typescript
// Use imperative API (not JSX) for @pixi/ui components
useEffect(() => {
  const button = new FancyButton({
    text: 'Click',
    defaultView: createBackground(),
  });
  containerRef.current?.addChild(button);
  return () => containerRef.current?.removeChild(button);
}, []);
```

**Completed Phases:**
| Phase | Description | Status |
|-------|-------------|--------|
| P1 | camelCase event handlers | ✅ |
| P2 | extend() centralization | ✅ |
| P3 | Graphics fill()/stroke() order | ✅ |
| P4 | useExtend hook | ✅ |
| P5-P6 | @pixi/ui 15 base components | ✅ |
| P7.1-P7.7 | Typography & spacing styles | ✅ |
| P7.8 | Yoga v3.2.1 layout engine | ✅ |
| P7.9 | borderStyle (dashed/dotted/double) | ✅ |
| **WebGL Migration Phases:** | | |
| Phase 1 | ToggleButton, ToggleButtonGroup, ListBox, Badge, Meter (5) | ✅ |
| Phase 2 | Separator, Link, Breadcrumbs, Card, Menu, Tabs (6) | ✅ |
| Phase 3 | NumberField, SearchField, ComboBox (3) | ✅ |
| Phase 4 | GridList, TagGroup, Tree, Table (4) | ✅ |
| Phase 5 | Disclosure, DisclosureGroup, Tooltip, Popover, Dialog (5) | ✅ |
| Phase 6 | Date/Color Components - 10 components | ✅ |
| Phase 7 | Form & Utility Components - 8 components | ✅ |
| Phase 8 | Notification & Color Utility - 6 components | ✅ |

### Preview Runtime (iframe)

The canvas runs in an isolated srcdoc iframe with its own React application (`src/canvas/index.tsx`):

- **Independent Zustand store** (`runtimeStore`) - completely separate from Builder state
- Receives element updates via `postMessage` with origin validation
- Queues messages until `CANVAS_READY` state
- Renders React Aria Components dynamically based on element tree
- Handles component-specific rendering (Tabs, Tables, Collections, etc.)
- **Collects computed styles** from DOM elements and sends to Inspector
- **CanvasRouter** - MemoryRouter-based internal routing for page navigation

**Key Files:**
- `src/canvas/index.tsx` - Canvas runtime entry point
- `src/canvas/store/runtimeStore.ts` - Independent Zustand store
- `src/canvas/router/CanvasRouter.tsx` - MemoryRouter-based routing
- `src/canvas/App.tsx` - Canvas React application

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

#### Style Panel Components

**Location**: `src/builder/panels/`

**PropertyUnitInput** (`src/builder/panels/common/PropertyUnitInput.tsx`)

Unified input component for CSS values with unit selection (px, %, rem, em, vh, vw).

**Key Features:**
- **Shorthand Parsing** - Handles CSS shorthand values like `"8px 12px"` by extracting first value
- **Smart Change Detection** - Compares parsed numeric value and unit, not string representation
- **Unit Dropdown** - ComboBox with unit selection and keyword support (auto, inherit, reset)
- **Keyboard Support** - Arrow up/down with Shift for 10x increment
- **Focus Optimization** - Prevents unnecessary onChange calls on focus in/out

**Shorthand Value Handling:**
```typescript
// CSS shorthand like "8px 12px 8px 12px" → extracts first value "8px"
const firstValue = trimmed.split(/\s+/)[0];

// Change detection compares parsed values, not strings
// This prevents overwriting mixed values on blur without actual changes
const originalParsed = parseUnitValue(value); // "8px 12px" → {numericValue: 8, unit: "px"}
const valueActuallyChanged =
  originalParsed.numericValue !== num || originalParsed.unit !== unit;
```

**LayoutSection** (`src/builder/panels/styles/sections/LayoutSection.tsx`)

Figma-style expandable layout editor with flex direction, alignment, gap, padding, and margin controls.

**Key Features:**
- **Flex Direction Controls** - Block/Row/Column with visual toggle buttons
- **3x3 Alignment Grid** - Combined justifyContent + alignItems control
- **Justify Content Spacing** - space-around, space-between, space-evenly options
- **Expandable Spacing** - Figma-style single value ↔ 4-direction individual inputs

**Expandable Spacing Pattern:**
```typescript
// Collapsed mode: single input for uniform padding/margin
<PropertyUnitInput
  value={paddingValues.displayValue}
  onChange={(value) => updateSpacingAll('padding', value)}
/>

// Expanded mode: 4-direction individual inputs (T/R/B/L)
<PropertyUnitInput label="T" value={paddingValues.top} onChange={...} />
<PropertyUnitInput label="R" value={paddingValues.right} onChange={...} />
<PropertyUnitInput label="B" value={paddingValues.bottom} onChange={...} />
<PropertyUnitInput label="L" value={paddingValues.left} onChange={...} />
```

**Mixed Value Detection:**
```typescript
function get4DirectionValues(element, prefix: 'padding' | 'margin') {
  const top = getStyleValue(element, `${prefix}Top`, '0px');
  const right = getStyleValue(element, `${prefix}Right`, '0px');
  const bottom = getStyleValue(element, `${prefix}Bottom`, '0px');
  const left = getStyleValue(element, `${prefix}Left`, '0px');

  // Mixed = not all values are equal
  const isMixed = !(top === right && right === bottom && bottom === left);

  return { top, right, bottom, left, isMixed, displayValue: isMixed ? shorthand : top };
}
```

**CSS Classes** (`src/builder/panels/common/index.css`):
- `.layout-spacing` - Main container with expand/collapse
- `.spacing-header` - Header with title and chevron toggle button
- `.spacing-4way` - Fieldset for each property (padding/margin)
- `.spacing-4way-grid` - CSS Grid for T/R/B/L positioning

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

### Monitor Panel (Bottom Panel)

> **Status**: 🔄 Rebuilding (2025-01) - 기존 footer monitor 시스템을 Panel 시스템 기반으로 재구축 중

경량 메모리 모니터링 패널 (패널 시스템 통합)

**Location**: `src/builder/panels/monitor/` (구현 예정)

**Features**:
- Memory usage monitoring (메모리 사용량 추적)
- SVG 기반 Mini chart visualization
- RequestIdleCallback 기반 수집 (퍼포먼스 영향 최소화)
- Bottom Panel Slot 통합 (resize 지원)

**Implementation Plan**: See `docs/MONITOR_PANEL_REDESIGN.md`

### Event System (Inspector Events Tab)

The Event System enables visual programming through a drag-and-drop event handler and action configuration interface.

**Status**: ✅ Phase 1-5 Complete (2025-12-08)

**Locations**:
- `src/builder/inspector/events/` - Legacy event editor and action editors
- `src/builder/panels/events/` - **NEW** Block-based Events Panel UI
- `src/builder/events/` - Shared event components (pickers, actions)

**Architecture**:
- **React Stately**: useListData-based state management for handlers and actions
- **Block-based UI**: WHEN → IF → THEN/ELSE visual pattern (Phase 5)
- **Three View Modes**: List (editing), Simple Flow (visualization), ReactFlow (advanced diagram)
- **Type System**: Inspector-specific types (camelCase) with EventEngine compatibility (snake_case)

#### Phase Completion Summary

**Phase 1: React Stately Foundation** ✅
- `useEventHandlers.ts` - Event handler list management with useListData
- `useActions.ts` - Action list management with useListData
- `useEventSelection.ts` - Handler selection state management

**Phase 2: Type System Unification** ✅
- Inspector types: `config` field, `event` field (camelCase)
- EventEngine: Dual-field support (`config` OR `value`, camelCase + snake_case)
- Fixed type mismatches causing data loss

**Phase 3: UI Components** ✅
- EventSection.tsx - Main event management UI with 2-level initial mount detection
- EventHandlerManager.tsx - Handler details and actions view
- ViewModeToggle.tsx - Three mode switcher
- ActionListView.tsx - List mode action editing

**Phase 4: Visual Modes** ✅
- SimpleFlowView.tsx - Simple flow diagram
- ReactFlowCanvas.tsx - Advanced ReactFlow-based diagram
- TriggerNode.tsx - Event trigger visualization
- ActionNode.tsx - Action visualization
- FlowConnector.tsx - Connection logic

**Phase 5: Block-Based UI & Data Persistence** ✅
- Block-based visual editor: WHEN → IF → THEN/ELSE pattern
- WhenBlock, IfBlock, ThenElseBlock components
- BlockActionEditor for unified action configuration
- Fixed data deletion on re-entry (initial mount detection)
- Fixed actions disappearing on handler click (removed dependency)
- Component remounting via key prop for clean state
- JSON comparison for actual content change detection
- Navigate action path normalization (auto "/" prefix)
- EventEngine warning for disabled actions

#### Key Architectural Decisions

**1. Component Remounting**
```typescript
// Force clean remount when element changes
<EventSection key={selectedElement.id} element={selectedElement} />
```

**2. Two-Level Initial Mount Detection**
```typescript
// Element level - prevent handlers from overwriting DB data
const isInitialMount = useRef(true);
useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    handlersJsonRef.current = JSON.stringify(handlers);
    return; // Skip first update
  }
  if (JSON.stringify(handlers) !== handlersJsonRef.current) {
    updateEvents(handlers);
  }
}, [handlers]);

// Handler level - prevent actions from overwriting when selected
const isInitialActionMount = useRef(true);
useEffect(() => {
  if (currentHandlerId !== lastSelectedHandlerIdRef.current) {
    isInitialActionMount.current = true; // Reset on handler change
  }
}, [selectedHandler?.id]);
```

**3. No Functions in Updates (postMessage Safety)**
```typescript
// ❌ WRONG - Functions can't be serialized
list.update(id, (old) => ({ ...old, ...updates }));

// ✅ CORRECT - Pass objects directly
const current = list.getItem(id);
if (current) {
  list.update(id, { ...current, ...updates } as EventHandler);
}
```

**4. Dual Field Support (EventEngine)**
```typescript
// Support both Inspector (config) and legacy (value) fields
const actionData = action as {
  config?: Record<string, unknown>;
  value?: Record<string, unknown>
};
const config = (actionData.config || actionData.value || {}) as ActionConfig;
```

**5. Path Normalization (Navigate Action)**
```typescript
// NavigateActionEditor - Always normalize path with "/" prefix
function normalizePath(path: string): string {
  if (!path) return '/';
  const trimmed = path.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

// BuilderCore - Normalize both path and slug for comparison
const normalizedPath = path.startsWith('/') ? path : `/${path}`;
const normalizedSlug = pageSlug.startsWith('/') ? pageSlug : `/${pageSlug}`;
return normalizedSlug === normalizedPath;
```

#### Event System Files

**State Management**:
- `src/builder/inspector/events/state/useEventHandlers.ts` - Handler CRUD with useListData
- `src/builder/inspector/events/state/useActions.ts` - Action CRUD with useListData
- `src/builder/inspector/events/state/useEventSelection.ts` - Selection state

**UI Components**:
- `src/builder/inspector/sections/EventSection.tsx` - Main UI with initial mount detection
- `src/builder/inspector/events/EventEditor.tsx` - Legacy event editor
- `src/builder/inspector/events/EventList.tsx` - Event list view

**Block-Based UI (Events Panel)**: `src/builder/panels/events/`
- `EventsPanel.tsx` - Main panel with block-based UI, WHEN → IF → THEN/ELSE pattern
- `blocks/WhenBlock.tsx` - Event trigger block (onClick, onChange, etc.)
- `blocks/IfBlock.tsx` - Conditional execution block with ConditionGroup editor
- `blocks/ThenElseBlock.tsx` - Action execution blocks with add/edit/delete
- `editors/BlockActionEditor.tsx` - Unified action config editor for all 21 action types

**Shared Event Components**: `src/builder/events/`
- `actions/NavigateActionEditor.tsx` - Page navigation with path normalization (auto "/" prefix)
- `pickers/EventTypePicker.tsx` - Event type selection (DialogTrigger + Popover + ListBox)
- `pickers/ActionTypePicker.tsx` - Action type selection with categories
- `components/DebounceThrottleEditor.tsx` - Timing controls for handlers
- `state/useEventHandlers.ts` - Handler list management with useListData
- `state/useActions.ts` - Action list management with useListData
- `state/useEventSelection.ts` - Handler selection state
- `types/eventTypes.ts` - Event type definitions
- `types/eventBlockTypes.ts` - Block UI type definitions
- `utils/normalizeEventTypes.ts` - snake_case → camelCase normalization

**Action Editors** (21 editors):
- `src/builder/inspector/events/actions/ActionEditor.tsx` - Base action editor wrapper
- `src/builder/inspector/events/actions/CustomFunctionActionEditor.tsx` - Code editor with Monaco
- `src/builder/inspector/events/actions/SetStateActionEditor.tsx` - Global state updates
- `src/builder/inspector/events/actions/SetComponentStateActionEditor.tsx` - Component-specific state
- `src/builder/inspector/events/actions/UpdateStateActionEditor.tsx` - State modifications
- `src/builder/inspector/events/actions/NavigateActionEditor.tsx` - Page navigation (legacy, use shared)
- `src/builder/inspector/events/actions/ShowModalActionEditor.tsx` - Modal show control
- `src/builder/inspector/events/actions/HideModalActionEditor.tsx` - Modal hide control
- `src/builder/inspector/events/actions/ShowToastActionEditor.tsx` - Toast notifications
- `src/builder/inspector/events/actions/APICallActionEditor.tsx` - REST API requests
- `src/builder/inspector/events/actions/ValidateFormActionEditor.tsx` - Form validation
- `src/builder/inspector/events/actions/SubmitFormActionEditor.tsx` - Form submission
- `src/builder/inspector/events/actions/ResetFormActionEditor.tsx` - Form reset
- `src/builder/inspector/events/actions/UpdateFormFieldActionEditor.tsx` - Field updates
- `src/builder/inspector/events/actions/FilterCollectionActionEditor.tsx` - Data filtering
- `src/builder/inspector/events/actions/SelectItemActionEditor.tsx` - Item selection
- `src/builder/inspector/events/actions/ClearSelectionActionEditor.tsx` - Clear selections
- `src/builder/inspector/events/actions/ScrollToActionEditor.tsx` - Scroll control
- `src/builder/inspector/events/actions/ToggleVisibilityActionEditor.tsx` - Show/hide elements
- `src/builder/inspector/events/actions/TriggerComponentActionEditor.tsx` - Component triggers
- `src/builder/inspector/events/actions/CopyToClipboardActionEditor.tsx` - Clipboard operations

**Event Components**:
- `src/builder/inspector/events/components/EventHandlerManager.tsx` - Handler details view
- `src/builder/inspector/events/components/ActionListView.tsx` - List mode action editing
- `src/builder/inspector/events/components/ViewModeToggle.tsx` - Mode switcher (List/Simple/ReactFlow)
- `src/builder/inspector/events/components/ConditionEditor.tsx` - Conditional execution
- `src/builder/inspector/events/components/DebounceThrottleEditor.tsx` - Timing controls
- `src/builder/inspector/events/components/ActionDelayEditor.tsx` - Action delay settings
- `src/builder/inspector/events/components/ComponentSelector.tsx` - Component selection UI
- `src/builder/inspector/events/components/ExecutionDebugger.tsx` - Runtime debugging

**Visual Mode Components**:
- `src/builder/inspector/events/components/visualMode/SimpleFlowView.tsx` - Simple flow diagram
- `src/builder/inspector/events/components/visualMode/ReactFlowCanvas.tsx` - ReactFlow diagram
- `src/builder/inspector/events/components/visualMode/TriggerNode.tsx` - Event trigger node
- `src/builder/inspector/events/components/visualMode/ActionNode.tsx` - Action node
- `src/builder/inspector/events/components/visualMode/FlowNode.tsx` - Base flow node
- `src/builder/inspector/events/components/visualMode/FlowConnector.tsx` - Connection logic

**Pickers**:
- `src/builder/inspector/events/pickers/EventTypePicker.tsx` - Event type selection
- `src/builder/inspector/events/pickers/ActionTypePicker.tsx` - Action type selection with categories

**Data & Metadata**:
- `src/builder/inspector/events/data/actionMetadata.ts` - Action type metadata
- `src/builder/inspector/events/data/eventCategories.ts` - Event categorization
- `src/builder/inspector/events/data/eventTemplates.ts` - Pre-built event templates
- `src/builder/inspector/events/data/index.ts` - Data exports

**Execution Engine**:
- `src/builder/inspector/events/execution/eventExecutor.ts` - Event execution orchestration
- `src/builder/inspector/events/execution/conditionEvaluator.ts` - Condition evaluation
- `src/builder/inspector/events/execution/executionLogger.ts` - Execution logging

**Hooks**:
- `src/builder/inspector/events/hooks/useEventFlow.tsx` - Flow diagram state management
- `src/builder/inspector/events/hooks/useApplyTemplate.ts` - Template application
- `src/builder/inspector/events/hooks/useCopyPasteActions.ts` - Action copy/paste
- `src/builder/inspector/events/hooks/useEventSearch.ts` - Event search functionality
- `src/builder/inspector/events/hooks/useRecommendedEvents.ts` - AI-based recommendations

**Utilities**:
- `src/builder/inspector/events/utils/actionHelpers.ts` - Action utility functions

**Types**:
- `src/builder/inspector/events/types/eventTypes.ts` - Event type definitions
- `src/builder/inspector/events/types/templateTypes.ts` - Template type definitions
- `src/builder/inspector/events/types/index.ts` - Type exports
- `src/types/events.ts` - Global types (snake_case, backward compatibility)

**Event Engine** (Preview):
- `src/utils/eventEngine.ts` - Event execution engine with dual-field support
  - `getActionConfig<T>()` - Type-safe config extraction helper
  - Warning logs for disabled actions (`enabled: false`)
  - Navigate action sends `NAVIGATE_TO_PAGE` postMessage to Builder
- `src/builder/main/BuilderCore.tsx` - Handles `NAVIGATE_TO_PAGE` message
  - Bidirectional path/slug normalization (handles "/" prefix)

#### Key Features

**1. Event Templates**
Pre-built event patterns for common use cases:
- Form submission with validation
- API call with loading states
- Multi-step workflows
- Data filtering and sorting
- Component state synchronization

**2. Conditional Execution**
```typescript
// Handler-level condition (applies to all actions)
handler.condition = "state.isAuthenticated === true";

// Action-level condition (individual action)
action.condition = "response.status === 200";
```

**3. Timing Controls**
- **Debounce**: Delay execution until input stops (e.g., search-as-you-type)
- **Throttle**: Limit execution frequency (e.g., scroll events)
- **Delay**: Add delay before action execution

**4. Visual Flow Modes**
- **List Mode**: Traditional action list editing with drag-drop reordering
- **Simple Flow**: Simplified flow diagram for quick visualization
- **ReactFlow Mode**: Advanced flow diagram with complex branching

**5. Action Categories**
- **State Management**: setState, updateState, setComponentState
- **Navigation**: navigate, scrollTo
- **UI Control**: showModal, hideModal, showToast, toggleVisibility
- **Form Actions**: submitForm, validateForm, resetForm, updateFormField
- **Data Operations**: apiCall, filterCollection, selectItem, clearSelection
- **Component Actions**: triggerComponent
- **Utilities**: customFunction, copyToClipboard

**6. Execution Debugging**
- Real-time execution logging
- Condition evaluation results
- Action success/failure tracking
- Performance metrics

**7. Copy/Paste Actions**
- Copy single or multiple actions
- Paste across different handlers
- Preserve action configuration

**8. Event Search**
- Search by event type
- Search by action type
- Search by condition
- Filter by enabled/disabled state

**9. Recommended Events**
AI-powered event recommendations based on:
- Component type
- Common patterns
- User behavior
- Best practices

#### Known Issues & Solutions

**Issue**: Custom function data not saving
**Solution**: Use Inspector types throughout, `config` field instead of `value`

**Issue**: Data deleted on re-entry
**Solution**: Initial mount detection with JSON comparison

**Issue**: Actions disappear on handler click
**Solution**: Remove `selectedHandler` from useEffect dependencies

**Issue**: postMessage DataCloneError
**Solution**: Pass objects directly to list.update(), no functions

**Issue**: Events stored in props.events, not element.events
**Solution**: Read from `(builderElement?.props as any)?.events`

### Events Panel (Block-based UI)

The Events Panel provides a visual block-based event editor inspired by Airtable and n8n.

**Status**: ✅ Phase 0-5 Complete (2025-12)

**Location**: `src/builder/panels/events/`

**Architecture**:
- **Block Pattern**: WHEN → IF → THEN/ELSE visual flow
- **Variable Binding**: `{{variable}}` syntax with autocomplete
- **Lazy Code Generation**: Performance-optimized JavaScript preview
- **Minimap**: SVG-based handler visualization

#### Phase Completion Summary

**Phase 0: Bug Fixes** ✅
- Fixed EventTypePicker rendering issues
- Fixed TypeScript compilation errors

**Phase 1: Type System + Block Components** ✅
- `eventBlockTypes.ts` - Block-based type definitions
- `WhenBlock.tsx` - Event trigger block
- `IfBlock.tsx` - Condition block with AND/OR logic
- `ActionBlock.tsx` - Individual action display

**Phase 2: Condition System + Search** ✅
- `ConditionRow.tsx` - Single condition editor
- `OperatorPicker.tsx` - Comparison operator selection
- `ElementPicker.tsx` - Element reference picker
- Event type search with ComboBox

**Phase 3: THEN/ELSE + DataTable Actions** ✅
- `ThenElseBlock.tsx` - Branch container with collapse
- `ActionList.tsx` - Action list with reorder buttons
- `BlockActionEditor.tsx` - Adapter for 21 action editors
- 3 new DataTable actions: loadDataTable, syncComponent, saveToDataTable

**Phase 4: Variable Binding + Validation** ✅
- `variableParser.ts` - `{{variable}}` syntax parser
- `VariableBindingEditor.tsx` - Editor with autocomplete
- `useVariableSchema.ts` - Schema for autocomplete (event, state, datatable)
- `bindingValidator.ts` - Validation with Levenshtein suggestions

**Phase 5: Preview + Debug** ✅
- `CodePreviewPanel.tsx` - Lazy JavaScript code generation
- `EventMinimap.tsx` - SVG visualization of handler flow
- `EventDebugger.tsx` - Inline test execution with step results

#### Key Files

**Block Components** (`src/builder/panels/events/blocks/`):
- `WhenBlock.tsx` - Event trigger (onClick, onChange, etc.)
- `IfBlock.tsx` - Condition group with AND/OR
- `ThenElseBlock.tsx` - Action branch container
- `ActionBlock.tsx` - Single action display
- `ActionList.tsx` - Reorderable action list
- `BlockConnector.tsx` - Visual connector between blocks

**Editor Components** (`src/builder/panels/events/editors/`):
- `ConditionRow.tsx` - Condition: left op right
- `OperatorToggle.tsx` - AND/OR toggle
- `OperatorPicker.tsx` - Comparison operators
- `ElementPicker.tsx` - Element ID picker
- `BlockActionEditor.tsx` - Action editor adapter
- `VariableBindingEditor.tsx` - Variable autocomplete

**Preview Components** (`src/builder/panels/events/preview/`):
- `CodePreviewPanel.tsx` - JavaScript code preview
- `EventMinimap.tsx` - Handler flow minimap
- `EventDebugger.tsx` - Test execution debugger

**Hooks** (`src/builder/events/hooks/`):
- `useVariableSchema.ts` - Variable schema provider
- `useEventSearch.ts` - Event/action search
- `useApplyTemplate.ts` - Template application
- `useCopyPasteActions.ts` - Action clipboard
- `useEventFlow.ts` - Flow diagram state

**Utils** (`src/builder/events/utils/`):
- `variableParser.ts` - `{{var}}` parsing
- `bindingValidator.ts` - Binding validation
- `normalizeEventTypes.ts` - Type normalization
- `actionHelpers.ts` - Action utilities

#### CSS Architecture

All styles in `src/builder/panels/events/EventsPanel.css` (~1870 lines):

**Block Colors**:
```css
--block-trigger-color: var(--color-blue-500);     /* WHEN */
--block-condition-color: var(--color-amber-500);  /* IF */
--block-success-color: var(--color-green-500);    /* THEN */
--block-fallback-color: var(--color-red-500);     /* ELSE */
```

**Key Class Patterns**:
- `.event-block` - Base block container
- `.event-block-header` - Block header with icon
- `.event-block-content` - Block body content
- `.block-connector` - Visual flow connector
- `.condition-row` - Single condition editor
- `.binding-editor` - Variable binding input
- `.debugger-step` - Test execution step

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

#### Common TypeScript Error Patterns & Solutions

**Updated: 2025-11-15** - Based on Phase 3 TypeScript error fixing (280 errors resolved)

**1. PropertyCustomId Component Pattern**

PropertyCustomId was refactored to manage customId internally via Inspector state. DO NOT pass onChange prop.

```typescript
// ❌ WRONG - onChange not accepted
const updateCustomId = (newCustomId: string) => {
  const updateElement = useStore.getState().updateElement;
  updateElement(elementId, { customId: newCustomId });
};

<PropertyCustomId
  label="ID"
  value={customId}
  elementId={elementId}
  onChange={updateCustomId}  // ❌ This prop doesn't exist
/>

// ✅ CORRECT - Component handles updates internally
const element = useStore((state) => state.elements.find((el) => el.id === elementId));
const customId = element?.customId || '';

<PropertyCustomId
  label="ID"
  value={customId}
  elementId={elementId}
  placeholder="component_1"
/>
```

**2. Page Type Separation (API vs Store)**

The project has two different Page types - use appropriate type in each context:

```typescript
// ❌ WRONG - Type confusion
import { Page } from '../../services/api/PagesApiService';
const storePage: Page = { name: 'Home', ... };  // Error: 'name' doesn't exist

// ✅ CORRECT - Use type aliases
import { Page as ApiPage } from '../../services/api/PagesApiService';
import type { Page } from '../../types/builder/unified.types';

// Convert ApiPage (title field) → store Page (name field)
const storePage: Page = {
  id: apiPage.id,
  name: apiPage.title,  // Convert title → name
  slug: apiPage.slug,
  parent_id: apiPage.parent_id,
  order_num: apiPage.order_num
};
```

**3. Component Size Type Migration**

Always use standard size types, NOT legacy size values:

```typescript
// ❌ WRONG - Legacy sizes
size={(props.size as "small" | "medium" | "large" | undefined) || "medium"}

// ✅ CORRECT - ComponentSizeSubset
import type { ComponentSizeSubset } from '../../types/builder/componentVariants.types';

size={(props.size as ComponentSizeSubset | undefined) || "md"}
// ComponentSizeSubset = "sm" | "md" | "lg"
```

**4. Delete Operator on Non-Optional Properties**

Use destructuring instead of delete operator:

```typescript
// ❌ WRONG - Delete operator on required property
const element = { id: '1', customId: 'foo', props: {} };
delete element.customId;  // Error: customId not optional

// ✅ CORRECT - Use destructuring
const { customId, ...elementRest } = element;
const elementForDB = { ...elementRest, custom_id: customId };
```

**5. Type Assertions for Incompatible Types**

Use double assertion via `unknown` when types are incompatible:

```typescript
// ❌ WRONG - Direct assertion fails
const events = (element.events as EventHandler[]);  // Error: ElementEvent[] → EventHandler[]

// ✅ CORRECT - Double assertion via unknown
const events = (element.events as unknown as EventHandler[]);
```

**6. Supabase Direct Insert Pattern**

ElementUtils.createChildElementWithParentCheck was deleted - use direct Supabase insert:

```typescript
// ❌ WRONG - Method deleted
const data = await ElementUtils.createChildElementWithParentCheck(newElement, pageId, parentId);

// ✅ CORRECT - Direct Supabase insert
import { supabase } from '../../lib/supabase';

const { data, error } = await supabase
  .from('elements')
  .insert(newElement)
  .select()
  .single();

if (error) throw error;
if (!data) throw new Error('Failed to create element');
addElement(data as Element);
```

**7. Optional Property Handling**

Always handle potentially undefined properties with optional chaining or fallbacks:

```typescript
// ❌ WRONG - Assumes property exists
const timestamp = new Date(token.updated_at).getTime();

// ✅ CORRECT - Provide fallback
const timestamp = new Date(token.updated_at || 0).getTime();

// ✅ CORRECT - Optional chaining
const parentTag = element.parent?.tag;
```

**8. DataBinding Type Conversions**

DataBinding type requires explicit conversions between Record<string, unknown>:

```typescript
// Building tree (Element → ElementTreeItem)
const treeItem: ElementTreeItem = {
  id: el.id,
  dataBinding: el.dataBinding as Record<string, unknown> | undefined,
  // ...
};

// Flattening tree (ElementTreeItem → Element)
const element: Element = {
  id: item.id,
  dataBinding: item.dataBinding as DataBinding | undefined,
  // ...
};
```

**9. Array Filter Type Assertions**

When filtering arrays with unknown types, assert type before filtering:

```typescript
// ❌ WRONG - Array type unknown
const lightVars = data.vars.filter((v) => !v.isDark);  // Error

// ✅ CORRECT - Assert array type first
const lightVars = (data.vars as { isDark?: boolean; name: string; value: string }[])
  .filter((v) => !v.isDark);
```

**10. Import Completeness**

Always import required types - don't assume they're in scope:

```typescript
// Common missing imports that cause errors:
import type { DesignToken, DataBinding } from '../../types/theme';
import { supabase } from '../../lib/supabase';
import type { Element } from '../../types/core/store.types';
```

### React & Zustand Performance (CRITICAL)

**Updated: 2025-11-17** - Critical performance rules to avoid unnecessary re-renders

#### Rule 1: Understand When Re-renders Are Necessary

**⚠️ CRITICAL MISCONCEPTION:** Not all re-renders are bad!

Many components **MUST re-render** to function correctly. Attempting to prevent necessary re-renders will break functionality.

**Example: PropertiesPanel**

```typescript
// ❌ WRONG - Trying to prevent necessary re-renders
export function PropertiesPanel() {
  // Subscribing only to id/type to "optimize"
  const selectedElementId = useInspectorState((state) => state.selectedElement?.id);
  const selectedElementType = useInspectorState((state) => state.selectedElement?.type);

  // Problem: When properties change, id/type don't change
  // Result: Editor doesn't receive updated props → BROKEN! ❌
}

// ✅ CORRECT - Accept necessary re-renders
export function PropertiesPanel() {
  // Subscribe to full selectedElement (includes properties)
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // When properties change, component re-renders
  // Editor receives new props → WORKS! ✅
  return <Editor currentProps={selectedElement.properties} />;
}
```

#### Rule 2: Optimize Child Components, Not Parents

If a parent component re-renders frequently, optimize **children** instead:

```typescript
// ✅ CORRECT - Optimize children with React.memo
const Editor = React.memo(function Editor({ elementId, currentProps, onUpdate }) {
  // Only re-renders if props actually change
  return <PropertyInputs />;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.elementId === nextProps.elementId &&
         JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps);
});

// Parent can re-render freely
export function PropertiesPanel() {
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // Re-renders on every property change (necessary!)
  // But Editor only re-renders if props actually changed
  return <Editor currentProps={selectedElement.properties} />;
}
```

#### Rule 3: Use Selector Pattern Correctly

**When to use selective subscriptions:**

```typescript
// ✅ GOOD - For truly independent state
const currentPageId = useStore((state) => state.currentPageId);
const multiSelectMode = useStore((state) => state.multiSelectMode);

// ✅ GOOD - For primitive values that change independently
const selectedElementId = useInspectorState((state) => state.selectedElement?.id);

// ❌ BAD - When child properties need to trigger updates
const selectedElement = useInspectorState((state) => state.selectedElement);
// Problem: If you only subscribe to id, property changes won't trigger re-render
```

#### Rule 4: Understand Store Update Patterns

**Zustand creates new objects on every update:**

```typescript
// In useInspectorState:
updateProperties: (properties) => {
  set((state) => ({
    selectedElement: {
      ...state.selectedElement,  // New object created!
      properties: {
        ...state.selectedElement.properties,
        ...properties,  // Properties merged
      },
    },
  }));
}

// Result: selectedElement reference changes every time
// This is NORMAL and NECESSARY for React to detect changes
```

#### Rule 5: When Optimization Is Appropriate

Only optimize when you have **actual performance problems**:

**Appropriate optimizations:**

```typescript
// ✅ GOOD - useCallback for stable function references
const handleUpdate = useCallback((props) => {
  updateProperties(props);
}, [updateProperties]);

// ✅ GOOD - useMemo for expensive computations
const sortedElements = useMemo(() => {
  return elements.sort((a, b) => a.order_num - b.order_num);
}, [elements]);

// ✅ GOOD - React.memo for expensive child components
const ExpensiveEditor = React.memo(PropertyEditor);

// ❌ BAD - Premature optimization breaking functionality
const selectedElement = useMemo(() => {
  // Trying to cache when cache should update on every property change
  return getState().selectedElement;
}, [selectedElementId]); // Missing properties dependency!
```

#### Rule 6: Debug Re-renders Before Optimizing

Add logging to understand re-render patterns:

```typescript
export function PropertiesPanel() {
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // Temporary debug logging
  if (import.meta.env.DEV) {
    console.log('🔄 PropertiesPanel render:', {
      elementId: selectedElement?.id,
      elementType: selectedElement?.type,
      // Log what changed
    });
  }

  // Now you can see:
  // - How often it re-renders
  // - What triggers re-renders
  // - If re-renders are necessary
}
```

#### Common Performance Anti-Patterns

**❌ ANTI-PATTERN 1: Over-optimization**
```typescript
// Breaking functionality to avoid re-renders
const id = useStore(state => state.selectedElement?.id);
const type = useStore(state => state.selectedElement?.type);
// Missing properties subscription → broken updates
```

**❌ ANTI-PATTERN 2: Premature Memoization**
```typescript
// Memoizing everything "just in case"
const value1 = useMemo(() => simpleValue, [simpleValue]);
const value2 = useMemo(() => anotherValue, [anotherValue]);
// useMemo overhead > benefit for simple values
```

**❌ ANTI-PATTERN 3: Wrong Dependency Arrays**
```typescript
const cached = useMemo(() => {
  return obj.property; // Uses obj.property
}, [obj.id]); // Only depends on obj.id
// Missing obj.property dependency → stale data
```

**✅ CORRECT PATTERN: Accept necessary re-renders**
```typescript
export function PropertiesPanel() {
  // Subscribe to what you need
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // Re-renders when selectedElement changes (GOOD!)
  // This is how React detects changes

  // Optimize children if needed
  return <Editor currentProps={selectedElement.properties} />;
}
```

#### Performance Checklist

Before optimizing re-renders:

- [ ] Is the component actually slow? (Use React DevTools Profiler)
- [ ] Are the re-renders necessary for correctness?
- [ ] Have you tried optimizing children instead?
- [ ] Are you breaking functionality with your optimization?
- [ ] Is the optimization complexity worth the benefit?

**Remember:** Premature optimization is the root of all evil. Functionality > Performance.

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

Collection components support dynamic data rendering using the **Item + Field** pattern and `useCollectionData` hook.

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

**All 13 Collection Components with DataBinding:**

| Component | useCollectionData | Field Support | Notes |
|-----------|-------------------|---------------|-------|
| **ListBox** | ✅ | ✅ Field children | Reference implementation |
| **GridList** | ✅ | ✅ Field children | Grid layout |
| **Select** | ✅ | ✅ Field children | Dropdown selection |
| **ComboBox** | ✅ | ✅ Field children + textValue | Auto-complete filtering |
| **Menu** | ✅ | ✅ Field children | Context menu |
| **TagGroup** | ✅ | ✅ Field children | removedItemIds tracking |
| **Tree** | ✅ | hierarchical data | Recursive rendering |
| **Table** | ✅ | Column/Cell mapping | Tabular data |
| **Tabs** | ✅ | dynamic Tab/TabPanel | Navigation |
| **Breadcrumbs** | ✅ | dynamic Breadcrumb | Navigation path |
| **RadioGroup** | ✅ | dynamic Radio | Single selection |
| **CheckboxGroup** | ✅ | dynamic Checkbox | Multiple selection |
| **ToggleButtonGroup** | ✅ | dynamic ToggleButton | Toggle selection |

**Initial Component Creation Pattern:**
All collection components create only **1 initial child item** as a template for dynamic data rendering. See `src/builder/factories/definitions/SelectionComponents.ts`.

#### PropertyDataBinding Format

Collection components support two DataBinding formats:

1. **PropertyDataBinding** (Inspector에서 설정): `{source: 'dataTable' | 'api', name: string}`
2. **DataBinding** (프로그래매틱): `{type: 'collection', source: 'static' | 'api' | 'supabase', config: {...}}`

**Detection Pattern (all 13 components use this):**
```typescript
const isPropertyBinding =
  dataBinding &&
  "source" in dataBinding &&
  "name" in dataBinding &&
  !("type" in dataBinding);

const hasDataBinding =
  (!isPropertyBinding &&
    dataBinding &&
    "type" in dataBinding &&
    dataBinding.type === "collection") ||
  isPropertyBinding;
```

**⚠️ Common Issue - `dataBinding.config` Access:**

PropertyDataBinding format doesn't have a `config` property. Always use optional chaining:

```typescript
// ❌ WRONG - Crashes when PropertyDataBinding format
const config = dataBinding.config as { columnMapping?: {...} };
const idField = config.columnMapping?.id || "id";

// ✅ CORRECT - Safe for both formats
const config = (dataBinding as { config?: Record<string, unknown> })?.config as {
  columnMapping?: { id: string; label: string };
} | undefined;
const idField = config?.columnMapping?.id || "id";
```

**Fixed in:** `Select.tsx:131-145`, `ComboBox.tsx:263-277`

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

### Canvas iframe Communication

**Always validate postMessage origins:**

```tsx
window.addEventListener('message', (event) => {
  // Validate origin in production
  if (event.data.type === 'YOUR_MESSAGE_TYPE') {
    // Handle message
  }
});
```

**Queue messages until canvas is ready:**

```tsx
if (!canvasReady) {
  messageQueue.push(message);
} else {
  window.parent.postMessage(message, '*');
}
```

**ACK-based Auto-Select System** (Page Navigation):

When a page is added/deleted/selected, the system uses an ACK-based pattern to ensure overlay displays correctly:

1. **Builder**: Registers auto-select request BEFORE updating elements
   ```tsx
   // usePageManager.ts
   if (bodyElement && requestAutoSelectAfterUpdate) {
     requestAutoSelectAfterUpdate(bodyElement.id); // 1️⃣ Register first
   }
   setElements(elementsData); // 2️⃣ Then update store
   ```

2. **Preview**: Sends ACK after receiving elements
   ```tsx
   // messageHandlers.ts
   setElements(elements);
   window.parent.postMessage({ type: "ELEMENTS_UPDATED_ACK" }, origin);
   ```

3. **Builder**: Receives ACK and sends overlay request
   ```tsx
   // useIframeMessenger.ts
   if (pendingAutoSelectElementId) {
     iframe.contentWindow.postMessage({
       type: "REQUEST_ELEMENT_SELECTION",
       elementId: pendingAutoSelectElementId,
     }, '*');
   }
   ```

4. **Preview**: Displays overlay (DOM-first approach for timing resilience)
   ```tsx
   // messageHandlers.ts - DOM first, then elements array
   const domElement = document.querySelector(`[data-element-id="${elementId}"]`);
   const element = elements.find(el => el.id === elementId); // May be outdated
   // Continue with domElement even if element not found in array
   ```

**Key Implementation Details**:
- Module-level `pendingAutoSelectElementId` shared across all `useIframeMessenger` instances
- DOM-first search prevents React state timing issues
- No setTimeout - purely ACK-driven for reliability

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

❌ **Zustand Grouped Selectors with Object Returns (CRITICAL - Causes Infinite Loops):**
```tsx
// REJECT - Creates new object reference every render → infinite loop
const settings = useStore((state) => ({
  showOverlay: state.showOverlay,
  showGrid: state.showGrid,
  snapToGrid: state.snapToGrid,
}));

// ✅ CORRECT - Individual selectors
const showOverlay = useStore((state) => state.showOverlay);
const showGrid = useStore((state) => state.showGrid);
const snapToGrid = useStore((state) => state.snapToGrid);
```
**ESLint Rule:** `local/no-zustand-grouped-selectors` (error)
**Reference:** See CHANGELOG.md "Anti-Patterns Discovered" and SettingsPanel.tsx refactoring

❌ **useShallow Wrapper with Zustand (CRITICAL - Also Causes Infinite Loops):**
```tsx
// REJECT - Selector function recreated every render → infinite loop
import { useShallow } from "zustand/react/shallow";

const settings = useStore(
  useShallow((state) => ({
    showOverlay: state.showOverlay,
    showGrid: state.showGrid,
  }))
);

// ✅ CORRECT - Individual selectors (same as above)
const showOverlay = useStore((state) => state.showOverlay);
const showGrid = useStore((state) => state.showGrid);
```
**ESLint Rule:** `local/no-zustand-use-shallow` (error)
**Reference:** See CHANGELOG.md "Anti-Patterns Discovered"

❌ **Manual Keyboard Event Listeners (Duplicate Code):**
```tsx
// REJECT - Duplicate code pattern
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey && event.shiftKey && event.key === 'c') {
      handleCopy();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleCopy]);

// ✅ CORRECT - Use declarative hook
import { useKeyboardShortcutsRegistry } from '../../hooks/useKeyboardShortcutsRegistry';

const shortcuts = useMemo(() => [
  { key: 'c', modifier: 'cmdShift', handler: handleCopy, description: 'Copy' },
  { key: 'v', modifier: 'cmdShift', handler: handlePaste, description: 'Paste' },
], [handleCopy, handlePaste]);

useKeyboardShortcutsRegistry(shortcuts, [handleCopy, handlePaste]);
```
**ESLint Rule:** `local/prefer-keyboard-shortcuts-registry` (warn)
**Reference:** See `src/builder/hooks/useKeyboardShortcutsRegistry.ts`

❌ **Manual Clipboard Operations (Duplicate Code):**
```tsx
// REJECT - Duplicate clipboard logic
const handleCopy = useCallback(async () => {
  try {
    const json = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(json);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}, [data]);

// ✅ CORRECT - Use generic hook
import { useCopyPaste } from '../../hooks/useCopyPaste';

const { copy, paste } = useCopyPaste({
  onPaste: (data) => updateState(data),
  validate: (data) => typeof data === 'object' && data !== null,
  name: 'properties',
});

const handleCopy = useCallback(async () => {
  await copy(data);
}, [data, copy]);
```
**ESLint Rule:** `local/prefer-copy-paste-hook` (warn)
**Reference:** See `src/builder/hooks/useCopyPaste.ts`

❌ **EventType Import from Legacy Paths:**
```tsx
// REJECT - Legacy path with extra types not in registry
import type { EventType } from "../../events/types/eventTypes";
// This includes 'onInput' which doesn't exist in official registry

// ✅ CORRECT - Official registry path
import type { EventType } from "@/types/events/events.types";
```
**ESLint Rule:** `local/no-eventtype-legacy-import` (error)
**Reference:** See CHANGELOG.md "Anti-Patterns Discovered"

### Quick Reference for AI Assistants

| Task | Correct Approach | File Location |
|------|------------------|---------------|
| Add component styles | Create/edit in `styles/` with `@layer components` | `src/builder/components/styles/` |
| Style component in TSX | Use `tv()` with semantic class names | Import from `tailwind-variants` |
| Create store action | Factory pattern with `createAction(set, get)` | `src/builder/stores/utils/` |
| Update element | Use `updateElementProps()` or `updateElement()` | From Zustand store |
| Add CSS value | Use CSS variable `var(--token-name)` | Defined in `theme.css` |
| Name React Aria class | Use `react-aria-ComponentName` prefix | Follow existing patterns |
| Add DataBinding to component | Add `dataBinding?: DataBinding` prop, use `useCollectionData` hook | Component file (see `ListBox.tsx`, `Select.tsx`) |
| Pass DataBinding in renderer | Add `dataBinding={element.dataBinding \|\| element.props.dataBinding}` | Renderer file in `src/canvas/renderers/` |
| Access dataBinding.config safely | Use optional chaining: `(dataBinding as {config?})?.config?.field` | PropertyDataBinding has no config |
| Test with mock data | Use `baseUrl: "MOCK_DATA"` with available endpoints | See `src/services/api/index.ts` |
| Display dynamic data in Collection | Use Field component inside ListBoxItem/GridListItem/MenuItem | `src/builder/components/Field.tsx` |
| Add Field management to ItemEditor | Detect Field children, Edit → setSelectedElement() | Follow `ListBoxItemEditor.tsx` pattern |
| Edit Field properties | Click Edit button → Navigate to FieldEditor (reuse, NO custom UI) | Field auto-selected in Layer Tree + Inspector |
| Add ComboBox filtering | Calculate textValue from visible Field values, join with spaces | `SelectionRenderers.tsx:719-741` |
| Create initial component | Only 1 child item as template | `SelectionComponents.ts` |
| Implement TagGroup removal | Use `removedItemIds` array to track hidden items non-destructively | `TagGroup.tsx:131-151`, `CollectionRenderers.tsx:321-365` |
| Restore removed TagGroup items | Inspector button: `updateProp('removedItemIds', [])` | `TagGroupEditor.tsx:197-214` |
| Add event handler | Use `useEventHandlers` hook with `addHandler(eventType)` | `src/builder/inspector/events/state/useEventHandlers.ts` |
| Add action to handler | Use `useActions` hook with `addAction(actionType, config)` | `src/builder/inspector/events/state/useActions.ts` |
| Create action editor | Extend ActionEditor base, use PropertyInput/Select/Switch | `src/builder/inspector/events/actions/` |
| Add conditional execution | Use ConditionEditor component, evaluate with conditionEvaluator | `src/builder/inspector/events/components/ConditionEditor.tsx` |
| Add event template | Define in eventTemplates.ts with handler and actions | `src/builder/inspector/events/data/eventTemplates.ts` |
| Add timing controls | Use DebounceThrottleEditor for handler-level, ActionDelayEditor for action-level | `src/builder/inspector/events/components/` |
| Debug event execution | Use ExecutionDebugger component, check executionLogger | `src/builder/inspector/events/components/ExecutionDebugger.tsx` |
| Create visual flow node | Extend TriggerNode or ActionNode, use ReactFlow components | `src/builder/inspector/events/components/visualMode/` |
| Prevent initial mount data overwrite | Use `useInitialMountDetection` hook with resetKey | `src/builder/hooks/useInitialMountDetection.ts` |
| Add keyboard shortcuts | Use `useKeyboardShortcutsRegistry` with declarative shortcuts array | `src/builder/hooks/useKeyboardShortcutsRegistry.ts` |
| Add copy/paste functionality | Use `useCopyPaste` hook with validation and transform | `src/builder/hooks/useCopyPaste.ts` |

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

## 📋 Recent Updates

> **Note**: This section has been moved to a dedicated document for better organization.
> See **[COMPLETED_FEATURES.md](docs/COMPLETED_FEATURES.md)** for full implementation details of all completed features.

### Summary of Completed Features (2025-12-16)

**Total Features Completed**: 22 major features
**Code Reduction**: 37-88% in refactored areas
**Performance Improvements**: 30-50% reduction in CPU/Memory usage

**Completed Implementations**:
1. ✅ **Event System** - Visual programming with 21 action editors, 3 visual modes
2. 🔄 **Monitor Panel** - Bottom panel with memory monitoring (rebuilding 2025-01)
3. ✅ **Panel System Refactoring** - 3 reusable hooks, code reduction up to 82%
4. ✅ **Multi-Element Selection** - Cmd+Click, lasso selection, AABB collision
5. ✅ **Multi-Element Editing** - Batch property editor, mixed value detection
6. ✅ **Copy/Paste/Duplicate** - Relationship preservation, auto-select, history integration
7. ✅ **Advanced Selection** - Select All, Tab navigation, property filtering
8. ✅ **Grouping & Organization** - Group/ungroup with Cmd+G/Cmd+Shift+G
9. ✅ **History Integration** - Batch updates, single undo entries
10. ✅ **Performance (RAF)** - RequestAnimationFrame throttling, virtual scrolling
11. ✅ **Element Alignment** - 6 alignment types with keyboard shortcuts
12. ✅ **Element Distribution** - Even spacing calculation
13. ✅ **Status Indicator** - Primary badge, action grouping, shortcut hints
14. ✅ **Batch Editor** - Staged updates, property type detection
15. ✅ **Component Migration** - tv() pattern, Action tokens, 6 phases complete
16. ✅ **CSS Architecture** - Builder/Preview isolation, ITCSS, zero hardcoded colors
17. ✅ **M3 Color System** - Real-time M3 role visualization in Theme Studio
18. ✅ **Panel Standardization** - Consistent naming, hooks compliance, unified styles
19. ✅ **Layout Preset System** - Body editor separation, 9 presets, Slot auto-creation ([상세](docs/features/LAYOUT_PRESET_SYSTEM.md))
20. ✅ **Canvas Runtime Isolation** - srcdoc iframe, 독립 runtimeStore, postMessage 통신 ([상세](docs/features/CANVAS_RUNTIME_ISOLATION.md))
21. ✅ **DataTable Component** - Phase 1-6 완료: Store, Component, Editor, Factory, Preview, Transform, Cache ([상세](docs/PLANNED_FEATURES.md#-datatable-component-architecture))
22. ✅ **WebGL Canvas Migration** - Phase 1-8 완료: 62개 React Aria 컴포넌트의 PixiJS WebGL 구현 (WYSIWYG 편집)

**Key Achievements**:
- Zero TypeScript errors
- Zero hardcoded colors (100% CSS variables)
- 5 custom ESLint rules for anti-pattern prevention
- Comprehensive documentation (22 feature docs)
- 62 WebGL components for WYSIWYG canvas editing

**Next**: See [PLANNED_FEATURES.md](docs/PLANNED_FEATURES.md) for upcoming implementations.

---

## 🚀 Planned Features

> **상세 계획은 [docs/PLANNED_FEATURES.md](docs/PLANNED_FEATURES.md)를 참조하세요.**

| 기능 | 상태 | 우선순위 |
|------|------|----------|
| **WebGL Canvas Migration** | ✅ Complete (Phase 1-8, 62 components) | - |
| **Context Menu System** | 📋 Planning | High |
| **DataTable Component** | ✅ Complete | - |
| **SlotEditor** | ✅ Complete | - |
| **Grid/Flex 시각적 편집** | 📋 Planning | Medium |
| **프리셋 커스터마이징** | 📋 Planning | Low |

---

**Remember:** This project prioritizes accessibility (React Aria), maintainability (CSS variables, semantic classes), and type safety (strict TypeScript). AI suggestions should align with these values.
