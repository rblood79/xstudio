# WebGL Canvas Component Migration Status

> **Last Updated**: 2025-12-16
> **Branch**: claude/migrate-panel-components-webgl-96QYI

## Overview

This document tracks the migration progress of React Aria Components from the iframe preview system (`src/canvas/`) to the WebGL-based canvas system (`src/builder/workspace/canvas/ui/`).

### Architecture Comparison

| Aspect | iframe Preview | WebGL Canvas |
|--------|----------------|--------------|
| Location | `src/canvas/renderers/` | `src/builder/workspace/canvas/ui/` |
| Base | React Aria Components | @pixi/ui + Custom PixiJS |
| Rendering | DOM-based | WebGL Graphics |
| Component Prefix | None (direct RAC) | `Pixi*` |

---

## Migration Progress Summary

### Overall Stats

| Category | Total | Migrated | Pending | Progress |
|----------|-------|----------|---------|----------|
| **Basic UI** | 8 | 5 | 3 | 62.5% |
| **Form Controls** | 10 | 3 | 7 | 30.0% |
| **Selection/Collection** | 12 | 5 | 7 | 41.7% |
| **Layout Components** | 6 | 0 | 6 | 0.0% |
| **Date/Time** | 5 | 0 | 5 | 0.0% |
| **Navigation** | 4 | 0 | 4 | 0.0% |
| **Overlay/Modal** | 4 | 0 | 4 | 0.0% |
| **Data Display** | 5 | 1 | 4 | 20.0% |
| **Primitives** | 3 | 3 | 0 | 100.0% |
| **Total** | **57** | **17** | **40** | **29.8%** |

---

## Detailed Migration Status

### ✅ Completed (17 components)

#### Core Sprites (Primitives)
| Component | WebGL Implementation | Status | Notes |
|-----------|---------------------|--------|-------|
| Box/Container | `BoxSprite.tsx` | ✅ Complete | borderStyle support |
| Text | `TextSprite.tsx` | ✅ Complete | textDecoration, textTransform |
| Image | `ImageSprite.tsx` | ✅ Complete | Loading states |

#### Basic UI Components
| React Aria | WebGL Implementation | Status | Notes |
|------------|---------------------|--------|-------|
| Button | `PixiButton.tsx` | ✅ Complete | FancyButton wrapper |
| FancyButton | `PixiFancyButton.tsx` | ✅ Complete | Enhanced button |
| ProgressBar | `PixiProgressBar.tsx` | ✅ Complete | |
| Slider | `PixiSlider.tsx` | ✅ Complete | |
| Switch | `PixiSwitcher.tsx` | ✅ Complete | @pixi/ui Switcher |

#### Form Controls
| React Aria | WebGL Implementation | Status | Notes |
|------------|---------------------|--------|-------|
| Input/TextField | `PixiInput.tsx` | ✅ Complete | Text input handling |
| Select | `PixiSelect.tsx` | ✅ Complete | Dropdown |
| Checkbox | `PixiCheckbox.tsx` | ✅ Complete | Standalone checkbox |

#### Selection/Collection
| React Aria | WebGL Implementation | Status | Notes |
|------------|---------------------|--------|-------|
| CheckboxGroup | `PixiCheckboxGroup.tsx` | ✅ Complete | Visual rendering |
| CheckboxItem | `PixiCheckboxItem.tsx` | ✅ Complete | Hit area for group |
| RadioGroup | `PixiRadio.tsx` | ✅ Complete | Group container |
| RadioItem | `PixiRadioItem.tsx` | ✅ Complete | Hit area only |
| List | `PixiList.tsx` | ✅ Complete | Virtual list |

#### Data Display
| React Aria | WebGL Implementation | Status | Notes |
|------------|---------------------|--------|-------|
| MaskedFrame | `PixiMaskedFrame.tsx` | ✅ Complete | Clipped image |

#### Containers
| React Aria | WebGL Implementation | Status | Notes |
|------------|---------------------|--------|-------|
| ScrollBox | `PixiScrollBox.tsx` | ✅ Complete | Scroll container |

---

### 🔄 Pending Migration (40 components)

#### Basic UI Components (3 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| ToggleButton | High | Medium | Group selection support needed |
| ToggleButtonGroup | High | Medium | Multiple selection |
| Badge | Low | Low | Text with background |

#### Form Controls (7 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| NumberField | High | Medium | Numeric input + stepper |
| SearchField | Medium | Medium | Input + clear button |
| ColorField | Low | High | Color picker integration |
| ColorPicker | Low | High | Complex color selection |
| ColorArea | Low | High | 2D color selection |
| ColorSlider | Low | High | Color channel slider |
| ColorWheel | Low | High | Circular color picker |

#### Selection/Collection (7 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| ListBox | High | High | Item rendering, selection |
| ListBoxItem | High | Medium | Item template |
| GridList | High | High | Grid layout |
| GridListItem | High | Medium | Grid item |
| ComboBox | Medium | High | Input + dropdown |
| ComboBoxItem | Medium | Medium | Item template |
| Menu | Medium | High | Context menu |

#### Layout Components (6 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Tabs | High | High | Tab + Panel coordination |
| Tab | High | Medium | Tab button |
| Panel | High | Medium | Content panel |
| Tree | Medium | High | Hierarchical structure |
| TreeItem | Medium | High | Expandable node |
| Table | Low | Very High | Complex grid system |

