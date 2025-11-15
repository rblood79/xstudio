# Multi-Element Selection: Future Improvements

**Last Updated**: 2025-11-16
**Current Status**: ✅ Phase 1 Complete (Basic Multi-Select)

This document outlines potential improvements and enhancements for the multi-element selection feature.

---

## 🎯 Phase 2: Multi-Element Editing (Priority: High)

### 1. Batch Property Editor

**Goal**: Allow editing common properties across multiple selected elements

**UI Design**:
```
┌─────────────────────────────────────┐
│ 🔹 3 Elements Selected              │
├─────────────────────────────────────┤
│ Common Properties:                  │
│                                     │
│ Width:     [Mixed Values ▼]        │
│ Height:    [Mixed Values ▼]        │
│ Background: #ffffff ████           │  ← Same value
│ Color:     [Mixed Values ▼]        │
│                                     │
│ [Apply to All] [Reset]             │
└─────────────────────────────────────┘
```

**Features**:
- Show "Mixed Values" for properties with different values
- Allow setting common value for all selected elements
- Undo/redo support for batch changes
- Smart property detection (only show applicable properties)

**Implementation**:
- File: `src/builder/inspector/properties/BatchPropertyEditor.tsx`
- Store action: `updateMultipleElements(elementIds, props)`
- History: Single undo entry for batch operation

**Complexity**: Medium (3-5 days)

---

### 2. Multi-Select Status Indicator

**Goal**: Show selection count and provide quick actions

**UI Design**:
```
┌─────────────────────────────────────┐
│ 🔹 5 elements selected              │
│                                     │
│ [Group] [Align] [Distribute] [✕]   │
└─────────────────────────────────────┘
```

**Features**:
- Display count of selected elements
- Quick action buttons (Group, Align, Distribute, Clear)
- Keyboard shortcut hints (Esc to deselect)

**Implementation**:
- Component: `src/builder/inspector/components/MultiSelectIndicator.tsx`
- Position: Top of Inspector panel
- Integration: Read from `selectedElementIds.length`

**Complexity**: Low (1-2 days)

---

## 🎯 Phase 3: Advanced Selection (Priority: Medium)

### 3. Keyboard Shortcuts

**Goal**: Provide keyboard-based selection controls

**Shortcuts**:
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Cmd+A` | Select All | Select all elements in current page |
| `Esc` | Deselect | Clear all selections |
| `Cmd+Shift+A` | Invert Selection | Toggle selection of all elements |
| `Tab` | Next Element | Select next element in DOM order |
| `Shift+Tab` | Previous Element | Select previous element |

**Implementation**:
```typescript
// src/builder/hooks/useSelectionShortcuts.ts
useKeyboardShortcutsRegistry([
  {
    key: 'a',
    modifier: 'cmd',
    handler: handleSelectAll,
    description: 'Select all elements'
  },
  {
    key: 'Escape',
    modifier: 'none',
    handler: handleDeselect,
    description: 'Clear selection'
  },
  // ... more shortcuts
]);
```

**Complexity**: Low (1-2 days)

---

### 4. Selection Filters

**Goal**: Filter selection by element type, tag, or properties

**UI Design**:
```
┌─────────────────────────────────────┐
│ Filter Selection:                   │
│                                     │
│ Type: [All ▼] Tag: [All ▼]        │
│                                     │
│ ☑ Button (3)                        │
│ ☑ Input (2)                         │
│ ☐ Card (5)                          │
│                                     │
│ [Apply Filter]                      │
└─────────────────────────────────────┘
```

**Features**:
- Filter by component type (Button, Input, Card, etc.)
- Filter by tag (div, span, section, etc.)
- Filter by custom properties (className, data-* attributes)
- Checkbox-based multi-filter

**Implementation**:
- Component: `src/builder/inspector/components/SelectionFilter.tsx`
- Store action: `filterSelection(predicate)`

**Complexity**: Medium (2-3 days)

---

## 🎯 Phase 4: Grouping & Organization (Priority: Medium)

### 5. Group Selection

**Goal**: Create element groups from selected elements

**Features**:
- Create `<Group>` container element
- Move selected elements inside group
- Maintain relative positions
- Preserve parent-child relationships

**UI Flow**:
1. Select multiple elements
2. Click "Group" button or `Cmd+G`
3. Group element created with unique ID
4. Selected elements become children
5. Group appears in Layer Tree

**Implementation**:
```typescript
// src/builder/stores/utils/elementGrouping.ts
export const createGroupFromSelection = (
  elementIds: string[],
  pageId: string
) => {
  const groupElement = {
    id: generateId(),
    tag: 'Group',
    props: { className: 'element-group' },
    parent_id: null,
    page_id: pageId,
    order_num: getNextOrderNum(),
  };

  // Update selected elements' parent_id
  const updatedElements = elementIds.map(id => ({
    ...getElement(id),
    parent_id: groupElement.id
  }));

  return { groupElement, updatedElements };
};
```

**Complexity**: Medium-High (4-6 days)

---

### 6. Ungroup Selection

**Goal**: Break apart grouped elements

**Features**:
- Select group element
- Click "Ungroup" or `Cmd+Shift+G`
- Children move to group's parent
- Maintain order_num sequence
- Group element deleted

**Implementation**:
```typescript
// src/builder/stores/utils/elementGrouping.ts
export const ungroupElement = (groupId: string) => {
  const group = getElement(groupId);
  const children = getChildElements(groupId);

  // Move children to group's parent
  const updatedChildren = children.map(child => ({
    ...child,
    parent_id: group.parent_id,
  }));

  // Delete group
  removeElement(groupId);

  return updatedChildren;
};
```

**Complexity**: Low (1-2 days)

---

## 🎯 Phase 5: Alignment & Distribution (Priority: Low)

### 7. Element Alignment

**Goal**: Align selected elements relative to each other

**Alignment Options**:
- **Horizontal**: Left, Center, Right
- **Vertical**: Top, Middle, Bottom

**UI Design**:
```
┌─────────────────────────────────────┐
│ Align:                              │
│                                     │
│ [⬅] [↔] [➡]  [⬆] [↕] [⬇]          │
│  L    C   R    T   M   B            │
└─────────────────────────────────────┘
```

**Algorithm**:
```typescript
// Align Left
const leftmost = Math.min(...elements.map(el => el.rect.left));
elements.forEach(el => {
  updateElementProps(el.id, {
    style: { ...el.props.style, left: leftmost }
  });
});

