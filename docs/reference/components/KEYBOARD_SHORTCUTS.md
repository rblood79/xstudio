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
5. [리뷰 반영 개선사항](#part-5-리뷰-반영-개선사항)
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

**접근성(ARIA) 포커스 관리:**
```typescript
// 단축키가 있는 버튼/메뉴에 aria-keyshortcuts 속성 자동 부여
export function useAriaKeyboardHint(shortcut: KeyboardShortcut) {
  const ariaLabel = useMemo(() => {
    const modifiers = [];
    if (shortcut.modifier.includes('cmd')) modifiers.push('⌘');
    if (shortcut.modifier.includes('Shift')) modifiers.push('⇧');
    if (shortcut.modifier.includes('Alt')) modifiers.push('⌥');
    return `${modifiers.join('')}${shortcut.key.toUpperCase()}`;
  }, [shortcut]);

  return {
    'aria-keyshortcuts': ariaLabel,
    'aria-label': `${shortcut.description} (${ariaLabel})`,
  };
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

**E2E 테스트 (Playwright/Vitest):**
```typescript
// tests/e2e/keyboard-shortcuts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test('allowInInput 옵션별 동작 검증', async ({ page }) => {
    await page.goto('/builder');

    // 입력 필드 포커스 시 전역 단축키 차단 확인
    await page.fill('[data-testid="property-input"]', '');
    await page.keyboard.press('Control+z');
    // allowInInput: true인 Undo는 동작해야 함
    expect(await page.evaluate(() => window.__lastShortcut)).toBe('undo');

    // allowInInput: false인 Delete는 차단되어야 함
    await page.keyboard.press('Delete');
    expect(await page.evaluate(() => window.__lastShortcut)).not.toBe('delete');
  });

  test('capture/stopPropagation 옵션 검증', async ({ page }) => {
    await page.goto('/builder');
    await page.keyboard.press('Control+=');
    // capture: true로 브라우저 기본 동작(확대) 차단 확인
    const zoom = await page.evaluate(() => window.visualViewport?.scale);
    expect(zoom).toBe(1);
  });

  test('스코프별 단축키 충돌 없음 확인', async ({ page }) => {
    // Canvas에서 Cmd+C
    await page.click('[data-testid="canvas"]');
    await page.keyboard.press('Control+c');
    expect(await page.evaluate(() => window.__lastShortcut)).toBe('copyElements');

    // Events 패널에서 Cmd+C
    await page.click('[data-testid="events-panel"]');
    await page.keyboard.press('Control+c');
    expect(await page.evaluate(() => window.__lastShortcut)).toBe('copyActions');
  });
});
```

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

**충돌 자동 해결 가이드:**
```typescript
// DevTools 패널에서 충돌 발견 시 해결 옵션 제시
interface ConflictResolution {
  type: 'priority' | 'scope' | 'alternate';
  suggestion: string;
  apply: () => void;
}

function suggestResolutions(conflict: ConflictInfo): ConflictResolution[] {
  return [
    {
      type: 'priority',
      suggestion: `우선순위 조정: ${conflict.new.id}를 priority ${conflict.existing.priority + 10}으로 변경`,
      apply: () => updatePriority(conflict.new.id, conflict.existing.priority + 10),
    },
    {
      type: 'scope',
      suggestion: `스코프 분리: ${conflict.new.id}를 '${suggestNewScope(conflict)}'로 이동`,
      apply: () => updateScope(conflict.new.id, suggestNewScope(conflict)),
    },
    {
      type: 'alternate',
      suggestion: `대체 키 추천: Alt+Shift+${conflict.new.key.toUpperCase()}`,
      apply: () => updateKey(conflict.new.id, conflict.new.key, 'altShift'),
    },
  ];
}
```

**사용자 충돌 알림 UI:**
```typescript
// 사용자에게 충돌 알림 및 선택지 제공
export function ShortcutConflictDialog({ conflict }: { conflict: ConflictInfo }) {
  return (
    <Dialog>
      <Heading>⚠️ 단축키 충돌 감지</Heading>
      <Content>
        <p><kbd>{formatShortcut(conflict.existing)}</kbd>가 이미 다음에 할당되어 있습니다:</p>
        <p><strong>{conflict.existing.description}</strong></p>
        <p>새로 할당하려는 동작:</p>
        <p><strong>{conflict.new.description}</strong></p>
      </Content>
      <ButtonGroup>
        <Button onPress={() => replaceShortcut(conflict)}>교체</Button>
        <Button onPress={() => keepBoth(conflict)}>둘 다 유지 (스코프 분리)</Button>
        <Button variant="secondary" onPress={close}>취소</Button>
      </ButtonGroup>
    </Dialog>
  );
}
```

**사용량 분석 및 학습 트래킹:**
```typescript
// 단축키 사용 빈도 추적
interface ShortcutUsageMetrics {
  id: string;
  usageCount: number;
  lastUsed: Date | null;
  avgDailyUsage: number;
}

