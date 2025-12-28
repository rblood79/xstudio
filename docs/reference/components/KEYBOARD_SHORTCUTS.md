# XStudio Keyboard Shortcuts System

> **Version:** 2.0
> **Last Updated:** 2024-12-28
> **Status:** Audit Complete + Architecture Proposal

---

## Executive Summary

### Current State
- **67+ shortcuts** across **22 files** in `src/builder`
- **3 implementation patterns** (only 1 centralized)
- **6 critical limitations** in current registry

### Proposed Solution
- Enhanced registry with **capture phase**, **priority system**, **scope-aware** filtering
- **8 implementation phases** from basic enhancement to full customization
- Industry-aligned design inspired by **Figma** and **Photoshop Web**

### Key Metrics

| Metric | Current | After Phase 3 | After Phase 7 |
|--------|---------|---------------|---------------|
| Centralized Shortcuts | 45% | 95% | 100% |
| Conflict Detection | ❌ | ✅ | ✅ |
| Context-Aware | ❌ | ✅ | ✅ |
| International KB | ❌ | ❌ | ✅ |
| User Customization | ❌ | ❌ | ✅ |

---

## 구현 전/후 비교표

### 아키텍처 비교

| 항목 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **단축키 정의 위치** | 22개 파일에 분산 | `keyboardShortcuts.json` 단일 파일 |
| **등록 방식** | 3가지 패턴 혼재 | `useKeyboardShortcutsRegistry` 통합 |
| **설정 포맷** | 하드코딩 | JSON 기반 설정 |
| **이벤트 타겟** | window/document 혼용 | 표준화된 타겟 선택 |

### 기능 비교

| 기능 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **중앙 집중 관리** | ❌ 45%만 레지스트리 사용 | ✅ 100% 레지스트리 통합 |
| **Capture Phase** | ❌ 별도 구현 필요 | ✅ `capture: true` 옵션 |
| **입력 필드 내 동작** | ❌ 일괄 차단 | ✅ `allowInInput` 선택적 허용 |
| **Shift 수식어** | ❌ 미지원 | ✅ `'shift'` modifier 추가 |
| **스코프 시스템** | ❌ 없음 | ✅ 7개 스코프 정의 |
| **우선순위** | ❌ 등록 순서 의존 | ✅ `priority` 기반 처리 |
| **충돌 감지** | ❌ 런타임 오류 발생 | ✅ 개발 시점 경고 |
| **국제 키보드** | ❌ US 레이아웃 고정 | ✅ Keyboard API 레이아웃 감지 |
| **사용자 커스터마이징** | ❌ 불가능 | ✅ 리맵, 프로필, 워크스페이스 |

### 개발자 경험 (DX) 비교

| 항목 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **단축키 추가** | 파일마다 다른 방식 | 통일된 인터페이스 |
| **디버깅** | console.log 수동 삽입 | DevTools 내장 디버거 |
| **충돌 해결** | 수동 테스트 필요 | 자동 충돌 리포트 |
| **문서화** | 별도 관리 필요 | JSON에서 자동 생성 |
| **i18n** | 지원 안함 | `i18n` 속성 내장 |

### 사용자 경험 (UX) 비교

| 항목 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **도움말 패널** | 기본 목록 | 검색 + 카테고리 탭 + 진행률 |
| **입력 필드 충돌** | Cmd+Z 작동 안함 | 컨텍스트 인식 동작 |
| **동일 키 충돌** | 예측 불가 동작 | 스코프별 분리 |
| **국제 키보드** | 레이아웃 무시 | 자동 레이아웃 감지 |
| **개인화** | 불가능 | 완전한 커스터마이징 |

### 코드 복잡도 비교

| 측정 항목 | 현재 (Before) | 구현 후 (After) | 변화 |
|----------|--------------|-----------------|------|
| 단축키 관련 파일 수 | 22개 | 5개 | -77% |
| 중복 이벤트 리스너 | 17개 | 2개 | -88% |
| 단축키당 코드 라인 | ~15줄 | ~5줄 | -67% |
| 테스트 가능성 | 낮음 | 높음 | ⬆️ |