// Align Center (horizontal)
const centerX = elements.reduce((sum, el) => sum + el.rect.left + el.rect.width / 2, 0) / elements.length;
elements.forEach(el => {
  updateElementProps(el.id, {
    style: { ...el.props.style, left: centerX - el.rect.width / 2 }
  });
});
```

**Complexity**: Medium (2-3 days)

---

### 8. Element Distribution

**Goal**: Evenly distribute selected elements

**Distribution Options**:
- **Horizontal**: Even spacing between elements
- **Vertical**: Even spacing between elements

**UI Design**:
```
┌─────────────────────────────────────┐
│ Distribute:                         │
│                                     │
│ [↔ Horizontal] [↕ Vertical]        │
└─────────────────────────────────────┘
```

**Algorithm**:
```typescript
// Distribute Horizontally
const sorted = elements.sort((a, b) => a.rect.left - b.rect.left);
const totalWidth = sorted[sorted.length - 1].rect.right - sorted[0].rect.left;
const totalElementWidth = sorted.reduce((sum, el) => sum + el.rect.width, 0);
const spacing = (totalWidth - totalElementWidth) / (sorted.length - 1);

let currentLeft = sorted[0].rect.left;
sorted.forEach((el, index) => {
  if (index > 0) {
    currentLeft += sorted[index - 1].rect.width + spacing;
    updateElementProps(el.id, {
      style: { ...el.props.style, left: currentLeft }
    });
  }
});
```

**Complexity**: Medium (2-3 days)

---

## 🎯 Phase 6: Copy/Paste/Duplicate (Priority: High)

### 9. Multi-Element Copy/Paste

**Goal**: Copy and paste multiple selected elements

**Features**:
- Copy all selected elements to clipboard
- Maintain parent-child relationships
- Preserve relative positions
- Generate new IDs on paste
- Paste at mouse position or offset

**Implementation**:
```typescript
// Extend existing useCopyPaste hook
export function useCopyPaste() {
  const copyMultiple = useCallback(() => {
    const elements = selectedElementIds.map(id => getElement(id));

    // Build tree structure
    const tree = buildElementTree(elements);

    // Serialize with relationships
    const clipboard = {
      type: 'multi-elements',
      count: elements.length,
      tree: tree,
      timestamp: Date.now()
    };

    navigator.clipboard.writeText(JSON.stringify(clipboard));
  }, [selectedElementIds]);

  const pasteMultiple = useCallback((position?: { x: number; y: number }) => {
    const data = await navigator.clipboard.readText();
    const clipboard = JSON.parse(data);

    if (clipboard.type !== 'multi-elements') return;

    // Regenerate IDs
    const newElements = regenerateIds(clipboard.tree);

    // Offset position
    if (position) {
      offsetElementPositions(newElements, position);
    }

    // Add to store
    addComplexElement(newElements);
  }, []);

  return { copyMultiple, pasteMultiple };
}
```

**Complexity**: Medium-High (4-5 days)

---

### 10. Duplicate Selection

**Goal**: Quickly duplicate selected elements

**Features**:
- Shortcut: `Cmd+D`
- Duplicate with offset (10px right, 10px down)
- Maintain relationships
- Auto-select duplicated elements

**Implementation**:
```typescript
const duplicateSelection = useCallback(() => {
  const elements = selectedElementIds.map(id => getElement(id));
  const duplicated = elements.map(el => ({
    ...el,
    id: generateId(),
    props: {
      ...el.props,
      style: {
        ...el.props.style,
        left: (el.props.style.left || 0) + 10,
        top: (el.props.style.top || 0) + 10,
      }
    }
  }));

  addElements(duplicated);
  setSelectedElements(duplicated.map(el => el.id));
}, [selectedElementIds]);
```

**Complexity**: Low (1 day)

---

## 🎯 Phase 7: History & Undo (Priority: High)

### 11. Multi-Select History Integration

**Goal**: Track multi-select operations in undo/redo history

**Operations to Track**:
- Multi-element selection changes
- Batch property updates
- Group/ungroup operations
- Alignment/distribution changes
- Multi-element delete

**Implementation**:
```typescript
// Extend history manager
export const recordMultiSelectAction = (
  action: 'select' | 'update' | 'delete' | 'group',
  elementIds: string[],
  prevState: any,
  nextState: any
) => {
  historyManager.push({
    type: 'multi-select',
    action,
    elementIds,
    prevState,
    nextState,
    timestamp: Date.now(),
    undo: () => restoreState(prevState),
    redo: () => applyState(nextState),
  });
};
```

**Complexity**: Medium (2-3 days)

---

## 🎯 Phase 8: Performance Optimization (Priority: Low)

### 12. Virtual Scrolling for Large Selections

**Goal**: Handle 100+ element selections without performance degradation

**Problem**: Rendering 100+ overlay elements causes lag

**Solution**: Virtual scrolling pattern
```typescript
// Only render overlays visible in viewport
const visibleOverlays = useMemo(() => {
  return multiOverlays.filter(overlay => {
    return isInViewport(overlay.rect, viewportBounds);
  });
}, [multiOverlays, viewportBounds]);
```

**Complexity**: Medium (2-3 days)

---

### 13. Debounced Overlay Updates

**Goal**: Reduce re-renders during scroll/resize

**Current**: Overlay updates on every scroll event
**Improved**: Debounce updates to 16ms (60fps)

**Implementation**:
```typescript
const updateMultiOverlays = useMemo(() =>
  debounce(() => {
    // Update logic
  }, 16),
  [selectedElementIds]
);
```

**Complexity**: Low (1 day)

---

## 🎯 Phase 9: Advanced Features (Priority: Low)

### 14. Selection Memory

**Goal**: Remember previous selections for quick re-selection

**Features**:
- Store last 5 selections
- Quick access dropdown
- Keyboard shortcut to cycle through history

**UI Design**:
```
┌─────────────────────────────────────┐
│ Selection History:                  │
│                                     │
│ ○ 3 Buttons (2 min ago)            │
│ ● 5 Cards (5 min ago)   ← Current  │
│ ○ 2 Inputs (10 min ago)            │
└─────────────────────────────────────┘
```

**Implementation**:
```typescript
interface SelectionHistory {
  id: string;
  elementIds: string[];
  timestamp: number;
  label: string; // "3 Buttons", "5 Cards"
}

