# Preview Runtime Isolation

**Status**: ✅ Phase 1 Complete (2025-11-27)

## Overview

Preview Runtime은 Builder와 완전히 분리된 독립적인 React 애플리케이션입니다. `srcdoc` iframe 내에서 실행되며, `postMessage`를 통해서만 Builder와 통신합니다.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Builder                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Sidebar    │  │   Preview    │  │  Inspector   │      │
│  │              │  │   (iframe)   │  │              │      │
│  │              │  │      ↓       │  │              │      │
│  └──────────────┘  │  postMessage │  └──────────────┘      │
│                    └───────┬──────┘                         │
└────────────────────────────┼────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Preview Runtime                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  srcdoc iframe                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │ PreviewApp │  │   Store    │  │  MessageHandler│  │  │
│  │  │  (React)   │  │  (Zustand) │  │  (postMessage) │  │  │
│  │  └────────────┘  └────────────┘  └────────────────┘  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │ Renderers  │  │   Router   │  │  EventEngine   │  │  │
│  │  │ (React     │  │ (Memory)   │  │  (Actions)     │  │  │
│  │  │  Aria)     │  │            │  │                │  │  │
│  │  └────────────┘  └────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

### 1. Security Isolation
- `srcdoc` iframe은 `about:srcdoc` origin을 가짐
- Builder의 window/document에 직접 접근 불가
- 사용자 코드가 Builder를 오염시킬 수 없음

### 2. State Independence
- Preview 전용 Zustand store (`previewStore.ts`)
- Builder store와 완전히 분리
- postMessage를 통한 단방향 데이터 플로우

### 3. CSS/Style Isolation
- Preview 내부 스타일이 Builder에 영향 없음
- Design tokens는 postMessage로 동적 주입
- Theme switching 독립적 처리

### 4. Performance
- Builder와 별도 React 트리
- 독립적인 렌더링 사이클
- 요소 선택 시 즉시 응답 (Option B+C 패턴)

## File Structure

```
src/preview/
├── index.tsx              # Entry point (srcdoc에서 실행)
├── PreviewApp.tsx         # Main React component
├── messaging/
│   ├── index.ts           # Exports
│   └── messageHandler.ts  # postMessage 수신/발신
├── store/
│   ├── index.ts           # Exports
│   ├── previewStore.ts    # Zustand store
│   └── types.ts           # Type definitions
├── router/
│   ├── index.ts           # Exports
│   └── PreviewRouter.tsx  # MemoryRouter 기반
├── renderers/
│   ├── index.ts           # Renderer map
│   ├── CollectionRenderers.tsx
│   ├── DateRenderers.tsx
│   ├── FormRenderers.tsx
│   ├── LayoutRenderers.tsx
│   ├── SelectionRenderers.tsx
│   └── TableRenderer.tsx
├── types/
│   └── index.ts           # Preview-specific types
└── utils/
    ├── eventHandlers.ts   # Event handling utilities
    ├── layoutResolver.ts  # Layout/Slot resolution
    ├── messageHandlers.ts # Legacy message handlers
    ├── propsConverter.ts  # Props transformation
    └── responsiveCSS.ts   # Responsive styles
```

## Communication Protocol

### Builder → Preview Messages

| Message Type | Purpose | Payload |
|--------------|---------|---------|
| `UPDATE_ELEMENTS` | Element tree sync | `{ elements, pageInfo }` |
| `UPDATE_ELEMENT_PROPS` | Single element update | `{ elementId, props }` |
| `DELETE_ELEMENT` | Remove element | `{ elementId }` |
| `DELETE_ELEMENTS` | Batch remove | `{ elementIds }` |
| `THEME_VARS` | Design tokens | `{ vars: ThemeVar[] }` |
| `SET_DARK_MODE` | Theme toggle | `{ isDark }` |
| `UPDATE_PAGE_INFO` | Page context | `{ pageId, layoutId }` |
| `UPDATE_PAGES` | Page list | `{ pages }` |
| `REQUEST_ELEMENT_SELECTION` | Auto-select request | `{ elementId }` |

### Preview → Builder Messages

| Message Type | Purpose | Payload |
|--------------|---------|---------|
| `PREVIEW_READY` | Initialization complete | (none) |
| `ELEMENTS_UPDATED_ACK` | Elements received | `{ elementCount, timestamp }` |
| `ELEMENT_SELECTED` | User clicked element | `{ elementId, rect, props, style }` |
| `ELEMENT_COMPUTED_STYLE` | Computed styles (deferred) | `{ elementId, computedStyle }` |
| `ELEMENTS_DRAG_SELECTED` | Lasso selection | `{ elementIds }` |

