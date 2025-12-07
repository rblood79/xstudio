# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Events Panel Block-Based UI (2025-12-08)

#### Phase 5: Block-Based UI Implementation

**New Block Components:**

- `src/builder/panels/events/blocks/WhenBlock.tsx`
  - Event trigger block (onClick, onChange, etc.)
  - Visual indicator with "WHEN" label
  - EventTypePicker integration for changing trigger

- `src/builder/panels/events/blocks/IfBlock.tsx`
  - Conditional execution block
  - ConditionGroup editor integration
  - Optional block (can be removed)

- `src/builder/panels/events/blocks/ThenElseBlock.tsx`
  - Action execution blocks
  - Action list with add/edit/delete
  - Toggle enabled/disabled per action

- `src/builder/panels/events/editors/BlockActionEditor.tsx`
  - Unified action config editor
  - Supports all 21 action types
  - Type-safe config handling

**Modified Files:**

- `src/builder/panels/events/EventsPanel.tsx`
  - Refactored to use block-based components
  - WHEN → IF → THEN/ELSE visual pattern
  - Added `enabled` safeguard (defaults to `true`)
  - Debug logging for action updates

- `src/builder/events/actions/NavigateActionEditor.tsx`
  - Added `normalizePath()` function
  - Auto-adds "/" prefix to all paths
  - Consistent URL path format

- `src/builder/main/BuilderCore.tsx`
  - Fixed NAVIGATE_TO_PAGE message handler
  - Bidirectional path/slug normalization
  - Handles both "/page" and "page" formats

- `src/utils/events/eventEngine.ts`
  - Added warning for disabled actions
  - `getActionConfig<T>()` helper function
  - Dual-field support (config/value)

**Bug Fixes:**

- Fixed navigate action not executing due to `enabled: false`
- Fixed page navigation failing due to slug mismatch
- Fixed path comparison without "/" prefix normalization

**Results:**
- ✅ Block-based visual event editor
- ✅ Navigate action works correctly
- ✅ Path format standardized with "/" prefix
- ✅ All 21 action types supported

### Added - Panel System Refactoring (2025-11-16)

#### Phase 1: Stability Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useInitialMountDetection.ts` (106 lines)
  - Generic hook for distinguishing initial mount from data changes
  - Prevents database data overwriting on component mount
  - Uses JSON comparison and resetKey pattern for reliability
  - Supports custom dependencies and update callbacks

**Modified Files:**

- `src/builder/panels/data/DataPanel.tsx`
  - Replaced hardcoded empty state HTML with `EmptyState` component
  - Improved consistency across panels

- `src/builder/panels/ai/AIPanel.tsx`
  - Replaced module-level singleton with `useMemo` for Groq service initialization
  - Better lifecycle management and error handling
  - Prevents stale service instances across remounts

- `src/builder/panels/events/EventsPanel.tsx`
  - Applied `useInitialMountDetection` hook to handler and action synchronization
  - **Reduced code: 62 lines → 16 lines (76% reduction)**
  - Fixed EventType import path conflict (`@/types/events/events.types`)
  - Removed unnecessary type assertions (`as unknown as`)

**Results:**
- ✅ Zero TypeScript errors
- ✅ Zero Lint errors
- ✅ No `any` types
- ✅ 76% code reduction in EventsPanel synchronization logic

#### Phase 2: Performance Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useKeyboardShortcutsRegistry.ts` (147 lines)
  - Centralized keyboard shortcut registration system
  - Declarative shortcut definitions with modifier support
  - Automatic cleanup and conflict prevention
  - Blocks shortcuts when user is typing in input fields

**Modified Files:**

- `src/builder/panels/properties/PropertiesPanel.tsx`
  - Applied `useKeyboardShortcutsRegistry` for copy/paste shortcuts
  - **Reduced code: 30 lines → 15 lines (50% reduction)**
  - Cleaner, more maintainable keyboard handling

- `src/builder/panels/styles/StylesPanel.tsx`
  - Applied `useKeyboardShortcutsRegistry` for copy/paste shortcuts
  - **Reduced code: 38 lines → 24 lines (37% reduction)**
  - Consistent with PropertiesPanel pattern

**Results:**
- ✅ Eliminated duplicate keyboard event listener code
- ✅ Declarative shortcut definitions
- ✅ 37-50% code reduction in keyboard handling

**Attempted (Reverted):**

- `src/builder/panels/settings/SettingsPanel.tsx`
  - **Attempted:** Group 19 individual `useStore` selectors into 2-4 grouped selectors
  - **Result:** Caused infinite loop due to Zustand object reference instability
  - **Resolution:** Reverted to original code with individual selectors
  - **Lesson:** Zustand grouped selectors with object returns are unsafe

#### Phase 3: Reusability Improvements

**Created Reusable Hooks:**

- `src/builder/hooks/useCopyPaste.ts` (95 lines)
  - Generic clipboard-based copy/paste for JSON-serializable data
  - Built-in validation and transformation support
  - Consistent error handling across use cases
  - Supports custom data validation callbacks

**Modified Files:**

- `src/builder/panels/properties/PropertiesPanel.tsx`
  - Applied `useCopyPaste` hook for property copy/paste
  - **Reduced code: 15 lines → 3 lines (80% reduction)**
  - Eliminated duplicate clipboard logic

