# Inspector Event System Implementation Guide

Complete implementation guide for the refactored Inspector Event system. This system provides a comprehensive event management interface with dual-mode visualization (List and Visual).

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Usage Examples](#usage-examples)
4. [Integration Guide](#integration-guide)
5. [API Reference](#api-reference)

---

## Architecture Overview

The event system is organized into three main layers:

```
events/
├── types/              # Type definitions (EventHandler, EventAction, etc.)
├── data/               # Static data (metadata, categories, templates)
├── hooks/              # React hooks (search, templates, copy/paste)
└── components/
    ├── listMode/       # List view components
    ├── visualMode/     # Flow visualization components
    └── shared/         # ViewModeToggle, EventHandlerManager
```

### Key Design Principles

1. **Zero Additional Dependencies**: Uses only React Aria Components (already installed)
2. **Type Safety**: Strict TypeScript with comprehensive type definitions
3. **Single Source of Truth**: All event/action metadata centralized
4. **Progressive Enhancement**: Start simple (list mode), add complexity (visual mode)
5. **Accessibility First**: React Aria components throughout

---

## Component Structure

### Phase 1: Foundation (Types & Metadata)

**Type System** (`types/eventTypes.ts`):
- `EventType`: 17 event types (onClick, onChange, onPress, etc.)
- `ActionType`: 14 action types (navigate, apiCall, showModal, etc.)
- `EventHandler`: Single event trigger + array of actions
- `EventAction`: Individual action with type and config

**Event Metadata** (`data/eventCategories.ts`):
- 26 events across 5 categories (Mouse, Form, Keyboard, Selection, Lifecycle)
- Usage statistics (e.g., onClick: 95%)
- Component compatibility tracking
- Example use cases

**Action Metadata** (`data/actionMetadata.ts`):
- 14 actions across 4 categories (Navigation, State, UI, Data)
- Dynamic form field definitions
- Config validation rules

### Phase 2: Event Palette

**Components**:
- `EventPalette`: Main event browser with search and recommendations
- `EventCategoryGroup`: Collapsible category groups
- `useEventSearch`: Fuse.js-based fuzzy search (threshold: 0.3)
- `useRecommendedEvents`: Component-specific recommendations

**Usage**:
```tsx
<EventPalette
  componentType="Button"
  registeredEvents={["onClick"]}
  onAddEvent={(eventType) => console.log('Add', eventType)}
/>
```

### Phase 3: Event Templates

**20+ Pre-built Templates**:
- **Form** (4): validation, submit to API, reset, auto-save
- **Navigation** (4): page nav, scroll to section, back button, external link
- **UI** (5): modals, toasts, visibility, clipboard
- **Data** (7): fetch on load, refresh, filter, selection, delete with confirm

**Components**:
- `EventTemplateLibrary`: Template browser with search and category filters
- `TemplateCard`: Individual template display
- `useApplyTemplate`: Template application with merge/replace modes

**Usage**:
```tsx
<EventTemplateLibrary
  componentType="Button"
  onApplyTemplate={(template) => {
    // Apply template.events to current component
  }}
/>
```

### Phase 4: Action Management

**Components**:
- `ActionList`: Drag-and-drop reorderable list (React Aria GridList + useDragAndDrop)
- `ActionCard`: Individual action with drag handle and controls
- `InlineActionEditor`: Dynamic form editor based on ACTION_METADATA
- `useCopyPasteActions`: Clipboard management with localStorage persistence

**Keyboard Shortcuts**:
- `Cmd/Ctrl + C`: Copy selected actions
- `Cmd/Ctrl + V`: Paste actions
- `Delete/Backspace`: Remove selected actions

**Usage**:
```tsx
<ActionList
  actions={eventHandler.actions}
  onReorder={(reordered) => updateActions(reordered)}
  onUpdateAction={(id, action) => updateAction(id, action)}
  onDeleteAction={(id) => deleteAction(id)}
  onDuplicateAction={(action) => duplicateAction(action)}
/>
```

### Phase 5: Visual Flow View

**Components**:
- `SimpleFlowView`: HTML/CSS-based flow visualization
- `FlowNode`: Trigger and Action node variants
- `FlowConnector`: Visual connections between nodes

**Node Types**:
- **TriggerNode** (Blue): Event trigger with description
- **ActionNode** (Purple): Action with icon, label, config summary

**Usage**:
```tsx
<SimpleFlowView
  eventHandler={handler}
  onSelectAction={(actionId) => console.log('Selected', actionId)}
/>
```

### Phase 7: Mode Integration

**Components**:
- `ViewModeToggle`: List ↔ Visual mode switcher
- `EventHandlerManager`: Unified manager with mode switching

**Usage**:
```tsx
<EventHandlerManager
  eventHandler={handler}
  onUpdateHandler={(updated) => setHandler(updated)}
  onAddAction={() => openActionPicker()}
/>
```

---

## Usage Examples

### Basic Event Handler Display

```tsx
import { EventHandlerManager } from './events/components';
import type { EventHandler } from './events/types';

function MyEventSection() {
  const [handler, setHandler] = useState<EventHandler>({
    id: 'handler-1',
    type: 'onClick',
    actions: [
      {
        id: 'action-1',
        type: 'navigate',
        config: { path: '/home', openInNewTab: false }
      }
    ]
  });

  return (
    <EventHandlerManager
      eventHandler={handler}
      onUpdateHandler={setHandler}
    />
  );
}
```

### Event Palette with Recommendations

```tsx
import { EventPalette } from './events/components';

function AddEventDialog({ componentType, registeredEvents }) {
  return (
    <EventPalette
      componentType={componentType}
      registeredEvents={registeredEvents}
      onAddEvent={(eventType) => {
        // Create new event handler
        const newHandler = {
          id: generateId(),
          type: eventType,
          actions: []
        };
        addHandler(newHandler);
      }}
    />
  );
}
```

### Template Library

```tsx
import { EventTemplateLibrary } from './events/components';
import { useApplyTemplate } from './events/hooks';

function TemplateSelector({ currentHandlers, onUpdate }) {
  const { applyTemplate } = useApplyTemplate(
    currentHandlers,
    onUpdate,
    { mode: 'merge' }
  );

  return (
    <EventTemplateLibrary
      componentType="Form"
      onApplyTemplate={applyTemplate}
    />
  );
}
```

### Copy/Paste Actions

```tsx
import { useCopyPasteActions, useActionKeyboardShortcuts } from './events/hooks';

function ActionManager({ actions }) {
  const { copyActions, pasteActions, hasClipboard } = useCopyPasteActions();
  const [selectedActions, setSelectedActions] = useState([]);

  useActionKeyboardShortcuts(
    selectedActions,
    copyActions,
    () => {
      const pasted = pasteActions();
      addActions(pasted);
    },
    () => deleteActions(selectedActions)
  );

  return (
    <div>
      <button onClick={() => copyActions(selectedActions)}>
        Copy ({selectedActions.length})
      </button>
      <button onClick={() => addActions(pasteActions())} disabled={!hasClipboard}>
        Paste
      </button>
    </div>
  );
}
```

---

## Integration Guide

### Step 1: Import Types and Components

```tsx
import {
  EventHandlerManager,
  EventPalette,
  EventTemplateLibrary,
  ViewModeToggle
} from '@/builder/inspector/events/components';

import type {
  EventHandler,
  EventAction,
  EventType,
  ActionType
} from '@/builder/inspector/events/types';
```

### Step 2: Integrate with Element Store

```tsx
// In your inspector component
function InspectorEventSection({ elementId }) {
  const element = useElementStore((state) =>
    state.elements.find((el) => el.id === elementId)
  );
  const updateElement = useElementStore((state) => state.updateElementProps);

  const handlers = element?.props?.eventHandlers || [];

  const handleUpdateHandler = (handlerId: string, updated: EventHandler) => {
    const updatedHandlers = handlers.map((h) =>
      h.id === handlerId ? updated : h
    );

    updateElement(elementId, {
      eventHandlers: updatedHandlers
    });
  };

  return (
    <div>
      {handlers.map((handler) => (
        <EventHandlerManager
          key={handler.id}
          eventHandler={handler}
          onUpdateHandler={(updated) => handleUpdateHandler(handler.id, updated)}
        />
      ))}
    </div>
  );
}
```

### Step 3: Add Event Handler Creation

```tsx
function AddEventButton({ elementId, componentType }) {
  const [showPalette, setShowPalette] = useState(false);
  const addHandler = useElementStore((state) => state.addEventHandler);

  return (
    <>
      <button onClick={() => setShowPalette(true)}>
        + Add Event
      </button>

      {showPalette && (
        <EventPalette
          componentType={componentType}
          registeredEvents={[]} // TODO: Get from element
          onAddEvent={(eventType) => {
            addHandler(elementId, {
              id: generateId(),
              type: eventType,
              actions: []
            });
            setShowPalette(false);
          }}
        />
      )}
    </>
  );
}
```

---

## API Reference

### EventHandlerManager

Main component for managing event handlers with dual-mode visualization.

**Props**:
```tsx
interface EventHandlerManagerProps {
  eventHandler: EventHandler;
  onUpdateHandler: (handler: EventHandler) => void;
  onAddAction?: () => void;
}
```

**Features**:
- View mode toggle (List/Visual)
- Action management (CRUD operations)
- Drag-and-drop reordering (List mode)
- Flow visualization (Visual mode)

### EventPalette

Event browser with search and component-specific recommendations.

**Props**:
```tsx
interface EventPaletteProps {
  componentType?: string;
  registeredEvents: EventType[];
  onAddEvent: (eventType: EventType) => void;
}
```

**Features**:
- Fuzzy search (Fuse.js, threshold: 0.3)
- Component-specific recommendations
- Category-based browsing
- Usage statistics display

### EventTemplateLibrary

Pre-built event template browser and applicator.

**Props**:
```tsx
interface EventTemplateLibraryProps {
  componentType?: string;
  onApplyTemplate: (template: EventTemplate) => void;
}
```

**Features**:
- 20+ pre-built templates
- Category filtering (Form, Navigation, UI, Data)
- Component compatibility filtering
- Template search

### ActionList

Drag-and-drop reorderable action list with inline editing.

**Props**:
```tsx
interface ActionListProps {
  actions: EventAction[];
  onReorder: (reordered: EventAction[]) => void;
  onUpdateAction: (actionId: string, updated: EventAction) => void;
  onDeleteAction: (actionId: string) => void;
  onDuplicateAction: (action: EventAction) => void;
  onAddAction?: () => void;
}
```

**Features**:
- React Aria GridList + useDragAndDrop
- Inline action editing
- Duplicate/Delete controls
- Keyboard shortcuts (Cmd+C/V/Delete)

### SimpleFlowView

HTML/CSS-based flow visualization for event handlers.

**Props**:
```tsx
interface SimpleFlowViewProps {
  eventHandler: EventHandler;
  onSelectAction?: (actionId: string) => void;
}
```

**Features**:
- Trigger → Actions flow visualization
- Color-coded nodes (Blue: trigger, Purple: action)
- Click to select nodes
- Config summary display

---

## Testing

### Type Checking

```bash
npx tsc --noEmit
```

### Build Test

```bash
npm run build
```

### Integration Testing

Test the following scenarios:

1. **Event Palette Search**: Type "click" → verify onClick appears
2. **Template Application**: Apply "Form Validation" template → verify actions added
3. **Drag-and-Drop**: Reorder actions → verify order persists
4. **Copy/Paste**: Copy action → paste → verify duplicate created
5. **Mode Switching**: Toggle List ↔ Visual → verify data consistency
6. **Inline Editing**: Edit action config → save → verify changes applied

---

## Future Enhancements

- **Phase 6 (Optional)**: ReactFlow-based advanced flow editor
- **Condition Nodes**: Add conditional branching to flow
- **Action Presets**: User-defined action templates
- **Keyboard Shortcuts**: More shortcuts for power users
- **Undo/Redo**: Action-level history
- **Import/Export**: Share event handlers as JSON

---

## Support

For issues, questions, or contributions:
- Reference: `CLAUDE.md` for coding standards
- Event Types: See `events/types/eventTypes.ts`
- Metadata: See `events/data/` folder

Built with React Aria Components, TypeScript, and ❤️
