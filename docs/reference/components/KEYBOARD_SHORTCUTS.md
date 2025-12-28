# XStudio Keyboard Shortcuts System

> **Version:** 3.0
> **Last Updated:** 2025-12-28
> **Status:** ✅ Phase 0-5 구현 완료

---

## Executive Summary

### 구현 완료 상태
- **51개 단축키** 중앙 설정 파일에 정의
- **단일 레지스트리 패턴** 적용
- **7개 스코프** 기반 충돌 해결

### 구현된 기능
- Enhanced registry with **capture phase**, **priority system**, **scope-aware** filtering
- **5개 구현 Phase** 완료 (Phase 0+1 ~ Phase 5)
- Industry-aligned design inspired by **Figma** and **Photoshop Web**

### Key Metrics

| Metric | Before | After Phase 5 | Status |
|--------|--------|---------------|--------|
| Centralized Shortcuts | 45% | 95%+ | ✅ 완료 |
| Conflict Detection | ❌ | ✅ | ✅ 완료 |
| Context-Aware | ❌ | ✅ | ✅ 완료 |
| DevTools Debugger | ❌ | ✅ | ✅ 완료 |

### Performance Benchmarks

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Event Listeners | 17개 | 2개 | `getEventListeners(window)` |
| Keydown → Handler | ~5ms | ~1ms | Performance.mark() |
| Memory (shortcuts) | 분산 | ~10KB | DevTools Heap |
| Bundle Size Impact | - | +2KB | Vite build analysis |

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

### 파일 구조 비교

#### Before (현재)
```
src/builder/
├── hooks/
│   ├── useKeyboardShortcuts.ts       # Undo/Redo (document, capture)
│   ├── useKeyboardShortcutsRegistry.ts  # 기본 레지스트리 (제한적)
│   └── useTreeKeyboardNavigation.ts  # Tree 네비게이션
├── workspace/
│   ├── useZoomShortcuts.ts           # Zoom (window, capture)
│   └── ZoomControls.tsx              # Zoom input (onKeyDown)
├── panels/
│   ├── properties/
│   │   └── PropertiesPanel.tsx       # Tab navigation (onKeyDown)
│   └── events/hooks/
│       ├── useCopyPasteActions.ts    # Copy/Paste (document)
│       └── useBlockKeyboard.ts       # Arrow/Escape (document)
└── components/
    └── property/
        ├── PropertyUnitInput.tsx     # Value editing (onKeyDown)
        ├── PropertyCustomId.tsx      # ID validation (onKeyDown)
        └── PropertyInput.tsx         # Text input (onKeyDown)

📊 문제점: 22개 파일, 3가지 패턴, 45% 중앙화
```

#### After (구현 완료)
```
src/builder/
├── config/
│   ├── index.ts                      # ✅ Config exports
│   └── keyboardShortcuts.ts          # ✅ 51개 단축키 정의
├── types/
│   ├── index.ts                      # ✅ Types exports
│   └── keyboard.ts                   # ✅ 타입 정의
├── hooks/
│   ├── useKeyboardShortcutsRegistry.ts  # ✅ 확장된 레지스트리 (scope, priority, capture)
│   ├── useGlobalKeyboardShortcuts.ts    # ✅ 통합 훅 (Undo/Redo/Zoom)
│   ├── useActiveScope.ts             # ✅ 스코프 감지 훅
│   └── useTreeKeyboardNavigation.ts  # 유지 (Tree 전용)
├── devtools/
│   ├── index.ts                      # ✅ DevTools exports
│   └── ShortcutDebugger.tsx          # ✅ 개발용 디버거 (prod 비활성)
├── utils/
│   └── detectShortcutConflicts.ts    # ✅ 충돌 감지 유틸리티
├── main/
│   └── BuilderCore.tsx               # ✅ useGlobalKeyboardShortcuts 호출
├── workspace/
│   └── Workspace.tsx                 # ✅ useZoomShortcuts 제거됨
├── components/
│   ├── help/
│   │   └── KeyboardShortcutsHelp.tsx # ✅ 검색 + 탭 필터링 + 설정 연동
│   ├── overlay/                      # 🔜 Phase 7 예정
│   │   ├── ShortcutTooltip.css       # 단축키 툴팁 스타일
│   │   └── ShortcutTooltip.tsx       # 단축키 툴팁 컴포넌트
│   └── property/
│       ├── PropertyUnitInput.tsx     # 유지 (컴포넌트 로컬)
│       ├── PropertyCustomId.tsx      # 유지 (컴포넌트 로컬)
│       └── PropertyInput.tsx         # 유지 (컴포넌트 로컬)

📊 결과: 8개 핵심 파일, 1가지 패턴, 95%+ 중앙화
```

### 삭제/이동 대상 (완료)

| 파일 | 액션 | 상태 | 비고 |
|------|------|------|------|
| `useKeyboardShortcuts.ts` | 🗑️ 삭제 | ✅ 완료 | `useGlobalKeyboardShortcuts.ts`로 통합 |
| `useZoomShortcuts.ts` | 🗑️ 삭제 | ✅ 완료 | `useGlobalKeyboardShortcuts.ts`로 통합 |
| `useCopyPasteActions.ts` | 📌 유지 | ✅ 검토 완료 | 패널 컨텍스트 의존, 스코프로 분리 |
| `useBlockKeyboard.ts` | 📌 유지 | ✅ 검토 완료 | 패널 컨텍스트 의존, 스코프로 분리 |
| `PropertiesPanel.tsx` | 📌 유지 | ✅ 검토 완료 | 컴포넌트 로컬 단축키로 유지 |

