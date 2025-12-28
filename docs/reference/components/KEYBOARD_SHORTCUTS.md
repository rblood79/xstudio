# Keyboard Shortcuts Audit Report

> **Generated:** 2024-12-28
> **Scope:** `src/builder` directory
> **Total Shortcuts:** 67+
> **Files Affected:** 22

---

## Summary

This document provides a comprehensive audit of all keyboard shortcuts implemented in the `src/builder` directory of XStudio.

---

## Current Issues: Decentralized Shortcut Management

### Problem Overview

Despite having a centralized registry (`useKeyboardShortcutsRegistry`), keyboard shortcuts are scattered across **15+ files** with **3 different implementation patterns**:

### Pattern Distribution

| Pattern | Files | Count | Centralized? |
|---------|-------|-------|--------------|
| Direct `addEventListener` | 8 files | ~20 shortcuts | ❌ No |
| React `onKeyDown` | 9 files | ~15 shortcuts | ❌ No |
| `useKeyboardShortcutsRegistry` | 2 files | ~30 shortcuts | ✅ Yes |

### Direct `addEventListener` Implementations (Not Centralized)

| File | Shortcut | Target |
|------|----------|--------|
| `hooks/useKeyboardShortcuts.ts` | Undo/Redo | `document` (capture) |
| `workspace/useZoomShortcuts.ts` | Zoom +/-/0/1/2 | `window` (capture) |
| `workspace/canvas/BuilderCanvas.tsx` | Shift (lasso) | `window` |
| `panels/properties/PropertiesPanel.tsx` | Tab navigation | `window` |
| `overlay/hooks/useBorderRadiusDrag.ts` | Escape | `document` |
| `panels/events/hooks/useCopyPasteActions.ts` | Copy/Paste/Delete | `document` |
| `panels/events/hooks/useBlockKeyboard.ts` | Arrow/Escape | `document` |
| `panels/events/editors/VariableBindingEditor.tsx` | Escape/Brace | `document` |

### React `onKeyDown` Implementations (Component-Local)

| File | Purpose |
|------|---------|
| `components/property/PropertyUnitInput.tsx` | Enter, Arrow Up/Down |
| `components/property/PropertyCustomId.tsx` | Enter, Escape |
| `components/property/PropertyColor.tsx` | Enter |
| `components/property/PropertyInput.tsx` | Enter |
| `workspace/ZoomControls.tsx` | Enter, Escape, Arrow |
| `workspace/overlay/TextEditOverlay.tsx` | Enter, Escape |
| `layout/BottomPanelSlot.tsx` | Arrow Up/Down |
| `panels/properties/editors/SlotEditor.tsx` | Enter, Space |
| `panels/ai/AIPanel.tsx` | Enter |

### Using `useKeyboardShortcutsRegistry` (Centralized)

| File | Shortcuts |
|------|-----------|
| `panels/properties/PropertiesPanel.tsx` | Copy, Paste, Duplicate, Select All, Group, Align, Distribute, etc. |
| `layout/BottomPanelSlot.tsx` | Escape (close panel) |

---

## Refactoring Proposal

### Current Registry Limitations

The existing `useKeyboardShortcutsRegistry` cannot handle all use cases:

| Limitation | Current State | Required | Affected Shortcuts |
|------------|---------------|----------|-------------------|
| **Capture Phase** | ❌ Not supported | Intercept browser defaults | Undo/Redo, Zoom |
| **Input Field Handling** | Always disabled | Conditional allow | Undo/Redo (must work in Input) |
| **Shift-only Modifier** | ❌ Not supported | `'shift'` modifier | Tab navigation |
| **Context/Scope** | ❌ None | Panel-specific scopes | Events panel Copy/Paste |
| **Priority System** | ❌ None | Conflict resolution | Same key, different contexts |
| **stopPropagation** | ❌ Not supported | Event bubbling control | Undo/Redo |

### Why Separate Implementations Exist

```typescript
// useKeyboardShortcuts.ts - Undo/Redo
// Problem: Must work in Input fields + needs capture phase
document.addEventListener('keydown', handleKeyDown, { capture: true });

// useZoomShortcuts.ts - Zoom
// Problem: Must intercept browser zoom (capture phase required)
window.addEventListener('keydown', handleKeyDown, { capture: true });

// PropertiesPanel.tsx - Tab navigation
// Problem: 'shift' modifier not supported
// Note: Tab navigation requires special handling (Shift+Tab, preventDefault)
// that useKeyboardShortcutsRegistry doesn't support
```

