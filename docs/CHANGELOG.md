# Changelog

All notable changes to XStudio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - Layout Preset System Critical Bugs (2025-11-28)

#### Same Preset Reapply Bug
- **문제**: 동일한 프리셋(예: 전체화면) 적용 후 다시 같은 프리셋 클릭 시 덮어쓰기 다이얼로그가 표시됨
- **원인**: `sidebar-left`와 `sidebar-right`가 동일한 Slot 이름(`sidebar`, `content`)을 가져 Set 비교로 구분 불가
- **해결**: Slot 이름 비교 대신 `appliedPreset` 키를 body element props에 저장하여 감지
- **파일**: `usePresetApply.ts`, `LayoutPresetSelector/index.tsx`, `styles.css`

```typescript
// body element props에서 직접 읽기
const currentPresetKey = useMemo((): string | null => {
  const body = elements.find((el) => el.id === bodyElementId);
  const appliedPreset = (body?.props as { appliedPreset?: string })?.appliedPreset;
  // appliedPreset이 있고 slot 구성이 일치하면 유효
  if (appliedPreset && LAYOUT_PRESETS[appliedPreset]) {
    // ... slot 검증 로직
    return appliedPreset;
  }
  return null;
}, [elements, bodyElementId, existingSlots]);
```

#### LayoutsTab Body Auto-Select Bug
- **문제**: Layout 모드에서 Slot 선택 시 자동으로 body가 선택되어 버림
- **원인**: body 자동 선택 useEffect가 layout 변경 시뿐 아니라 `layoutElements` 변경 시마다 실행됨
- **해결**: `bodyAutoSelectedRef`를 추가하여 layout 당 한 번만 body 자동 선택 실행
- **파일**: `LayoutsTab.tsx`

```typescript
const bodyAutoSelectedRef = React.useRef<boolean>(false);

useEffect(() => {
  if (layoutChanged) {
    bodyAutoSelectedRef.current = false; // 레이아웃 변경 시 리셋
  }

  // 한 번만 실행
  if (!bodyAutoSelectedRef.current && bodyElement) {
    setSelectedElement(bodyElement.id, ...);
    bodyAutoSelectedRef.current = true;
  }
}, [currentLayout?.id, layoutElements, ...]);
```

#### Critical: Layout Slot Content Duplication Bug
- **문제**: Layout 프리셋 적용 시 Page body 내부의 모든 컴포넌트가 모든 Slot에 복제됨
- **원인**: `renderLayoutElement`에서 Slot 렌더링 시 `slot_name` 필터링 없이 모든 body 자식을 삽입
- **해결**: `slot_name` 매칭 필터 추가 - 각 Slot에는 해당 `slot_name`을 가진 요소만 삽입

**Before (Bug)**:
```typescript
slotContent = pageElements
  .filter((pe) => pe.parent_id === pageBody.id)  // 모든 body 자식
  .sort(...);
```

**After (Fix)**:
```typescript
slotContent = pageElements
  .filter((pe) => {
    if (pe.parent_id !== pageBody.id) return false;
    const peSlotName = (pe.props as { slot_name?: string })?.slot_name || 'content';
    return peSlotName === slotName;  // slot_name 매칭
  })
  .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
```

- **파일**: `PreviewApp.tsx`

---

### Added - Style Panel Improvements (2025-11-24)

#### PropertyUnitInput Shorthand Parsing
- **Shorthand Value Support** - CSS shorthand 값 (예: `"8px 12px"`) 파싱 시 첫 번째 값 추출
- **Smart Change Detection** - 문자열 비교 대신 파싱된 숫자값/단위 비교로 불필요한 onChange 방지
- **Focus Bug Fix** - Mixed 값에서 포커스 인/아웃만 해도 값이 변경되던 버그 수정

#### LayoutSection Figma-style Expandable Spacing
- **Expandable Spacing UI** - Figma 스타일 단일 값 ↔ 4방향 개별 입력 토글
- **Mixed Value Detection** - 4방향 값이 다를 때 "(Mixed)" 라벨 표시
- **4-Direction Grid** - T/R/B/L 개별 입력 그리드 레이아웃
- **Bulk Update** - 축소 모드에서 4방향 동시 업데이트

#### Files Modified
- `src/builder/panels/common/PropertyUnitInput.tsx` - Shorthand 파싱 및 변경 감지 로직
- `src/builder/panels/styles/sections/LayoutSection.tsx` - 확장형 Spacing UI
- `src/builder/panels/common/index.css` - `.layout-spacing`, `.spacing-4way-grid` 스타일

---

### Added - Layout/Slot System Implementation (2025-11-21)

#### Phase 1: Core Infrastructure ✅
- **Database Schema** - `layouts` and `slots` tables with RLS policies
- **Type Definitions** - Layout, Slot, LayoutSlot types in `unified.types.ts`
- **Zustand Store** - `layoutStore.ts` with layouts/slots management
- **API Service** - `LayoutsApiService.ts` for CRUD operations