### 의존성 그래프

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Builder.tsx                                    │
│                    useGlobalKeyboardShortcuts()                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  useGlobalKeyboardShortcuts.ts                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ useStore (undo)  │  │ useCanvasSyncStore│  │ useClipboard     │       │
│  │ useStore (redo)  │  │ (zoom, pan)       │  │ (copy, paste)    │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
          │                         │                        │
          ▼                         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  useKeyboardShortcutsRegistry.ts                         │
│  - capture phase 처리                                                    │
│  - priority 기반 정렬                                                    │
│  - scope 필터링                                                          │
│  - allowInInput 처리                                                     │
└─────────────────────────────────────────────────────────────────────────┘
          │                         │
          ▼                         ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────────┐
│ keyboardShortcuts.ts│  │               useActiveScope.ts                 │
│ (67개 단축키 정의)   │  │  - useActivePanelStore                          │
│                     │  │  - useModalStore                                │
│                     │  │  - useTextEditStore                             │
└─────────────────────┘  └─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    Component Local Shortcuts (유지)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │PropertyUnitInput │  │ PropertyCustomId │  │ TextEditOverlay  │       │
│  │ (Arrow Up/Down)  │  │ (Enter/Escape)   │  │ (text editing)   │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Import 의존성 요약:**
```
keyboardShortcuts.ts ← useGlobalKeyboardShortcuts.ts ← Builder.tsx
keyboard.ts (types)  ← useKeyboardShortcutsRegistry.ts
                     ← useActiveScope.ts
                     ← useGlobalKeyboardShortcuts.ts
```

### 유지되는 컴포넌트 로컬 단축키

| 컴포넌트 | 단축키 | 이유 |
|----------|--------|------|
| `PropertyUnitInput` | Arrow Up/Down | 값 조절이 컴포넌트 상태에 의존 |
| `PropertyCustomId` | Enter/Escape | 유효성 검사 로직과 긴밀히 연결 |
| `TextEditOverlay` | 텍스트 편집 | 콘텐츠 편집 모드 전용 |
| `AIPanel` | Enter (제출) | 폼 제출 로직과 직접 연결 |

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
  | 'ctrl' | 'ctrlShift' | 'ctrlAlt'  // NEW: 패널 토글용
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

| Phase | Description | Status | 완료일 |
|-------|-------------|--------|--------|
| **0+1** | Enhance Registry + Core Migration | ✅ 완료 | 2025-12-28 |
| **2** | JSON Config | ✅ 완료 | 2025-12-28 |
| **3** | Single Registration Point | ✅ 완료 | 2025-12-28 |
| **4** | Category & Scope System | ✅ 완료 | 2025-12-28 |
| **5** | DevTools & Help Panel | ✅ 완료 | 2025-12-28 |

**전체 구현 완료:** 2025-12-28

### 권장 실행 순서

```
Phase 0+1 (Day 1-2: Registry + Undo/Redo/Zoom만)
    ↓
  테스트 및 검증
    ↓
Phase 0+1 (Day 3-4: 나머지 마이그레이션)
    ↓
Phase 2 → Phase 3 → Phase 4 → Phase 5
```

> **권장:** Phase 0과 1을 병합하여 레지스트리 확장과 첫 마이그레이션(Undo/Redo, Zoom)을 함께 진행하면 즉시 동작 검증이 가능합니다.

### 롤백 전략

각 Phase별 롤백 방법을 명시합니다. 문제 발생 시 빠른 복구가 가능하도록 설계되었습니다.

| Phase | 롤백 방법 | 롤백 시간 | 체크포인트 |
|-------|----------|----------|-----------|
| **0+1** | 레거시 훅 파일 복원 (`git checkout`) | ~5분 | `useKeyboardShortcuts.ts`, `useZoomShortcuts.ts` 삭제 전 |
| **2** | `keyboardShortcuts.ts` 삭제, 인라인 정의로 복원 | ~10분 | JSON 설정 파일 생성 전 |
| **3** | `useGlobalKeyboardShortcuts.ts` 삭제, 개별 훅 복원 | ~15분 | Builder.tsx 수정 전 |
| **4** | 스코프 로직 제거, 단순 필터링으로 복원 | ~10분 | `useActiveScope.ts` 생성 전 |
| **5** | DevTools 컴포넌트 제거 (프로덕션 영향 없음) | ~2분 | 독립적 |

**롤백 Git 태그 규칙:**
```bash
# Phase 시작 전 태그 생성
git tag -a keyboard-phase-0-start -m "Before keyboard shortcuts Phase 0+1"

# 롤백 필요 시
git checkout keyboard-phase-0-start -- src/builder/hooks/useKeyboardShortcuts.ts
git checkout keyboard-phase-0-start -- src/builder/workspace/useZoomShortcuts.ts
```

**Feature Flag (선택사항):**
```typescript
// src/builder/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_NEW_KEYBOARD_SYSTEM: import.meta.env.VITE_NEW_KEYBOARD === 'true',
};

// Builder.tsx
if (FEATURE_FLAGS.USE_NEW_KEYBOARD_SYSTEM) {
  useGlobalKeyboardShortcuts();
} else {
  useKeyboardShortcuts(); // 레거시
  useZoomShortcuts();     // 레거시
}
```

---

### Phase 0+1: Enhance Registry + Core Migration (4일)

**목표:** `useKeyboardShortcutsRegistry` 훅에 누락된 기능 추가 및 핵심 단축키 마이그레이션

> **병합 이유:** 레지스트리 확장과 첫 마이그레이션을 함께 진행하면 즉시 동작 검증이 가능하여 피드백 루프가 빨라집니다.

#### Part A: 레지스트리 확장 (Day 1-2)