### Conclusion: Current Design Cannot Centralize

| Question | Answer |
|----------|--------|
| Can current registry unify all shortcuts? | ❌ **No** |
| Can it work after enhancement? | ✅ **Yes** |
| Required additions | capture, allowInInput, stopPropagation, priority, shift modifier |

---

## Phase 0: Enhance Registry (Required First)

### Enhanced Interface

```typescript
// src/builder/hooks/useKeyboardShortcutsRegistry.ts

export type KeyboardModifier =
  | 'cmd'
  | 'cmdShift'
  | 'alt'
  | 'altShift'
  | 'shift'        // NEW: Shift-only
  | 'none';

export interface KeyboardShortcut {
  key: string;
  code?: string;
  modifier: KeyboardModifier;
  handler: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;     // NEW
  description?: string;
  disabled?: boolean;

  // NEW: Advanced options
  allowInInput?: boolean;        // Allow in INPUT/TEXTAREA
  scope?: string;                // 'global' | 'events-panel' | etc.
  priority?: number;             // Higher = first (conflict resolution)
}

export interface RegistryOptions {
  eventType?: 'keydown' | 'keyup';
  capture?: boolean;             // NEW: capture phase
  target?: 'window' | 'document'; // NEW: event target
}
```

### Enhanced Implementation

```typescript
export function useKeyboardShortcutsRegistry(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = [],
  options: RegistryOptions = {}
): void {
  const {
    eventType = 'keydown',
    capture = false,
    target = 'window'
  } = options;

  useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      const targetEl = event.target as HTMLElement;
      const isInputField =
        targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.isContentEditable;

      // Sort by priority (descending)
      const sorted = [...shortcuts].sort(
        (a, b) => (b.priority || 0) - (a.priority || 0)
      );

      for (const shortcut of sorted) {
        // Skip if in input field and not allowed
        if (isInputField && !shortcut.allowInInput) continue;

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          shortcut.handler();
          break;
        }
      }
    };

    const eventTarget = target === 'document' ? document : window;
    eventTarget.addEventListener(eventType, handleKeyEvent, { capture });

    return () => {
      eventTarget.removeEventListener(eventType, handleKeyEvent, { capture });
    };
  }, [...deps]);
}
```

---

## Phase 1: Migrate Global Shortcuts

### Migration Example

```typescript
// Before: useKeyboardShortcuts.ts (separate implementation)
document.addEventListener('keydown', handleKeyDown, { capture: true });

// After: Unified registry
useKeyboardShortcutsRegistry([
  {
    key: 'z',
    modifier: 'cmd',
    handler: handleUndo,
    allowInInput: true,      // Works in Input fields
    stopPropagation: true,
    priority: 100,           // Highest priority
    description: 'Undo'
  },
  {
    key: 'z',
    modifier: 'cmdShift',
    handler: handleRedo,
    allowInInput: true,
    stopPropagation: true,
    priority: 100,
    description: 'Redo'
  },
], [], { capture: true, target: 'document' });
```

### Migration Candidates

| File | Shortcuts | Migration Notes |
|------|-----------|-----------------|
| `useKeyboardShortcuts.ts` | Undo/Redo | `allowInInput: true`, `capture: true` |
| `useZoomShortcuts.ts` | Zoom +/-/0/1/2 | `capture: true` |
| `useCopyPasteActions.ts` | Copy/Paste/Delete | `scope: 'events-panel'` |
| `useBlockKeyboard.ts` | Arrow/Escape | `scope: 'events-panel'` |
| `PropertiesPanel.tsx` | Tab navigation | `modifier: 'shift'` |
| `BuilderCanvas.tsx` | Shift (lasso) | ❌ Keep (modifier state, not shortcut) |

---

## Phase 2: Create Global Shortcuts Config