#### Phase 2: Builder UI ✅
- **Nodes Panel Layouts Tab** - Layout 생성/삭제/선택 UI
- **Slot Component** - 드래그 가능한 Slot 컴포넌트 with React Aria
- **Slot Editor** - Inspector에서 Slot name/required 설정

#### Phase 3: Page-Layout Integration ✅
- **BodyEditor 업데이트** - Page에 Layout 할당 UI (Select 컴포넌트)
- **Element Inspector 업데이트** - Element에 slot_name 지정 UI
- **Preview Rendering** - Layout + Page 합성 렌더링 엔진

#### Phase 4: Complex Component Support ✅ (Bug Fix)
- **ComponentCreationContext 확장** - `layoutId` 필드 추가
- **ComponentFactory 업데이트** - `createComplexComponent()`에 `layoutId` 파라미터 전달
- **Definition 파일 업데이트** - 11개 컴포넌트 정의 함수에 `ownerFields` 패턴 적용
  - `SelectionComponents.ts`: Select, ComboBox, ListBox, GridList
  - `GroupComponents.ts`: Group, ToggleButtonGroup, CheckboxGroup, RadioGroup, TagGroup, Breadcrumbs
  - `LayoutComponents.ts`: Tabs, Tree
  - `FormComponents.ts`: TextField
  - `TableComponents.ts`: Table, ColumnGroup

#### Key Architecture Decisions
- **ownerFields Pattern** - Layout/Page 모드 구분하여 `layout_id` 또는 `page_id` 설정
  ```typescript
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };
  ```
- **Element 소유권** - Element는 `page_id` 또는 `layout_id` 중 하나만 가짐 (상호 배타적)
- **Slot 렌더링** - Preview에서 Slot 위치에 해당 `slot_name` Element들 삽입

#### Files Modified
- `src/builder/factories/types/index.ts`
- `src/builder/factories/ComponentFactory.ts`
- `src/builder/hooks/useElementCreator.ts`
- `src/builder/factories/definitions/SelectionComponents.ts`
- `src/builder/factories/definitions/GroupComponents.ts`
- `src/builder/factories/definitions/LayoutComponents.ts`
- `src/builder/factories/definitions/FormComponents.ts`
- `src/builder/factories/definitions/TableComponents.ts`

#### Related Documentation
- [Layout/Slot System Plan V2](./LAYOUT_SLOT_SYSTEM_PLAN_V2.md) - 전체 구현 계획

---

### Fixed - Theme System & iframe Communication (2025-11-14)

#### Theme Cross-Selection Bug Fix
- **Fixed theme switching between different themes** not applying to Preview
  - Root cause: Hash calculation used string interpolation on objects (incorrect serialization)
  - Solution: Serialize full token structure with `JSON.stringify({ name, value, scope })`
  - Implementation: `useThemeMessenger.ts:33-39`
  - Status: ✅ Cross-theme switching now works correctly

#### Theme Refresh Application Fix
- **Fixed theme not applying after page refresh**
  - Root cause: Zustand subscribe selector pattern had timing issues
  - Solution: Changed from selector subscribe to full store subscribe with length comparison
  - Implementation: `BuilderCore.tsx:263-286`
  - Added automatic token transmission when iframe ready
  - Status: ✅ Theme now applies correctly on refresh

#### iframe Stale Reference Detection
- **Fixed elements not appearing after dashboard → builder re-entry**
  - Root cause: MessageService cached stale iframe references (contentWindow = null)
  - Solution: Automatic stale detection and re-fetch when contentWindow is null
  - Implementation: `messaging.ts:6-16`
  - Added `clearIframeCache()` on BuilderCore unmount
  - Status: ✅ Elements now appear correctly on re-entry

#### Debug Logging Cleanup
- **Removed unnecessary console.log statements**
  - Cleaned 6 files: `useThemeMessenger.ts`, `SettingsPanel.tsx`, `messageHandlers.ts`, `BuilderCore.tsx`, `themeStore.ts`, `messaging.ts`
  - Kept essential warning and error logs
  - Improved console readability for debugging

### Added - Collection Components Data Binding (2025-10-27)

#### ComboBox Filtering Enhancement
- **Added textValue support for auto-complete filtering** in ComboBox with Field-based rendering
  - Calculates searchable text from all visible Field values
  - Concatenates field values with spaces for partial matching
  - Enables searching across multiple fields (e.g., "John" matches name OR email)
  - Implementation: `SelectionRenderers.tsx:719-741`

#### TagGroup ColumnMapping Support
- **Added columnMapping support** for dynamic data rendering in TagGroup
  - Renders Tag for each data item with Field children
  - Supports REST API, MOCK_DATA, and Supabase data sources
  - Consistent pattern with ListBox, GridList, Select, ComboBox
  - Implementation: `CollectionRenderers.tsx:174-384`