#### 0.1 타입 정의 확장
```typescript
// src/builder/hooks/useKeyboardShortcutsRegistry.ts

export type KeyboardModifier =
  | 'cmd' | 'cmdShift' | 'cmdAlt'
  | 'ctrl' | 'ctrlShift' | 'ctrlAlt'  // 신규: 패널 토글용 (macOS/Windows 동일)
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

#### 0.3.1 Store 접근 패턴 (중요)

현재 `useKeyboardShortcuts.ts`에서 selector 캐싱 문제를 방지하기 위해 `useStore.getState()`를 사용합니다.
새로운 통합 훅에서도 동일한 패턴을 유지해야 합니다.

```typescript
// ❌ 잘못된 방식 - selector 캐싱 문제 발생 가능
const undo = useStore(s => s.undo);
const redo = useStore(s => s.redo);

// ✅ 올바른 방식 - 현재 코드와 동일
const handler = () => {
  const { undo, redo } = useStore.getState();
  // ...
};
```

#### 0.3.2 현재 Registry 수정 사항

현재 `useKeyboardShortcutsRegistry.ts`의 입력 필드 처리 로직을 수정해야 합니다:

```typescript
// 현재 코드 (일괄 차단)
if (isInputElement) return;

// 수정 후 (allowInInput 옵션 확인)
// for 루프 내부로 이동
if (isInputField && !shortcut.allowInInput) continue;
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

#### Part B: 핵심 단축키 마이그레이션 (Day 3-4)

**목표:** 분산된 전역 단축키를 레지스트리로 통합

#### 0+1.5 마이그레이션 대상

| 파일 | 단축키 | 옵션 | 우선순위 |
|------|--------|------|----------|
| `useKeyboardShortcuts.ts` | Cmd+Z, Cmd+Shift+Z | `allowInInput: true`, `capture: true` | 100 |
| `useZoomShortcuts.ts` | Cmd+=/-/0/1/2 | `capture: true` | 90 |
| `useCopyPasteActions.ts` | Cmd+C/V, Delete | `scope: ['canvas-focused', 'panel:events']` | 50 |
| `useBlockKeyboard.ts` | Arrow, Escape | `scope: ['canvas-focused', 'panel:events']` | 50 |
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

#### 3.2 BuilderCore에 적용
```typescript
// src/builder/main/BuilderCore.tsx

export function BuilderCore() {
  useGlobalKeyboardShortcuts(); // 단일 등록 포인트 (기존 useKeyboardShortcuts 대체)

  return (
    <div className="builder">
      {/* ... */}
    </div>
  );
}

// src/builder/workspace/Workspace.tsx
// useZoomShortcuts() 호출 제거 (useGlobalKeyboardShortcuts로 통합됨)
```

#### 3.3 레거시 코드 제거

| 삭제 대상 | 대체 | 호출 위치 수정 |
|----------|------|---------------|
| `useKeyboardShortcuts.ts` | `useGlobalKeyboardShortcuts` | `BuilderCore.tsx:164` |
| `useZoomShortcuts.ts` | `useGlobalKeyboardShortcuts` | `Workspace.tsx:68` 제거 |
| `useCopyPasteActions.ts` 키보드 부분 | `useGlobalKeyboardShortcuts` | Events 패널 |
| `useBlockKeyboard.ts` 일부 | `useGlobalKeyboardShortcuts` | Events 패널 |

**주의:** `useCopyPasteActions.ts`의 `useCopyPasteActions()` 훅(클립보드 상태 관리)은 유지하고, `useActionKeyboardShortcuts()` 훅만 통합합니다.

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
  | 'text-editing';    // 텍스트 편집 중 (input/textarea/contenteditable)

export type ShortcutCategory =
  | 'system'      // Undo, Redo, Save (priority: 100)
  | 'navigation'  // Zoom, Pan (priority: 90)
  | 'panels'      // Panel toggles (priority: 80)
  | 'canvas'      // Element manipulation (priority: 70)
  | 'properties'  // Property editing (priority: 50)
  | 'events'      // Events panel (priority: 50)
  | 'nodes';      // Nodes panel (priority: 50)
```

#### 4.1.1 text-editing 스코프 동작 정의

`text-editing` 스코프에서는 대부분의 단축키가 비활성화되어 텍스트 입력에 집중합니다.

| 단축키 | text-editing에서 | 이유 |
|--------|------------------|------|
| `Cmd+Z` / `Cmd+Shift+Z` | ✅ 허용 | Undo/Redo는 입력 필드에서도 필수 (`allowInInput: true`) |
| `Cmd+C` / `Cmd+V` / `Cmd+X` | ✅ 허용 | 기본 클립보드는 브라우저에 위임 (커스텀 핸들러 비활성) |
| `Cmd+=` / `Cmd+-` | ✅ 허용 | Zoom은 전역 필요 (`allowInInput: true`) |
| `Escape` | ✅ 허용 | 편집 모드 종료 용도 |
| `Delete` / `Backspace` | ❌ 차단 | 텍스트 삭제에 사용 (요소 삭제 방지) |
| `Arrow Keys` | ❌ 차단 | 텍스트 커서 이동에 사용 |
| `Tab` / `Shift+Tab` | ❌ 차단 | 포커스 이동에 사용 |
| Single keys (`V`, `B`, etc.) | ❌ 차단 | 문자 입력에 사용 |

```typescript
// text-editing 스코프 감지
const isTextEditing = (target: HTMLElement): boolean => {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[data-text-editing="true"]') !== null
  );
};
```

#### 4.1.2 macOS / Windows 키 매핑

`cmd` modifier는 플랫폼에 따라 자동 변환됩니다.

| Modifier | macOS | Windows/Linux |
|----------|-------|---------------|
| `cmd` | ⌘ Command | Ctrl |
| `cmdShift` | ⌘⇧ | Ctrl+Shift |
| `cmdAlt` | ⌘⌥ | Ctrl+Alt |
| `alt` | ⌥ Option | Alt |
| `ctrl` | ^ Control | Ctrl (별도 처리) |

```typescript
// src/builder/utils/keyboardUtils.ts

