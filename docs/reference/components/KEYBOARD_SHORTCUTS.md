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
- **6 implementation phases** for core functionality
- Industry-aligned design inspired by **Figma** and **Photoshop Web**

### Key Metrics

| Metric | Current | After Phase 3 | After Phase 5 |
|--------|---------|---------------|---------------|
| Centralized Shortcuts | 45% | 95% | 100% |
| Conflict Detection | ❌ | ✅ | ✅ |
| Context-Aware | ❌ | ✅ | ✅ |
| DevTools Debugger | ❌ | ❌ | ✅ |

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

### 개발자 경험 (DX) 비교

| 항목 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **단축키 추가** | 파일마다 다른 방식 | 통일된 인터페이스 |
| **디버깅** | console.log 수동 삽입 | DevTools 내장 디버거 |
| **충돌 해결** | 수동 테스트 필요 | 자동 충돌 경고 (개발 시점) |
| **문서화** | 별도 관리 필요 | JSON에서 자동 생성 |

### 사용자 경험 (UX) 비교

| 항목 | 현재 (Before) | 구현 후 (After) |
|------|--------------|-----------------|
| **도움말 패널** | 기본 목록 | 검색 + 카테고리 탭 |
| **입력 필드 충돌** | Cmd+Z 작동 안함 | 컨텍스트 인식 동작 |
| **동일 키 충돌** | 예측 불가 동작 | 스코프별 분리 |

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
5. [테스트 전략](#part-5-테스트-전략)
6. [Appendix A: Shortcuts Reference](#appendix-a-shortcuts-reference)
7. [Appendix B: Custom Components](#appendix-b-custom-components)

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
| **5** | DevTools & Help Panel | 🟢 Medium | 2 days |

**총 예상 소요:** 14일

---

### Phase 0: Enhance Registry (2일)

**목표:** `useKeyboardShortcutsRegistry` 훅에 누락된 기능 추가

#### 0.1 타입 정의 확장
```typescript
// src/builder/hooks/useKeyboardShortcutsRegistry.ts

export type KeyboardModifier =
  | 'cmd' | 'cmdShift' | 'cmdAlt'
  | 'alt' | 'altShift'
  | 'shift'           // 신규
  | 'none';

export interface KeyboardShortcut {
  key: string;
  code?: string;      // 물리 키 코드 (선택)
  modifier: KeyboardModifier;
  handler: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;    // 신규
  allowInInput?: boolean;       // 신규
  priority?: number;            // 신규 (높을수록 먼저 처리)
}

export interface RegistryOptions {
  eventType?: 'keydown' | 'keyup';
  capture?: boolean;            // 신규
  target?: 'window' | 'document';
}
```

#### 0.2 구현 세부사항

| 작업 | 설명 | 파일 |
|------|------|------|
| `capture` 옵션 | 이벤트 캡처 단계 처리 | `useKeyboardShortcutsRegistry.ts` |
| `allowInInput` | 입력 필드 내 단축키 허용 여부 | `useKeyboardShortcutsRegistry.ts` |
| `stopPropagation` | 이벤트 전파 중단 | `useKeyboardShortcutsRegistry.ts` |
| `priority` | 우선순위 기반 정렬 처리 | `useKeyboardShortcutsRegistry.ts` |
| `shift` modifier | Shift+Tab 등 지원 | `matchesShortcut.ts` |

#### 0.3 구현 코드
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

      // 우선순위 기준 정렬 (내림차순)
      const sorted = [...shortcuts].sort((a, b) =>
        (b.priority || 0) - (a.priority || 0)
      );

      for (const shortcut of sorted) {
        // 입력 필드에서 allowInInput이 false면 스킵
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

#### 0.4 테스트 케이스
```typescript
// tests/unit/useKeyboardShortcutsRegistry.test.ts
describe('useKeyboardShortcutsRegistry', () => {
  it('capture: true일 때 캡처 단계에서 이벤트 처리', () => {});
  it('allowInInput: true일 때 입력 필드에서도 동작', () => {});
  it('priority 높은 단축키가 먼저 실행됨', () => {});
  it('stopPropagation: true일 때 이벤트 전파 중단', () => {});
  it('shift modifier 정상 동작', () => {});
});
```

---

### Phase 1: Migrate Global Shortcuts (3일)

**목표:** 분산된 전역 단축키를 레지스트리로 통합

#### 1.1 마이그레이션 대상

| 파일 | 단축키 | 옵션 | 우선순위 |
|------|--------|------|----------|
| `useKeyboardShortcuts.ts` | Cmd+Z, Cmd+Shift+Z | `allowInInput: true`, `capture: true` | 100 |
| `useZoomShortcuts.ts` | Cmd+=/-/0/1/2 | `capture: true` | 90 |
| `useCopyPasteActions.ts` | Cmd+C/V, Delete | `scope: 'panel:events'` | 50 |
| `useBlockKeyboard.ts` | Arrow, Escape | `scope: 'panel:events'` | 50 |
| `PropertiesPanel.tsx` | Tab, Shift+Tab | `modifier: 'shift'` | 50 |

#### 1.2 마이그레이션 단계

**Day 1: 시스템 단축키**
```typescript
// useKeyboardShortcuts.ts → useGlobalKeyboardShortcuts.ts로 이동

// Before (useKeyboardShortcuts.ts)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
}, { capture: true });

// After (useGlobalKeyboardShortcuts.ts 내부)
useKeyboardShortcutsRegistry([
  {
    key: 'z',
    modifier: 'cmd',
    handler: undo,
    allowInInput: true,
    priority: 100,
  },
  {
    key: 'z',
    modifier: 'cmdShift',
    handler: redo,
    allowInInput: true,
    priority: 100,
  },
], [], { capture: true, target: 'document' });
```

**Day 2: Zoom 단축키**
```typescript
// useZoomShortcuts.ts 제거

// After
useKeyboardShortcutsRegistry([
  { key: '=', modifier: 'cmd', handler: () => zoomTo(zoom + 0.1), priority: 90 },
  { key: '-', modifier: 'cmd', handler: () => zoomTo(zoom - 0.1), priority: 90 },
  { key: '0', modifier: 'cmd', handler: () => fitToScreen(), priority: 90 },
  { key: '1', modifier: 'cmd', handler: () => zoomTo(1), priority: 90 },
  { key: '2', modifier: 'cmd', handler: () => zoomTo(2), priority: 90 },
], [], { capture: true });
```

**Day 3: 패널 단축키 + 테스트**
```typescript
// useCopyPasteActions.ts, useBlockKeyboard.ts 통합
// E2E 테스트 작성
```

#### 1.3 유지할 컴포넌트 로컬 단축키

| 컴포넌트 | 단축키 | 이유 |
|----------|--------|------|
| PropertyUnitInput | Arrow Up/Down | 값 조절이 컴포넌트 상태에 의존 |
| PropertyCustomId | Enter/Escape | 유효성 검사 로직 연결 |
| TextEditOverlay | 텍스트 편집 | 콘텐츠 편집 모드 전용 |
| AIPanel | Enter (제출) | 폼 제출 로직 연결 |

#### 1.4 E2E 테스트
```typescript
// tests/e2e/keyboard-shortcuts.spec.ts
test.describe('Keyboard Shortcuts Migration', () => {
  test('Undo/Redo가 입력 필드에서도 동작', async ({ page }) => {
    await page.fill('[data-testid="property-input"]', 'test');
    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-testid="toast"]')).toContainText('Undo');
  });

  test('Zoom 단축키가 브라우저 확대 차단', async ({ page }) => {
    await page.keyboard.press('Control+=');
    const browserZoom = await page.evaluate(() => window.visualViewport?.scale);
    expect(browserZoom).toBe(1); // 브라우저 확대 안됨
  });
});
```

---

### Phase 2: JSON Config (2일)

**목표:** 단축키 정의를 JSON 설정 파일로 분리

#### 2.1 설정 파일 구조
```typescript
// src/builder/config/keyboardShortcuts.ts
export const SHORTCUT_DEFINITIONS = {
  // System
  undo: {
    key: 'z',
    modifier: 'cmd',
    category: 'system',
    priority: 100,
    allowInInput: true,
    description: 'Undo',
  },
  redo: {
    key: 'z',
    modifier: 'cmdShift',
    category: 'system',
    priority: 100,
    allowInInput: true,
    description: 'Redo',
  },

  // Navigation
  zoomIn: {
    key: '=',
    modifier: 'cmd',
    category: 'navigation',
    priority: 90,
    description: 'Zoom In',
  },
  // ... 67개 단축키
} as const;

export type ShortcutId = keyof typeof SHORTCUT_DEFINITIONS;
```

#### 2.2 작업 목록

| 작업 | 설명 |
|------|------|
| 설정 파일 생성 | `keyboardShortcuts.ts` 생성 및 67개 단축키 정의 |
| 타입 정의 | `ShortcutId`, `ShortcutDefinition` 타입 |
| 핸들러 분리 | 설정(definition)과 핸들러(handler) 분리 |
| 도움말 데이터 연동 | `KeyboardShortcutsHelp.tsx`에서 설정 파일 사용 |

---

### Phase 3: Single Registration Point (2일)

**목표:** 모든 전역 단축키를 한 곳에서 등록

#### 3.1 통합 훅 구조
```typescript
// src/builder/hooks/useGlobalKeyboardShortcuts.ts

import { SHORTCUT_DEFINITIONS } from '../config/keyboardShortcuts';

export function useGlobalKeyboardShortcuts() {
  const { undo, redo } = useStore.getState();
  const { zoomTo, fitToScreen } = useCanvasSyncStore.getState();
  const { copy, paste, deleteSelected } = useClipboard();

  // 핸들러 매핑
  const handlers: Record<ShortcutId, () => void> = {
    undo,
    redo,
    zoomIn: () => zoomTo(zoom + 0.1),
    zoomOut: () => zoomTo(zoom - 0.1),
    zoomReset: fitToScreen,
    zoom100: () => zoomTo(1),
    zoom200: () => zoomTo(2),
    copy,
    paste,
    delete: deleteSelected,
    // ...
  };

  // 시스템 단축키 (capture phase)
  const systemShortcuts = useMemo(() =>
    Object.entries(SHORTCUT_DEFINITIONS)
      .filter(([_, def]) => def.category === 'system' || def.category === 'navigation')
      .map(([id, def]) => ({ ...def, handler: handlers[id as ShortcutId] })),
    [handlers]
  );

  useKeyboardShortcutsRegistry(systemShortcuts, [], {
    capture: true,
    target: 'document'
  });

  // 일반 단축키
  const normalShortcuts = useMemo(() =>
    Object.entries(SHORTCUT_DEFINITIONS)
      .filter(([_, def]) => def.category !== 'system' && def.category !== 'navigation')
      .map(([id, def]) => ({ ...def, handler: handlers[id as ShortcutId] })),
    [handlers]
  );

  useKeyboardShortcutsRegistry(normalShortcuts, []);
}
```

#### 3.2 Builder에 적용
```typescript
// src/builder/Builder.tsx

export function Builder() {
  useGlobalKeyboardShortcuts(); // 단일 등록 포인트

  return (
    <div className="builder">
      {/* ... */}
    </div>
  );
}
```

#### 3.3 레거시 코드 제거

| 삭제 대상 | 대체 |
|----------|------|
| `useKeyboardShortcuts.ts` | `useGlobalKeyboardShortcuts` |
| `useZoomShortcuts.ts` | `useGlobalKeyboardShortcuts` |
| `useCopyPasteActions.ts` 일부 | `useGlobalKeyboardShortcuts` |
| `useBlockKeyboard.ts` 일부 | `useGlobalKeyboardShortcuts` |

---

### Phase 4: Category & Scope System (3일)

**목표:** 스코프 기반 단축키 필터링으로 충돌 해결

#### 4.1 스코프 정의
```typescript
// src/builder/types/keyboard.ts

export type ShortcutScope =
  | 'global'           // 항상 활성
  | 'canvas-focused'   // 캔버스 포커스 시
  | 'panel:properties' // Properties 패널 활성 시
  | 'panel:events'     // Events 패널 활성 시
  | 'panel:nodes'      // Nodes 패널 활성 시
  | 'modal'            // 모달 열림 시
  | 'text-editing';    // 텍스트 편집 중

export type ShortcutCategory =
  | 'system'      // Undo, Redo, Save (priority: 100)
  | 'navigation'  // Zoom, Pan (priority: 90)
  | 'panels'      // Panel toggles (priority: 80)
  | 'canvas'      // Element manipulation (priority: 70)
  | 'properties'  // Property editing (priority: 50)
  | 'events'      // Events panel (priority: 50)
  | 'nodes';      // Nodes panel (priority: 50)
```

#### 4.2 활성 스코프 감지 훅
```typescript
// src/builder/hooks/useActiveScope.ts

export function useActiveScope(): ShortcutScope {
  const activePanel = useActivePanelStore(s => s.activePanel);
  const isModalOpen = useModalStore(s => s.isOpen);
  const isTextEditing = useTextEditStore(s => s.isEditing);
  const focusedElement = useFocusedElement();

  if (isModalOpen) return 'modal';
  if (isTextEditing) return 'text-editing';
  if (focusedElement?.dataset.scope === 'canvas') return 'canvas-focused';
  if (activePanel === 'properties') return 'panel:properties';
  if (activePanel === 'events') return 'panel:events';
  if (activePanel === 'nodes') return 'panel:nodes';
  return 'global';
}
```

#### 4.3 스코프 기반 필터링
```typescript
export function useGlobalKeyboardShortcuts() {
  const activeScope = useActiveScope();

  const activeShortcuts = useMemo(() =>
    ALL_SHORTCUTS.filter(s => {
      // global은 항상 활성
      if (s.scope === 'global') return true;
      // 배열이면 포함 여부 확인
      if (Array.isArray(s.scope)) return s.scope.includes(activeScope);
      // 단일 스코프면 일치 확인
      return s.scope === activeScope;
    }),
    [activeScope]
  );

  useKeyboardShortcutsRegistry(activeShortcuts, [activeScope], {
    capture: true,
    target: 'document',
  });
}
```

#### 4.4 충돌 해결 예시
```typescript
// 같은 Cmd+C가 스코프에 따라 다르게 동작
const shortcuts = [
  {
    key: 'c',
    modifier: 'cmd',
    scope: 'canvas-focused',  // 캔버스에서만
    handler: copyElements
  },
  {
    key: 'c',
    modifier: 'cmd',
    scope: 'panel:events',    // Events 패널에서만
    handler: copyActions
  },
];
```

---

### Phase 5: DevTools & Help Panel (2일)

**목표:** 개발 디버거 및 도움말 패널 개선

#### 5.1 Shortcut Debugger (개발 전용)
```typescript
// src/builder/devtools/ShortcutDebugger.tsx

export function ShortcutDebugger() {
  const [lastEvent, setLastEvent] = useState<KeyboardEvent | null>(null);
  const [matchedShortcut, setMatchedShortcut] = useState<string | null>(null);
  const activeScope = useActiveScope();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      setLastEvent(e);
      // 매칭된 단축키 찾기
      const matched = findMatchingShortcut(e, activeScope);
      setMatchedShortcut(matched?.description || null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeScope]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="shortcut-debugger">
      <div>Scope: {activeScope}</div>
      <div>Key: {lastEvent?.key}</div>
      <div>Modifier: {formatModifiers(lastEvent)}</div>
      <div>Matched: {matchedShortcut || 'None'}</div>
    </div>
  );
}
```

#### 5.2 Help Panel 개선
```typescript
// src/builder/components/help/KeyboardHelpPanel.tsx

export function KeyboardHelpPanel() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredShortcuts = useMemo(() => {
    let shortcuts = Object.entries(SHORTCUT_DEFINITIONS);

    // 카테고리 필터
    if (activeTab !== 'all') {
      shortcuts = shortcuts.filter(([_, def]) => def.category === activeTab);
    }

    // 검색 필터
    if (search) {
      shortcuts = shortcuts.filter(([_, def]) =>
        def.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    return shortcuts;
  }, [search, activeTab]);

  return (
    <DialogContent>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search shortcuts..."
      />
      <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab}>
        <Tab id="all">All</Tab>
        <Tab id="system">System</Tab>
        <Tab id="navigation">Navigation</Tab>
        <Tab id="canvas">Canvas</Tab>
        <Tab id="panels">Panels</Tab>
      </Tabs>
      <div className="shortcuts-list">
        {filteredShortcuts.map(([id, def]) => (
          <div key={id} className="shortcut-item">
            <kbd>{formatShortcut(def)}</kbd>
            <span>{def.description}</span>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}
```

#### 5.3 충돌 감지 (개발 시점)
```typescript
// src/builder/utils/detectShortcutConflicts.ts

export function detectConflicts(): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const keyMap = new Map<string, ShortcutDefinition[]>();

  for (const [id, def] of Object.entries(SHORTCUT_DEFINITIONS)) {
    const key = `${def.modifier}+${def.key}`;
    const existing = keyMap.get(key) || [];

    for (const prev of existing) {
      if (scopesOverlap(prev.scope, def.scope)) {
        conflicts.push({ existing: prev, new: def });
      }
    }
    keyMap.set(key, [...existing, def]);
  }

  if (process.env.NODE_ENV === 'development' && conflicts.length > 0) {
    console.warn('⚠️ Keyboard shortcut conflicts detected:', conflicts);
  }

  return conflicts;
}
```

---

## Part 5: 테스트 전략

### 5.1 테스트 커버리지 목표

| 테스트 유형 | 범위 | 도구 |
|------------|------|------|
| **Unit Test** | 레지스트리 로직, 매칭 함수 | Vitest |
| **Integration** | 스코프 전환, 충돌 감지 | Vitest + Testing Library |
| **E2E** | 실제 단축키 동작, 입력 필드 상호작용 | Playwright |

### 5.2 품질 지표

| 지표 | 현재 | 목표 (Phase 3) | 목표 (Phase 5) |
|------|------|----------------|----------------|
| 테스트 커버리지 | 0% | 80% | 90% |
| 충돌 감지율 | 0% | 100% | 100% |
| 중앙화율 | 45% | 95% | 100% |

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