#### TagGroup Item Removal System
- **Added non-destructive item removal** with `removedItemIds` tracking
  - Tracks removed item IDs without modifying source data (REST API/MOCK_DATA)
  - Items filtered out before rendering
  - Persisted to database, survives page refresh
  - Integrated with history system for undo/redo
  - Implementation: `TagGroup.tsx:131-151`, `CollectionRenderers.tsx:321-365`

#### TagGroup Restore Functionality
- **Added Inspector UI for restoring removed items**
  - Visual indicator showing count of removed items
  - "♻️ Restore All Removed Items" button
  - One-click restoration of all hidden items
  - Implementation: `TagGroupEditor.tsx:197-214`

#### Initial Component Creation Pattern
- **Standardized initial child items** for all Collection components
  - All components now create only **1 child item** as template for dynamic data
  - **Select**: Changed from 3 SelectItems → 1 SelectItem
  - **ComboBox**: Changed from 2 ComboBoxItems → 1 ComboBoxItem
  - **GridList**: 1 GridListItem
  - **ListBox**: 1 ListBoxItem
  - Consistent template pattern for columnMapping mode
  - Implementation: `SelectionComponents.ts`

#### Collection Components Status Update
- ✅ **ListBox + ListBoxItem**: columnMapping implemented
- ✅ **GridList + GridListItem**: columnMapping implemented
- ✅ **Select + SelectItem**: columnMapping implemented
- ✅ **ComboBox + ComboBoxItem**: columnMapping + textValue filtering implemented
- ✅ **TagGroup + Tag**: columnMapping + removedItemIds implemented
- 🔄 **Menu + MenuItem**: pending
- 🔄 **Tree + TreeItem**: hierarchical data supported, columnMapping pending
- 🔄 **CheckboxGroup + Checkbox**: pending
- 🔄 **RadioGroup + Radio**: pending
- 🔄 **ToggleButtonGroup + ToggleButton**: pending

### Added - Inspector UI/UX Improvements (2025-10)

#### Compact Layout
- **One-line layouts** for related controls to improve space efficiency
  - Font Size + Line Height in a single row with action button
  - Text Align + Vertical Align in a single row
  - Text Decoration + Font Style in a single row
  - Font Weight + Letter Spacing in a single row
  - All layouts follow consistent pattern with `.fieldset-actions`

#### Icon-based Controls
- **Replaced text buttons with icons** for better visual consistency
  - Text Align: `AlignLeft`, `AlignCenter`, `AlignRight`
  - Vertical Align: `AlignVerticalJustifyStart`, `AlignVerticalJustifyCenter`, `AlignVerticalJustifyEnd`
  - Text Decoration: `RemoveFormatting`, `Underline`, `Strikethrough`
  - Font Style: `RemoveFormatting`, `Italic`, `Type` (with skew for oblique)
  - Text Transform: `RemoveFormatting`, `CaseUpper`, `CaseLower`, `CaseSensitive`
- All icon-based controls use `indicator` attribute for consistent visual feedback

#### Auto Option for Style Reset
- **Added "auto" option** to all style properties for inline style removal
  - Properties with auto: Width, Height, Left, Top, Gap, Padding, Margin
  - Properties with auto: Border Width, Border Radius, Border Style
  - Properties with auto: Font Size, Line Height, Font Family, Font Weight, Letter Spacing
- Selecting "auto" removes inline style and falls back to class-defined styles
- Implemented in both `PropertyUnitInput` and `PropertySelect` components

### Changed

#### Input Control Improvements
- **Separated immediate input from blur input** in `PropertyUnitInput`
  - Input changes only update local state during typing
  - Style changes apply on blur or Enter key press
  - Prevents value accumulation issues (e.g., "16" becoming "116")
  - Added Enter key support for immediate value application

#### PropertySelect Enhancements
- **Ellipsis handling** for long option labels
  - Added `text-overflow: ellipsis` with `overflow: hidden`
  - Fixed width constraints with `min-width: 0` throughout component hierarchy
  - Prevents Font Weight from expanding and squeezing Letter Spacing
  - Flex layout with proper width constraints in `.react-aria-Button`

### Fixed

#### Synchronization Issues
- **Element switching now properly updates styles**
  - Added `style` and `computedStyle` comparison in Inspector component
  - Previous elements' style values no longer persist when selecting new elements
  - Fixed `mapElementToSelected` to initialize style as empty object instead of undefined
  - Fixed `mapSelectedToElementUpdate` to always include style property (even empty object)

#### Style Application
- **Inline style changes now properly sync to Builder**
  - Empty style objects now transmitted to Builder for style removal
  - Fixed conditional check to use `!== undefined` instead of truthy check
  - Style deletions via "auto" option now properly reflected in preview

## Related Documentation

- [Inspector Style System](./features/INSPECTOR_STYLE_SYSTEM.md) - Comprehensive guide to style management
- [ToggleButtonGroup Indicator](./features/TOGGLEBUTTONGROUP_INDICATOR.md) - Indicator implementation details
- [CLAUDE.md](../CLAUDE.md) - Development guidelines and architecture

## Breaking Changes

None in this release.

## Migration Guide

No migration needed for this release. All changes are backward compatible.