export function isCmdKey(event: KeyboardEvent): boolean {
  // macOS: metaKey (⌘), Windows/Linux: ctrlKey
  return navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;
}

export function formatShortcutForPlatform(shortcut: ShortcutDefinition): string {
  const isMac = navigator.platform.includes('Mac');
  const modifierSymbols = {
    cmd: isMac ? '⌘' : 'Ctrl+',
    shift: isMac ? '⇧' : 'Shift+',
    alt: isMac ? '⌥' : 'Alt+',
    ctrl: isMac ? '⌃' : 'Ctrl+',
  };
  // ...
}
```

**패널 토글 단축키 (Ctrl+Shift+*):**

패널 토글은 `Ctrl+Shift` 조합을 사용하며, macOS에서도 `Ctrl`을 사용합니다 (⌘가 아님).
이는 `Cmd+Shift+*`가 시스템 단축키와 충돌할 수 있기 때문입니다.

```typescript
// 패널 토글은 ctrl modifier 사용 (macOS/Windows 동일)
{ key: 'n', modifier: 'ctrlShift', handler: toggleNodes }  // Ctrl+Shift+N
{ key: 'p', modifier: 'ctrlShift', handler: toggleProperties }  // Ctrl+Shift+P
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

> **Note:** 패널 토글은 `Ctrl+Shift` 조합을 사용합니다 (macOS/Windows 동일).
> macOS에서도 `⌘`가 아닌 `⌃ Ctrl`을 사용하여 시스템 단축키 충돌을 방지합니다.

| Shortcut | Action | Category | Scope | Modifier |
|----------|--------|----------|-------|----------|
| `Ctrl+Shift+N` | Toggle Nodes | panels | global | `ctrlShift` |
| `Ctrl+Shift+C` | Toggle Components | panels | global | `ctrlShift` |
| `Ctrl+Shift+P` | Toggle Properties | panels | global | `ctrlShift` |
| `Ctrl+Shift+S` | Toggle Styles | panels | global | `ctrlShift` |
| `Ctrl+Shift+E` | Toggle Events | panels | global | `ctrlShift` |
| `Ctrl+Shift+H` | Toggle History | panels | global | `ctrlShift` |
| `Ctrl+,` | Open Settings | panels | global | `ctrl` |

### A.4 Canvas Shortcuts

| Shortcut | Action | Category | Scope |
|----------|--------|----------|-------|
| `Cmd+C` | Copy elements | canvas | `['canvas-focused', 'panel:events']` |
| `Cmd+V` | Paste elements | canvas | `['canvas-focused', 'panel:events']` |
| `Cmd+D` | Duplicate | canvas | canvas-focused |
| `Cmd+A` | Select all | canvas | canvas-focused |
| `Escape` | Clear selection | canvas | `['canvas-focused', 'panel:events']` |
| `Tab` | Next element | canvas | canvas-focused |
| `Shift+Tab` | Previous element | canvas | canvas-focused |
| `Backspace` | Delete | canvas | `['canvas-focused', 'panel:events']` |

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

> **Note:** Copy/Paste/Delete/Escape는 Canvas와 공유되며, 스코프 배열로 정의됩니다.
> 핸들러 내부에서 현재 컨텍스트에 따라 동작이 분기됩니다.

| Shortcut | Action | Category | Scope | Note |
|----------|--------|----------|-------|------|
| `Cmd+C` | Copy actions | events | (A.4 참조) | Canvas와 핸들러 공유 |
| `Cmd+V` | Paste actions | events | (A.4 참조) | Canvas와 핸들러 공유 |
| `Delete` | Delete actions | events | (A.4 참조) | Canvas와 핸들러 공유 |
| `Arrow Up/Down` | Navigate actions | events | `['canvas-focused', 'panel:events']` | |
| `Escape` | Deselect | events | (A.4 참조) | Canvas와 핸들러 공유 |

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

## Related Files (구현 완료)

```
src/builder/
├── config/
│   ├── index.ts                      # Config 모듈 exports
│   └── keyboardShortcuts.ts          # 51개 단축키 정의
├── types/
│   ├── index.ts                      # Types 모듈 exports
│   └── keyboard.ts                   # ShortcutScope, ShortcutDefinition 등
├── hooks/
│   ├── useKeyboardShortcutsRegistry.ts  # 확장된 레지스트리 (capture, priority, scope)
│   ├── useGlobalKeyboardShortcuts.ts    # 전역 단축키 통합 훅
│   ├── useActiveScope.ts                # 활성 스코프 감지 훅
│   └── useTreeKeyboardNavigation.ts     # Tree 네비게이션 (유지)
├── devtools/
│   ├── index.ts                      # DevTools 모듈 exports
│   └── ShortcutDebugger.tsx          # 개발용 디버거 (prod 자동 비활성)
├── utils/
│   └── detectShortcutConflicts.ts    # 충돌 감지 유틸리티
├── components/
│   └── help/
│       └── KeyboardShortcutsHelp.tsx # 도움말 패널 (검색, 탭 필터)
└── main/
    └── BuilderCore.tsx               # useGlobalKeyboardShortcuts 호출

삭제된 파일:
├── hooks/useKeyboardShortcuts.ts     # 🗑️ (useGlobalKeyboardShortcuts로 통합)
└── workspace/useZoomShortcuts.ts     # 🗑️ (useGlobalKeyboardShortcuts로 통합)
```

---

## 구현 요약 (Phase 0+1 ~ Phase 5)