export function useShortcutAnalytics() {
  const trackUsage = useCallback((shortcutId: string) => {
    const metrics = getMetrics(shortcutId);
    updateMetrics(shortcutId, {
      usageCount: metrics.usageCount + 1,
      lastUsed: new Date(),
    });

    // 분석 데이터 전송 (선택적)
    analytics.track('shortcut_used', { shortcutId, timestamp: Date.now() });
  }, []);

  const getUnusedShortcuts = useCallback(() => {
    return ALL_SHORTCUTS.filter(s => {
      const metrics = getMetrics(s.id);
      return !metrics.lastUsed || daysSince(metrics.lastUsed) > 30;
    });
  }, []);

  const getRecommendations = useCallback(() => {
    // 자주 사용하는 단축키 기반 추천
    const unused = getUnusedShortcuts();
    return unused.slice(0, 5).map(s => ({
      shortcut: s,
      reason: '이 단축키를 아직 사용해보지 않았습니다',
    }));
  }, []);

  return { trackUsage, getUnusedShortcuts, getRecommendations };
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

**레이아웃 변경 감지 및 알림:**
```typescript
// 국제 키보드 레이아웃 감지 시 사용자 알림
export function useKeyboardLayoutNotification() {
  const [layout, setLayout] = useState<string>('US');

  useEffect(() => {
    const detectAndNotify = async () => {
      const detected = await detectKeyboardLayout();

      if (detected.layout !== 'US') {
        // 도움말 패널 상단에 레이아웃 배지 표시
        setLayout(detected.layout);

        // 첫 감지 시 토스트 알림
        if (!localStorage.getItem('keyboard_layout_notified')) {
          toast.info(`키보드 레이아웃 감지: ${detected.layout}`, {
            description: '단축키가 해당 레이아웃에 맞게 조정됩니다.',
            action: {
              label: '자세히',
              onClick: () => openKeyboardHelpPanel(),
            },
          });
          localStorage.setItem('keyboard_layout_notified', 'true');
        }
      }
    };

    detectAndNotify();

    // 레이아웃 변경 감지 (창 포커스 시)
    window.addEventListener('focus', detectAndNotify);
    return () => window.removeEventListener('focus', detectAndNotify);
  }, []);

  return layout;
}

// 도움말 패널에 레이아웃 배지 표시
export function KeyboardLayoutBadge({ layout }: { layout: string }) {
  if (layout === 'US') return null;

  return (
    <Badge variant="info" className="keyboard-layout-badge">
      ⌨️ {layout}
    </Badge>
  );
}
```

**오프라인 폴백 메커니즘:**
```typescript
// 네트워크 문제 시 기본 단축키 보장
const DEFAULT_SHORTCUTS = await import('./defaultShortcuts.json');

export async function loadShortcutConfig() {
  try {
    // 서버에서 사용자 설정 로드 시도
    const userConfig = await fetchUserShortcuts();
    localStorage.setItem('shortcuts_cache', JSON.stringify(userConfig));
    return userConfig;
  } catch (error) {
    // 오프라인 시 캐시 또는 기본값 사용
    const cached = localStorage.getItem('shortcuts_cache');
    if (cached) {
      console.info('오프라인 모드: 캐시된 단축키 설정 사용');
      return JSON.parse(cached);
    }
    console.info('오프라인 모드: 기본 단축키 설정 사용');
    return DEFAULT_SHORTCUTS;
  }
}
```

**Phase 7: User Customization**
- Remap shortcuts
- Export/import profiles
- Workspace-based sets
- Conflict resolution UI

**역할별 프리셋 시스템:**
```typescript
// 역할별 단축키 프리셋 정의
export const ROLE_PRESETS: Record<string, ShortcutPreset> = {
  designer: {
    name: '디자이너',
    description: '디자인 작업에 최적화된 단축키',
    shortcuts: {
      // 정렬/레이아웃 단축키 우선
      alignLeft: { key: 'l', modifier: 'cmd' },
      alignCenter: { key: 'c', modifier: 'cmdShift' },
      // ...
    },
  },
  developer: {
    name: '개발자',
    description: '코드 작업에 최적화된 단축키',
    shortcuts: {
      // 이벤트/로직 단축키 우선
      toggleEvents: { key: 'e', modifier: 'cmd' },
      duplicateAction: { key: 'd', modifier: 'cmdShift' },
      // ...
    },
  },
  qa: {
    name: 'QA',
    description: '테스트/검증에 최적화된 단축키',
    shortcuts: {
      // 미리보기/상태 확인 단축키 우선
      preview: { key: 'p', modifier: 'cmd' },
      toggleDevTools: { key: 'i', modifier: 'cmdAlt' },
      // ...
    },
  },
};

// 프리셋 내보내기/불러오기
export function exportPreset(preset: ShortcutPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function importPreset(json: string): ShortcutPreset {
  const parsed = JSON.parse(json);
  validatePresetSchema(parsed);
  return parsed;
}

// 워크스페이스 공유 링크 생성
export function generateShareLink(preset: ShortcutPreset): string {
  const encoded = btoa(JSON.stringify(preset));
  return `${window.location.origin}/shortcuts/import?preset=${encoded}`;
}
```

**도움말 패널 음성 안내 모드:**
```typescript
// 스크린리더 사용자를 위한 음성 안내 토글
export function KeyboardHelpPanel() {
  const [voiceMode, setVoiceMode] = useState(false);

  return (
    <div role="dialog" aria-label="키보드 단축키 도움말">
      <Switch
        isSelected={voiceMode}
        onChange={setVoiceMode}
        aria-label="음성 안내 모드"
      >
        🔊 음성 안내 모드
      </Switch>

      {shortcuts.map(shortcut => (
        <div
          key={shortcut.id}
          role="listitem"
          aria-label={voiceMode
            ? `${shortcut.description}, 단축키 ${formatShortcutForSpeech(shortcut)}`
            : undefined
          }
        >
          <kbd aria-hidden={voiceMode}>{formatShortcut(shortcut)}</kbd>
          <span>{shortcut.description}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Part 5: 리뷰 반영 개선사항

### 5.1 반영된 리뷰 항목

| 항목 | 설명 | 반영 위치 |
|------|------|----------|
| **ARIA 포커스 관리** | `aria-keyshortcuts` 속성 자동 부여, 스크린리더 지원 | Phase 0, Phase 7 |
| **E2E 테스트** | Playwright 기반 단축키 동작 검증 자동화 | Phase 1 |
| **사용량 분석** | 단축키 사용 빈도 추적, 미사용 단축키 추천 | Phase 5 |
| **충돌 알림 UI** | 사용자에게 충돌 안내 및 해결 선택지 제공 | Phase 5 |
| **충돌 자동 해결 가이드** | 우선순위/스코프/대체 키 자동 추천 | Phase 5 |
| **오프라인 폴백** | 네트워크 문제 시 캐시/기본값 사용 | Phase 6 |
| **레이아웃 알림** | 국제 키보드 감지 시 배지/토스트 표시 | Phase 6 |
| **역할별 프리셋** | 디자이너/개발자/QA용 단축키 세트 | Phase 7 |
| **프리셋 공유** | 워크스페이스 공유 링크 생성 | Phase 7 |
| **음성 안내 모드** | 스크린리더 사용자용 토글 | Phase 7 |

### 5.2 테스트 커버리지 목표

| 테스트 유형 | 범위 | 도구 |
|------------|------|------|
| **Unit Test** | 레지스트리 로직, 매칭 함수 | Vitest |
| **Integration** | 스코프 전환, 충돌 감지 | Vitest + Testing Library |
| **E2E** | 실제 단축키 동작, 입력 필드 상호작용 | Playwright |
| **Accessibility** | ARIA 속성, 포커스 관리 | axe-core, Playwright |

### 5.3 품질 지표

| 지표 | 현재 | 목표 (Phase 3) | 목표 (Phase 7) |
|------|------|----------------|----------------|
| 테스트 커버리지 | 0% | 80% | 95% |
| 접근성 점수 | - | WCAG AA | WCAG AAA |
| 충돌 감지율 | 0% | 100% | 100% |
| 오프라인 가용성 | ❌ | ✅ 기본값 | ✅ 전체 캐시 |

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