```typescript
// src/builder/config/keyboardShortcuts.ts

export const SHORTCUT_DEFINITIONS = {
  // === System (highest priority, capture phase) ===
  undo: {
    key: 'z', modifier: 'cmd',
    priority: 100, allowInInput: true, capture: true
  },
  redo: {
    key: 'z', modifier: 'cmdShift',
    priority: 100, allowInInput: true, capture: true
  },

  // === Zoom (capture phase to override browser) ===
  zoomIn: { key: '=', modifier: 'cmd', priority: 90, capture: true },
  zoomOut: { key: '-', modifier: 'cmd', priority: 90, capture: true },
  zoomFit: { key: '0', modifier: 'cmd', priority: 90, capture: true },
  zoom100: { key: '1', modifier: 'cmd', priority: 90, capture: true },
  zoom200: { key: '2', modifier: 'cmd', priority: 90, capture: true },

  // === Edit (normal priority) ===
  copy: { key: 'c', modifier: 'cmd', priority: 50 },
  paste: { key: 'v', modifier: 'cmd', priority: 50 },
  duplicate: { key: 'd', modifier: 'cmd', priority: 50 },
  delete: { key: 'Backspace', modifier: 'none', priority: 50 },

  // === Selection ===
  selectAll: { key: 'a', modifier: 'cmd', priority: 50 },
  clearSelection: { key: 'Escape', modifier: 'none', priority: 40 },
  nextElement: { key: 'Tab', modifier: 'none', priority: 40 },
  prevElement: { key: 'Tab', modifier: 'shift', priority: 40 },

  // === Grouping ===
  group: { key: 'g', modifier: 'cmd', priority: 50 },
  ungroup: { key: 'g', modifier: 'cmdShift', priority: 50 },

  // === Alignment ===
  alignLeft: { key: 'l', modifier: 'cmdShift', priority: 50 },
  alignCenter: { key: 'h', modifier: 'cmdShift', priority: 50 },
  alignRight: { key: 'r', modifier: 'cmdShift', priority: 50 },
  alignTop: { key: 't', modifier: 'cmdShift', priority: 50 },
  alignMiddle: { key: 'm', modifier: 'cmdShift', priority: 50 },
  alignBottom: { key: 'b', modifier: 'cmdShift', priority: 50 },

  // === Distribution ===
  distributeH: { key: 'd', modifier: 'cmdShift', priority: 50 },
  distributeV: { key: 'v', modifier: 'altShift', priority: 50 },

  // === Help ===
  showHelp: { key: '?', modifier: 'cmd', priority: 30 },
} as const;
```

---

## Phase 3: Single Registration Point

```typescript
// src/builder/hooks/useGlobalKeyboardShortcuts.ts

import { SHORTCUT_DEFINITIONS } from '../config/keyboardShortcuts';
import { useKeyboardShortcutsRegistry } from './useKeyboardShortcutsRegistry';

export function useGlobalKeyboardShortcuts() {
  const { undo, redo } = useStore.getState();
  const { zoomTo, zoomToFit } = useCanvasSyncStore.getState();
  // ... other handlers

  // System shortcuts (capture phase)
  useKeyboardShortcutsRegistry([
    { ...SHORTCUT_DEFINITIONS.undo, handler: undo },
    { ...SHORTCUT_DEFINITIONS.redo, handler: redo },
    { ...SHORTCUT_DEFINITIONS.zoomIn, handler: () => zoomTo(zoom + 0.1) },
    { ...SHORTCUT_DEFINITIONS.zoomOut, handler: () => zoomTo(zoom - 0.1) },
    // ...
  ], [], { capture: true, target: 'document' });

  // Normal shortcuts
  useKeyboardShortcutsRegistry([
    { ...SHORTCUT_DEFINITIONS.copy, handler: handleCopy },
    { ...SHORTCUT_DEFINITIONS.paste, handler: handlePaste },
    // ...
  ], []);
}
```

---

## Keep as Component-Local (No Migration Needed)

These should remain as React `onKeyDown`:
- `PropertyUnitInput` - Arrow keys for value adjustment
- `PropertyCustomId` - Enter/Escape for validation
- `PropertyColor` - Enter for color confirm
- `PropertyInput` - Enter for submit
- `TextEditOverlay` - Enter/Escape for text editing
- `AIPanel` - Enter for send message

**Reason:** These are context-specific to input fields and should not be global.

---

## 1. Core Shortcuts (Undo/Redo)

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Ctrl+Z` (Mac: `Cmd+Z`) | Undo | `hooks/useKeyboardShortcuts.ts:20` |
| `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) | Redo | `hooks/useKeyboardShortcuts.ts:25-26` |

---