### Phase 0+1: Enhance Registry + Core Migration ✅
- `useKeyboardShortcutsRegistry` 확장 (capture, allowInInput, priority, scope)
- `useGlobalKeyboardShortcuts` 생성 (Undo/Redo/Zoom 통합)
- `BuilderCore.tsx`에서 호출, `Workspace.tsx`에서 `useZoomShortcuts` 제거

### Phase 2: JSON Config ✅
- `src/builder/config/keyboardShortcuts.ts` 생성 (51개 단축키 정의)
- `src/builder/types/keyboard.ts` 생성 (타입 정의)
- 설정과 핸들러 분리 구조

### Phase 3: Single Registration Point ✅
- `useKeyboardShortcuts.ts` 삭제
- `useZoomShortcuts.ts` 삭제
- `config/index.ts`, `types/index.ts` export 정리

### Phase 4: Category & Scope System ✅
- `useActiveScope.ts` 훅 생성 (7개 스코프 감지)
- 레지스트리에 `activeScope` 옵션 추가
- 스코프 기반 단축키 필터링 구현

### Phase 5: DevTools & Help Panel ✅
- `ShortcutDebugger.tsx` 생성 (개발 전용)
- `KeyboardShortcutsHelp.tsx` 개선 (검색, 카테고리 탭, 설정 파일 연동)
- `detectShortcutConflicts.ts` 충돌 감지 유틸리티

---

## 향후 개선 방향 (Phase 6-9)

### Phase Overview (Future)

| Phase | Description | Priority | Effort | 의존성 |
|-------|-------------|----------|--------|--------|
| **6** | 패널 단축키 완전 통합 | 🟡 Medium | 3일 | Phase 4 |
| **7** | 툴팁 & 디스커버러빌리티 | 🟢 Low | 2일 | Phase 2 |
| **8** | 국제 키보드 지원 | 🟡 Medium | 4일 | Phase 2 |
| **9** | 사용자 커스터마이징 | 🟢 Low | 5일 | Phase 8 |

---

### Phase 6: 패널 단축키 완전 통합 (3일)

**목표:** Events/Properties 패널의 단축키를 useGlobalKeyboardShortcuts로 완전 통합

#### 6.1 현재 상태

| 훅 | 위치 | 단축키 | 통합 난이도 |
|----|------|--------|------------|
| `useCopyPasteActions` | Events 패널 | Cmd+C/V, Delete | 🟡 Medium |
| `useBlockKeyboard` | Events 패널 | Arrow, Escape | 🟡 Medium |
| `useActionKeyboardShortcuts` | Events 패널 | 전체 | 🟡 Medium |

#### 6.2 구현 계획

```typescript
// src/builder/hooks/useGlobalKeyboardShortcuts.ts 확장

export function useGlobalKeyboardShortcuts() {
  const activeScope = useActiveScope();

  // 기존 핸들러
  const systemHandlers = useSystemHandlers();      // Undo/Redo
  const navigationHandlers = useNavigationHandlers(); // Zoom

  // 📦 Phase 6: 패널 핸들러 추가
  const canvasHandlers = useCanvasHandlers();      // Copy/Paste/Delete (canvas)
  const eventsHandlers = useEventsHandlers();      // Copy/Paste/Delete (events)

  // 스코프 기반 핸들러 선택
  const handlers = useMemo(() => ({
    ...systemHandlers,
    ...navigationHandlers,
    // 스코프에 따라 다른 핸들러 바인딩
    copy: activeScope === 'panel:events' ? eventsHandlers.copy : canvasHandlers.copy,
    paste: activeScope === 'panel:events' ? eventsHandlers.paste : canvasHandlers.paste,
    delete: activeScope === 'panel:events' ? eventsHandlers.delete : canvasHandlers.delete,
  }), [activeScope, systemHandlers, navigationHandlers, canvasHandlers, eventsHandlers]);

  // 단일 레지스트리 호출
  useKeyboardShortcutsRegistry(shortcuts, [shortcuts, activeScope], {
    capture: true,
    target: 'document',
    activeScope,
  });
}
```

#### 6.3 작업 목록

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| `useCanvasHandlers` 훅 분리 | 캔버스 Copy/Paste/Delete 로직 추출 | 4h |
| `useEventsHandlers` 훅 분리 | Events 패널 Copy/Paste/Delete 로직 추출 | 4h |
| `useGlobalKeyboardShortcuts` 확장 | 스코프 기반 핸들러 선택 로직 | 4h |
| 레거시 훅 정리 | `useCopyPasteActions`, `useBlockKeyboard` 제거 | 2h |
| E2E 테스트 | 스코프별 동작 검증 | 4h |

#### 6.4 삭제 대상

```
src/builder/panels/events/hooks/
├── useCopyPasteActions.ts  # 🗑️ useEventsHandlers로 대체
└── useBlockKeyboard.ts     # 🗑️ useGlobalKeyboardShortcuts로 통합
```

#### 6.5 테스트 케이스

```typescript
describe('Phase 6: 패널 단축키 통합', () => {
  it('canvas-focused에서 Cmd+C → 요소 복사', () => {});
  it('panel:events에서 Cmd+C → 액션 복사', () => {});
  it('스코프 전환 시 핸들러 변경 확인', () => {});
  it('Delete 키가 스코프별로 다르게 동작', () => {});
});
```

---

### Phase 7: 툴팁 & 디스커버러빌리티 (2일)

**목표:** 단축키를 UI에서 쉽게 발견할 수 있도록 개선

#### 7.1 구현 기능

| 기능 | 설명 | 위치 |
|------|------|------|
| 버튼 툴팁 | hover 시 단축키 표시 | 전역 |
| 메뉴 아이템 | 단축키 표시 (오른쪽 정렬) | ContextMenu, MenuBar |
| 커맨드 팔레트 | Cmd+K로 열기, 검색 가능 | 전역 |