## Element Selection Flow (Option B+C)

성능 최적화를 위해 요소 선택 시 두 단계로 분리:

```
User Click in Preview
       │
       ▼
┌──────────────────┐
│ ELEMENT_SELECTED │ ← Immediate (rect, props, style)
└────────┬─────────┘
         │
         ▼
   Builder Updates:
   - Selection state
   - Overlay display
   - Inspector basic info
         │
         │ (requestAnimationFrame)
         ▼
┌────────────────────────┐
│ ELEMENT_COMPUTED_STYLE │ ← Deferred (20+ computed props)
└────────┬───────────────┘
         │
         ▼
   Inspector Updates:
   - Computed styles panel
   - Inherited values
```

## Preview Store State

```typescript
interface PreviewStoreState {
  // Elements
  elements: PreviewElement[];
  setElements: (elements) => void;
  updateElementProps: (id, props) => void;

  // Pages & Layout
  pages: PreviewPage[];
  currentPageId: string | null;
  currentLayoutId: string | null;
  currentPath: string;

  // Theme
  themeVars: ThemeVar[];
  isDarkMode: boolean;

  // Data Sources
  dataSources: DataSource[];
  dataStates: Map<string, DataState>;

  // State Hierarchy (3-level)
  appState: Record<string, unknown>;      // Global state
  pageStates: Map<string, Record<...>>;   // Per-page state
  componentStates: Map<string, Record<...>>; // Per-component state

  // Utility
  setState: (path, value) => void;  // "app.user.name", "page.count", "component.id.value"
  getState: (path) => unknown;

  // Ready flag
  isReady: boolean;
}
```

## State Hierarchy

Preview Runtime은 3단계 상태 계층을 지원:

1. **App State** (`app.*`): 전역 상태 (user, theme, settings)
2. **Page State** (`page.*`): 페이지별 상태 (form data, filters)
3. **Component State** (`component.{elementId}.*`): 컴포넌트별 상태

```typescript
// Examples
setState('app.user.name', 'John');
setState('page.formData.email', 'john@example.com');
setState('component.button-1.isLoading', true);

getState('app.user.name'); // 'John'
```

## ACK-based Auto-Select Pattern

페이지 전환 후 요소 자동 선택을 위한 ACK 패턴:

```
Builder                          Preview
   │                                │
   │─── UPDATE_ELEMENTS ───────────>│
   │    (+ register pending select) │
   │                                │
   │<── ELEMENTS_UPDATED_ACK ───────│
   │                                │
   │─── REQUEST_ELEMENT_SELECTION ─>│
   │    (triggered by ACK)          │
   │                                │
   │<── ELEMENT_SELECTED ───────────│
```

**Implementation**: `useIframeMessenger.ts` - module-level `pendingAutoSelectElementId`

## Renderers

각 컴포넌트 타입별 전용 렌더러:

| Renderer | Components |
|----------|------------|
| `CollectionRenderers` | ListBox, GridList, Menu, Tree, TagGroup |
| `SelectionRenderers` | Select, ComboBox, ToggleButtonGroup |
| `FormRenderers` | TextField, NumberField, Checkbox, Radio, Switch |
| `DateRenderers` | DatePicker, Calendar, TimeField |
| `LayoutRenderers` | Card, Separator, Slot, Layout |
| `TableRenderer` | Table, Column, Row, Cell |

## Testing srcdoc Mode

srcdoc 모드 테스트를 위한 localStorage 기반 persistence:

```typescript
// Enable srcdoc testing
localStorage.setItem('preview_srcdoc_test', 'true');

// Check current mode
const isSrcdocMode = localStorage.getItem('preview_srcdoc_test') === 'true';
```

## Future Phases

### Phase 2: Event System Integration
- EventEngine 완전 분리
- Action 실행 Preview 내부에서 처리
- Custom JavaScript 실행 샌드박싱

### Phase 3: Full Isolation
- Web Worker 기반 실행
- 사용자 코드 완전 격리
- CSP (Content Security Policy) 적용

## Related Documentation

- [CLAUDE.md - Preview System](../CLAUDE.md#preview-system-iframe)
- [PERFORMANCE_REPORT.md](../PERFORMANCE_REPORT.md)
- [PROPERTIES_PANEL_OPTIMIZATION.md](../PROPERTIES_PANEL_OPTIMIZATION.md)
