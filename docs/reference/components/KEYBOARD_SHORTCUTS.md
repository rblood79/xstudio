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