#### 7.2 ShortcutTooltip 컴포넌트

> **Note:** `react-aria-components`의 `TooltipTrigger`와 `Tooltip` 사용

```typescript
// src/builder/components/overlay/ShortcutTooltip.tsx

import { TooltipTrigger, Tooltip } from 'react-aria-components';
import { SHORTCUT_DEFINITIONS, type ShortcutId } from '../../config/keyboardShortcuts';
import { formatShortcut } from '../../hooks/useKeyboardShortcutsRegistry';
import './ShortcutTooltip.css';

interface ShortcutTooltipProps {
  /** 단축키 ID */
  shortcutId: ShortcutId;
  /** 트리거 요소 (Button 등) */
  children: React.ReactElement;
  /** 툴팁 지연 시간 (ms) */
  delay?: number;
  /** 툴팁 위치 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function ShortcutTooltip({
  shortcutId,
  children,
  delay = 700,
  placement = 'top',
}: ShortcutTooltipProps) {
  const def = SHORTCUT_DEFINITIONS[shortcutId];
  if (!def) return children;

  const display = formatShortcut({ key: def.key, modifier: def.modifier });
  const description = def.i18n?.ko || def.description;

  return (
    <TooltipTrigger delay={delay}>
      {children}
      <Tooltip placement={placement} className="shortcut-tooltip">
        <span className="shortcut-tooltip-label">{description}</span>
        <kbd className="shortcut-tooltip-kbd">{display}</kbd>
      </Tooltip>
    </TooltipTrigger>
  );
}
```

**사용 예시:**
```tsx
import { ShortcutTooltip } from '../components/overlay/ShortcutTooltip';

<ShortcutTooltip shortcutId="undo">
  <Button onPress={handleUndo}>
    <Undo2 />
  </Button>
</ShortcutTooltip>
```

#### 7.2.1 CSS 스타일

```css
/* src/builder/components/overlay/ShortcutTooltip.css */
/*
 * ShortcutTooltip 컴포넌트 스타일
 * react-aria-components Tooltip 스타일링
 */

/* Base Tooltip Styles */
.shortcut-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--md-sys-typescale-body-small-font);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10000;

  /* react-aria animation */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.shortcut-tooltip[data-entering],
.shortcut-tooltip[data-exiting] {
  opacity: 0;
  transform: translateY(4px);
}

.shortcut-tooltip[data-placement="bottom"] {
  transform: translateY(-4px);
}

.shortcut-tooltip[data-placement="left"] {
  transform: translateX(4px);
}

.shortcut-tooltip[data-placement="right"] {
  transform: translateX(-4px);
}

/* Tooltip Label */
.shortcut-tooltip-label {
  color: inherit;
}

/* Keyboard Shortcut Badge */
.shortcut-tooltip-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 2px 6px;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  font-family: var(--md-sys-typescale-body-small-font);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

/* Visible state */
.shortcut-tooltip:not([data-entering]):not([data-exiting]) {
  opacity: 1;
  transform: translateY(0) translateX(0);
}
```

#### 7.2.2 디렉토리 구조

```
src/builder/components/overlay/
├── ShortcutTooltip.css       # 컴포넌트 스타일
└── ShortcutTooltip.tsx       # 컴포넌트
```

#### 7.3 MenuItem 단축키 표시

```typescript
// src/builder/components/menu/MenuItem.tsx

interface MenuItemProps {
  label: string;
  shortcutId?: ShortcutId;
  onAction: () => void;
}

export function MenuItem({ label, shortcutId, onAction }: MenuItemProps) {
  const shortcutDisplay = shortcutId
    ? formatShortcut(SHORTCUT_DEFINITIONS[shortcutId])
    : null;

  return (
    <Item onAction={onAction}>
      <span>{label}</span>
      {shortcutDisplay && <kbd className="menu-shortcut">{shortcutDisplay}</kbd>}
    </Item>
  );
}
```

#### 7.4 커맨드 팔레트

```typescript
// src/builder/components/CommandPalette.tsx

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Cmd+K로 열기
  useKeyboardShortcutsRegistry([
    { key: 'k', modifier: 'cmd', handler: () => setIsOpen(true), priority: 95 }
  ], [], { capture: true });

  const filteredCommands = useMemo(() => {
    return Object.entries(SHORTCUT_DEFINITIONS)
      .filter(([id, def]) =>
        def.description.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 10);
  }, [search]);

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Modal>
        <Dialog>
          <SearchField value={search} onChange={setSearch} autoFocus />
          <ListBox items={filteredCommands}>
            {([id, def]) => (
              <Item key={id} onAction={() => executeShortcut(id)}>
                <span>{def.description}</span>
                <kbd>{formatShortcut(def)}</kbd>
              </Item>
            )}
          </ListBox>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
```

#### 7.5 작업 목록

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| `ShortcutTooltip` 컴포넌트 | tsx + css 1:1 매칭 | 2h |
| 툴바 버튼 적용 | Undo/Redo/Zoom 등 버튼에 ShortcutTooltip 적용 | 2h |
| `MenuItem` 확장 | 단축키 표시 지원 | 2h |
| `CommandPalette` 구현 | Cmd+K 커맨드 팔레트 | 4h |

---

### Phase 8: 국제 키보드 지원 (4일)

**목표:** 다양한 키보드 레이아웃(QWERTY, AZERTY, QWERTZ 등)에서 일관된 단축키 경험 제공

#### 8.1 문제점

| 키보드 | `=` 키 위치 | `Z` 키 위치 | 영향 |
|--------|------------|------------|------|
| US QWERTY | Shift+= | Z | 기준 |
| French AZERTY | = (별도) | W 위치 | Cmd+Z → Cmd+W 의도 |
| German QWERTZ | = (별도) | Y 위치 | Cmd+Z → Cmd+Y 의도 |