## 2. Zoom Controls

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Ctrl+=` / `Ctrl++` | Zoom In (+10%) | `workspace/useZoomShortcuts.ts:83-87` |
| `Ctrl+-` | Zoom Out (-10%) | `workspace/useZoomShortcuts.ts:90-93` |
| `Ctrl+0` | Fit to Screen | `workspace/useZoomShortcuts.ts:96-99` |
| `Ctrl+1` | Zoom to 100% | `workspace/useZoomShortcuts.ts:102-105` |
| `Ctrl+2` | Zoom to 200% | `workspace/useZoomShortcuts.ts:108-111` |
| `Arrow Up/Down` | Adjust zoom by 1%/10% in input field | `workspace/ZoomControls.tsx:212-219` |

**Constraints:**
- MIN_ZOOM: 0.1 (10%)
- MAX_ZOOM: 5 (500%)
- ZOOM_STEP: 0.1 (10%)

---

## 3. Multi-Element Editing

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+C` / `Ctrl+C` | Copy selected elements | `panels/properties/PropertiesPanel.tsx:1005-1008` |
| `Cmd+V` / `Ctrl+V` | Paste elements | `panels/properties/PropertiesPanel.tsx:1011-1014` |
| `Cmd+D` / `Ctrl+D` | Duplicate selection | `panels/properties/PropertiesPanel.tsx:1017-1020` |
| `Cmd+Shift+C` | Copy properties only | `panels/properties/PropertiesPanel.tsx:991-995` |
| `Cmd+Shift+V` | Paste properties only | `panels/properties/PropertiesPanel.tsx:998-1001` |

---

## 4. Selection & Navigation

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+A` / `Ctrl+A` | Select all elements | `panels/properties/PropertiesPanel.tsx:1023-1027` |
| `Escape` | Clear selection | `panels/properties/PropertiesPanel.tsx:1030-1033` |
| `Tab` | Navigate to next element | `panels/properties/PropertiesPanel.tsx:1118` |
| `Shift+Tab` | Navigate to previous element | `panels/properties/PropertiesPanel.tsx:1118-1126` |
| `Shift` (hold + drag) | Lasso selection mode | `workspace/canvas/BuilderCanvas.tsx:157-162` |

---

## 5. Grouping

| Shortcut | Action | Constraint | File Location |
|----------|--------|------------|---------------|
| `Cmd+G` / `Ctrl+G` | Group selected elements | Requires 2+ elements | `panels/properties/PropertiesPanel.tsx:1036-1040` |
| `Cmd+Shift+G` | Ungroup selection | Must be a Group element | `panels/properties/PropertiesPanel.tsx:1042-1046` |

---

## 6. Alignment

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+Shift+L` | Align Left | `panels/properties/PropertiesPanel.tsx:1049-1053` |
| `Cmd+Shift+H` | Align Horizontal Center | `panels/properties/PropertiesPanel.tsx:1055-1059` |
| `Cmd+Shift+R` | Align Right | `panels/properties/PropertiesPanel.tsx:1061-1065` |
| `Cmd+Shift+T` | Align Top | `panels/properties/PropertiesPanel.tsx:1067-1071` |
| `Cmd+Shift+M` | Align Vertical Middle | `panels/properties/PropertiesPanel.tsx:1073-1077` |
| `Cmd+Shift+B` | Align Bottom | `panels/properties/PropertiesPanel.tsx:1079-1083` |

**Constraint:** Requires 2+ elements selected

---

## 7. Distribution

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+Shift+D` | Distribute Horizontally | `panels/properties/PropertiesPanel.tsx:1086-1090` |
| `Alt+Shift+V` | Distribute Vertically | `panels/properties/PropertiesPanel.tsx:1092-1096` |

**Constraint:** Requires 3+ elements selected

---

## 8. Panel Navigation

| Shortcut | Panel | File Location |
|----------|-------|---------------|
| `Ctrl+Shift+N` | Toggle Nodes Panel | `panels/core/panelConfigs.ts:58` |
| `Ctrl+Shift+C` | Toggle Components Panel | `panels/core/panelConfigs.ts:71` |
| `Ctrl+Shift+T` | Toggle DataTable Panel | `panels/core/panelConfigs.ts:84` |
| `Ctrl+,` | Open Settings Panel | `panels/core/panelConfigs.ts:137` |
| `Ctrl+Shift+P` | Toggle Properties Panel | `panels/core/panelConfigs.ts:152` |
| `Ctrl+Shift+S` | Toggle Styles Panel | `panels/core/panelConfigs.ts:165` |
| `Ctrl+Shift+E` | Toggle Events Panel | `panels/core/panelConfigs.ts:178` |
| `Ctrl+Shift+H` | Toggle History Panel | `panels/core/panelConfigs.ts:191` |

---

## 9. Text Editing

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Enter` | Complete text edit | `workspace/overlay/TextEditOverlay.tsx:114` |
| `Shift+Enter` | Insert line break | `workspace/overlay/TextEditOverlay.tsx:114` |
| `Escape` | Cancel text edit | `workspace/overlay/TextEditOverlay.tsx:120` |