const selectionHistory = useStore((state) => state.selectionHistory);
const restoreSelection = (historyId: string) => {
  const history = selectionHistory.find(h => h.id === historyId);
  if (history) {
    setSelectedElements(history.elementIds);
  }
};
```

**Complexity**: Low (1-2 days)

---

### 15. Smart Selection (AI-Powered)

**Goal**: AI-suggested selections based on context

**Features**:
- "Select similar elements" (same tag, class, or style)
- "Select siblings" (same parent)
- "Select children" (all descendants)
- "Select by pattern" (e.g., all buttons in a form)

**UI Design**:
```
┌─────────────────────────────────────┐
│ Smart Select:                       │
│                                     │
│ ○ Similar elements (12 found)      │
│ ○ Siblings (4 found)               │
│ ● Children (8 found)               │
│                                     │
│ [Apply Selection]                   │
└─────────────────────────────────────┘
```

**Implementation**:
```typescript
const selectSimilar = (referenceId: string) => {
  const reference = getElement(referenceId);
  const similar = elements.filter(el =>
    el.tag === reference.tag &&
    el.props.className === reference.props.className
  );
  setSelectedElements(similar.map(el => el.id));
};

const selectSiblings = (referenceId: string) => {
  const reference = getElement(referenceId);
  const siblings = elements.filter(el =>
    el.parent_id === reference.parent_id &&
    el.id !== referenceId
  );
  setSelectedElements(siblings.map(el => el.id));
};
```

**Complexity**: Medium (3-4 days)

---

## 📊 Implementation Priority Matrix

| Phase | Feature | Priority | Complexity | Estimated Days |
|-------|---------|----------|------------|----------------|
| 2 | Batch Property Editor | 🔴 High | Medium | 3-5 |
| 2 | Multi-Select Status Indicator | 🔴 High | Low | 1-2 |
| 3 | Keyboard Shortcuts | 🟡 Medium | Low | 1-2 |
| 3 | Selection Filters | 🟡 Medium | Medium | 2-3 |
| 4 | Group Selection | 🟡 Medium | Med-High | 4-6 |
| 4 | Ungroup Selection | 🟡 Medium | Low | 1-2 |
| 5 | Element Alignment | 🟢 Low | Medium | 2-3 |
| 5 | Element Distribution | 🟢 Low | Medium | 2-3 |
| 6 | Multi-Element Copy/Paste | 🔴 High | Med-High | 4-5 |
| 6 | Duplicate Selection | 🔴 High | Low | 1 |
| 7 | History Integration | 🔴 High | Medium | 2-3 |
| 8 | Virtual Scrolling | 🟢 Low | Medium | 2-3 |
| 8 | Debounced Updates | 🟢 Low | Low | 1 |
| 9 | Selection Memory | 🟢 Low | Low | 1-2 |
| 9 | Smart Selection | 🟢 Low | Medium | 3-4 |

**Total Estimated Effort**: 30-47 days (6-9 weeks)

---

## 🎯 Recommended Implementation Order

### Sprint 1 (1 week): Essential Editing
1. Multi-Select Status Indicator (1-2 days)
2. Batch Property Editor (3-5 days)

### Sprint 2 (1 week): Copy/Paste
3. Duplicate Selection (1 day)
4. Multi-Element Copy/Paste (4-5 days)

### Sprint 3 (1 week): History & Shortcuts
5. History Integration (2-3 days)
6. Keyboard Shortcuts (1-2 days)

### Sprint 4 (1-2 weeks): Grouping & Organization
7. Group Selection (4-6 days)
8. Ungroup Selection (1-2 days)
9. Selection Filters (2-3 days)

### Sprint 5 (1 week): Alignment & Distribution
10. Element Alignment (2-3 days)
11. Element Distribution (2-3 days)

### Sprint 6 (1 week): Advanced Features
12. Smart Selection (3-4 days)
13. Selection Memory (1-2 days)

### Sprint 7 (1 week): Performance
14. Debounced Updates (1 day)
15. Virtual Scrolling (2-3 days)

---

## 🔗 Related Documentation

- **Implementation Guide**: `CLAUDE.md` (Multi-Element Selection section)
- **Architecture**: `docs/CSS_ARCHITECTURE.md`
- **Store Pattern**: `src/builder/stores/README.md`
- **Keyboard Shortcuts**: `src/builder/hooks/useKeyboardShortcutsRegistry.ts`

---

## 📝 Notes

- All features should maintain backward compatibility
- Use existing Action Token system for styling
- Follow React Aria accessibility patterns
- Add comprehensive tests for each feature
- Update Storybook stories for new components
- Document breaking changes in CHANGELOG.md

---

**Last Updated**: 2025-11-16
**Next Review**: After Phase 2 completion
