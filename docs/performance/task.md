# Performance Optimization Tasks

> **Last Updated:** 2025-12-11 (모노레포 구조 확정, 80hr)

## Summary

| Phase | 구현 | 통합/사용 | 실제 완료율 | 상태 |
|-------|------|----------|------------|------|
| Phase 1 | 1/5 | 1/5 | **20%** | 🔴 부분 완료 |
| Phase 2 | 3/4 | 0/4 | **0%** | 🔴 미사용 |
| Phase 3 | 3/3 | 3/3 | **100%** | ✅ 완료 |
| ~~Phase 4~~ | ~~4/4~~ | ~~0/4~~ | - | ⚠️ **Phase 10으로 대체** |
| Phase 5 | 3/3 | 0/3 | **0%** | 🟡 구현만 완료 |
| Phase 6 | 2/4 | 1/4 | **25%** | 🔴 부분 완료 |
| Phase 7 | 4/4 | 0/4 | **0%** | 🟡 구현만 완료 |
| Phase 8 | 0/3 | 0/3 | **0%** | ❌ 미착수 |
| Phase 9 | 3/5 | 3/5 | **60%** | 🔄 부분 완료 |
| **🚀 Phase 10** | **0/7** | **0/7** | **0%** | **🆕 계획** |

### 범례
- ✅ **완료**: 구현 + 실제 사용
- 🟡 **구현만 완료**: 코드 존재하지만 실제 사용 안 함
- 🔴 **부분 완료**: 일부만 구현 또는 사용
- ❌ **미착수**: 구현 없음
- ⚠️ **대체됨**: 다른 Phase로 대체

### 🚀 Phase 10: WebGL Builder 아키텍처 (NEW)

> **상세 문서**: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)

**목표**: Builder를 @pixi/react 기반 WebGL로 재구축, Publish App 분리

**모노레포 구조 (확정)**:
```
xstudio/
├── packages/
│   ├── builder/                 ← 현재 src/ 이전
│   │   └── workspace/
│   │       ├── canvas/          ← WebGL (PixiJS)
│   │       └── overlay/         ← DOM 오버레이
│   ├── publish/                 ← Publish App
│   └── shared/                  ← 공통 코드
└── pnpm-workspace.yaml
```

| Sub-Phase | 작업 | 디렉토리 | 시간 | 우선순위 | 상태 |
|-----------|------|----------|------|----------|------|
| 10.1 | @pixi/react v8 설정 | `packages/builder/workspace/` | 8hr | P0 | 📋 |
| 10.2 | ElementSprite 시스템 | `packages/builder/workspace/canvas/sprites/` | 16hr | P0 | 📋 |
| 10.3 | Selection + Transform | `packages/builder/workspace/canvas/selection/` | 12hr | P1 | 📋 |
| 10.4 | Zoom/Pan + Grid | `packages/builder/workspace/canvas/grid/` | 8hr | P1 | 📋 |
| 10.5 | Text Input 하이브리드 | `packages/builder/workspace/overlay/` | 12hr | P1 | 📋 |
| 10.7 | Publish App 분리 | `packages/publish/` | 16hr | P0 | 📋 |
| 10.8 | Migration 완료 | `src/` → `packages/` | 8hr | P2 | 📋 |

**총 예상 시간**: 80hr (~10일)

> **10.6 (접근성 레이어) 제거 이유**:
> - 빌더는 **시각적 디자인 도구** (Figma, Canva도 빌더 접근성 미지원)
> - **Publish App은 React DOM 기반이므로 접근성 자동 지원**

**기대 효과**:
- 5,000개 요소 60fps 렌더링 (현재 불가능)
- 10,000개 요소 30fps 렌더링
- 줌/팬 반응 < 16ms
- postMessage 오버헤드 제거

---

## Phase 1: Panel Gateway Pattern (🔴 20%)

**문제점**: PropertiesPanel, StylesPanel, ComponentsPanel 모두 `isActive` 체크 전에 훅이 호출됨

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| MonitorPanel Gateway | ✅ | ✅ | `MonitorPanel.tsx:49-56` Content 분리 |
| useMemoryStats enabled | ✅ | ✅ | `useMemoryStats.ts:54` |
| useWebVitals enabled | ✅ | ✅ | `useWebVitals.ts:26` |
| useFPSMonitor enabled | ✅ | ✅ | `useFPSMonitor.ts:26` |
| PropertiesPanel Gateway | ❌ | ❌ | 훅이 isActive 전에 호출 (line 236 vs 937) |
| StylesPanel Gateway | ❌ | ❌ | 훅이 isActive 전에 호출 (line 37 vs 122) |
| ComponentsPanel Gateway | ❌ | ❌ | 훅이 isActive 전에 호출 (line 20 vs 85) |
| PanelShell HOC | ❌ | ❌ | 미구현 |

---

## Phase 2: Store Indexing System (🔴 0% 사용)

**문제점**: `getPageElements` 정의만 있고 실제 사용하지 않음. `.filter(el => el.page_id)` 여전히 10곳에서 사용

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| Type Definitions | ✅ | ❌ | `elementIndexer.ts:22-31` PageElementIndex |
| Indexer Utility | ✅ | ❌ | `elementIndexer.ts` (281줄) |
| Store Integration | ✅ | ❌ | `elements.ts:51,156-159` getPageElements 정의됨 |
| Migration | ❌ | ❌ | **10곳에서 `.filter(page_id)` 여전히 사용** |

**Migration 필요한 파일:**
- `stores/index.ts:115`
- `stores/elements.ts:436` (useCurrentPageElements)
- `panels/events/editors/ElementPicker.tsx:72`
- `panels/nodes/NodesPanel.tsx:99`
- `panels/properties/PropertiesPanel.tsx:258,523`
- `stores/utils/elementReorder.ts:42`
- `panels/components/ComponentsPanel.tsx:78`