#### Date/Time Components (5 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Calendar | Low | Very High | Grid + navigation |
| DatePicker | Low | Very High | Calendar + input |
| DateRangePicker | Low | Very High | Dual calendar |
| DateField | Low | High | Segmented date input |
| TimeField | Low | High | Segmented time input |

#### Navigation Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Breadcrumbs | Medium | Medium | Link chain |
| Breadcrumb | Medium | Low | Single item |
| Link | Low | Low | Clickable text |
| Toolbar | Low | Medium | Action bar |

#### Overlay/Modal Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Dialog | Low | High | Modal dialog |
| Modal | Low | High | Modal container |
| Popover | Low | High | Positioned overlay |
| Tooltip | Low | Medium | Hover info |

#### Data Display Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Meter | Medium | Medium | Value indicator |
| Card | Low | Low | Container with style |
| Separator | Low | Low | Line divider |
| TagGroup/Tag | Low | Medium | Tag collection |

---

## Migration Priority Roadmap

### Phase 1: Core Collection Components (Priority: High)
**Goal**: Enable data-driven lists and selection

1. `PixiListBox` + `PixiListBoxItem`
2. `PixiGridList` + `PixiGridListItem`
3. `PixiToggleButton` + `PixiToggleButtonGroup`
4. `PixiComboBox` + `PixiComboBoxItem`

### Phase 2: Layout Components (Priority: High)
**Goal**: Enable complex layouts

1. `PixiTabs` + `PixiTab` + `PixiPanel`
2. `PixiTree` + `PixiTreeItem`
3. `PixiMenu` + `PixiMenuItem`

### Phase 3: Form Enhancements (Priority: Medium)
**Goal**: Complete form control set

1. `PixiNumberField`
2. `PixiSearchField`
3. `PixiMeter`

### Phase 4: Navigation (Priority: Medium)
**Goal**: Enable page navigation UI

1. `PixiBreadcrumbs` + `PixiBreadcrumb`
2. `PixiLink`
3. `PixiToolbar`

### Phase 5: Advanced Components (Priority: Low)
**Goal**: Full feature parity

1. Date/Time components
2. Color components
3. Overlay components

---

## Implementation Patterns

### Standard Component Structure

```tsx
// src/builder/workspace/canvas/ui/PixiComponent.tsx

import { memo, useRef, useEffect, useCallback } from 'react';
import { Container } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { useExtend, extend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { parseStyleValue } from '../sprites/styleConverter';

export interface PixiComponentProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

export const PixiComponent = memo(function PixiComponent({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiComponentProps) {
  useExtend(PIXI_COMPONENTS);
  const containerRef = useRef<Container>(null);

  // Extract styles
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const width = parseStyleValue(style.width, 200);
  const height = parseStyleValue(style.height, 40);

  // Event handlers
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Render using @pixi/ui or custom Graphics
  return (
    <pixiContainer
      ref={containerRef}
      x={x}
      y={y}
      eventMode="static"
      onPointerDown={handleClick}
    >
      {/* Component-specific rendering */}
    </pixiContainer>
  );
});
```

### Key Considerations

1. **Use Imperative API for @pixi/ui**: Components like FancyButton, Slider require imperative instantiation
2. **Style Conversion**: Use `styleConverter.ts` for CSS → PixiJS value mapping
3. **Event Handling**: Use `eventMode="static"` and `onPointerDown`/`onPointerUp`
4. **State Sync**: Consider Zustand integration for complex state

---

## Files Reference

### Completed Components
```
src/builder/workspace/canvas/ui/
├── index.ts                # Module exports
├── PixiButton.tsx          # Basic button
├── PixiFancyButton.tsx     # Enhanced button
├── PixiCheckbox.tsx        # Standalone checkbox
├── PixiCheckboxGroup.tsx   # Checkbox container
├── PixiCheckboxItem.tsx    # Checkbox in group
├── PixiRadio.tsx           # RadioGroup
├── PixiRadioItem.tsx       # Radio in group
├── PixiSlider.tsx          # Range slider
├── PixiInput.tsx           # Text input
├── PixiSelect.tsx          # Dropdown select
├── PixiProgressBar.tsx     # Progress indicator
├── PixiSwitcher.tsx        # Toggle switch
├── PixiScrollBox.tsx       # Scroll container
├── PixiList.tsx            # Virtual list
└── PixiMaskedFrame.tsx     # Clipped image
```

### Core Sprites
```
src/builder/workspace/canvas/sprites/
├── ElementSprite.tsx       # Type router/dispatcher
├── BoxSprite.tsx           # Container rendering
├── TextSprite.tsx          # Text rendering
├── ImageSprite.tsx         # Image rendering
├── styleConverter.ts       # CSS → PixiJS conversion
└── paddingUtils.ts         # Padding utilities
```

### Layout System
```
src/builder/workspace/canvas/layout/
├── LayoutEngine.ts         # Yoga v3 Flexbox
└── GridLayout.tsx          # CSS Grid manual
```

---

## Notes

- Migration uses `@pixi/ui` v2.3.2 components where applicable
- Yoga v3.2.1 handles Flexbox layout calculations
- Focus on high-priority components that enable basic builder functionality first
- Complex components (Date/Time, Color) can be deferred as they're less commonly used in initial builds