---

## 10. Event Action Blocks

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+C` / `Ctrl+C` | Copy selected actions | `panels/events/hooks/useCopyPasteActions.ts:82` |
| `Cmd+V` / `Ctrl+V` | Paste actions | `panels/events/hooks/useCopyPasteActions.ts:88` |
| `Delete` / `Backspace` | Delete selected actions | `panels/events/hooks/useCopyPasteActions.ts:95` |
| `Escape` | Exit edit mode / Deselect | `panels/events/hooks/useBlockKeyboard.ts:73` |
| `Arrow Up/Down` | Navigate action list | `panels/events/hooks/useBlockKeyboard.ts:95-99` |

---

## 11. Tree Navigation (Nodes Panel, etc.)

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Arrow Down` | Move to next item | `hooks/useTreeKeyboardNavigation.ts:116` |
| `Arrow Up` | Move to previous item | `hooks/useTreeKeyboardNavigation.ts:122` |
| `Home` | Jump to first item | `hooks/useTreeKeyboardNavigation.ts:127` |
| `End` | Jump to last item | `hooks/useTreeKeyboardNavigation.ts:132` |
| `Enter` / `Space` | Select item | `hooks/useTreeKeyboardNavigation.ts:138` |
| `Arrow Right` | Expand node | `hooks/useTreeKeyboardNavigation.ts:145` |
| `Arrow Left` | Collapse node / Move to parent | `hooks/useTreeKeyboardNavigation.ts:155` |

---