#### 8.2 Keyboard Layout API 활용

```typescript
// src/builder/utils/keyboardLayout.ts

interface LayoutInfo {
  layout: string;           // 'en-US', 'fr-FR', 'de-DE'
  isAZERTY: boolean;
  isQWERTZ: boolean;
}

export async function detectKeyboardLayout(): Promise<LayoutInfo> {
  // Keyboard API 지원 확인
  if ('keyboard' in navigator && 'getLayoutMap' in navigator.keyboard) {
    const layoutMap = await navigator.keyboard.getLayoutMap();

    // 레이아웃 감지 (KeyZ의 실제 문자로 판단)
    const keyZ = layoutMap.get('KeyZ');

    return {
      layout: navigator.language,
      isAZERTY: keyZ === 'w',
      isQWERTZ: keyZ === 'y',
    };
  }

  // Fallback: 언어 기반 추정
  const lang = navigator.language.toLowerCase();
  return {
    layout: lang,
    isAZERTY: lang.startsWith('fr'),
    isQWERTZ: lang.startsWith('de') || lang.startsWith('de-ch'),
  };
}
```

#### 8.3 레이아웃별 키 매핑

```typescript
// src/builder/config/keyboardLayouts.ts

export const LAYOUT_KEY_MAPS: Record<string, Record<string, string>> = {
  'azerty': {
    'z': 'w',  // Undo: Cmd+W (물리적 Z 위치)
    'a': 'q',  // Select All: Cmd+Q (물리적 A 위치)
    // ...
  },
  'qwertz': {
    'z': 'y',  // Undo: Cmd+Y (물리적 Z 위치)
    'y': 'z',  // Redo용 (필요시)
    // ...
  },
};

export function getPhysicalKey(logicalKey: string, layout: LayoutInfo): string {
  if (layout.isAZERTY && LAYOUT_KEY_MAPS.azerty[logicalKey]) {
    return LAYOUT_KEY_MAPS.azerty[logicalKey];
  }
  if (layout.isQWERTZ && LAYOUT_KEY_MAPS.qwertz[logicalKey]) {
    return LAYOUT_KEY_MAPS.qwertz[logicalKey];
  }
  return logicalKey;
}
```

#### 8.4 레지스트리 통합

```typescript
// useKeyboardShortcutsRegistry 확장

export function useKeyboardShortcutsRegistry(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = [],
  options: RegistryOptions = {}
) {
  const [layout, setLayout] = useState<LayoutInfo | null>(null);

  useEffect(() => {
    detectKeyboardLayout().then(setLayout);
  }, []);

  // 레이아웃 기반 키 변환
  const adjustedShortcuts = useMemo(() => {
    if (!layout) return shortcuts;

    return shortcuts.map(s => ({
      ...s,
      key: getPhysicalKey(s.key, layout),
    }));
  }, [shortcuts, layout]);

  // ... 기존 로직
}
```

#### 8.5 도움말 패널 표시 업데이트

```typescript
// KeyboardShortcutsHelp.tsx

export function KeyboardShortcutsHelp() {
  const [layout, setLayout] = useState<LayoutInfo | null>(null);

  useEffect(() => {
    detectKeyboardLayout().then(setLayout);
  }, []);

  // 레이아웃에 맞는 키 표시
  const getDisplayKey = (def: ShortcutDefinition) => {
    const physicalKey = layout ? getPhysicalKey(def.key, layout) : def.key;
    return formatShortcut({ key: physicalKey, modifier: def.modifier });
  };

  // ...
}
```

#### 8.6 작업 목록

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| `detectKeyboardLayout` 유틸 | Keyboard API 기반 레이아웃 감지 | 4h |
| `keyboardLayouts.ts` 설정 | AZERTY, QWERTZ 매핑 테이블 | 4h |
| 레지스트리 통합 | 레이아웃 기반 키 변환 | 4h |
| 도움말 패널 업데이트 | 레이아웃별 키 표시 | 2h |
| 테스트 | 다양한 레이아웃 시뮬레이션 | 4h |

#### 8.7 브라우저 지원

| 브라우저 | Keyboard API | Fallback |
|----------|--------------|----------|
| Chrome 69+ | ✅ | - |
| Edge 79+ | ✅ | - |
| Firefox | ❌ | 언어 기반 추정 |
| Safari | ❌ | 언어 기반 추정 |

---

### Phase 9: 사용자 커스터마이징 (5일)

**목표:** 사용자가 단축키를 변경하고 저장할 수 있도록 지원

#### 9.1 저장 구조

```typescript
// src/builder/types/keyboard.ts

interface UserShortcutOverride {
  shortcutId: ShortcutId;
  key: string;
  modifier: KeyboardModifier;
  disabled?: boolean;
}

interface UserShortcutConfig {
  version: string;
  overrides: UserShortcutOverride[];
  createdAt: string;
  updatedAt: string;
}
```

#### 9.2 로컬 스토리지 저장

