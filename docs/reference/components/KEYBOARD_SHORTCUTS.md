# Keyboard Shortcuts Audit Report

> **Generated:** 2024-12-28
> **Scope:** `src/builder` directory
> **Total Shortcuts:** 67+
> **Files Affected:** 22

---

## Summary

This document provides a comprehensive audit of all keyboard shortcuts implemented in the `src/builder` directory of XStudio.

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