## 12. Property Input Fields

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Enter` | Confirm value | `components/property/PropertyUnitInput.tsx:210` |
| `Arrow Up/Down` | Increment/Decrement value | `components/property/PropertyUnitInput.tsx:256-260` |
| `Escape` | Cancel edit | `components/property/PropertyCustomId.tsx:104` |

---

## 13. Miscellaneous

| Shortcut | Action | File Location |
|----------|--------|---------------|
| `Cmd+?` / `Ctrl+?` | Toggle keyboard shortcuts help | `panels/properties/PropertiesPanel.tsx:1099-1103` |
| `Escape` | Cancel border radius drag | `overlay/hooks/useBorderRadiusDrag.ts:228` |
| `Escape` | Close bottom panel | `layout/BottomPanelSlot.tsx:38-42` |
| `Arrow Up/Down` | Resize bottom panel height | `layout/BottomPanelSlot.tsx:105-108` |

---

## Implementation Patterns

### Pattern 1: useKeyboardShortcutsRegistry (Most Common)

Centralized keyboard shortcut management hook:

```typescript
useKeyboardShortcutsRegistry([
  { key: 'c', modifier: 'cmd', handler: copyFn, description: 'Copy' }
])
```

**Location:** `hooks/useKeyboardShortcutsRegistry.ts`

**Supported Modifiers:**
- `'cmd'` - Cmd (Mac) or Ctrl (Windows/Linux)
- `'cmdShift'` - Cmd+Shift or Ctrl+Shift
- `'alt'` - Alt or Option key
- `'altShift'` - Alt+Shift or Option+Shift
- `'none'` - No modifier required

**Interface:**
```typescript
interface KeyboardShortcut {
  key: string;           // 'c', 'Enter', '?', etc.
  code?: string;         // Optional: 'Space', 'ArrowUp', etc.
  modifier: KeyboardModifier;
  handler: () => void;
  preventDefault?: boolean; // default: true
  description?: string;
  disabled?: boolean;
}
```

### Pattern 2: Direct Event Listeners (System Level)

Used for system-level shortcuts like undo/redo and zoom:

```typescript
document.addEventListener('keydown', handleKeyDown, { capture: true });
```

**Characteristics:**
- Attached to `document` or `window`
- Uses capture phase (`{ capture: true }`)
- Can intercept before child elements

### Pattern 3: React Event Handlers (Input Fields)

For form/input fields:

```typescript
onKeyDown={(e: React.KeyboardEvent) => {
  if (e.key === 'Enter') { ... }
}}
```

### Pattern 4: Module-Level State

For complex interactions like border radius drag:

```typescript
let isDragging = false;
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isDragging) { ... }
}
```

---

## Platform Compatibility

All shortcuts use cross-platform compatible patterns:

```typescript
// Mac: metaKey (Cmd), Windows/Linux: ctrlKey
if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
  // Handle undo
}
```

---

## Event Handling Notes

1. **Input Element Filtering:** Registry automatically skips INPUT/TEXTAREA/contentEditable elements
2. **preventDefault:** Most shortcuts call `e.preventDefault()` to prevent browser defaults
3. **Capture Phase:** System shortcuts use `{ capture: true }` for priority
4. **History Tracking:** Edit operations tracked via `trackBatchUpdate()`, `trackGroupCreation()`, etc.

---

## Statistics Summary

| Category | Shortcut Count | Files |
|----------|----------------|-------|
| General/Undo | 2 | 1 |
| Zoom | 5 | 2 |
| Multi-element Editing | 5 | 1 |
| Text Editing | 4 | 2 |
| Selection | 7 | 1 |
| Grouping | 2 | 1 |
| Alignment | 6 | 1 |
| Distribution | 2 | 1 |
| Panel Navigation | 8 | 1 |
| Events | 7 | 2 |
| Tree Navigation | 7 | 1 |
| Property Input | 7 | 3 |
| Miscellaneous | 5 | 4 |
| **Total** | **67** | **22** |

---

## Custom Components with Keyboard Handling

The following components in `src/builder` implement custom keyboard handling, independent of `src/shared/components`:

### Property Input Components

#### 1. PropertyUnitInput
**Location:** `src/builder/components/property/PropertyUnitInput.tsx`

Custom unit input component with integrated keyboard handling for CSS values.

| Shortcut | Action | Line |
|----------|--------|------|
| `Enter` | Confirm value and blur | 210-246 |
| `Arrow Up` | Increment value (+1, +10 with Shift) | 256-259 |
| `Arrow Down` | Decrement value (-1, -10 with Shift) | 260-264 |

**Features:**
- Shorthand CSS value parsing (e.g., `8px 12px` → first value `8px`)
- Unit switching with ComboBox (px, %, rem, em, vh, vw, reset)
- RAF throttled updates via `onDrag` prop
- Duplicate save prevention with `justSavedViaEnterRef`

**Base:** Uses `react-aria-components` (ComboBox, Input, ListBox, Popover) but implements custom keyboard logic.

---

#### 2. PropertyCustomId
**Location:** `src/builder/components/property/PropertyCustomId.tsx`

Custom ID input with validation and keyboard handling.

| Shortcut | Action | Line |
|----------|--------|------|
| `Enter` | Validate and save ID | 78-103 |
| `Escape` | Revert to original value | 104-110 |

**Features:**
- Real-time validation via `validateCustomId()`
- Uniqueness check against all elements
- Error state display with `aria-invalid`

**Base:** Native `<input>` with `PropertyFieldset` wrapper.

---

#### 3. PropertyColor
**Location:** `src/builder/components/property/PropertyColor.tsx`

Color picker with keyboard support for hex input.

| Shortcut | Action | Line |
|----------|--------|------|
| `Enter` | Confirm color value | 75-85 |

**Features:**
- Local state management during drag
- `onChangeEnd` for final value commit
- Key-based remounting for external value sync

**Base:** Uses `react-aria-components` (ColorPicker, ColorField) + `src/shared/components` (ColorSwatch, ColorArea, ColorSlider, Popover).

---

#### 4. PropertyInput
**Location:** `src/builder/components/property/PropertyInput.tsx`

Generic text/number input with optional multiline support.

| Shortcut | Action | Line |
|----------|--------|------|
| `Enter` | Confirm value (single-line only) | 76-88 |

**Features:**
- Single-line and multiline (textarea) modes
- Auto-select on focus
- Duplicate save prevention

**Base:** Native `<input>` / `<textarea>` with `PropertyFieldset` wrapper.

---

### Keyboard Infrastructure Hooks

#### 5. useKeyboardShortcuts
**Location:** `src/builder/hooks/useKeyboardShortcuts.ts`

Global undo/redo keyboard handler.

| Shortcut | Action |
|----------|--------|
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo |

**Implementation:** Direct `document.addEventListener('keydown', ...)` with capture phase.

---

#### 6. useKeyboardShortcutsRegistry
**Location:** `src/builder/hooks/useKeyboardShortcutsRegistry.ts`

Centralized keyboard shortcut registry system.

**Supported Modifiers:**
- `'cmd'` - Cmd (Mac) / Ctrl (Windows)
- `'cmdShift'` - Cmd+Shift / Ctrl+Shift
- `'alt'` - Alt / Option
- `'altShift'` - Alt+Shift
- `'none'` - No modifier

**Features:**
- Automatic INPUT/TEXTAREA/contentEditable filtering
- First-match-only execution
- Optional `disabled` and `preventDefault` per shortcut

---

#### 7. useTreeKeyboardNavigation
**Location:** `src/builder/hooks/useTreeKeyboardNavigation.ts`

Tree/list keyboard navigation for hierarchical UI.

| Shortcut | Action |
|----------|--------|
| `Arrow Down` | Next item |
| `Arrow Up` | Previous item |
| `Home` | First item |
| `End` | Last item |
| `Enter` / `Space` | Select item |
| `Arrow Right` | Expand node |
| `Arrow Left` | Collapse / Parent |

**Usage:** Nodes panel, event handlers list, etc.

---

### Help UI Component

#### 8. KeyboardShortcutsHelp
**Location:** `src/builder/components/help/KeyboardShortcutsHelp.tsx`

Modal help panel displaying all available shortcuts.

**Features:**
- Categorized shortcut list (General, Selection, Editing, Properties, Grouping, Alignment, Distribution)
- Collapsible category sections
- Platform-aware modifier display (⌘ vs Ctrl)
- Opens via `Cmd+?` / `Ctrl+?`

**Base:** Uses `src/shared/components/Button` for close button.

---

### Comparison: Shared vs Custom Components

| Component | Shared (`src/shared`) | Custom (`src/builder`) | Keyboard Handling |
|-----------|----------------------|------------------------|-------------------|
| Button | ✅ `Button.tsx` | - | React Aria built-in |
| ColorPicker | ✅ `ColorPicker.tsx` | PropertyColor | Custom `onKeyDown` |
| TextField | ✅ `TextField.tsx` | PropertyInput | Custom `onKeyDown` |
| NumberField | ✅ `NumberField.tsx` | PropertyUnitInput | Custom with units |
| ComboBox | ✅ `ComboBox.tsx` | PropertyUnitInput | Custom with units |
| Tree | ✅ `Tree.tsx` | useTreeKeyboardNavigation | Custom hook |
| - | - | PropertyCustomId | Custom validation |
| - | - | KeyboardShortcutsHelp | Static display |
| - | - | useKeyboardShortcuts | Global undo/redo |
| - | - | useKeyboardShortcutsRegistry | Central registry |

**Why Custom?**
1. **PropertyUnitInput**: Requires unit switching + shorthand CSS parsing not available in shared NumberField
2. **PropertyCustomId**: Needs real-time validation against all elements
3. **PropertyColor**: Needs drag state management + `onChangeEnd` pattern
4. **PropertyInput**: Simpler than shared TextField, with optional multiline
5. **Keyboard Hooks**: Builder-specific global shortcuts not applicable to shared components

---

## Related Files

### Core Implementation
- `src/builder/hooks/useKeyboardShortcuts.ts` - Global undo/redo
- `src/builder/hooks/useKeyboardShortcutsRegistry.ts` - Centralized registry
- `src/builder/hooks/useTreeKeyboardNavigation.ts` - Tree navigation

### UI Components
- `src/builder/components/help/KeyboardShortcutsHelp.tsx` - Help panel
- `src/builder/workspace/ZoomControls.tsx` - Zoom UI controls

### Panel Shortcuts
- `src/builder/panels/properties/PropertiesPanel.tsx` - Most editing shortcuts
- `src/builder/panels/core/panelConfigs.ts` - Panel toggle shortcuts
- `src/builder/panels/events/hooks/useCopyPasteActions.ts` - Event actions