---

## Phase 3: History Diff System (✅ 100%)

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| Element Diff Utility | ✅ | ✅ | `elementDiff.ts` (497줄) |
| History IndexedDB | ✅ | ✅ | `historyIndexedDB.ts` (533줄) |
| History Integration | ✅ | ✅ | `history.ts:273,282,361,363,659` diff 사용 확인 |
| Command Data Store | ✅ | ✅ | `commandDataStore.ts` |

---

## Phase 4: Canvas Delta Sync (🟡 구현만 완료)

**문제점**: 코드는 완벽하게 구현되어 있으나 BuilderCore나 다른 컴포넌트에서 **사용하지 않음**

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| Delta Message Types | ✅ | ❌ | `canvasDeltaMessenger.ts:19-53` |
| useDeltaMessenger Hook | ✅ | ❌ | `useDeltaMessenger.ts` (346줄) |
| Canvas Receiver | ✅ | ❌ | `messageHandler.ts:323-336,457-558` |
| Backpressure | ✅ | ❌ | `canvasDeltaMessenger.ts` shouldUseDelta |

**통합 필요:**
- `BuilderCore.tsx`에서 `useDeltaMessenger` 사용
- `sendElementsToIframe` 대신 `sendOptimalUpdate` 사용

---

## Phase 5: Lazy Loading & LRU (🟡 구현만 완료)

**문제점**: elementLoader가 Store에 통합되어 있으나 `usePageLoader` 훅이 **사용되지 않음**

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| LRU Page Cache | ✅ | ✅ | `LRUPageCache.ts` (pageCache 사용됨) |
| Element Loader Slice | ✅ | ❌ | `elementLoader.ts` (502줄), `stores/index.ts:8,48` |
| usePageLoader Hook | ✅ | ❌ | `usePageLoader.ts` - tsx에서 사용 안 함 |
| Auto-preload | ✅ | ❌ | `usePageLoader.ts:137-159` useAdjacentPagePreloader |

**통합 필요:**
- 페이지 전환 시 `loadPageIfNeeded()` 호출
- `BuilderCore`나 `PageManager`에서 `usePageLoader` 사용

---

## Phase 6: React Query Integration (🔴 25%)

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| useAsyncAction | ✅ | ✅ | `useAsyncAction.ts` (재시도 로직 포함) |
| useAsyncData | ✅ | ❓ | `useAsyncData.ts` |
| useAsyncQuery | ✅ | ❓ | `useAsyncQuery.ts` |
| useAsyncMutation | ✅ | ❓ | `useAsyncMutation.ts` |
| Request Manager (Deduplication) | ❌ | ❌ | AbortController는 있으나 전용 관리자 없음 |
| Persister | ❌ | ❌ | 미구현 |

---

## Phase 7: Performance Monitoring & SLO (🟡 구현만 완료)

**문제점**: 모두 구현되어 있으나 **실제 사용하지 않음**

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| PerformanceMonitor Class | ✅ | ❌ | `performanceMonitor.ts` (370줄+) |
| useAutoRecovery Hook | ✅ | ❌ | `useAutoRecovery.ts` - tsx에서 사용 안 함 |
| Health Score | ✅ | ❌ | `performanceMonitor.ts:43-46` |
| Auto Recovery Logic | ✅ | ❌ | `useAutoRecovery.ts:150-185` |

**통합 필요:**
- `BuilderApp.tsx`나 `BuilderCore.tsx`에서 `useAutoRecovery()` 호출

---

## Phase 8: CI & Large Scale Testing (❌ 0%)

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| Fixed Seed Generator | ❌ | ❌ | 미구현 |
| Long Session Simulation | ❌ | ❌ | 미구현 |
| SLO Verification | ❌ | ❌ | 미구현 |

---

## Phase 9: Supplement & Additional Ideas (🔄 60%)

| 항목 | 구현 | 사용 | 파일 위치 |
|------|------|------|----------|
| Canvas Virtualization | ✅ | ✅ | `VirtualizedTree.tsx`, `VirtualizedLayerTree.tsx` |
| Web Worker Offloading | ❌ | ❌ | 미구현 |
| CSS Containment | ✅ | ✅ | 여러 CSS 파일 (`contain:`, `content-visibility`) |
| Event Delegation | ❌ | ❌ | 미구현 |
| Selection Overlay Isolation | ❌ | ❌ | 미구현 |

**CSS Containment 적용 위치:**
- `Menu.css:218,247` - `contain: layout style paint`
- `ListBox.css:253` - `content-visibility: auto`
- `ListBox.css:487,496` - `contain: strict`, `contain: content`
- `ComboBox.css:150`, `Select.css:132`, `DatePicker.css:51`, `DateRangePicker.css:85`

---

## 우선순위별 TODO

### P0 (Critical)
1. **Phase 1**: 3개 패널 Gateway 패턴 적용 (PropertiesPanel, StylesPanel, ComponentsPanel)
2. **Phase 4**: `useDeltaMessenger`를 BuilderCore에 통합
3. **Phase 5**: `usePageLoader`를 페이지 전환에 통합

### P1 (High)
4. **Phase 2**: `.filter(page_id)` → `getPageElements()` 마이그레이션 (10곳)
5. **Phase 7**: `useAutoRecovery`를 BuilderApp에 통합

### P2 (Medium)
6. **Phase 6**: Request Manager (Deduplication + Abort) 구현
7. **Phase 9**: Event Delegation 구현

### P3 (Low)
8. **Phase 8**: CI 자동화 테스트
9. **Phase 9**: Web Worker, Selection Overlay Isolation