```typescript
// src/builder/stores/shortcutCustomization.ts

const STORAGE_KEY = 'xstudio-keyboard-shortcuts';

interface ShortcutCustomizationState {
  overrides: Map<ShortcutId, UserShortcutOverride>;

  // Actions
  setOverride: (id: ShortcutId, override: Partial<UserShortcutOverride>) => void;
  removeOverride: (id: ShortcutId) => void;
  resetAll: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

export const useShortcutCustomization = create<ShortcutCustomizationState>(
  persist(
    (set, get) => ({
      overrides: new Map(),

      setOverride: (id, override) => {
        set((state) => {
          const newOverrides = new Map(state.overrides);
          const existing = newOverrides.get(id) || { shortcutId: id };
          newOverrides.set(id, { ...existing, ...override });
          return { overrides: newOverrides };
        });
      },

      removeOverride: (id) => {
        set((state) => {
          const newOverrides = new Map(state.overrides);
          newOverrides.delete(id);
          return { overrides: newOverrides };
        });
      },

      resetAll: () => set({ overrides: new Map() }),

      exportConfig: () => {
        const config: UserShortcutConfig = {
          version: '1.0.0',
          overrides: Array.from(get().overrides.values()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return JSON.stringify(config, null, 2);
      },

      importConfig: (json) => {
        try {
          const config = JSON.parse(json) as UserShortcutConfig;
          const newOverrides = new Map<ShortcutId, UserShortcutOverride>();
          for (const override of config.overrides) {
            newOverrides.set(override.shortcutId, override);
          }
          set({ overrides: newOverrides });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: STORAGE_KEY }
  )
);
```

#### 9.3 커스터마이징 UI

```typescript
// src/builder/components/settings/ShortcutCustomizer.tsx

export function ShortcutCustomizer() {
  const { overrides, setOverride, removeOverride, resetAll } = useShortcutCustomization();
  const [editingId, setEditingId] = useState<ShortcutId | null>(null);
  const [recording, setRecording] = useState(false);

  // 키 녹화
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recording || !editingId) return;

    e.preventDefault();

    const modifier = detectModifier(e);
    const key = e.key;

    // 충돌 확인
    const conflicts = checkConflicts(editingId, key, modifier);
    if (conflicts.length > 0) {
      showConflictWarning(conflicts);
      return;
    }

    setOverride(editingId, { key, modifier });
    setRecording(false);
    setEditingId(null);
  }, [recording, editingId, setOverride]);

  return (
    <div className="shortcut-customizer">
      <div className="customizer-header">
        <h3>Keyboard Shortcuts</h3>
        <div className="customizer-actions">
          <Button onPress={resetAll}>Reset All</Button>
          <Button onPress={handleExport}>Export</Button>
          <Button onPress={handleImport}>Import</Button>
        </div>
      </div>

      <div className="shortcut-list">
        {Object.entries(SHORTCUT_DEFINITIONS).map(([id, def]) => {
          const override = overrides.get(id as ShortcutId);
          const isEditing = editingId === id;
          const displayKey = override?.key || def.key;
          const displayMod = override?.modifier || def.modifier;

          return (
            <div key={id} className="shortcut-row">
              <span className="shortcut-desc">
                {def.i18n?.ko || def.description}
              </span>

              <div className="shortcut-key-editor">
                {isEditing && recording ? (
                  <kbd className="recording">Press keys...</kbd>
                ) : (
                  <kbd
                    className={override ? 'custom' : 'default'}
                    onClick={() => startEditing(id as ShortcutId)}
                  >
                    {formatShortcut({ key: displayKey, modifier: displayMod })}
                  </kbd>
                )}

                {override && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeOverride(id as ShortcutId)}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 9.4 레지스트리 통합

```typescript
// useGlobalKeyboardShortcuts.ts 수정

export function useGlobalKeyboardShortcuts() {
  const { overrides } = useShortcutCustomization();
  const activeScope = useActiveScope();

  // 오버라이드 적용
  const shortcuts = useMemo(() => {
    return Object.entries(SHORTCUT_DEFINITIONS).map(([id, def]) => {
      const override = overrides.get(id as ShortcutId);

      // 비활성화된 단축키
      if (override?.disabled) {
        return { ...def, id, handler: () => {}, disabled: true };
      }

      // 오버라이드된 키/modifier
      return {
        ...def,
        id,
        key: override?.key || def.key,
        modifier: override?.modifier || def.modifier,
        handler: handlers[id as ShortcutId],
      };
    });
  }, [overrides, handlers]);

  // ...
}
```

#### 9.5 작업 목록

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| `useShortcutCustomization` 스토어 | Zustand persist 기반 저장소 | 4h |
| `ShortcutCustomizer` UI | 설정 패널 UI 구현 | 8h |
| 키 녹화 기능 | 실시간 키 입력 감지 | 4h |
| 충돌 감지 | 커스텀 단축키 충돌 경고 | 4h |
| Import/Export | JSON 기반 설정 공유 | 4h |
| 레지스트리 통합 | 오버라이드 적용 로직 | 4h |
| 테스트 | 커스터마이징 E2E 테스트 | 4h |

#### 9.6 충돌 처리 전략

```typescript
// 충돌 시 선택지 제공
interface ConflictResolution {
  action: 'replace' | 'swap' | 'cancel';
  targetId?: ShortcutId;
}

function showConflictDialog(
  newId: ShortcutId,
  conflicts: ShortcutId[]
): Promise<ConflictResolution> {
  // 다이얼로그 표시
  // - Replace: 기존 단축키 비활성화
  // - Swap: 두 단축키 키 교환
  // - Cancel: 변경 취소
}
```

---

### Phase 의존성 다이어그램

```
Phase 0-5 (완료)
    │
    ├── Phase 6: 패널 단축키 통합
    │       │
    │       └── Phase 7: 툴팁 & 디스커버러빌리티 (독립적)
    │
    └── Phase 8: 국제 키보드 지원
            │
            └── Phase 9: 사용자 커스터마이징
```

### 전체 완성도 로드맵

| 완성도 | Phase | 기능 |
|--------|-------|------|
| 80% | Phase 0-5 ✅ | 핵심 시스템 완료 |
| 85% | Phase 6 | 패널 단축키 완전 통합 |
| 90% | Phase 7 | 툴팁, 커맨드 팔레트 |
| 95% | Phase 8 | 국제 키보드 지원 |
| 100% | Phase 9 | 사용자 커스터마이징 |