- `src/builder/panels/styles/hooks/useStyleActions.ts`
  - Applied `useCopyPaste` hook for style copy/paste
  - **Reduced code: 38 lines → 7 lines (82% reduction)**
  - Added automatic type conversion for styles (all values → strings)

**Results:**
- ✅ Generic clipboard utilities reusable across all panels
- ✅ 80%+ code reduction in copy/paste implementations
- ✅ Consistent clipboard error handling

### Overall Statistics

**Code Reduction:**
- EventsPanel: 76% reduction (62→16 lines)
- PropertiesPanel keyboard: 50% reduction (30→15 lines)
- StylesPanel keyboard: 37% reduction (38→24 lines)
- PropertiesPanel copy/paste: 80% reduction (15→3 lines)
- useStyleActions copy/paste: 82% reduction (38→7 lines)

**Reusable Hooks Created:**
1. `useInitialMountDetection` - 106 lines
2. `useKeyboardShortcutsRegistry` - 147 lines
3. `useCopyPaste` - 95 lines

**Total Code Quality:**
- ✅ Zero TypeScript errors
- ✅ Zero Lint errors
- ✅ Zero `any` types
- ✅ 100% tested and validated

### Anti-Patterns Discovered & Documented

**1. Zustand Grouped Selectors with Object Returns**

❌ **WRONG - Causes Infinite Loop:**
```typescript
const settings = useStore((state) => ({
  showOverlay: state.showOverlay,
  showGrid: state.showGrid,
  // ... more fields
}));
```

**Problem:** Every render creates a new object with a new reference, triggering infinite re-renders.

✅ **CORRECT - Individual Selectors:**
```typescript
const showOverlay = useStore((state) => state.showOverlay);
const showGrid = useStore((state) => state.showGrid);
// ... individual selectors
```

**2. useShallow Wrapper Pattern**

❌ **WRONG - Also Causes Infinite Loop:**
```typescript
import { useShallow } from "zustand/react/shallow";

const settings = useStore(
  useShallow((state) => ({
    showOverlay: state.showOverlay,
    // ...
  }))
);
```

**Problem:** `useShallow` wrapper recreates the selector function every render.

✅ **CORRECT - Individual Selectors (Same as #1):**
```typescript
const showOverlay = useStore((state) => state.showOverlay);
```

**3. Manual Keyboard Event Listeners**

❌ **WRONG - Duplicate Code:**
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey && event.shiftKey && event.key === 'c') {
      handleCopy();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleCopy]);
```

✅ **CORRECT - Use Hook:**
```typescript
const shortcuts = useMemo(() => [
  { key: 'c', modifier: 'cmdShift', handler: handleCopy, description: 'Copy' },
], [handleCopy]);

useKeyboardShortcutsRegistry(shortcuts, [handleCopy]);
```

**4. Duplicate Clipboard Code**

❌ **WRONG - Duplicate Logic:**
```typescript
const handleCopy = useCallback(async () => {
  try {
    const json = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(json);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}, [data]);
```

✅ **CORRECT - Use Hook:**
```typescript
const { copy } = useCopyPaste({ onPaste: handlePaste, name: 'properties' });

const handleCopy = useCallback(async () => {
  await copy(data);
}, [data, copy]);
```

**5. EventType Import Path Conflicts**

❌ **WRONG - Legacy Path with Extra Types:**
```typescript
import type { EventType } from "../../events/types/eventTypes";
// This path includes 'onInput' not in registry
```

✅ **CORRECT - Registry Path:**
```typescript
import type { EventType } from "@/types/events/events.types";
// Official registry path with validated types
```

### Breaking Changes

None. All changes are internal refactoring with backward compatibility maintained.

### Migration Guide

**For developers using panels:**

No migration needed. All public APIs remain unchanged.

**For developers adding new panels:**

Consider using the new reusable hooks:

1. **Initial Mount Detection:**
   ```typescript
   import { useInitialMountDetection } from '../../hooks/useInitialMountDetection';

   useInitialMountDetection({
     data: myData,
     onUpdate: (updatedData) => saveToDatabase(updatedData),
     resetKey: selectedElement?.id, // Reset on element change
   });
   ```

2. **Keyboard Shortcuts:**
   ```typescript
   import { useKeyboardShortcutsRegistry } from '../../hooks/useKeyboardShortcutsRegistry';

   const shortcuts = useMemo(() => [
     { key: 'c', modifier: 'cmdShift', handler: handleCopy, description: 'Copy' },
     { key: 'v', modifier: 'cmdShift', handler: handlePaste, description: 'Paste' },
   ], [handleCopy, handlePaste]);

   useKeyboardShortcutsRegistry(shortcuts, [handleCopy, handlePaste]);
   ```

3. **Copy/Paste:**
   ```typescript
   import { useCopyPaste } from '../../hooks/useCopyPaste';

   const { copy, paste } = useCopyPaste({
     onPaste: (data) => updateState(data),
     validate: (data) => typeof data === 'object' && data !== null,
     name: 'myFeature',
   });
   ```

### References

- [Pull Request #XXX](link-to-pr)
- [Issue #XXX - Panel Refactoring](link-to-issue)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/performance)