### 마이그레이션 요약

```
현재 상태                          목표 상태
─────────────────────────────────────────────────────────
useKeyboardShortcuts.ts    ──┐
useZoomShortcuts.ts        ──┤
useCopyPasteActions.ts     ──┼──▶  useGlobalKeyboardShortcuts.ts
useBlockKeyboard.ts        ──┤         +
PropertiesPanel.tsx (일부) ──┘     keyboardShortcuts.json
─────────────────────────────────────────────────────────

유지 (컴포넌트 로컬):
• PropertyUnitInput     - 값 조절 (Arrow)
• PropertyCustomId      - 유효성 검사 (Enter/Escape)
• TextEditOverlay       - 텍스트 편집
• AIPanel              - 메시지 전송
```

---

## Table of Contents

0. [구현 전/후 비교표](#구현-전후-비교표)
1. [Current State Analysis](#part-1-current-state-analysis)
2. [Industry Benchmarks](#part-2-industry-benchmarks)
3. [Proposed Architecture](#part-3-proposed-architecture)
4. [Implementation Roadmap](#part-4-implementation-roadmap)
5. [Appendix A: Shortcuts Reference](#appendix-a-shortcuts-reference)
6. [Appendix B: Custom Components](#appendix-b-custom-components)

---

## Part 1: Current State Analysis

### 1.1 Problem Overview

Despite having `useKeyboardShortcutsRegistry`, shortcuts are scattered with 3 different patterns:

| Pattern | Files | Shortcuts | Centralized |
|---------|-------|-----------|-------------|
| Direct `addEventListener` | 8 | ~20 | ❌ |
| React `onKeyDown` | 9 | ~15 | ❌ |
| `useKeyboardShortcutsRegistry` | 4 | ~32 | ✅ |

### 1.2 Registry Limitations

| Limitation | Impact | Required Fix |
|------------|--------|--------------|
| No `capture` phase | Can't intercept browser defaults | `capture: true` option |
| Input field blocking | Undo/Redo don't work in inputs | `allowInInput` option |
| No `shift` modifier | Tab navigation broken | Add `'shift'` modifier |
| No scope system | Same key conflicts | `scope` property |
| No priority | Conflict resolution impossible | `priority` property |
| No `stopPropagation` | Event bubbling issues | `stopPropagation` option |

### 1.3 Current Implementation Map

```
src/builder/
├── hooks/
│   ├── useKeyboardShortcuts.ts      # Undo/Redo (document, capture)
│   ├── useKeyboardShortcutsRegistry.ts  # Central registry
│   └── useTreeKeyboardNavigation.ts # Tree navigation
├── workspace/
│   ├── useZoomShortcuts.ts          # Zoom (window, capture)
│   └── ZoomControls.tsx             # Zoom input (onKeyDown)
├── panels/
│   ├── properties/PropertiesPanel.tsx   # 30+ shortcuts (registry)
│   └── events/hooks/
│       ├── useCopyPasteActions.ts   # Copy/Paste (document)
│       └── useBlockKeyboard.ts      # Navigation (document)
└── components/property/
    ├── PropertyUnitInput.tsx        # Value editing (onKeyDown)
    ├── PropertyCustomId.tsx         # ID validation (onKeyDown)
    └── PropertyInput.tsx            # Text input (onKeyDown)
```

---

## Part 2: Industry Benchmarks

### 2.1 Figma vs Photoshop Comparison

| Feature | Figma | Photoshop Web | XStudio (Proposed) |
|---------|-------|---------------|-------------------|
| **Storage** | JSON + localStorage + DB | .kys files + Workspace | JSON config |
| **Categories** | Tab-based | 4 types | 8 categories |
| **Context-Aware** | ✅ State-based | ✅ Taskspaces | ✅ Scope system |
| **Conflict Detection** | ✅ Runtime | ✅ Warning dialog | ✅ Priority + DevTools |
| **International KB** | ✅ 2.5k+ layouts | ✅ OS-level | ⚡ Phase 6 |
| **Customization** | ❌ | ✅ Full | ⚡ Phase 7 |
| **Help Panel** | ✅ Gamified | ✅ Searchable | ✅ Enhanced |

### 2.2 Key Innovations to Adopt

**From Figma:**
- JSON-based shortcut configuration
- Keyboard API for layout detection
- Dual storage (localStorage + backend)
- Gamified help panel with usage tracking

**From Photoshop:**
- 4-category system (we extend to 8)
- Conflict warning dialog
- Hold-to-activate temporary tools
- Workspace-based shortcut sets

### 2.3 UX Best Practices

| Practice | Description | Status |
|----------|-------------|--------|
| Echo conventions | ⌘+C, ⌘+V, ⌘+Z | ✅ Done |
| Fence novel shortcuts | Context-specific keys | 🔧 Need scope |
| ESC exits modals | Universal escape | ✅ Done |
| ? shows help | Help shortcut | ✅ Cmd+? |
| Single-key caution | Avoid in text fields | 🔧 Need filtering |
| Discoverability | Tooltips with shortcuts | ⚡ Phase 5 |

**Sources:**
- [Figma: International Keyboard Shortcuts](https://www.figma.com/blog/behind-the-scenes-international-keyboard-shortcuts/)
- [Adobe: Customize Keyboard Shortcuts](https://helpx.adobe.com/photoshop/using/customizing-keyboard-shortcuts.html)
- [Knock: How to Design Great Shortcuts](https://knock.app/blog/how-to-design-great-keyboard-shortcuts)

---

## Part 3: Proposed Architecture

### 3.1 Enhanced Registry Interface

```typescript
// src/builder/hooks/useKeyboardShortcutsRegistry.ts

export type KeyboardModifier =
  | 'cmd' | 'cmdShift' | 'cmdAlt'
  | 'alt' | 'altShift'
  | 'shift'           // NEW
  | 'none';

export interface KeyboardShortcut {
  // Core
  key: string;
  code?: string;
  modifier: KeyboardModifier;
  handler: () => void;

  // Behavior
  preventDefault?: boolean;
  stopPropagation?: boolean;    // NEW
  allowInInput?: boolean;       // NEW

  // Organization
  category: ShortcutCategory;
  scope: ShortcutScope | ShortcutScope[];
  priority: number;             // NEW (higher = first)

  // Metadata
  id: string;
  description: string;
  i18n?: Record<string, string>;
  disabled?: boolean;
}

export interface RegistryOptions {
  eventType?: 'keydown' | 'keyup';
  capture?: boolean;            // NEW
  target?: 'window' | 'document';
}
```

### 3.2 Category System (8 Categories)

```typescript
export enum ShortcutCategory {
  SYSTEM = 'system',           // Undo, Redo, Save (priority: 100)
  NAVIGATION = 'navigation',   // Zoom, Pan (priority: 90)
  PANELS = 'panels',           // Panel toggles (priority: 80)
  CANVAS = 'canvas',           // Element manipulation (priority: 70)
  TOOLS = 'tools',             // Tool selection (priority: 60)
  PROPERTIES = 'properties',   // Property editing (priority: 50)
  EVENTS = 'events',           // Events panel (priority: 50)
  NODES = 'nodes',             // Nodes panel (priority: 50)
}
```

### 3.3 Scope System

```typescript
export type ShortcutScope =
  | 'global'           // Always active
  | 'canvas-focused'   // Canvas has focus
  | 'panel:properties' // Properties panel active
  | 'panel:events'     // Events panel active
  | 'panel:nodes'      // Nodes panel active
  | 'modal'            // Modal is open
  | 'text-editing';    // Text input focused

// Same key, different scopes = no conflict
const shortcuts = [
  { key: 'c', modifier: 'cmd', scope: 'canvas-focused', handler: copyElements },
  { key: 'c', modifier: 'cmd', scope: 'panel:events', handler: copyActions },
];
```

### 3.4 JSON Configuration

```json
{
  "version": "1.0.0",
  "shortcuts": {
    "undo": {
      "key": "z",
      "modifier": "cmd",
      "category": "system",
      "scope": "global",
      "priority": 100,
      "allowInInput": true,
      "capture": true,
      "description": "Undo last action",
      "i18n": { "ko": "실행 취소", "ja": "元に戻す" }
    },
    "zoomIn": {
      "key": "=",
      "modifier": "cmd",
      "alternateKeys": ["+", "NumpadAdd"],
      "category": "navigation",
      "scope": "global",
      "priority": 90,
      "capture": true,
      "description": "Zoom in"
    }
  }
}
```

### 3.5 Conflict Detection

```typescript
export function detectConflicts(shortcuts: KeyboardShortcut[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const keyMap = new Map<string, KeyboardShortcut[]>();

  for (const shortcut of shortcuts) {
    const key = `${shortcut.modifier}+${shortcut.key}`;
    const existing = keyMap.get(key) || [];

    for (const prev of existing) {
      if (scopesOverlap(prev.scope, shortcut.scope)) {
        conflicts.push({
          existing: prev,
          new: shortcut,
          resolution: shortcut.priority > prev.priority ? 'override' : 'skip',
        });
      }
    }
    keyMap.set(key, [...existing, shortcut]);
  }

  // Dev-time warning
  if (process.env.NODE_ENV === 'development' && conflicts.length > 0) {
    console.warn('⚠️ Keyboard shortcut conflicts:', conflicts);
  }

  return conflicts;
}
```

---

## Part 4: Implementation Roadmap

### Phase Overview

| Phase | Description | Priority | Effort |
|-------|-------------|----------|--------|
| **0** | Enhance Registry | 🔴 Critical | 2 days |
| **1** | Migrate Global Shortcuts | 🔴 Critical | 3 days |
| **2** | JSON Config | 🟡 High | 2 days |
| **3** | Single Registration Point | 🟡 High | 2 days |
| **4** | Category & Scope System | 🟡 High | 3 days |
| **5** | Conflict Detection & DevTools | 🟢 Medium | 2 days |
| **6** | International Keyboard | 🟢 Medium | 3 days |
| **7** | User Customization | 🔵 Low | 5 days |

---

### Phase 0: Enhance Registry

**Goal:** Add missing capabilities to `useKeyboardShortcutsRegistry`

```typescript
export function useKeyboardShortcutsRegistry(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = [],
  options: RegistryOptions = {}
): void {
  const { eventType = 'keydown', capture = false, target = 'window' } = options;

  useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      const targetEl = event.target as HTMLElement;
      const isInputField =
        targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.isContentEditable;

      // Sort by priority (descending)
      const sorted = [...shortcuts].sort((a, b) => (b.priority || 0) - (a.priority || 0));

      for (const shortcut of sorted) {
        if (isInputField && !shortcut.allowInInput) continue;

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) event.preventDefault();
          if (shortcut.stopPropagation) event.stopPropagation();
          shortcut.handler();
          break;
        }
      }
    };

    const eventTarget = target === 'document' ? document : window;
    eventTarget.addEventListener(eventType, handleKeyEvent, { capture });
    return () => eventTarget.removeEventListener(eventType, handleKeyEvent, { capture });
  }, [...deps]);
}
```

---

### Phase 1: Migrate Global Shortcuts

**Files to Migrate:**

| File | Shortcuts | Migration Notes |
|------|-----------|-----------------|
| `useKeyboardShortcuts.ts` | Undo/Redo | `allowInInput: true`, `capture: true` |
| `useZoomShortcuts.ts` | Zoom +/-/0/1/2 | `capture: true` |
| `useCopyPasteActions.ts` | Copy/Paste/Delete | `scope: 'panel:events'` |
| `useBlockKeyboard.ts` | Arrow/Escape | `scope: 'panel:events'` |
| `PropertiesPanel.tsx` (Tab) | Tab navigation | `modifier: 'shift'` |

**Keep as Component-Local:**
- `PropertyUnitInput` - Arrow keys for value adjustment
- `PropertyCustomId` - Enter/Escape for validation
- `TextEditOverlay` - Text editing shortcuts
- `AIPanel` - Message submission

---

### Phase 2-3: JSON Config & Single Registration

```typescript
// src/builder/hooks/useGlobalKeyboardShortcuts.ts

import { SHORTCUT_DEFINITIONS } from '../config/keyboardShortcuts.json';

export function useGlobalKeyboardShortcuts() {
  const { undo, redo } = useStore.getState();
  const { zoomTo } = useCanvasSyncStore.getState();

  // System shortcuts (capture phase)
  useKeyboardShortcutsRegistry([
    { ...SHORTCUT_DEFINITIONS.undo, handler: undo },
    { ...SHORTCUT_DEFINITIONS.redo, handler: redo },
    { ...SHORTCUT_DEFINITIONS.zoomIn, handler: () => zoomTo(zoom + 0.1) },
    // ...
  ], [], { capture: true, target: 'document' });

  // Normal shortcuts
  useKeyboardShortcutsRegistry([
    { ...SHORTCUT_DEFINITIONS.copy, handler: handleCopy },
    // ...
  ], []);
}
```

---

### Phase 4: Category & Scope System

```typescript
export function useGlobalKeyboardShortcuts() {
  const activeScope = useActiveScope(); // 'canvas-focused' | 'panel:events' | etc.

  const activeShortcuts = useMemo(() =>
    ALL_SHORTCUTS.filter(s =>
      s.scope === 'global' ||
      (Array.isArray(s.scope) ? s.scope.includes(activeScope) : s.scope === activeScope)
    ),
    [activeScope]
  );

  useKeyboardShortcutsRegistry(activeShortcuts, [activeScope], {
    capture: true,
    target: 'document',
  });
}
```

---

### Phase 5: DevTools & Enhanced Help

```typescript
// Shortcut Debugger (dev only)
export function ShortcutDebugger() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="shortcut-debugger">
      <div>Last key: {lastEvent?.key}</div>
      <div>Matched: {matchedShortcut?.description}</div>
      {conflicts.length > 0 && <div>⚠️ {conflicts.length} conflicts</div>}
    </div>
  );
}

// Enhanced Help Panel with usage tracking
export function EnhancedKeyboardHelp() {
  return (
    <div>
      <SearchField placeholder="Search shortcuts..." />
      <Tabs>
        <Tab id="all">All</Tab>
        <Tab id="system">System</Tab>
        <Tab id="canvas">Canvas</Tab>
      </Tabs>
      <ShortcutsList />
      <ProgressBar label="67/67 shortcuts mastered" />
    </div>
  );
}
```

---

### Phase 6-7: International KB & Customization

**Phase 6: Keyboard Layout Detection**
```typescript
async function detectKeyboardLayout() {
  if ('keyboard' in navigator) {
    const layoutMap = await navigator.keyboard.getLayoutMap();
    return inferLayoutFromMap(layoutMap);
  }
  return { layout: 'US', confidence: 0.5 };
}
```

**Phase 7: User Customization**
- Remap shortcuts
- Export/import profiles
- Workspace-based sets
- Conflict resolution UI

---

## Appendix A: Shortcuts Reference

### A.1 System Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+Z` | Undo | system | global |
| `Cmd+Shift+Z` | Redo | system | global |

### A.2 Navigation Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+=` | Zoom In | navigation | global |
| `Cmd+-` | Zoom Out | navigation | global |
| `Cmd+0` | Fit to Screen | navigation | global |
| `Cmd+1` | Zoom 100% | navigation | global |
| `Cmd+2` | Zoom 200% | navigation | global |

### A.3 Panel Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Ctrl+Shift+N` | Toggle Nodes | panels | global |
| `Ctrl+Shift+C` | Toggle Components | panels | global |
| `Ctrl+Shift+P` | Toggle Properties | panels | global |
| `Ctrl+Shift+S` | Toggle Styles | panels | global |
| `Ctrl+Shift+E` | Toggle Events | panels | global |
| `Ctrl+Shift+H` | Toggle History | panels | global |
| `Ctrl+,` | Open Settings | panels | global |

### A.4 Canvas Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+C` | Copy elements | canvas | canvas-focused |
| `Cmd+V` | Paste elements | canvas | canvas-focused |
| `Cmd+D` | Duplicate | canvas | canvas-focused |
| `Cmd+A` | Select all | canvas | canvas-focused |
| `Escape` | Clear selection | canvas | canvas-focused |
| `Tab` | Next element | canvas | canvas-focused |
| `Shift+Tab` | Previous element | canvas | canvas-focused |
| `Backspace` | Delete | canvas | canvas-focused |

### A.5 Grouping & Alignment

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+G` | Group | canvas | canvas-focused |
| `Cmd+Shift+G` | Ungroup | canvas | canvas-focused |
| `Cmd+Shift+L` | Align Left | canvas | canvas-focused |
| `Cmd+Shift+H` | Align H Center | canvas | canvas-focused |
| `Cmd+Shift+R` | Align Right | canvas | canvas-focused |
| `Cmd+Shift+T` | Align Top | canvas | canvas-focused |
| `Cmd+Shift+M` | Align V Middle | canvas | canvas-focused |
| `Cmd+Shift+B` | Align Bottom | canvas | canvas-focused |
| `Cmd+Shift+D` | Distribute H | canvas | canvas-focused |
| `Alt+Shift+V` | Distribute V | canvas | canvas-focused |

### A.6 Properties Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+Shift+C` | Copy properties | properties | panel:properties |
| `Cmd+Shift+V` | Paste properties | properties | panel:properties |

### A.7 Events Panel Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+C` | Copy actions | events | panel:events |
| `Cmd+V` | Paste actions | events | panel:events |
| `Delete` | Delete actions | events | panel:events |
| `Arrow Up/Down` | Navigate actions | events | panel:events |
| `Escape` | Deselect | events | panel:events |

### A.8 Tree Navigation

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Arrow Down` | Next item | nodes | panel:nodes |
| `Arrow Up` | Previous item | nodes | panel:nodes |
| `Home` | First item | nodes | panel:nodes |
| `End` | Last item | nodes | panel:nodes |
| `Enter/Space` | Select item | nodes | panel:nodes |
| `Arrow Right` | Expand | nodes | panel:nodes |
| `Arrow Left` | Collapse | nodes | panel:nodes |

### A.9 Help & Misc

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+?` | Toggle help | system | global |

---

## Appendix B: Custom Components

### B.1 Property Input Components

| Component | Location | Shortcuts |
|-----------|----------|-----------|
| PropertyUnitInput | `components/property/` | Enter, Arrow Up/Down |
| PropertyCustomId | `components/property/` | Enter, Escape |
| PropertyColor | `components/property/` | Enter |
| PropertyInput | `components/property/` | Enter |

### B.2 Keyboard Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| useKeyboardShortcuts | `hooks/` | Undo/Redo (legacy) |
| useKeyboardShortcutsRegistry | `hooks/` | Central registry |
| useTreeKeyboardNavigation | `hooks/` | Tree navigation |
| useZoomShortcuts | `workspace/` | Zoom controls (legacy) |

### B.3 Shared vs Custom

| Shared (`src/shared`) | Custom (`src/builder`) | Reason |
|----------------------|------------------------|--------|
| NumberField | PropertyUnitInput | CSS units + shorthand parsing |
| TextField | PropertyInput | Simpler API + multiline |
| ColorPicker | PropertyColor | Drag state + onChangeEnd |
| - | PropertyCustomId | Element ID validation |
| Tree | useTreeKeyboardNavigation | Builder-specific behavior |

---

## Related Files

```
src/builder/
├── config/
│   └── keyboardShortcuts.ts (proposed)
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useKeyboardShortcutsRegistry.ts
│   ├── useTreeKeyboardNavigation.ts
│   └── useGlobalKeyboardShortcuts.ts (proposed)
├── components/
│   └── help/KeyboardShortcutsHelp.tsx
└── devtools/
    └── ShortcutDebugger.tsx (proposed)
```
