# Planned Features

> **Note**: 이 문서는 CLAUDE.md에서 분리된 계획 중인 기능들입니다.
> 구현 완료 시 해당 섹션을 `docs/features/`로 이동합니다.

**최종 업데이트**: 2025-12-11

---

## 목차

1. [Context Menu System](#-context-menu-system)
2. [Dataset Component Architecture](#-dataset-component-architecture)
3. [Layout Preset 개선 계획](#-layout-preset-개선-계획)

---

## 🎯 Context Menu System

**Status**: 📋 Planning Phase

### Overview

Comprehensive context menu system with area-specific and element-specific menus for improved UX and discoverability.

### Implementation Plan

#### Phase 1: Core Infrastructure ⏳
**Goal**: Build universal Context Menu system

**1.1 Context Menu Component**
- Location-based menu display with viewport boundary detection
- Keyboard navigation (↑↓ arrows, Enter, Esc)
- Click outside detection for auto-close
- Icon + Label + Shortcut display
- Separator and nested submenu support

**Files to Create**:
- `src/builder/components/ContextMenu.tsx` - Main menu component
- `src/builder/components/ContextMenuItem.tsx` - Menu item component
- `src/builder/components/ContextMenuSeparator.tsx` - Separator component
- `src/builder/components/styles/ContextMenu.css` - Menu styles

**1.2 Context Menu Hook**
- Menu open/close state management
- Position calculation (prevent overflow)
- Menu item definition interface
- Conditional items (disabled, visible)

**Files to Create**:
- `src/builder/hooks/useContextMenu.ts` - Core hook
- `src/builder/hooks/useElementContextMenu.ts` - Element-specific menus

**1.3 Type Definitions**

**Files to Create**:
- `src/builder/types/contextMenu.types.ts`

```typescript
interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  handler: () => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  danger?: boolean; // Red highlight (e.g., Delete)
  submenu?: ContextMenuItem[];
  separator?: boolean;
}

type MenuContext =
  | { type: 'element'; elementId: string; elementType: string }
  | { type: 'multi-select'; elementIds: string[] }
  | { type: 'canvas'; area: 'preview' | 'sidebar' | 'inspector' }
  | { type: 'property'; propertyKey: string };
```

---

#### Phase 2: Element-Specific Menus ⏳
**Goal**: Different menus per element type

**2.1 Element Context Menu Provider**

**Files to Create**:
- `src/builder/providers/ElementContextMenuProvider.tsx`

**2.2 Element Type Menus**

**Files to Create**:
- `src/builder/config/elementContextMenus.ts`

```typescript
// Example configuration
{
  Button: [
    { label: 'Edit Text', icon: Type, handler: ... },
    { label: 'Change Variant', icon: Palette, handler: ... },
    { separator: true },
    { label: 'Copy', icon: Copy, shortcut: 'Cmd+C', handler: ... },
    { label: 'Duplicate', icon: CopyPlus, shortcut: 'Cmd+D', handler: ... },
    { label: 'Delete', icon: Trash, shortcut: 'Del', handler: ... }
  ],
  Card: [...],
  // All component types
}
```

**2.3 Common Element Actions**

**Files to Create**:
- `src/builder/utils/contextMenu/menuActions.ts`

Functions:
- `copyElement()`
- `duplicateElement()`
- `deleteElement()`
- `groupElements()`
- `ungroupElement()`
- `bringToFront()`
- `sendToBack()`
- `lockElement()`
- `hideElement()`

---

#### Phase 3: Area-Specific Menus ⏳
**Goal**: Context menus for Preview, Sidebar, Inspector

**3.1 Preview Canvas Menu**
```typescript
// Right-click on empty canvas
{
  'Paste': { handler: handlePaste, shortcut: 'Cmd+V' },
  'Select All': { handler: handleSelectAll, shortcut: 'Cmd+A' },
  separator,
  'Add Element': {
    submenu: [
      { label: 'Button', icon: Square, handler: () => addElement('Button') },
      { label: 'Card', icon: LayoutGrid, handler: () => addElement('Card') },
    ]
  }
}
```

**3.2 Sidebar (Layer Tree) Menu**
```typescript
// Right-click on tree node
{
  'Rename': { icon: Edit, handler: handleRename },
  'Duplicate': { icon: Copy, handler: handleDuplicate },
  separator,
  'Show/Hide': { icon: Eye, handler: toggleVisibility },
  'Lock/Unlock': { icon: Lock, handler: toggleLock },
  separator,
  'Delete': { icon: Trash, handler: handleDelete, danger: true }
}
```

**3.3 Inspector Panel Menu**
```typescript
// Right-click on property field
{
  'Copy Value': { handler: copyPropertyValue },
  'Paste Value': { handler: pastePropertyValue },
  'Reset to Default': { handler: resetProperty }
}
```

**Files to Create**:
- `src/builder/config/areaContextMenus.ts`

---

#### Phase 4: Multi-Select Menu ⏳
**Goal**: Common actions only when multiple elements selected

**Menu Configuration**:
```typescript
{
  'Group (Cmd+G)': { handler: handleGroup },
  separator,
  'Align': {
    submenu: [
      { label: 'Left', shortcut: 'Cmd+Shift+L' },
      { label: 'Center', shortcut: 'Cmd+Shift+H' },
      { label: 'Right', shortcut: 'Cmd+Shift+R' },
      separator,
      { label: 'Top', shortcut: 'Cmd+Shift+T' },
      { label: 'Middle', shortcut: 'Cmd+Shift+M' },
      { label: 'Bottom', shortcut: 'Cmd+Shift+B' }
    ]
  },
  'Distribute': {
    submenu: [
      { label: 'Horizontally' },
      { label: 'Vertically' }
    ]
  },
  separator,
  'Copy All (Cmd+Shift+C)': { handler: handleCopyAll },
  'Delete All (Del)': { handler: handleDeleteAll, danger: true }
}
```

---

#### Phase 5: System Integration ⏳
**Goal**: Integrate with existing systems

**5.1 Preview iframe Integration**
- Element right-click → postMessage to Builder
- Builder displays Context Menu
- Menu action → postMessage back to Preview

**Files to Modify**:
- `src/builder/preview/index.tsx`

**5.2 Overlay Integration**
- Right-click on overlay opens menu
- Multi-overlay right-click shows element-specific menu

**Files to Modify**:
- `src/builder/overlay/index.tsx`

**5.3 Keyboard Shortcuts Integration**
- Context menu shortcuts = actual shortcuts
- Use existing `useKeyboardShortcutsRegistry`
- Prevent duplicate shortcuts

**Files to Modify**:
- `src/builder/hooks/useKeyboardShortcutsRegistry.ts`

---

#### Phase 6: Advanced Features (Optional) ⏳
**Goal**: UX enhancements

**6.1 Smart Menus**
- Recent actions shown at top
- Context-aware items (e.g., Submit action inside Form)
- Disabled item tooltips (show reason)

**6.2 Custom Menu Extensions**
- User-defined menu items
- Plugin architecture for custom actions

**6.3 Menu Search**
- Cmd+K style command palette
- In-menu search when many items

---

### File Structure

```
src/builder/
├── components/
│   ├── ContextMenu.tsx
│   ├── ContextMenuItem.tsx
│   ├── ContextMenuSeparator.tsx
│   └── styles/
│       └── ContextMenu.css
│
├── hooks/
│   ├── useContextMenu.ts
│   └── useElementContextMenu.ts
│
├── config/
│   ├── elementContextMenus.ts
│   ├── areaContextMenus.ts
│   └── contextMenuIcons.ts
│
├── utils/
│   └── contextMenu/
│       ├── menuPosition.ts
│       ├── menuActions.ts
│       └── menuConditions.ts
│
└── types/
    └── contextMenu.types.ts
```

---

### Performance Considerations

1. **Lazy Rendering**: Menu only renders when opened
2. **Memoization**: Menu config cached with `useMemo`
3. **Portal Rendering**: React Portal to top-level DOM
4. **Event Delegation**: Single event listener for all areas

---

### Priority

- **High Priority**: Phase 1-3 (Core + Element + Area menus)
- **Medium Priority**: Phase 4-5 (Multi-select + Integration)
- **Low Priority**: Phase 6 (Advanced features)

---

## 🗄️ Dataset Component Architecture

**Status**: ✅ All Phases Complete (Phase 1-6) (2025-11-30)

### Overview

Dataset component architecture enables centralized data management and reuse across multiple UI components. Inspired by modern builders like Webflow CMS Collections, Framer Data Sources, and Retool Resources, this pattern allows a single data source to be shared by multiple components without duplication.

### Current Architecture vs Dataset Pattern

#### Current Direct Binding
```tsx
// Each component fetches data independently
<ListBox
  dataBinding={{
    type: "collection",
    source: "api",
    config: {
      baseUrl: "MOCK_DATA",
      endpoint: "/users",
      dataMapping: { resultPath: "data", idKey: "id" }
    }
  }}
/>

<Select
  dataBinding={{
    type: "collection",
    source: "api",
    config: {
      baseUrl: "MOCK_DATA",
      endpoint: "/users",  // Duplicate fetch!
      dataMapping: { resultPath: "data", idKey: "id" }
    }
  }}
/>
```

**Problems**:
- Same data fetched multiple times
- All components need updates when data source changes
- No data synchronization between components

#### Proposed Dataset Pattern
```tsx
// Single Dataset manages data
<Dataset
  id="users-dataset"
  dataBinding={{
    type: "collection",
    source: "api",
    config: {
      baseUrl: "MOCK_DATA",
      endpoint: "/users",
      dataMapping: { resultPath: "data", idKey: "id" }
    }
  }}
/>

// Multiple components reference the same Dataset
<ListBox datasetId="users-dataset" />
<Select datasetId="users-dataset" />
<ComboBox datasetId="users-dataset" />
```

**Benefits**:
- ✅ Data fetched once (performance improvement)
- ✅ Centralized data management
- ✅ Easy data source changes (update Dataset only)
- ✅ Real-time data synchronization across components

---

### Real-World Builder Examples

| Builder | Pattern |
|---------|---------|
| **Webflow** | CMS Collections → Multiple List/Grid components |
| **Framer** | Data Sources → List, Gallery, Form Select |
| **Retool** | Resources → Table, Select, Chart |

---

### Implementation Plan

#### Phase 1: Core Infrastructure ✅ COMPLETE

**Files Created**:
- `src/types/dataset.types.ts` - Dataset 타입 정의
- `src/builder/stores/dataset.ts` - Zustand 스토어 (캐싱, 자동 새로고침, consumer 추적)
- `src/builder/components/Dataset.tsx` - Dataset 컴포넌트 (비시각적)

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| Dataset 등록/해제 | ✅ | registerDataset, unregisterDataset |
| 데이터 로드 | ✅ | loadDataset (MOCK_DATA, REST API 지원) |
| 캐싱 | ✅ | TTL 기반 캐시 (기본 5분) |
| Consumer 추적 | ✅ | 어떤 컴포넌트가 Dataset 사용 중인지 추적 |
| 자동 새로고침 | ✅ | refreshInterval prop으로 주기적 새로고침 |

#### Phase 2: Component Integration ✅ COMPLETE

**Files Modified**:
- `src/builder/hooks/useCollectionData.ts` - datasetId prop 추가

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| datasetId prop | ✅ | Collection 컴포넌트에서 Dataset 참조 |
| Consumer 자동 등록 | ✅ | 컴포넌트 마운트 시 자동 등록 |
| 로딩/에러 상태 통합 | ✅ | Dataset Store의 상태를 useCollectionData에서 반환 |

**사용 예**:
```tsx
// Dataset 정의
<Dataset
  id="users-dataset"
  dataBinding={{
    type: "collection",
    source: "api",
    config: { baseUrl: "MOCK_DATA", endpoint: "/users" }
  }}
/>

// Collection 컴포넌트에서 참조
<ListBox datasetId="users-dataset" />
<Select datasetId="users-dataset" />
```

#### Phase 3: Inspector UI ✅ COMPLETE

**Files Created**:
- `src/builder/panels/properties/editors/DatasetEditor.tsx` - Dataset 속성 편집기

**Files Modified**:
- `src/builder/panels/properties/editors/index.ts` - DatasetEditor export 추가
- `src/builder/panels/common/index.css` - DatasetEditor 스타일 추가
- `src/shared/components/metadata.ts` - Dataset 메타데이터 추가

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| Dataset ID 편집 | ✅ | 고유 식별자 설정 |
| Data Binding 설정 | ✅ | PropertyDataBinding 컴포넌트 사용 |
| Auto Refresh 설정 | ✅ | 자동 로드, 새로고침 간격 |
| 상태 모니터링 | ✅ | 로딩/에러/성공 상태, 아이템 수, Consumer 수 표시 |
| 수동 로드/새로고침 | ✅ | Load Data, Refresh 버튼 |

#### Phase 4: Component Factory ✅ COMPLETE

**Files Created**:
- `src/builder/factories/definitions/DataComponents.ts` - Dataset, Slot 팩토리 정의

**Files Modified**:
- `src/builder/factories/ComponentFactory.ts` - Dataset, Slot 등록

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| Dataset Factory | ✅ | createDatasetDefinition - 기본 dataBinding 설정 포함 |
| Slot Factory | ✅ | createSlotDefinition - Layout 전용 컴포넌트 |
| ownerFields 패턴 | ✅ | Layout/Page 모드에 따른 page_id/layout_id 설정 |

#### Phase 5: Preview Integration ✅ COMPLETE

**Files Created**:
- `src/canvas/renderers/DataRenderers.tsx` - Canvas용 Dataset 렌더러

**Files Modified**:
- `src/canvas/renderers/index.ts` - Dataset 렌더러 등록

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| Dataset 렌더러 | ✅ | 비시각적 컴포넌트 (null 반환) |
| 데이터 로드 | ✅ | Runtime Store의 dataStates 활용 |
| Auto-refresh | ✅ | refreshInterval 지원 |
| AbortController | ✅ | 컴포넌트 언마운트 시 요청 취소 |

#### Phase 6: Advanced Features ✅ COMPLETE

**Files Modified**:
- `src/types/dataset.types.ts` - DatasetTransform, persistCache 추가
- `src/builder/stores/dataset.ts` - Transform 적용, Cache Persistence

**6.1 Transform System** ✅
| 기능 | 상태 | 설명 |
|------|------|------|
| Filter | ✅ | eq, ne, gt, gte, lt, lte, contains, startsWith, endsWith |
| Sort | ✅ | field, direction (asc/desc) |
| Limit/Offset | ✅ | 페이지네이션 지원 |
| Select | ✅ | 필드 projection |
| Map | ✅ | 필드 renaming |

**사용 예**:
```typescript
// DatasetConfig.transform
{
  filter: [
    { field: 'status', operator: 'eq', value: 'active' },
    { field: 'age', operator: 'gte', value: 18 }
  ],
  sort: { field: 'name', direction: 'asc' },
  limit: 10,
  offset: 0,
  select: ['id', 'name', 'email'],
  map: { 'userName': 'name' }  // userName → name 으로 변경
}
```

**6.2 Consumer Reference** ✅
| 기능 | 상태 | 설명 |
|------|------|------|
| addConsumer | ✅ | 컴포넌트가 Dataset 사용 시 등록 |
| removeConsumer | ✅ | 컴포넌트 언마운트 시 해제 |
| consumers 추적 | ✅ | DatasetEditor에서 Consumer 수 표시 |

**6.3 Cache Persistence** ✅
| 기능 | 상태 | 설명 |
|------|------|------|
| persistCache 옵션 | ✅ | localStorage에 캐시 영속화 |
| TTL 기반 만료 | ✅ | cacheTTL 설정에 따른 자동 만료 |
| 캐시 복원 | ✅ | 페이지 새로고침 시 localStorage에서 복원 |
| 캐시 정리 | ✅ | unregister/clearAll 시 자동 정리 |

**사용 예**:
```typescript
// DatasetConfig
{
  id: 'users-dataset',
  name: 'Users',
  dataBinding: { ... },
  useCache: true,
  cacheTTL: 5 * 60 * 1000,  // 5분
  persistCache: true,  // localStorage에 저장
  transform: { ... }
}
```

---

### Layer Tree Structure

```
Page
├─ Dataset (users-api)           // Data source (not visible in Preview)
├─ Dataset (products-api)        // Multiple datasets supported
├─ ListBox → users-api           // References dataset
├─ Select → users-api            // Shares same data
└─ Table → products-api          // Different dataset
```

---

### Priority

- ~~**High Priority**: Phase 1-2 (Core + Component integration)~~ ✅ Complete
- ~~**Medium Priority**: Phase 3-4 (Inspector UI + Factory)~~ ✅ Complete
- ~~**Low Priority**: Phase 5-6 (Preview + Advanced)~~ ✅ Complete

---

## 🎨 Layout Preset 개선 계획

**Status**: 📋 Planning Phase (Phase 6 완료 후 추가 개선)

> **관련 문서**:
> - [LAYOUT_PRESET_SYSTEM.md](features/LAYOUT_PRESET_SYSTEM.md) - Phase 6 완료 상세
> - [LAYOUT_SLOT_SYSTEM_PLAN_V2.md](LAYOUT_SLOT_SYSTEM_PLAN_V2.md) - 전체 Layout/Slot 시스템 계획

### 1. SlotEditor 구현 ✅ COMPLETE

**Status**: 구현 완료 (2025-11-30)

**구현된 기능**:
| 기능 | 상태 | 설명 |
|------|------|------|
| name 편집 | ✅ | Slot 이름 변경 |
| required 토글 | ✅ | 필수 Slot 여부 |
| description | ✅ | Slot 용도 설명 |
| 콘텐츠 미리보기 | ✅ | Slot 내부 자식 요소 목록, 클릭 시 해당 요소로 이동 |
| defaultStyle | ⏳ | 향후 추가 예정 |

**Files**:
- `src/builder/panels/properties/editors/SlotEditor.tsx`
- `src/builder/panels/common/index.css` (SlotEditor 스타일 추가)

---

### 2. 프리셋 커스터마이징

**필요성**: 사용자 정의 레이아웃 저장 기능

**흐름**:
```
Layout Body 선택 → "프리셋으로 저장" 클릭 → 이름 입력 → Supabase 저장 → 프리셋 목록에 표시
```

**Database Schema**:
```sql
CREATE TABLE custom_presets (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  slots JSONB NOT NULL,
  container_style JSONB,
  preview_areas JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create**:
- `src/builder/hooks/useCustomPresets.ts`
- Inspector에 "프리셋으로 저장" 버튼 추가

---

### 3. Grid/Flex 시각적 편집

**필요성**: 코드 없이 레이아웃 구조 편집

**UI 개념**:
```
┌─────────────────────────────────────────┐
│  Grid Template Editor                    │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  header   header   header       │   │
│  ├─────────────────────────────────┤   │
│  │ sidebar │ content │   aside     │   │
│  ├─────────────────────────────────┤   │
│  │  footer   footer   footer       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Columns: [200px] [1fr] [200px]    [+] │
│  Rows:    [auto] [1fr] [auto]      [+] │
└─────────────────────────────────────────┘
```

**기능**:
- 영역 드래그 리사이즈
- Column/Row 추가/삭제
- 영역 병합
- Gap 설정

**Files to Create**:
- `src/builder/panels/properties/editors/GridEditor/`
  - `index.tsx`
  - `GridCanvas.tsx`
  - `useGridParser.ts`
  - `useGridDrag.ts`

---

### 구현 우선순위

| 순위 | 기능 | 상태 | 이유 |
|------|------|------|------|
| ~~1~~ | ~~SlotEditor~~ | ✅ 완료 | Slot 선택 시 즉시 필요 |
| **1** | Grid/Flex 편집 | 📋 | 프리셋 미세 조정 필수 |
| **2** | 프리셋 저장 | 📋 | 편의 기능, 기본 프리셋으로 충분 |

---

**Remember:** This project prioritizes accessibility (React Aria), maintainability (CSS variables, semantic classes), and type safety (strict TypeScript).
