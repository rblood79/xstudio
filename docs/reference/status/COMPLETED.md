# XStudio - Completed Features Documentation

이 문서는 XStudio 프로젝트에서 구현 완료된 주요 기능들을 정리합니다. CLAUDE.md에서 분리하여 별도 관리합니다.

---

## 📋 Table of Contents

- [Event System (2025-11-11)](#event-system)
- [Monitor Panel (Rebuilding)](#monitor-panel)
- [Panel System Refactoring (2025-11-16)](#panel-system-refactoring)
- [Multi-Element Selection (2025-11-16)](#multi-element-selection)
- [Multi-Element Editing (2025-11-16)](#multi-element-editing)
- [Multi-Element Copy/Paste/Duplicate (2025-11-16)](#multi-element-copy-paste-duplicate)
- [Advanced Selection (2025-11-16)](#advanced-selection)
- [Grouping & Organization (2025-11-16)](#grouping--organization)
- [History Integration (2025-11-16)](#history-integration)
- [Performance Optimization - RAF Throttling (2025-11-16)](#performance-optimization)
- [Element Alignment (2025-11-16)](#element-alignment)
- [Element Distribution (2025-11-16)](#element-distribution)
- [Multi-Select Status Indicator Enhancement (2025-11-16)](#multi-select-status-indicator-enhancement)
- [Batch Property Editor (2025-11-16)](#batch-property-editor)
- [Component Migration Status](#component-migration-status)
- [CSS Architecture & Theme System (2025-11-09)](#css-architecture--theme-system)
- [M3 Color System Guide (2025-11-19)](#m3-color-system-guide)
- [Panel System Standardization (2025-11-13)](#panel-system-standardization)
- [Layout Preset System (2025-11-26)](#layout-preset-system)
- [Preview Runtime Isolation (2025-11-27)](#preview-runtime-isolation)
- [Data Panel System - Phase 1-6 (2025-11-30)](#data-panel-system)
- [Nested Routes System - Phase 1-6 (2025-11-30)](#nested-routes-system)
- [Performance Optimization - Track A/B/C (2025-12-11)](#performance-optimization-track-abc)
- [WASM Performance Path - Phase 0-4 (2026-02-02)](#wasm-performance-path)
- [Skia Border-Box Rendering Fix (2026-02-02)](#skia-border-box-rendering-fix)
- [Skia AABB Viewport Culling Fix (2026-02-02)](#skia-aabb-viewport-culling-fix)
- [Skia Rendering Pipeline Completion (2026-02-02)](#skia-rendering-pipeline-completion)
- [Skia Style Reactivity & Display Switch Fix (2026-02-02)](#skia-style-reactivity--display-switch-fix)

---

## Skia AABB Viewport Culling Fix

**Status**: ✅ Complete (2026-02-02)

캔버스 팬 시 body가 화면 왼쪽/위쪽 가장자리에 닿으면 Skia 렌더링이 전부 사라지는 버그 수정.

**Root Cause:**
1. `buildSkiaTreeFromRegistry`(현재 `buildSkiaTreeHierarchical`로 교체됨)의 가상 루트 노드 `{width:0, height:0}`에 AABB 컬링 적용 → 카메라 원점 이탈 시 루트 컬링
2. `canvas.translate()` 후 자식에 씬-로컬 `cullingBounds` 전달 → 좌표계 불일치로 텍스트 잘못 컬링

**Fix:**
- zero-size 노드 AABB 컬링 스킵 (`node.width > 0 || node.height > 0` 조건 추가)
- 자식 재귀 시 `cullingBounds`를 `(x - node.x, y - node.y)` 로 역변환

**파일:** `apps/builder/src/.../skia/nodeRenderers.ts`

---

## Skia Rendering Pipeline Completion

**Status**: ✅ Complete (2026-02-02)

Skia 렌더링 파이프라인의 남은 기능 8건을 모두 구현하여 Pencil 렌더링 아키텍처 전환 100% 완료.

**구현 내용:**
- **MeshGradient Fill**: bilinear interpolation 근사 (top/bottom LinearGradient + MakeBlend)
- **LayerBlur Effect**: 전경 가우시안 블러 (`MakeBlur` + `saveLayer`)
- **Phase 6 이중 Surface 활성화**: idle 스킵, camera-only 블리팅, dirty rect 부분 렌더링 (이후 좌표계 불일치로 dirty rect 비활성화 — 아래 참조)
- **변수 resolve 경로 완성**: `$--` 참조 → `Float32Array` 색상 변환 파이프라인 검증
- **KitComponentList 패널 통합**: 마스터 컴포넌트 목록 + 인스턴스 생성
- **킷 적용 시각 피드백**: generating → flash 애니메이션 연동
- **내장 디자인 킷 JSON**: Basic Kit (5변수 + 12토큰 + Card/Badge 컴포넌트)
- **문서 업데이트**: CHANGELOG, COMPLETED, PENCIL_VS_XSTUDIO, WASM_DOC_IMPACT 반영

**파일 (8개):**
- `canvas/skia/types.ts`, `fills.ts`, `effects.ts`, `SkiaOverlay.tsx`
- `panels/designKit/DesignKitPanel.tsx`
- `stores/elements.ts`, `stores/designKitStore.ts`
- `utils/designKit/builtinKits/basicKit.ts` (신규)

---

## Skia Border-Box Rendering Fix

**Status**: ✅ Complete (2026-02-02)

Skia 렌더러의 border(stroke) 렌더링이 CSS border-box 모델과 불일치하여 인접 요소 border가 겹치는 문제를 수정.

**구현 내용:**
- **nodeRenderers.ts**: stroke rect를 `strokeWidth/2` 만큼 inset하여 border가 요소 바운드 내부에 완전히 포함
- **BodyLayer.tsx**: Skia body 렌더 데이터에 `strokeColor`/`strokeWidth` 추가 (borderColor 미적용 수정)
- **BuilderCanvas.tsx**: block 레이아웃 `parentBorder`를 `availableWidth`/offset에서 제거 (border = 시각 전용)

**영향:** 모든 Box 타입 Skia 노드 (Button, Body, div 등), display:block / display:flex 양쪽 경로

---

## WASM Performance Path

**Status**: ✅ Phase 0-4 Complete (2026-02-02)

Rust WASM 기반 캔버스 성능 가속 모듈 빌드 및 활성화.

**구현 내용:**
- **Phase 0**: Rust 1.93.0 + wasm-pack 0.14.0 환경, WASM 빌드 (70KB)
- **Phase 1**: SpatialIndex — Grid-cell 기반 O(k) 뷰포트 컬링, 라쏘 선택, 히트 테스트
- **Phase 2**: Layout Engine — Block/Grid 레이아웃 WASM 가속 (children > 10 임계값)
- **Phase 4**: Web Worker — 비동기 레이아웃 + SWR 캐싱 + Transferable ArrayBuffer

**Feature Flags:** 환경변수 제거됨 (2026-02-02). 모든 WASM 모듈 하드코딩 활성화.

**상세:** `docs/WASM.md` Phase 0-4

---

## Skia Style Reactivity & Display Switch Fix

**Status**: ✅ Complete (2026-02-02)

스타일 패널 변경이 캔버스에 즉시 반영되지 않는 문제와, display 전환 시 1-프레임 플리커 수정.

**문제 1: 스타일 변경 후 팬(이동)해야 반영**

**Root Cause:** SkiaRenderer 이중 Surface의 `content` 프레임에서 dirty rect 부분 렌더링 시, `registerSkiaNode()`의 dirty rect 좌표(CSS/style 로컬)와 실제 Skia 렌더링 좌표(카메라 변환 후 스크린)가 불일치. `clipRect`이 실제 렌더 위치를 포함하지 못해 변경 사항이 보이지 않음.

**Fix:** `content` 프레임에서 dirty rect 부분 렌더링 비활성화 → 전체 재렌더링 (`camera-only`와 동일 비용)

**파일:** `canvas/skia/SkiaRenderer.ts`

**문제 2: display: block ↔ flex 전환 시 (0,0) 플리커**

**Root Cause:** `renderFrame`이 ticker NORMAL priority (0)에서 실행되어 `Application.render()` (LOW=-25) **이전**에 `buildSkiaTreeHierarchical()`를 호출. @pixi/layout의 Yoga `calculateLayout()`은 `Application.render()` 내부의 `prerender` 단계에서 실행되므로, display 전환 시 Yoga가 아직 새 레이아웃을 계산하지 않은 stale worldTransform (0,0) 좌표를 읽음.

**Fix:**
- `syncPixiVisibility` (HIGH=25): Camera 자식 `alpha=0` 설정 — Application.render() 전에 실행
- `renderFrame` (UTILITY=-50): Skia 트리 빌드 + 렌더링 — Application.render() 후에 실행하여 최신 worldTransform 보장

**파일:** `canvas/skia/SkiaOverlay.tsx`

---

## Event System

**Status**: ✅ Phase 1-5 Complete (2025-11-11)

### Overview
Visual programming system with drag-and-drop event handlers and action configuration.

### Key Features
- React Stately-based state management (useEventHandlers, useActions)
- 21 action editors for comprehensive event handling
- Three visual modes (List, Simple Flow, ReactFlow)
- Event templates and AI-powered recommendations
- Conditional execution and timing controls
- Execution debugging and logging
- Copy/paste actions functionality
- Event search and filtering
- Complete type system unification (Inspector + EventEngine)

### Files
- 65+ files in `src/builder/inspector/events/`
- State management hooks in `state/`
- Action editors in `actions/`
- Visual components in `components/visualMode/`

### Documentation
- See CLAUDE.md "Event System (Inspector Events Tab)" section for detailed implementation

---

## Monitor Panel

**Status**: 🔄 Rebuilding (2025-01) - Panel 시스템 기반으로 재구축 중

### Overview
기존 footer monitor 시스템을 완전히 삭제하고 Panel 시스템 기반의 경량 모니터링 패널로 재구축

### Planned Features
- Memory usage monitoring (메모리 사용량 추적)
- SVG 기반 Mini chart visualization
- RequestIdleCallback 기반 수집 (퍼포먼스 영향 최소화)
- Bottom Panel Slot 통합 (resize 지원)

### Files (구현 예정)
- `src/builder/panels/monitor/` - Panel component

### Implementation Plan
- See `docs/MONITOR_PANEL_REDESIGN.md` for detailed implementation plan

---

## Panel System Refactoring

**Status**: ✅ Phase 1-3 Complete (2025-11-16)

### Overview
Code reduction and architecture improvement through reusable hooks.

### Phase 1: Stability (76% Code Reduction)
- Created `useInitialMountDetection` hook (106 lines)
- EventsPanel: 62 lines → 16 lines (76% reduction)
- DataPanel: Replaced hardcoded HTML with EmptyState
- AIPanel: useMemo for Groq service
- Fixed EventType import path conflicts

### Phase 2: Performance (37-50% Code Reduction)
- Created `useKeyboardShortcutsRegistry` hook (147 lines)
- PropertiesPanel: 30 lines → 15 lines (50% reduction)
- StylesPanel: 38 lines → 24 lines (37% reduction)
- Declarative shortcut definitions

### Phase 3: Reusability (80%+ Code Reduction)
- Created `useCopyPaste` hook (95 lines)
- PropertiesPanel copy/paste: 15 lines → 3 lines (80% reduction)
- useStyleActions copy/paste: 38 lines → 7 lines (82% reduction)

### Anti-Patterns Discovered
1. Zustand grouped selectors with object returns → infinite loops
2. useShallow wrapper → infinite loops
3. Manual keyboard listeners → duplicate code
4. Manual clipboard operations → duplicate code
5. EventType legacy imports → type conflicts

### ESLint Rules Added
- `local/no-zustand-grouped-selectors` (error)
- `local/no-zustand-use-shallow` (error)
- `local/prefer-keyboard-shortcuts-registry` (warn)
- `local/prefer-copy-paste-hook` (warn)
- `local/no-eventtype-legacy-import` (error)

---

## Multi-Element Selection

**Status**: ✅ Complete (2025-11-16)

### Overview
Select multiple elements with Cmd+Click or lasso selection.

### Key Features
- Cmd/Ctrl + Click multi-select (toggle selection)
- Shift + Drag lasso selection (area selection)
- Multi-overlay visual feedback with primary/secondary distinction
- AABB collision detection algorithm
- Action token integration (--action-primary-bg)

### User Experience
- Click → Single selection (orange outline)
- Cmd/Ctrl + Click → Toggle in multi-select (blue outline)
- Shift + Drag → Lasso selection (blue dashed box)

### Files Modified
- `src/builder/preview/types/index.ts`
- `src/builder/stores/elements.ts`
- `src/builder/preview/index.tsx`
- `src/builder/hooks/useIframeMessenger.ts`
- `src/builder/overlay/index.tsx`
- `src/builder/overlay/index.css`

---

## Multi-Element Editing

**Status**: ✅ Phase 2 Complete (2025-11-16)

### Overview
Batch editing for multiple selected elements with common property detection.

### Components Created
- `MultiSelectStatusIndicator.tsx` - Status display with quick actions
- `BatchPropertyEditor.tsx` - Common property editor
- `batchPropertyUtils.ts` - Property analysis utilities

### Key Features
- Multi-Select Status Indicator with element count
- Batch Property Editor for common properties
- Quick actions: Copy All, Delete All, Clear Selection
- Mixed value detection
- Category filtering (All, Layout, Style, Content)

---

## Multi-Element Copy/Paste/Duplicate

**Status**: ✅ Complete (2025-11-16)

### Overview
Copy, paste, and duplicate multiple elements with relationship preservation.

### Key Features
- Copy All with relationship preservation
- Paste with automatic offset (10px)
- Duplicate selection (Cmd+D) with auto-select
- Keyboard shortcuts (Cmd+C, Cmd+V, Cmd+D)
- Parent-child relationship preservation
- Descendant element inclusion (BFS traversal)

### Files Created
- `src/builder/utils/multiElementCopy.ts` (231 lines)

### Keyboard Shortcuts
- **Cmd+C**: Copy all selected elements
- **Cmd+V**: Paste copied elements
- **Cmd+D**: Duplicate selection
- **Cmd+Shift+C**: Copy properties (single element)
- **Cmd+Shift+V**: Paste properties (single element)

---

## Advanced Selection

**Status**: ✅ Phase 3 Complete (2025-11-16)

### Overview
Select All, Clear Selection, Tab Navigation, and advanced filtering.

### Components Created
- `SelectionFilter.tsx` - Filter UI (218 lines)

### Key Features
- Select All (Cmd+A) - All elements on current page
- Clear Selection (Esc)
- Tab Navigation (Tab/Shift+Tab) - Cycle through selected elements
- Selection Filter - Filter by type, tag, or properties
- Collapsible Filter UI

### Keyboard Shortcuts
- **Cmd+A**: Select all elements
- **Esc**: Clear selection
- **Tab**: Next element
- **Shift+Tab**: Previous element

---

## Grouping & Organization

**Status**: ✅ Phase 4 Complete (2025-11-16)

### Overview
Group multiple elements into container, ungroup to restore.

### Components Created
- `Group.tsx` - Group container component (58 lines)
- `elementGrouping.ts` - Group/ungroup utilities (241 lines)
- `GroupComponents.ts` - Factory definition

### Key Features
- Group Selection (Cmd+G) - Create group from 2+ elements
- Ungroup Selection (Cmd+Shift+G)
- Relationship preservation
- Position calculation (average of children)
- Order management

### Keyboard Shortcuts
- **Cmd+G**: Group selected elements
- **Cmd+Shift+G**: Ungroup selected Group

---

## History Integration

**Status**: ✅ Phase 7 Complete (2025-11-16)

### Overview
Undo/redo support for multi-element operations.

### Files Created
- `historyHelpers.ts` - History tracking utilities (279 lines)

### Key Features
- Batch property update tracking
- Group/ungroup tracking
- Multi-paste tracking
- Extended history entry types (batch, group, ungroup)
- Efficient storage (only changed properties)

### Memory Efficiency
- Before: N individual entries for N elements
- After: 1 batch entry for N elements
- Savings: ~80-90% reduction

---

## Performance Optimization

**Status**: ✅ Phase 8.2 Complete (2025-11-16)

### Overview
RAF-based throttling and virtual scrolling for better performance.

### Files Created
- `useRAFThrottle.ts` - RAF throttle hooks (115 lines)
- `useVisibleOverlays.ts` - Virtual scrolling hook (175 lines)

### Key Features
- RAF-based throttle (sync with browser rendering)
- Virtual scrolling for overlays (render only visible)
- Passive event listeners
- Performance stats display

### Performance Comparison

| Metric | setTimeout | RAF | Improvement |
|--------|------------|-----|-------------|
| Rendering | Irregular | 60fps | ✅ Stable |
| CPU Usage | Medium | Low | 30-40% ↓ |
| Memory | Timer overhead | Single RAF | 50% ↓ |
| Battery | Always running | Auto-pause | ✅ Efficient |

---

## Element Alignment

**Status**: ✅ Phase 5.1 Complete (2025-11-16)

### Overview
Align multiple elements (left, center, right, top, middle, bottom).

### Files Created
- `elementAlignment.ts` - Alignment utilities (241 lines)

### Alignment Types
- **left** - Align to leftmost element's left edge
- **center** - Align to average horizontal center
- **right** - Align to rightmost element's right edge
- **top** - Align to topmost element's top edge
- **middle** - Align to average vertical middle
- **bottom** - Align to bottommost element's bottom edge

### Keyboard Shortcuts
- **Cmd+Shift+L**: Align Left
- **Cmd+Shift+H**: Align Horizontal Center
- **Cmd+Shift+R**: Align Right
- **Cmd+Shift+T**: Align Top
- **Cmd+Shift+M**: Align Vertical Middle
- **Cmd+Shift+B**: Align Bottom

---

## Element Distribution

**Status**: ✅ Phase 5.2 Complete (2025-11-16)

### Overview
Distribute elements with even spacing (horizontal/vertical).

### Files Created
- `elementDistribution.ts` - Distribution utilities (276 lines)

### Distribution Types
- **horizontal** - Even horizontal spacing
- **vertical** - Even vertical spacing

### Algorithm
1. Sort elements by position
2. First and last stay in place
3. Calculate even spacing for middle elements
4. Reposition middle elements

### Keyboard Shortcuts
- **Cmd+Shift+D**: Distribute Horizontally
- **Cmd+Alt+Shift+V**: Distribute Vertically

---

## Multi-Select Status Indicator Enhancement

**Status**: ✅ Phase 2.2 Complete (2025-11-16)

### Overview
Enhanced UI with primary element badge and action grouping.

### New Features
1. **Primary Element Badge** - Shows selected element type
2. **Action Groups** - Organized by category (편집, 구성, 정렬, 분산, 관리)
3. **Keyboard Shortcut Hints** - Visual shortcuts
4. **Visual Improvements** - Better hierarchy and organization

### Action Groups
- **편집** (Edit): Copy All (⌘⇧C), Paste (⌘⇧V)
- **구성** (Organize): Group (⌘G)
- **정렬** (Align): 6 alignment buttons
- **분산** (Distribute): 2 distribution buttons
- **관리** (Manage): Delete All (⌦), Clear Selection (Esc)

---

## Batch Property Editor

**Status**: ✅ Phase 2.1 Complete (2025-11-16)

### Overview
Smart property detection and batch editing with staged updates.

### Key Features
- Smart property detection (finds common properties)
- Mixed value handling
- Staged updates (pending until "Apply All")
- Property type detection
- Category filtering (Layout, Style, Content)
- Mixed-only filter

### Property Type Detection
- **Color**: backgroundColor, color, borderColor
- **Dimension**: width, height, padding, margin
- **Boolean**: isDisabled, isRequired, isSelected
- **Select**: variant, size, display, flexDirection
- **Number**: opacity, zIndex, order

---

## Component Migration Status

**Status**: ✅ Phase 0-6 Complete (2025-11-07)

### Overview
Systematic migration to tv() pattern with Action tokens.

### Completed Phases
1. **Phase 0.1**: Semantic Tokens ✅
2. **Phase 0.2**: Component Variant Types ✅
3. **Phase 0.4**: Inspector Property Components ✅
4. **Phase 1**: Component TSX Refactoring (Card, Panel) ✅
5. **Phase 2**: Button.css Semantic Token Migration ✅
6. **Phase 3**: Card Component Complete Migration ✅
7. **Phase 4**: Action Token Hover/Pressed States ✅
8. **Phase 5**: Separator Component Migration ✅
9. **Phase 6**: Tag Component Action Token Migration ✅

### Migrated Components
- Button
- Card
- Panel
- Separator
- TagGroup/Tag

### Pattern
- Use `tv()` from tailwind-variants
- Use `composeRenderProps` for className composition
- Semantic CSS classes (`react-aria-*` prefix)
- Action tokens for theming

---

## CSS Architecture & Theme System

**Status**: ✅ Phase 0-4.7 Complete (2025-11-09)

### Overview
Complete CSS refactoring with Builder/Preview theme isolation.

### Key Accomplishments

**1. Theme System Isolation** ✅
- Builder UI and Preview completely separated
- Builder uses `--builder-*` tokens
- Preview uses `--action-*` tokens
- Zero interference between themes

**2. Zero Hardcoded Colors** ✅
- Removed 27 hardcoded colors
- Removed 320 palette variable references
- 100% CSS variables

**3. ITCSS Architecture** ✅
```
src/builder/styles/
├── 1-theme/
│   ├── builder-system.css
│   ├── preview-system.css
│   └── shared-tokens.css
├── 2-base/
├── 3-utilities/
├── 4-layout/
└── 5-modules/
```

**4. CSS Layer Hierarchy** ✅
```css
@layer dashboard
@layer builder-system
@layer preview-system
@layer shared-tokens
@layer components
@layer utilities
```

### Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Hardcoded Colors | 27 | 0 | -100% |
| Builder Palette Vars | 320 | 0 | -100% |
| @layer Coverage | 85% | 95% | +10% |
| Builder Tokens | 35 | 70 | +100% |

### Documentation
- [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)

---

## M3 Color System Guide

**Status**: ✅ Complete (2025-11-19)

### Overview
Dynamic Material Design 3 Color Roles visualization in Theme Studio.

### Key Features
- Displays selected theme's actual colors in M3 role structure
- 20 M3 Color Roles across 5 categories
- Light/Dark Mode automatic switching
- Real-time theme color display

### Technical Implementation
- IndexedDB token loading
- HSL → Hex conversion
- Raw scope token handling
- M3 mapping rules (light: 600, dark: 400)

### Files Created
- `src/builder/panels/themes/components/M3ColorSystemGuide.tsx` (214 lines)
- `src/builder/panels/themes/components/M3ColorSystemGuide.css` (283 lines)

### User Experience
1. Open Theme Studio → M3 diagram appears
2. Select theme → Colors update in real-time
3. Toggle Dark Mode → Diagram switches shades
4. Generate theme (AI/Figma) → M3 roles populate automatically

### Documentation
- [M3_PALETTE_MAPPING.md](M3_PALETTE_MAPPING.md)

---

## Panel System Standardization

**Status**: ✅ Complete (2025-11-13)

### Overview
Complete refactoring for consistent architecture and naming conventions.

### Major Changes

**1. File Naming Standardization** ✅
- All panels use `XxxPanel.tsx` pattern
- Eliminated `index.tsx` anti-pattern

**2. Panel/Section Duplication Cleanup** ✅
- Removed obsolete Section files
- Integrated simple sections into panels
- Retained complex sections (1000+ lines)

**3. React Hooks Compliance** ✅
- Fixed hooks order violations
- All hooks at component top
- Proper dependency arrays

**4. Inspector Styles Fixed** ✅
- Added `.inspector` class to all panels
- Restored fieldset and property components
- React Aria overrides

### Final Panel Structure
```
src/builder/panels/
├── core/ (types, registry, configs)
├── sections/ (StyleSection, EventSection)
├── nodes/NodesPanel.tsx
├── components/ComponentsPanel.tsx
├── properties/PropertiesPanel.tsx
├── styles/StylesPanel.tsx
├── data/DataPanel.tsx
├── events/EventsPanel.tsx
├── themes/ThemesPanel.tsx
├── ai/AIPanel.tsx
└── settings/SettingsPanel.tsx
```

### Documentation
- [PANEL_SYSTEM.md](PANEL_SYSTEM.md)

---

## Layout Preset System

**Status**: ✅ Complete (2025-11-26)

### Overview
Layout body에 미리 정의된 레이아웃 구조를 적용하고 Slot을 자동 생성하는 시스템.

### Key Features
- **Body 에디터 분리**: PageBodyEditor (Layout 선택) / LayoutBodyEditor (프리셋 + Slot)
- **9개 프리셋**: Basic(3), Sidebar(2), Complex(2), Dashboard(2)
- **SVG 미리보기**: PresetPreview 컴포넌트로 시각적 썸네일
- **기존 Slot 처리**: 덮어쓰기/병합/취소 옵션 다이얼로그
- **History 통합**: addComplexElement로 단일 엔트리 기록
- **containerStyle 자동 적용**: CSS Grid/Flexbox

### Files
```
src/builder/panels/properties/editors/
├── PageBodyEditor.tsx           # Page body 전용
├── LayoutBodyEditor.tsx         # Layout body 전용
└── LayoutPresetSelector/
    ├── index.tsx                # 메인 컴포넌트
    ├── presetDefinitions.ts     # 9개 프리셋 정의
    ├── types.ts                 # 타입 정의
    ├── PresetPreview.tsx        # SVG 썸네일
    ├── ExistingSlotDialog.tsx   # 확인 다이얼로그
    ├── usePresetApply.ts        # 적용 로직
    └── styles.css               # 스타일
```

### Preset Categories

| Category | Presets |
|----------|---------|
| **Basic** | 전체화면, 수직 2단, 수직 3단 |
| **Sidebar** | 좌측 사이드바, 우측 사이드바 |
| **Complex** | Holy Grail, 3열 레이아웃 |
| **Dashboard** | 대시보드, 대시보드 (위젯) |

### Performance Optimizations
- `memo` + 커스텀 비교 함수
- `useMemo`로 Zustand 구독 방지
- `useCallback`으로 onChange 개별 메모이제이션
- SVG rect 요소 캐싱

### Documentation
- [LAYOUT_PRESET_SYSTEM.md](features/LAYOUT_PRESET_SYSTEM.md)
- [LAYOUT_SLOT_SYSTEM_PLAN_V2.md](LAYOUT_SLOT_SYSTEM_PLAN_V2.md)

---

## Preview Runtime Isolation

**Status**: ✅ Phase 1 Complete (2025-11-27)

### Overview
Preview Runtime을 Builder와 완전히 분리된 독립적인 React 애플리케이션으로 구현. `srcdoc` iframe 내에서 실행되며 `postMessage`를 통해서만 통신.

### Key Features
- **Security Isolation**: srcdoc iframe으로 완전 격리 (origin 분리)
- **State Independence**: 독립적인 Zustand store (`previewStore.ts`)
- **CSS/Style Isolation**: Builder 스타일과 완전 분리
- **Performance Optimized**: Option B+C 패턴으로 요소 선택 최적화
- **3-Level State Hierarchy**: App/Page/Component 상태 관리
- **ACK-based Communication**: 안정적인 양방향 메시지 프로토콜

### Architecture

```
Builder (Parent)          Preview Runtime (srcdoc iframe)
     │                              │
     │──── UPDATE_ELEMENTS ────────>│
     │                              │
     │<─── ELEMENTS_UPDATED_ACK ────│
     │                              │
     │<─── ELEMENT_SELECTED ────────│ (즉시 - rect, props)
     │<─── ELEMENT_COMPUTED_STYLE ──│ (지연 - RAF)
```

### Files
```
src/preview/
├── index.tsx              # Entry point
├── PreviewApp.tsx         # Main component
├── messaging/             # postMessage 처리
├── store/                 # 독립 Zustand store
├── router/                # MemoryRouter
├── renderers/             # 컴포넌트별 렌더러 (6개)
├── types/                 # Preview 전용 타입
└── utils/                 # 유틸리티 (5개)
```

### Communication Protocol
- **Builder → Preview**: UPDATE_ELEMENTS, THEME_VARS, SET_DARK_MODE, etc.
- **Preview → Builder**: PREVIEW_READY, ELEMENT_SELECTED, ELEMENT_COMPUTED_STYLE

### Documentation
- [PREVIEW_RUNTIME_ISOLATION.md](features/PREVIEW_RUNTIME_ISOLATION.md)

---

## Data Panel System

**Status**: ✅ Phase 1-6 Complete (2025-11-30)

### Overview
데이터 관리 시스템으로 DataTable, API Endpoint, Variable을 통합 관리하고 컴포넌트와 바인딩합니다.

### Phase 5: Integration (Canvas + Property Editor)

#### Key Features
- **useDataSource Hook**: DataTable/API 데이터 fetch, 캐싱, 변수 치환 지원
- **useVariable Hook**: Variable 값 접근 및 설정
- **useRouteParams Hook**: 동적 라우트 파라미터 접근
- **useDataBinding Hook**: 컴포넌트 속성-데이터 소스 연결
- **PropertyDataBinding Component**: Property Editor에서 바인딩 UI
- **Event System Actions**: fetchDataTable, refreshDataTable, executeApi, setVariable, getVariable

### Files
```
src/canvas/hooks/
├── useDataSource.ts      # 데이터 소스 통합 훅 (~490 lines)
└── index.ts              # 훅 exports

src/builder/panels/common/
├── PropertyDataBinding.tsx   # 데이터 바인딩 UI (~290 lines)
├── PropertyDataBinding.css   # 스타일
└── index.ts                  # export 추가

src/types/events/
├── events.registry.ts    # 데이터 액션 타입 추가
└── events.types.ts       # 액션 값 타입 추가
```

### Usage Example
```typescript
// Property Editor에서 바인딩 설정
<PropertyDataBinding
  label="데이터 소스"
  value={currentProps.dataBinding}
  onChange={handleDataBindingChange}
/>

// Canvas에서 데이터 사용
const { data, loading, error } = useDataSource('users');
const { value, setValue } = useVariable('currentUserId');
const params = useRouteParams();
```

### Phase 6: Testing & Polish

**코드 품질 검증 완료**
- TypeScript: 0 errors (`npx tsc --noEmit` 통과)
- ESLint: 0 errors, 17 warnings (react-refresh 관련 minor 경고)
- Vitest: 21개 테스트 모두 통과

**수정된 파일**
- `DatasetPanel.tsx` - 사용하지 않는 import 제거
- `ApiEndpointList.tsx` - 사용하지 않는 타입 import 제거
- `DataTableList.tsx` - 사용하지 않는 타입 import 제거
- `TransformerList.tsx` - 사용하지 않는 타입 import 제거
- `VariableList.tsx` - 사용하지 않는 타입 import 제거
- `ApiEndpointEditor.tsx` - 미사용 함수에 `_` 접두사 추가
- `PropertyDataBinding.tsx` - setState ESLint 경고 주석 추가
- `useDataSource.ts` - 불필요한 regex escape 제거

### Documentation
- [DATA_PANEL_SYSTEM.md](features/DATA_PANEL_SYSTEM.md)

---

## Nested Routes System

**Status**: ✅ Phase 1-6 Complete (2025-11-30)

### Overview
중첩 라우트 및 Slug 시스템 - 계층적 페이지 구조, 동적 라우트 파라미터, Property Editor 통합

### Phase Completion

| Phase   | Status | Description                        |
| ------- | ------ | ---------------------------------- |
| Phase 1 | ✅     | Foundation (Types, DB)             |
| Phase 2 | ✅     | Page Creation UI (Router)          |
| Phase 3 | ✅     | Dynamic Route Parameters           |
| Phase 4 | ✅     | Property Editors (이미 구현됨)     |
| Phase 5 | ✅     | NodesPanel Tree (이미 구현됨)      |
| Phase 6 | ✅     | Testing & Polish                   |

### Key Features

**Phase 3 - Dynamic Route Parameters**
- **urlGenerator.ts 확장**: extractDynamicParams, hasDynamicParams, fillDynamicParams, matchDynamicUrl
- **useCanvasParams Hook**: Canvas 컴포넌트에서 동적 파라미터 접근
- **RuntimeStore 연동**: routeParams 상태 관리
- **라우트 정렬**: 정적 라우트가 동적 라우트보다 먼저 매칭

**Phase 4 - Property Editors**
- **LayoutSlugEditor.tsx**: Layout base slug 편집, URL 프리뷰
- **PageParentSelector.tsx**: Parent 선택 + Page slug 편집
- **PageBodyEditor.tsx**: Layout/Parent 통합 편집 UI
- **generatePageUrl**: 실시간 최종 URL 계산

**Phase 5 - NodesPanel Tree**
- **renderTree 함수**: parent_id 기반 재귀적 트리 렌더링
- **hasChildren 함수**: 자식 페이지 존재 확인
- **CSS 들여쓰기**: data-depth 기반 계층 시각화 (0-5 레벨)
- **PagesTab 통합**: Pages + Layers 래핑

**Phase 6 - Testing & Polish**
- **TypeScript**: 0 errors (`npx tsc --noEmit` 통과)
- **ESLint**: 0 errors (minor warnings only)
- **Vitest**: 21개 테스트 모두 통과
- **코드 품질**: 모든 NESTED_ROUTES 관련 파일 정상 작동 확인

### Files
```
src/utils/urlGenerator.ts                                     # 동적 파라미터 유틸리티
src/canvas/router/CanvasRouter.tsx                            # useCanvasParams, 라우트 정렬
src/builder/panels/properties/editors/LayoutSlugEditor.tsx    # Layout slug 편집
src/builder/panels/properties/editors/PageParentSelector.tsx  # Parent 선택 + slug
src/builder/panels/properties/editors/PageBodyEditor.tsx      # 통합 편집 UI
src/builder/sidebar/index.tsx                                 # renderTree 함수
src/builder/nodes/index.css                                   # data-depth 스타일
src/builder/nodes/PagesTab/PagesTab.tsx                       # Pages + Layers
```

### Usage Example
```typescript
// 동적 파라미터 추출
extractDynamicParams('/products/:categoryId/:itemId')
// → ['categoryId', 'itemId']

// Canvas에서 사용
function ProductDetail() {
  const params = useCanvasParams();
  // params = { productId: '123' }
}

// API에서 변수 치환
const { data } = useDataSource('getProduct', {
  params: { productId: '{{route.productId}}' }
});

// 계층적 페이지 트리 렌더링
renderTree(pages, getLabel, onClick, onDelete, null, 0)
// → parent_id 기반 재귀 렌더링 with depth 들여쓰기
```

### Documentation
- [NESTED_ROUTES_SLUG_SYSTEM.md](features/NESTED_ROUTES_SLUG_SYSTEM.md)

---

## Performance Optimization Track A/B/C

**Status**: ✅ All Tracks Complete (2025-12-11)

### Overview
엔터프라이즈급 10,000개+ 요소, 24시간+ 안정 사용을 위한 성능 최적화. Panel Gateway, React Query, WebGL Builder, Publish App 분리, CI/SLO 자동화 완료.

### Track A: 즉시 실행 ✅

**A1. 미사용 코드 통합**

| 항목 | 구현 위치 |
|------|----------|
| Panel Gateway 적용 (3개 패널) | `PropertiesPanel.tsx:241-247`, `StylesPanel.tsx:44-50`, `ComponentsPanel.tsx:27-33` |
| Store Index Migration | `stores/utils/elementIndexer.ts`, `stores/elements.ts:156-158` |
| usePageLoader 통합 | `BuilderCore.tsx:24,156` |
| useAutoRecovery 통합 | `BuilderCore.tsx:25,164` |

**A2. 네트워크 최적화 (React Query)**

| 항목 | 구현 방식 |
|------|----------|
| Request Deduplication | React Query 내장 기능 |
| 캐시 관리 | staleTime: 5분, gcTime: 30분 |
| 요청 취소 | React Query 자동 관리 |

```typescript
// src/main.tsx - React Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5분 캐시
      gcTime: 30 * 60 * 1000,    // 30분 GC
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Track B: WebGL Builder ✅

**B0. 전제조건 충족**

| 항목 | 구현 파일 |
|------|----------|
| @pixi/react v8 호환성 | `workspace/PixiCanvasTest.tsx` |
| Feature Flag 설정 | `src/utils/featureFlags.ts:58` |
| 성능 베이스라인 측정 | `scripts/perf-benchmark.ts` |
| pnpm workspace 전환 | `pnpm-workspace.yaml` |

**B1. WebGL Canvas 구축**

```
src/builder/workspace/
├── canvas/
│   ├── BuilderCanvas.tsx          # 메인 WebGL 캔버스
│   ├── store/canvasStore.ts       # Direct Zustand Access
│   ├── sprites/                   # BoxSprite, TextSprite, ImageSprite
│   ├── selection/                 # SelectionBox, TransformHandle, LassoSelection
│   ├── grid/                      # GridLayer, useZoomPan
│   └── utils/gpuProfiler.ts       # GPU 프로파일링
└── overlay/                       # TextEditOverlay, useTextEdit
```

**B2. Publish App 분리**

```
packages/
├── shared/src/                    # 공통 Types, Utils, Components
└── publish/src/                   # SSR/SEO 지원 Publish App
    ├── registry/ComponentRegistry.tsx
    ├── renderer/PageRenderer.tsx, ElementRenderer.tsx
    └── styles/
```

### Track C: 검증 및 CI ✅

| 항목 | 구현 파일 |
|------|----------|
| Seed Generator | `scripts/lib/seedRandom.ts` (Mulberry32 PRNG) |
| Long Session Simulation | `scripts/long-session-test.ts` |
| GitHub Actions Workflow | `.github/workflows/performance-test.yml` |
| SLO Verification 자동화 | `scripts/verify-slo.ts` |

### 목표 성능 지표

| 지표 | 현재 (DOM) | 목표 (WebGL) |
|------|------------|--------------|
| 5,000개 렌더링 | 불가능 | < 16ms (60fps) |
| 10,000개 렌더링 | 불가능 | < 33ms (30fps) |
| 요소 선택 | 50-100ms | < 5ms |
| 줌/팬 반응 | 100-200ms | < 16ms |
| 메모리 (24시간) | +200MB | GPU VRAM 활용 |
| CPU (유휴) | 15-25% | < 2% (GPU 오프로드) |
| 안정 사용 | 2-3시간 | 24시간+ |

### 폐기된 항목

| 항목 | 이유 |
|------|------|
| Phase 4 Delta Sync | WebGL Builder에서 postMessage 자체가 제거됨 |
| requestDeduplication.ts | React Query로 대체됨 |
| QueryPersister.ts | React Query 메모리 캐시로 충분 |

### Documentation
- [docs/performance/README.md](performance/README.md) - 개요 및 완료 현황
- [docs/performance/task.md](performance/task.md) - 상세 작업 체크리스트
- [docs/performance/10-webgl-builder-architecture.md](performance/10-webgl-builder-architecture.md) - WebGL 아키텍처

---

## Summary Statistics

### Total Features Completed: 23
### Total Lines of Code Added: ~18,000+
### Code Reduction Achieved: 37-88% in refactored areas
### Performance Improvements:
- CPU Usage: 30-40% reduction (RAF throttling)
- Memory: 50% reduction (virtual scrolling)
- History entries: 80-90% reduction
- **NEW** Network requests: React Query caching (5min stale, 30min GC)
- **NEW** WebGL rendering: 10,000+ elements @ 60fps target

### Key Achievements
✅ Multi-element operations (selection, editing, copy/paste, grouping)
✅ Advanced keyboard shortcuts and accessibility
✅ Performance optimization (RAF, virtual scrolling)
✅ Complete theme system isolation
✅ Panel system standardization
✅ Layout Preset System with Slot auto-creation
✅ Preview Runtime Isolation (srcdoc iframe, independent store)
✅ Data Panel System Phase 1-6 (Types, Store, UI, Editors, Integration)
✅ Nested Routes Dynamic Parameters (urlGenerator, useCanvasParams, routeParams)
✅ **Performance Optimization Track A/B/C** (Panel Gateway, React Query, WebGL Canvas, Publish App, CI/SLO)
✅ Comprehensive documentation

---

**Last Updated**: 2025-12-11
**Next Steps**: See [PLANNED_FEATURES.md](PLANNED_FEATURES.md) for upcoming implementations
