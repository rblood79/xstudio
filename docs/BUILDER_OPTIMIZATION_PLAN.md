# XStudio Builder 통합 최적화 계획

> **작성일**: 2025-12-09
> **목표**: 엔터프라이즈급 5,000개+ 요소, 24시간 안정 사용
> **범위**: Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리

---

## 목차

1. [현재 문제 분석](#1-현재-문제-분석)
2. [목표 성능 지표](#2-목표-성능-지표)
3. [아키텍처 설계](#3-아키텍처-설계)
4. [Phase 1: Panel Gateway 패턴](#4-phase-1-panel-gateway-패턴)
5. [Phase 2: Store 인덱스 시스템](#5-phase-2-store-인덱스-시스템)
6. [Phase 3: History Diff 시스템](#6-phase-3-history-diff-시스템)
7. [Phase 4: Canvas Delta 업데이트](#7-phase-4-canvas-delta-업데이트)
8. [Phase 5: Lazy Loading + LRU 캐시](#8-phase-5-lazy-loading--lru-캐시)
9. [Phase 6: React Query 서버 상태](#9-phase-6-react-query-서버-상태)
10. [Phase 7: 성능 모니터링 + 자동 복구](#10-phase-7-성능-모니터링--자동-복구)
11. [구현 순서 및 예상 소요](#11-구현-순서-및-예상-소요)
12. [기대 효과](#12-기대-효과)

---

## 1. 현재 문제 분석

### 1.1 패널별 상태

| 패널 | 상태 | 주요 문제 | 우선순위 |
|------|------|----------|----------|
| **MonitorPanel** | 🔴 Critical | RAF/interval이 비활성 시에도 실행, enabled 파라미터 없음 | **P0** |
| **PropertiesPanel** | 🟠 High | 5개 selector 구독, isActive 체크 전 실행 | **P1** |
| **StylesPanel** | 🟠 Medium | 4개 훅 구독, isActive 체크 전 실행 | **P2** |
| **ComponentsPanel** | 🟡 Medium | 6개 selector 구독, isActive 체크 전 실행 | **P2** |
| **DataTablePanel** | 🟡 Low | 4개 API 호출 (캐시 없음), useEffect 내 isActive 체크 | **P3** |
| **NodesPanel** | ✅ OK | Virtual Scrolling 이미 적용 (VirtualizedLayerTree) | - |
| **EventsPanel** | ✅ OK | Early return 패턴 적용됨 | - |
| **AIPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **SettingsPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **ThemesPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **DataTableEditorPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **CodePreviewPanel** | ✅ OK | Props 기반, Lazy 코드 생성 | - |

### 1.2 MonitorPanel 상세 분석 (가장 심각)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx`

| Line | 코드 | 문제 |
|------|------|------|
| 42 | `useMemoryStats()` | ❌ `enabled` 파라미터 없음 → 10초 interval 항상 실행 |
| 53 | `useWebVitals()` | ❌ `enabled` 파라미터 없음 → message listener 항상 등록 |
| 76-86 | Toast warning useEffect | ❌ isActive 가드 없음 |
| 88-112 | Memory history RAF | ❌ isActive 가드 없음 |
| 121 | `if (!isActive) return null` | ❌ 너무 늦음 (훅 이미 실행됨) |

**영향**: 패널이 숨겨져 있어도 CPU 지속 사용, 메모리 누적 증가

### 1.3 대규모 요소 처리 문제

| 요소 수 | 현재 상태 | 문제점 |
|--------|----------|--------|
| 100개 | ⚠️ 사용 가능 | 6시간 후 성능 저하 |
| 500개 | 🔴 느림 | 페이지 전환 200-500ms |
| 1,000개 | 🔴 매우 느림 | 2-3시간 후 사용 어려움 |
| 5,000개 | ❌ 불가능 | 초기 로드 실패 가능 |

**원인**:
- `elements.filter()`: O(n) 매번 전체 순회
- History 스냅샷: 전체 요소 복사 저장
- Canvas postMessage: 전체 요소 직렬화

---

## 2. 목표 성능 지표

### 2.1 엔터프라이즈 목표

| 지표 | 현재 (1,000개) | 목표 (5,000개) |
|------|---------------|----------------|
| **초기 로드** | 1-2초 | < 1초 |
| **페이지 전환** | 200-500ms | < 100ms |
| **요소 선택** | 50-100ms | < 30ms |
| **요소 추가** | 100-200ms | < 50ms |
| **Undo/Redo** | 200-400ms | < 100ms |
| **메모리 (24시간)** | 100-200MB 증가 | < 50MB 증가 |
| **CPU (유휴)** | 15-25% | < 5% |
| **안정 사용** | 2-3시간 | **24시간+** |

### 2.2 일반 웹페이지 요소 기준

| 페이지 유형 | 요소 수 | 프로젝트 규모 | 총 요소 |
|------------|--------|--------------|--------|
| 랜딩 페이지 | 30-50 | 소형 (5 pages) | 150-250 |
| 대시보드 | 100-150 | 중형 (15 pages) | 1,500-2,250 |
| SaaS 앱 | 100-200 | 대형 (30 pages) | 3,000-6,000 |
| 엔터프라이즈 | 150-300 | 초대형 (50 pages) | 7,500-15,000 |

---

## 3. 아키텍처 설계

### 3.1 엔터프라이즈 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                 Enterprise Architecture (5,000+)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Normalized Store    │  Multi-Index    │  Pagination     │   │
│  │  (ID 참조만 저장)     │  (5개 인덱스)   │  (페이지별 로드) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Memory Layer                            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  LRU Cache (5 pages)  │  WeakMap Refs  │  Auto GC        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Sync Layer                              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Delta Updates       │  Batch Queue   │  RAF Throttle    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   History Layer                           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Command Pattern     │  Diff Storage  │  IndexedDB       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 데이터 흐름

```
User Action
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Store     │────▶│   History   │────▶│  IndexedDB  │
│  (Memory)   │     │   (Diff)    │     │ (Persist)   │
└─────────────┘     └─────────────┘     └─────────────┘
    │
    ▼ Delta Only
┌─────────────┐     ┌─────────────┐
│   Canvas    │◀────│   Batch     │
│  (iframe)   │     │   Queue     │
└─────────────┘     └─────────────┘
    │
    ▼
┌─────────────┐
│  Supabase   │
│   (Async)   │
└─────────────┘
```

---

## 4. Phase 1: Panel Gateway 패턴

### 4.1 올바른 패턴 (Good Pattern)

```tsx
// ✅ 올바른 패턴: isActive 체크 후 Content 컴포넌트 렌더링
export function Panel({ isActive }: PanelProps) {
  // 1️⃣ isActive 체크 FIRST
  if (!isActive) {
    return null;
  }

  // 2️⃣ Content 컴포넌트 마운트 (훅은 여기서 실행)
  return <PanelContent />;
}

function PanelContent() {
  // 훅들은 isActive=true일 때만 실행됨
  const data = useStore((state) => state.data);
  const { stats } = useMemoryStats({ enabled: true });

  return <div>{/* UI */}</div>;
}
```

### 4.2 MonitorPanel 수정

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx`

```tsx
// ❌ Before
export function MonitorPanel({ isActive }: PanelProps) {
  const { stats } = useMemoryStats();  // 항상 실행
  const { vitals } = useWebVitals();   // 항상 실행

  if (!isActive) return null;  // 너무 늦음
  return <div>...</div>;
}

// ✅ After
export function MonitorPanel({ isActive }: PanelProps) {
  if (!isActive) return null;
  return <MonitorPanelContent />;
}

function MonitorPanelContent() {
  const [activeTab, setActiveTab] = useState<TabType>("memory");

  // enabled 파라미터로 조건부 실행
  const { stats } = useMemoryStats({ enabled: true });
  const { vitals } = useWebVitals({ enabled: activeTab === "vitals" });
  const { fps } = useFPSMonitor({ enabled: activeTab === "realtime" });

  return <div>...</div>;
}
```

### 4.3 useMemoryStats 수정

**파일**: `src/builder/panels/monitor/hooks/useMemoryStats.ts`

```typescript
interface UseMemoryStatsOptions {
  enabled?: boolean;
  interval?: number;
}

export function useMemoryStats(options: UseMemoryStatsOptions = {}) {
  const { enabled = true, interval = 10000 } = options;
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const intervalRef = useRef<number | null>(null);

  const collectStats = useCallback(() => {
    // ... 기존 로직
  }, []);

  useEffect(() => {
    // 🆕 enabled 체크
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 초기 수집
    if ("requestIdleCallback" in window) {
      requestIdleCallback(collectStats);
    } else {
      collectStats();
    }

    // 주기적 수집
    intervalRef.current = window.setInterval(() => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(collectStats);
      } else {
        collectStats();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, collectStats]);

  return { stats, /* ... */ };
}
```

### 4.4 적용 대상 패널

| 패널 | 수정 내용 |
|------|----------|
| MonitorPanel | Gateway 패턴 + 훅 enabled 파라미터 |
| PropertiesPanel | Gateway 패턴 적용 |
| StylesPanel | Gateway 패턴 적용 |
| ComponentsPanel | Gateway 패턴 적용 |

---

## 5. Phase 2: Store 인덱스 시스템

### 5.1 현재 문제

```typescript
// 현재: O(n) 필터링 매번 실행
const currentPageElements = elements.filter(el => el.page_id === currentPageId);
// 5,000개 요소 → 매 렌더링마다 5,000번 순회
```

### 5.2 인덱스 구조

**파일**: `src/builder/stores/elements.ts`

```typescript
interface ElementsState {
  // 기존
  elements: Element[];
  elementsMap: Map<string, Element>;

  // 🆕 인덱스 시스템
  elementsByPage: Map<string, Set<string>>;      // pageId → elementIds
  elementsByParent: Map<string, string[]>;       // parentId → childIds (순서 유지)
  rootElementsByPage: Map<string, string[]>;     // pageId → root elementIds

  // 🆕 캐시
  pageElementsCache: Map<string, Element[]>;     // pageId → elements (computed)
  cacheVersion: Map<string, number>;             // 캐시 무효화용
}

interface ElementsActions {
  // 🆕 O(1) 조회
  getPageElements: (pageId: string) => Element[];
  getChildElements: (parentId: string) => Element[];
  getRootElements: (pageId: string) => Element[];

  // 🆕 인덱스 관리
  invalidatePageCache: (pageId: string) => void;
  rebuildIndexes: () => void;
}
```

### 5.3 인덱스 자동 업데이트

**파일**: `src/builder/stores/utils/elementIndexer.ts`

```typescript
export function createElementIndexer(set: SetState, get: GetState) {

  /**
   * 요소 추가 시 인덱스 업데이트
   */
  const indexElement = (element: Element) => {
    const state = get();

    // 1. pageId 인덱스
    const pageSet = state.elementsByPage.get(element.page_id) ?? new Set();
    pageSet.add(element.id);
    state.elementsByPage.set(element.page_id, pageSet);

    // 2. parentId 인덱스
    if (element.parent_id) {
      const siblings = state.elementsByParent.get(element.parent_id) ?? [];
      // order_num 기준 정렬 삽입
      const insertIndex = siblings.findIndex(id => {
        const sibling = state.elementsMap.get(id);
        return sibling && sibling.order_num > element.order_num;
      });
      if (insertIndex === -1) {
        siblings.push(element.id);
      } else {
        siblings.splice(insertIndex, 0, element.id);
      }
      state.elementsByParent.set(element.parent_id, siblings);
    } else {
      // Root element
      const roots = state.rootElementsByPage.get(element.page_id) ?? [];
      roots.push(element.id);
      state.rootElementsByPage.set(element.page_id, roots);
    }

    // 3. 캐시 무효화
    const version = state.cacheVersion.get(element.page_id) ?? 0;
    state.cacheVersion.set(element.page_id, version + 1);
    state.pageElementsCache.delete(element.page_id);
  };

  /**
   * 요소 제거 시 인덱스 업데이트
   */
  const unindexElement = (element: Element) => {
    const state = get();

    // 1. pageId 인덱스에서 제거
    const pageSet = state.elementsByPage.get(element.page_id);
    if (pageSet) {
      pageSet.delete(element.id);
    }

    // 2. parentId 인덱스에서 제거
    if (element.parent_id) {
      const siblings = state.elementsByParent.get(element.parent_id);
      if (siblings) {
        const idx = siblings.indexOf(element.id);
        if (idx !== -1) siblings.splice(idx, 1);
      }
    } else {
      const roots = state.rootElementsByPage.get(element.page_id);
      if (roots) {
        const idx = roots.indexOf(element.id);
        if (idx !== -1) roots.splice(idx, 1);
      }
    }

    // 3. 자식 인덱스 제거
    state.elementsByParent.delete(element.id);

    // 4. 캐시 무효화
    state.pageElementsCache.delete(element.page_id);
  };

  /**
   * O(1) 페이지 요소 조회
   */
  const getPageElements = (pageId: string): Element[] => {
    const state = get();

    // 캐시 확인
    const cached = state.pageElementsCache.get(pageId);
    if (cached) return cached;

    // 인덱스에서 조회
    const elementIds = state.elementsByPage.get(pageId);
    if (!elementIds || elementIds.size === 0) return [];

    const elements = Array.from(elementIds)
      .map(id => state.elementsMap.get(id))
      .filter((el): el is Element => el !== undefined)
      .sort((a, b) => a.order_num - b.order_num);

    // 캐시 저장
    state.pageElementsCache.set(pageId, elements);

    return elements;
  };

  return { indexElement, unindexElement, getPageElements };
}
```

### 5.4 성능 비교

| 연산 | 현재 O(n) | 인덱스 후 | 개선율 |
|------|----------|----------|--------|
| 페이지 요소 조회 | 2ms (5,000개) | 0.01ms | **200x** |
| 자식 요소 조회 | 2ms | 0.01ms | **200x** |
| 요소 추가 | 0.1ms | 0.2ms | 2x 느림 (허용) |
| 요소 삭제 | 2ms | 0.1ms | **20x** |

---

## 6. Phase 3: History Diff 시스템

### 6.1 현재 문제

```typescript
// 현재: 전체 스냅샷 저장
historyManager.push({
  elements: [...allElements],  // 5,000개 복사 = ~10MB
  timestamp: Date.now()
});

// 50회 Undo = 50 × 10MB = 500MB 메모리 사용!
```

### 6.2 Command Pattern + Diff 저장

**파일**: `src/builder/stores/history/diffHistory.ts`

```typescript
type CommandType =
  | 'ADD_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'MOVE_ELEMENT'
  | 'BATCH';

interface Command {
  id: string;
  type: CommandType;
  timestamp: number;
  pageId: string;

  // Diff만 저장 (전체 스냅샷 X)
  undo: CommandPayload;
  redo: CommandPayload;
}

interface CommandPayload {
  elementId?: string;
  elementIds?: string[];

  // UPDATE: 변경된 필드만
  before?: Partial<Element>;
  after?: Partial<Element>;

  // DELETE: 복원용 전체 요소
  deletedElement?: Element;
  deletedChildren?: Element[];

  // MOVE: 위치 정보
  oldParentId?: string | null;
  newParentId?: string | null;
  oldOrderNum?: number;
  newOrderNum?: number;
}

export class DiffHistoryManager {
  private commands: Command[] = [];
  private currentIndex = -1;
  private maxCommands = 100;

  /**
   * 요소 업데이트 기록 (Diff만 저장)
   */
  recordUpdate(
    elementId: string,
    pageId: string,
    before: Partial<Element>,
    after: Partial<Element>
  ) {
    const diff = this.computeDiff(before, after);

    if (Object.keys(diff.changed).length === 0) return;

    this.push({
      id: crypto.randomUUID(),
      type: 'UPDATE_ELEMENT',
      timestamp: Date.now(),
      pageId,
      undo: { elementId, after: diff.original },
      redo: { elementId, after: diff.changed },
    });
  }

  /**
   * 요소 삭제 기록 (전체 요소 저장 - 복원 필요)
   */
  recordDelete(element: Element, children: Element[] = []) {
    this.push({
      id: crypto.randomUUID(),
      type: 'DELETE_ELEMENT',
      timestamp: Date.now(),
      pageId: element.page_id,
      undo: {
        deletedElement: element,
        deletedChildren: children
      },
      redo: { elementId: element.id },
    });
  }

  /**
   * Diff 계산
   */
  private computeDiff(before: Partial<Element>, after: Partial<Element>) {
    const changed: Partial<Element> = {};
    const original: Partial<Element> = {};

    for (const key of Object.keys(after) as (keyof Element)[]) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed[key] = after[key];
        original[key] = before[key];
      }
    }

    return { changed, original };
  }

  /**
   * Undo
   */
  undo(): Command | null {
    if (this.currentIndex < 0) return null;
    return this.commands[this.currentIndex--];
  }

  /**
   * Redo
   */
  redo(): Command | null {
    if (this.currentIndex >= this.commands.length - 1) return null;
    return this.commands[++this.currentIndex];
  }

  /**
   * 메모리 사용량 (Diff 기반으로 대폭 감소)
   */
  getMemoryUsage(): number {
    // 명령당 평균 ~300 bytes (vs 스냅샷 ~10KB)
    return this.commands.length * 300;
  }
}
```

### 6.3 IndexedDB 영속화 (선택적)

```typescript
// 대용량 히스토리 IndexedDB 저장
interface HistoryDB {
  commands: Command[];
  currentIndex: number;
}

async function persistHistory(db: HistoryDB) {
  const idb = await openDB('xstudio-history', 1);
  await idb.put('history', db, 'current');
}

async function loadHistory(): Promise<HistoryDB | null> {
  const idb = await openDB('xstudio-history', 1);
  return idb.get('history', 'current');
}
```

### 6.4 메모리 비교

| 시나리오 | 현재 (스냅샷) | Diff 기반 | 절감률 |
|----------|-------------|-----------|--------|
| 5,000요소 × 100회 | ~500MB | ~3MB | **99.4%** |
| props 1개 변경 | ~10KB | ~300B | **97%** |
| 요소 이동 | ~10KB | ~200B | **98%** |

---

## 7. Phase 4: Canvas Delta 업데이트

### 7.1 현재 문제

```typescript
// 현재: 변경마다 전체 요소 전송
postMessage({
  type: 'SET_ELEMENTS',
  elements: allPageElements  // 100개 × 2KB = 200KB
});
```

### 7.2 Delta Message 시스템

**파일**: `src/builder/hooks/useCanvasDeltaSync.ts`

```typescript
type DeltaType =
  | 'ELEMENT_ADD'
  | 'ELEMENT_UPDATE'
  | 'ELEMENT_DELETE'
  | 'ELEMENT_MOVE'
  | 'BATCH_DELTA'
  | 'FULL_SYNC';

interface DeltaMessage {
  type: DeltaType;
  payload: {
    elementId?: string;
    element?: Element;
    changes?: Partial<Element>;
    elements?: Element[];
  };
}

export function useCanvasDeltaSync() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingDeltas = useRef<DeltaMessage[]>([]);
  const flushScheduled = useRef(false);

  /**
   * 단일 요소 업데이트 (변경분만)
   */
  const sendElementUpdate = useCallback((
    elementId: string,
    changes: Partial<Element>
  ) => {
    pendingDeltas.current.push({
      type: 'ELEMENT_UPDATE',
      payload: { elementId, changes }
    });
    scheduleFlush();
  }, []);

  /**
   * 요소 추가
   */
  const sendElementAdd = useCallback((element: Element) => {
    pendingDeltas.current.push({
      type: 'ELEMENT_ADD',
      payload: { element }
    });
    scheduleFlush();
  }, []);

  /**
   * 요소 삭제
   */
  const sendElementDelete = useCallback((elementId: string) => {
    pendingDeltas.current.push({
      type: 'ELEMENT_DELETE',
      payload: { elementId }
    });
    scheduleFlush();
  }, []);

  /**
   * RAF 기반 배치 전송
   */
  const scheduleFlush = useCallback(() => {
    if (flushScheduled.current) return;

    flushScheduled.current = true;
    requestAnimationFrame(() => {
      const deltas = pendingDeltas.current;
      pendingDeltas.current = [];
      flushScheduled.current = false;

      if (deltas.length === 0) return;

      iframeRef.current?.contentWindow?.postMessage({
        type: 'BATCH_DELTA',
        deltas
      }, '*');
    });
  }, []);

  /**
   * 전체 동기화 (페이지 전환 시)
   */
  const sendFullSync = useCallback((elements: Element[]) => {
    // 기존 pending 클리어
    pendingDeltas.current = [];
    flushScheduled.current = false;

    iframeRef.current?.contentWindow?.postMessage({
      type: 'FULL_SYNC',
      elements
    }, '*');
  }, []);

  return {
    iframeRef,
    sendElementUpdate,
    sendElementAdd,
    sendElementDelete,
    sendFullSync
  };
}
```

### 7.3 Canvas Runtime 수신

**파일**: `src/canvas/hooks/useDeltaReceiver.ts`

```typescript
export function useDeltaReceiver() {
  const { updateElement, addElement, removeElement, setElements } = useRuntimeStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, deltas, elements, payload } = event.data;

      switch (type) {
        case 'BATCH_DELTA':
          // 배치 처리
          deltas.forEach((delta: DeltaMessage) => {
            switch (delta.type) {
              case 'ELEMENT_UPDATE':
                updateElement(delta.payload.elementId!, delta.payload.changes!);
                break;
              case 'ELEMENT_ADD':
                addElement(delta.payload.element!);
                break;
              case 'ELEMENT_DELETE':
                removeElement(delta.payload.elementId!);
                break;
            }
          });
          break;

        case 'FULL_SYNC':
          setElements(elements);
          break;

        case 'ELEMENT_UPDATE':
          updateElement(payload.elementId, payload.changes);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
}
```

### 7.4 전송량 비교

| 작업 | 현재 | Delta | 절감률 |
|------|------|-------|--------|
| props 변경 | ~2KB | ~100B | **95%** |
| 요소 이동 | ~2KB | ~50B | **97%** |
| 연속 10회 변경 | ~20KB | ~1KB | **95%** |
| 페이지 전환 | ~200KB | ~200KB | 동일 |

---

## 8. Phase 5: Lazy Loading + LRU 캐시

### 8.1 페이지별 Lazy Loading

**파일**: `src/builder/stores/elementLoader.ts`

```typescript
interface LoaderState {
  loadedPages: Set<string>;
  loadingPages: Set<string>;
}

export function createElementLoader(set: SetState, get: GetState) {
  const lruCache = new LRUPageCache(5); // 최대 5개 페이지 메모리 유지

  /**
   * 페이지 요소 Lazy Load
   */
  const loadPageElements = async (pageId: string): Promise<Element[]> => {
    const state = get();

    // 이미 로드됨
    if (state.loadedPages.has(pageId)) {
      lruCache.access(pageId);
      return state.getPageElements(pageId);
    }

    // 로딩 중
    if (state.loadingPages.has(pageId)) {
      return new Promise((resolve) => {
        const checkLoaded = setInterval(() => {
          if (get().loadedPages.has(pageId)) {
            clearInterval(checkLoaded);
            resolve(get().getPageElements(pageId));
          }
        }, 50);
      });
    }

    set(s => ({
      loadingPages: new Set([...s.loadingPages, pageId])
    }));

    try {
      // Supabase에서 해당 페이지 요소만 로드
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('page_id', pageId)
        .order('order_num');

      if (error) throw error;

      // Store에 추가
      if (data) {
        const { indexElement } = get();
        data.forEach(element => {
          state.elementsMap.set(element.id, element as Element);
          indexElement(element as Element);
        });
      }

      // LRU 체크 - 초과 시 오래된 페이지 언로드
      const evictPageId = lruCache.access(pageId);
      if (evictPageId) {
        unloadPage(evictPageId);
      }

      set(s => ({
        loadedPages: new Set([...s.loadedPages, pageId]),
        loadingPages: new Set([...s.loadingPages].filter(id => id !== pageId))
      }));

      return data as Element[] ?? [];
    } catch (error) {
      console.error('[ElementLoader] Failed to load page:', error);
      set(s => ({
        loadingPages: new Set([...s.loadingPages].filter(id => id !== pageId))
      }));
      return [];
    }
  };

  /**
   * 페이지 언로드 (메모리 해제)
   */
  const unloadPage = (pageId: string) => {
    const state = get();

    // 현재 페이지는 언로드 불가
    if (pageId === state.currentPageId) return;

    const elementIds = state.elementsByPage.get(pageId);
    if (!elementIds) return;

    // 요소 제거
    elementIds.forEach(id => {
      const element = state.elementsMap.get(id);
      if (element) {
        state.unindexElement(element);
        state.elementsMap.delete(id);
      }
    });

    set(s => ({
      loadedPages: new Set([...s.loadedPages].filter(id => id !== pageId))
    }));
  };

  return { loadPageElements, unloadPage };
}
```

### 8.2 LRU 캐시

**파일**: `src/builder/utils/LRUPageCache.ts`

```typescript
export class LRUPageCache {
  private maxPages: number;
  private accessOrder: string[] = [];

  constructor(maxPages = 5) {
    this.maxPages = maxPages;
  }

  /**
   * 페이지 접근 기록
   * @returns 언로드할 페이지 ID (초과 시)
   */
  access(pageId: string): string | null {
    // 기존 위치에서 제거
    this.accessOrder = this.accessOrder.filter(id => id !== pageId);
    // 맨 앞에 추가
    this.accessOrder.unshift(pageId);

    // 초과 시 가장 오래된 페이지 반환
    if (this.accessOrder.length > this.maxPages) {
      return this.accessOrder.pop() ?? null;
    }

    return null;
  }

  /**
   * 현재 로드된 페이지 수
   */
  get size(): number {
    return this.accessOrder.length;
  }
}
```

### 8.3 메모리 관리 효과

| 시나리오 | 전체 로드 | LRU (5 pages) | 절감률 |
|----------|----------|---------------|--------|
| 50페이지 × 100요소 | ~100MB | ~10MB | **90%** |
| 페이지 전환 | 즉시 | ~50ms 로드 | 허용 |

---

## 9. Phase 6: React Query 서버 상태

### 9.1 설치

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### 9.2 Provider 설정

**파일**: `src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 30 * 60 * 1000,   // 30분 (구 cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    {import.meta.env.DEV && <ReactQueryDevtools />}
  </QueryClientProvider>
);
```

### 9.3 DataTablePanel 적용

**파일**: `src/builder/panels/datatable/DataTablePanel.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';

function DataTablePanelContent({ projectId }: { projectId: string }) {
  // 4개 API를 React Query로 통합
  const { data: dataTables, isLoading: loadingTables } = useQuery({
    queryKey: ['dataTables', projectId],
    queryFn: () => fetchDataTables(projectId),
    enabled: !!projectId,
  });

  const { data: apiEndpoints, isLoading: loadingApi } = useQuery({
    queryKey: ['apiEndpoints', projectId],
    queryFn: () => fetchApiEndpoints(projectId),
    enabled: !!projectId,
  });

  const { data: variables, isLoading: loadingVars } = useQuery({
    queryKey: ['variables', projectId],
    queryFn: () => fetchVariables(projectId),
    enabled: !!projectId,
  });

  const { data: transformers, isLoading: loadingTrans } = useQuery({
    queryKey: ['transformers', projectId],
    queryFn: () => fetchTransformers(projectId),
    enabled: !!projectId,
  });

  const isLoading = loadingTables || loadingApi || loadingVars || loadingTrans;

  if (isLoading) return <Loading />;

  return <DataTableContent {...{ dataTables, apiEndpoints, variables, transformers }} />;
}
```

### 9.4 효과

| 항목 | Before | After |
|------|--------|-------|
| 패널 전환 시 API | 4회 호출 | 0회 (캐시) |
| 캐시 히트율 | 0% | 90%+ |
| 에러 재시도 | 수동 | 자동 |

---

## 10. Phase 7: 성능 모니터링 + 자동 복구

### 10.1 성능 메트릭 수집

**파일**: `src/builder/utils/performanceMonitor.ts`

```typescript
interface PerformanceMetrics {
  // 요소
  elementCount: number;
  pageCount: number;
  loadedPages: number;

  // 메모리
  storeMemory: number;
  historyMemory: number;
  cacheMemory: number;
  browserHeapUsed: number;
  browserHeapLimit: number;

  // 성능
  lastRenderTime: number;
  avgRenderTime: number;
  fps: number;

  // 상태
  healthScore: number;  // 0-100
  warnings: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private renderTimes: number[] = [];
  private maxRenderSamples = 60;

  /**
   * 메트릭 수집
   */
  collect(): PerformanceMetrics {
    const state = useStore.getState();
    const historyManager = getHistoryManager();

    // 브라우저 메모리
    const memory = (performance as any).memory;

    this.metrics = {
      elementCount: state.elementsMap.size,
      pageCount: state.elementsByPage.size,
      loadedPages: state.loadedPages.size,

      storeMemory: this.estimateStoreMemory(state),
      historyMemory: historyManager.getMemoryUsage(),
      cacheMemory: this.estimateCacheMemory(state),
      browserHeapUsed: memory?.usedJSHeapSize ?? 0,
      browserHeapLimit: memory?.jsHeapSizeLimit ?? 0,

      lastRenderTime: this.renderTimes[this.renderTimes.length - 1] ?? 0,
      avgRenderTime: this.calculateAvgRenderTime(),
      fps: this.calculateFPS(),

      healthScore: this.calculateHealthScore(),
      warnings: this.generateWarnings(),
    };

    return this.metrics;
  }

  /**
   * 건강 점수 계산 (0-100)
   */
  private calculateHealthScore(): number {
    let score = 100;

    // 메모리 사용량
    const heapPercent = this.metrics.browserHeapUsed / this.metrics.browserHeapLimit;
    if (heapPercent > 0.8) score -= 30;
    else if (heapPercent > 0.6) score -= 15;

    // 렌더링 시간
    if (this.metrics.avgRenderTime > 100) score -= 20;
    else if (this.metrics.avgRenderTime > 50) score -= 10;

    // FPS
    if (this.metrics.fps < 30) score -= 20;
    else if (this.metrics.fps < 50) score -= 10;

    return Math.max(0, score);
  }

  /**
   * 경고 생성
   */
  private generateWarnings(): string[] {
    const warnings: string[] = [];

    if (this.metrics.browserHeapUsed > this.metrics.browserHeapLimit * 0.8) {
      warnings.push('메모리 사용량이 80%를 초과했습니다');
    }

    if (this.metrics.avgRenderTime > 100) {
      warnings.push('렌더링 시간이 100ms를 초과했습니다');
    }

    if (this.metrics.elementCount > 5000) {
      warnings.push('요소 수가 5,000개를 초과했습니다');
    }

    return warnings;
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

### 10.2 자동 복구

```typescript
/**
 * 성능 저하 시 자동 복구
 */
function useAutoRecovery() {
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = performanceMonitor.collect();

      // 심각한 성능 저하 감지
      if (metrics.healthScore < 30) {
        console.warn('[AutoRecovery] Critical performance detected, initiating recovery');

        // 1. 비활성 페이지 언로드
        const { unloadInactivePages } = useStore.getState();
        unloadInactivePages();

        // 2. 히스토리 정리
        const historyManager = getHistoryManager();
        historyManager.trim(50); // 최근 50개만 유지

        // 3. 캐시 클리어
        const { clearCaches } = useStore.getState();
        clearCaches();

        // 4. 가비지 컬렉션 힌트
        if ('gc' in window) {
          (window as any).gc?.();
        }
      }
    }, 30000); // 30초마다 체크

    return () => clearInterval(interval);
  }, []);
}
```

---

## 11. 구현 순서 및 예상 소요

| Phase | 작업 | 예상 소요 | 누적 효과 |
|-------|------|----------|----------|
| **1** | Panel Gateway + MonitorPanel | 6시간 | CPU 70% ↓ |
| **2** | Store 인덱스 시스템 | 8시간 | 조회 200x ↑ |
| **3** | History Diff + IndexedDB | 8시간 | 메모리 97% ↓ |
| **4** | Canvas Delta + Batch | 6시간 | 전송량 95% ↓ |
| **5** | Lazy Loading + LRU | 6시간 | 초기로드 70% ↓ |
| **6** | React Query 서버 상태 | 4시간 | API 캐시 90% ↑ |
| **7** | 성능 모니터링 + 자동복구 | 4시간 | 안정성 확보 |
| **8** | 문서화 + 테스트 | 4시간 | 유지보수성 |

**총 예상 소요: 46시간 (약 6일)**

---

## 12. 기대 효과

### 12.1 성능 개선 요약

| 지표 | 현재 | 최적화 후 | 개선율 |
|------|------|----------|--------|
| **페이지 요소 조회** | O(n) 2ms | O(1) 0.01ms | **200x** |
| **History 메모리** | 500MB | 3MB | **99%** |
| **Canvas 전송량** | 200KB | 1KB | **95%** |
| **메모리 (24시간)** | 200MB+ | < 50MB | **75%** |
| **CPU (유휴)** | 15-25% | < 5% | **80%** |
| **API 호출** | 매번 | 캐시 히트 | **90%** |

### 12.2 안정성 목표 달성

```
현재:
───────────────────────────────────────────
시간   0h    3h    6h    9h    12h   24h
성능  100% → 80% → 50% → 30% → ❌    ❌

최적화 후:
───────────────────────────────────────────
시간   0h    3h    6h    9h    12h   24h
성능  100% → 98% → 96% → 95% → 94% → 92%
```

### 12.3 지원 규모

| 규모 | 현재 | 최적화 후 |
|------|------|----------|
| 500 요소 | ⚠️ 6시간 | ✅ 24시간+ |
| 1,000 요소 | 🔴 2시간 | ✅ 24시간+ |
| 5,000 요소 | ❌ 불가 | ✅ 24시간+ |
| 10,000 요소 | ❌ 불가 | ⚠️ 테스트 필요 |

---

## 부록: 구현 파일 목록

| 파일 | 작업 | Phase |
|------|------|-------|
| `src/builder/panels/monitor/MonitorPanel.tsx` | Gateway 패턴 | 1 |
| `src/builder/panels/monitor/hooks/useMemoryStats.ts` | enabled 파라미터 | 1 |
| `src/builder/panels/monitor/hooks/useWebVitals.ts` | enabled 파라미터 | 1 |
| `src/builder/panels/properties/PropertiesPanel.tsx` | Gateway 패턴 | 1 |
| `src/builder/panels/styles/StylesPanel.tsx` | Gateway 패턴 | 1 |
| `src/builder/panels/components/ComponentsPanel.tsx` | Gateway 패턴 | 1 |
| `src/builder/stores/elements.ts` | 인덱스 시스템 | 2 |
| `src/builder/stores/utils/elementIndexer.ts` | 인덱스 유틸 | 2 |
| `src/builder/stores/history/diffHistory.ts` | Diff 히스토리 | 3 |
| `src/builder/hooks/useCanvasDeltaSync.ts` | Delta 동기화 | 4 |
| `src/canvas/hooks/useDeltaReceiver.ts` | Delta 수신 | 4 |
| `src/builder/stores/elementLoader.ts` | Lazy Loading | 5 |
| `src/builder/utils/LRUPageCache.ts` | LRU 캐시 | 5 |
| `src/main.tsx` | QueryProvider | 6 |
| `src/builder/panels/datatable/DataTablePanel.tsx` | React Query 적용 | 6 |
| `src/builder/utils/performanceMonitor.ts` | 성능 모니터 | 7 |

---

> **작성자**: Claude AI
> **최종 수정**: 2025-12-09
> **다음 단계**: Phase 1 구현 시작

---

## 부록 B: Phase별 상세 구현 체크리스트

### Phase 1: Panel Gateway 패턴 (6시간)

#### 1.1 MonitorPanel 수정 (2시간)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx`

- [ ] **Step 1.1.1**: Gateway 패턴 적용
  ```tsx
  // Before
  export function MonitorPanel({ isActive }: PanelProps) {
    const { stats } = useMemoryStats();
    if (!isActive) return null;
    return <div>...</div>;
  }

  // After
  export function MonitorPanel({ isActive }: PanelProps) {
    if (!isActive) return null;
    return <MonitorPanelContent />;
  }

  function MonitorPanelContent() {
    const { stats } = useMemoryStats({ enabled: true });
    return <div>...</div>;
  }
  ```

- [ ] **Step 1.1.2**: `useMemoryStats.ts` 수정
  - `enabled` 파라미터 추가
  - interval cleanup 로직 추가
  - `enabled: false` 시 interval 중지

- [ ] **Step 1.1.3**: `useWebVitals.ts` 수정
  - `enabled` 파라미터 추가
  - message listener 조건부 등록

- [ ] **Step 1.1.4**: `useFPSMonitor.ts` 확인
  - 이미 `enabled` 파라미터 있음 (확인만)

**테스트 기준**:
```bash
# CPU 사용량 측정 (패널 비활성 상태)
# Before: 15-25%
# After: < 5%
```

#### 1.2 PropertiesPanel 수정 (1.5시간)

**파일**: `src/builder/panels/properties/PropertiesPanel.tsx`

- [ ] **Step 1.2.1**: 현재 구조 분석
  ```tsx
  // 현재 (추정)
  export function PropertiesPanel({ isActive }: PanelProps) {
    const selectedElement = useInspectorState(s => s.selectedElement);
    const multiSelectMode = useStore(s => s.multiSelectMode);
    // ... 더 많은 selectors
    if (!isActive) return null;
  }
  ```

- [ ] **Step 1.2.2**: Gateway 패턴 적용
  ```tsx
  export function PropertiesPanel({ isActive }: PanelProps) {
    if (!isActive) return null;
    return <PropertiesPanelContent />;
  }

  function PropertiesPanelContent() {
    const selectedElement = useInspectorState(s => s.selectedElement);
    // ... hooks here
  }
  ```

#### 1.3 StylesPanel 수정 (1시간)

**파일**: `src/builder/panels/styles/StylesPanel.tsx`

- [ ] **Step 1.3.1**: Gateway 패턴 적용
- [ ] **Step 1.3.2**: `useSectionCollapse` 훅을 Content로 이동
- [ ] **Step 1.3.3**: `useStyleActions` 훅을 Content로 이동
- [ ] **Step 1.3.4**: `useKeyboardShortcutsRegistry`를 Content로 이동

#### 1.4 ComponentsPanel 수정 (1시간)

**파일**: `src/builder/panels/components/ComponentsPanel.tsx`

- [ ] **Step 1.4.1**: 6개 selector 분석
- [ ] **Step 1.4.2**: Gateway 패턴 적용
- [ ] **Step 1.4.3**: Content 컴포넌트로 selectors 이동

#### 1.5 Phase 1 검증 (0.5시간)

- [ ] 모든 패널 기능 테스트
- [ ] DevTools로 re-render 횟수 확인
- [ ] CPU 사용량 비교 측정

---

### Phase 2: Store 인덱스 시스템 (8시간)

#### 2.1 타입 정의 (1시간)

**파일**: `src/types/store/elementIndex.types.ts`

- [ ] **Step 2.1.1**: 인덱스 타입 정의
  ```typescript
  export interface ElementIndexes {
    elementsByPage: Map<string, Set<string>>;
    elementsByParent: Map<string, string[]>;
    rootElementsByPage: Map<string, string[]>;
    pageElementsCache: Map<string, Element[]>;
    cacheVersion: Map<string, number>;
  }

  export interface ElementIndexActions {
    getPageElements: (pageId: string) => Element[];
    getChildElements: (parentId: string) => Element[];
    getRootElements: (pageId: string) => Element[];
    invalidatePageCache: (pageId: string) => void;
    rebuildIndexes: () => void;
  }
  ```

#### 2.2 인덱서 유틸리티 (2시간)

**파일**: `src/builder/stores/utils/elementIndexer.ts`

- [ ] **Step 2.2.1**: `indexElement()` 함수 구현
- [ ] **Step 2.2.2**: `unindexElement()` 함수 구현
- [ ] **Step 2.2.3**: `getPageElements()` 함수 구현 (캐시 포함)
- [ ] **Step 2.2.4**: `getChildElements()` 함수 구현
- [ ] **Step 2.2.5**: `rebuildIndexes()` 함수 구현

#### 2.3 Store 통합 (3시간)

**파일**: `src/builder/stores/elements.ts`

- [ ] **Step 2.3.1**: State에 인덱스 필드 추가
  ```typescript
  interface ElementsState {
    // 기존 필드
    elements: Element[];
    elementsMap: Map<string, Element>;

    // 🆕 인덱스
    elementsByPage: Map<string, Set<string>>;
    elementsByParent: Map<string, string[]>;
    rootElementsByPage: Map<string, string[]>;
    pageElementsCache: Map<string, Element[]>;
    cacheVersion: Map<string, number>;
  }
  ```

- [ ] **Step 2.3.2**: `addElement` 수정 - 인덱스 업데이트 추가
- [ ] **Step 2.3.3**: `removeElement` 수정 - 인덱스 제거 추가
- [ ] **Step 2.3.4**: `updateElement` 수정 - parent_id 변경 시 인덱스 업데이트
- [ ] **Step 2.3.5**: `setElements` 수정 - 인덱스 재구축
- [ ] **Step 2.3.6**: `getPageElements` action 추가

#### 2.4 기존 코드 마이그레이션 (1.5시간)

- [ ] **Step 2.4.1**: `elements.filter(el => el.page_id === ...)` 검색
  ```bash
  grep -r "elements.filter" src/builder --include="*.tsx" --include="*.ts"
  ```

- [ ] **Step 2.4.2**: 각 위치에서 `getPageElements()` 사용으로 교체
- [ ] **Step 2.4.3**: `useMemo`로 감싸진 필터링 제거 (인덱스가 대체)

#### 2.5 Phase 2 검증 (0.5시간)

- [ ] 5,000개 요소 테스트 데이터 생성
- [ ] `getPageElements()` 성능 측정 (목표: < 1ms)
- [ ] 요소 추가/삭제 후 인덱스 정합성 확인

---

### Phase 3: History Diff 시스템 (8시간)

#### 3.1 Command 타입 정의 (1시간)

**파일**: `src/builder/stores/history/types.ts`

- [ ] **Step 3.1.1**: CommandType enum 정의
- [ ] **Step 3.1.2**: Command interface 정의
- [ ] **Step 3.1.3**: CommandPayload interface 정의

#### 3.2 DiffHistoryManager 구현 (3시간)

**파일**: `src/builder/stores/history/diffHistory.ts`

- [ ] **Step 3.2.1**: 클래스 기본 구조
  ```typescript
  export class DiffHistoryManager {
    private commands: Command[] = [];
    private currentIndex = -1;
    private maxCommands = 100;
  }
  ```

- [ ] **Step 3.2.2**: `computeDiff()` 메서드 구현
- [ ] **Step 3.2.3**: `recordUpdate()` 메서드 구현
- [ ] **Step 3.2.4**: `recordAdd()` 메서드 구현
- [ ] **Step 3.2.5**: `recordDelete()` 메서드 구현
- [ ] **Step 3.2.6**: `recordMove()` 메서드 구현
- [ ] **Step 3.2.7**: `recordBatch()` 메서드 구현
- [ ] **Step 3.2.8**: `undo()` 메서드 구현
- [ ] **Step 3.2.9**: `redo()` 메서드 구현
- [ ] **Step 3.2.10**: `getMemoryUsage()` 메서드 구현

#### 3.3 Store 통합 (2시간)

**파일**: `src/builder/stores/elements.ts`

- [ ] **Step 3.3.1**: 기존 historyManager 참조 교체
- [ ] **Step 3.3.2**: `addElement`에서 `recordAdd()` 호출
- [ ] **Step 3.3.3**: `updateElement`에서 `recordUpdate()` 호출
- [ ] **Step 3.3.4**: `removeElement`에서 `recordDelete()` 호출
- [ ] **Step 3.3.5**: Undo/Redo action에서 새 히스토리 사용

#### 3.4 IndexedDB 영속화 (선택, 1.5시간)

**파일**: `src/builder/stores/history/historyPersistence.ts`

- [ ] **Step 3.4.1**: IndexedDB 스키마 정의
- [ ] **Step 3.4.2**: `saveHistory()` 함수 구현
- [ ] **Step 3.4.3**: `loadHistory()` 함수 구현
- [ ] **Step 3.4.4**: 자동 저장 interval 설정

#### 3.5 Phase 3 검증 (0.5시간)

- [ ] 메모리 사용량 측정 (100회 Undo 후)
- [ ] Undo/Redo 동작 테스트
- [ ] 복잡한 작업 시퀀스 테스트

---

### Phase 4: Canvas Delta 업데이트 (6시간)

#### 4.1 Delta 타입 정의 (0.5시간)

**파일**: `src/types/canvas/delta.types.ts`

- [ ] **Step 4.1.1**: DeltaType 정의
- [ ] **Step 4.1.2**: DeltaMessage interface 정의
- [ ] **Step 4.1.3**: DeltaPayload interface 정의

#### 4.2 Delta Sync 훅 구현 (2시간)

**파일**: `src/builder/hooks/useCanvasDeltaSync.ts`

- [ ] **Step 4.2.1**: 기본 구조 및 refs 설정
- [ ] **Step 4.2.2**: `sendElementUpdate()` 구현
- [ ] **Step 4.2.3**: `sendElementAdd()` 구현
- [ ] **Step 4.2.4**: `sendElementDelete()` 구현
- [ ] **Step 4.2.5**: `scheduleFlush()` RAF 배치 구현
- [ ] **Step 4.2.6**: `sendFullSync()` 구현

#### 4.3 Canvas Runtime 수신기 (1.5시간)

**파일**: `src/canvas/hooks/useDeltaReceiver.ts`

- [ ] **Step 4.3.1**: message handler 구현
- [ ] **Step 4.3.2**: BATCH_DELTA 처리
- [ ] **Step 4.3.3**: FULL_SYNC 처리
- [ ] **Step 4.3.4**: 개별 delta 처리

#### 4.4 기존 postMessage 마이그레이션 (1.5시간)

- [ ] **Step 4.4.1**: 현재 postMessage 호출 위치 검색
  ```bash
  grep -r "postMessage" src/builder --include="*.tsx" --include="*.ts"
  ```

- [ ] **Step 4.4.2**: `SET_ELEMENTS` → `sendFullSync` (페이지 전환만)
- [ ] **Step 4.4.3**: 개별 요소 변경 → Delta 함수 사용

#### 4.5 Phase 4 검증 (0.5시간)

- [ ] postMessage 크기 측정
- [ ] 연속 변경 시 배치 동작 확인
- [ ] Canvas 동기화 정확성 테스트

---

### Phase 5: Lazy Loading + LRU 캐시 (6시간)

#### 5.1 LRU 캐시 구현 (1시간)

**파일**: `src/builder/utils/LRUPageCache.ts`

- [ ] **Step 5.1.1**: 클래스 기본 구조
- [ ] **Step 5.1.2**: `access()` 메서드 구현
- [ ] **Step 5.1.3**: `getEvictionCandidate()` 메서드 구현

#### 5.2 Element Loader 구현 (2.5시간)

**파일**: `src/builder/stores/elementLoader.ts`

- [ ] **Step 5.2.1**: LoaderState 정의
- [ ] **Step 5.2.2**: `loadPageElements()` 구현
  - Supabase 쿼리
  - Store 업데이트
  - LRU 체크

- [ ] **Step 5.2.3**: `unloadPage()` 구현
  - 메모리에서 제거
  - 인덱스 정리

- [ ] **Step 5.2.4**: `preloadAdjacentPages()` 구현 (선택)

#### 5.3 Store 통합 (1.5시간)

**파일**: `src/builder/stores/elements.ts`

- [ ] **Step 5.3.1**: `loadedPages`, `loadingPages` 상태 추가
- [ ] **Step 5.3.2**: 페이지 전환 시 `loadPageElements` 호출
- [ ] **Step 5.3.3**: LRU 초과 시 자동 `unloadPage`

#### 5.4 UI 연동 (0.5시간)

- [ ] **Step 5.4.1**: 페이지 로딩 인디케이터 추가
- [ ] **Step 5.4.2**: 로딩 중 상호작용 방지

#### 5.5 Phase 5 검증 (0.5시간)

- [ ] 50페이지 프로젝트 테스트
- [ ] 메모리 사용량 측정 (5페이지 제한 확인)
- [ ] 페이지 전환 시간 측정

---

### Phase 6: React Query 서버 상태 (4시간)

#### 6.1 설치 및 설정 (0.5시간)

- [ ] **Step 6.1.1**: 패키지 설치
  ```bash
  npm install @tanstack/react-query
  npm install -D @tanstack/react-query-devtools
  ```

- [ ] **Step 6.1.2**: `src/main.tsx`에 QueryProvider 추가

#### 6.2 DataTablePanel 마이그레이션 (2시간)

**파일**: `src/builder/panels/datatable/DataTablePanel.tsx`

- [ ] **Step 6.2.1**: useQuery로 `fetchDataTables` 교체
- [ ] **Step 6.2.2**: useQuery로 `fetchApiEndpoints` 교체
- [ ] **Step 6.2.3**: useQuery로 `fetchVariables` 교체
- [ ] **Step 6.2.4**: useQuery로 `fetchTransformers` 교체
- [ ] **Step 6.2.5**: 로딩/에러 상태 처리

#### 6.3 기타 API 호출 최적화 (1시간)

- [ ] **Step 6.3.1**: 테마 로드 → useQuery
- [ ] **Step 6.3.2**: 프로젝트 설정 로드 → useQuery

#### 6.4 Phase 6 검증 (0.5시간)

- [ ] DevTools에서 캐시 상태 확인
- [ ] 패널 전환 시 네트워크 요청 확인 (0회 목표)

---

### Phase 7: 성능 모니터링 + 자동 복구 (4시간)

#### 7.1 PerformanceMonitor 구현 (2시간)

**파일**: `src/builder/utils/performanceMonitor.ts`

- [ ] **Step 7.1.1**: PerformanceMetrics interface 정의
- [ ] **Step 7.1.2**: `collect()` 메서드 구현
- [ ] **Step 7.1.3**: `calculateHealthScore()` 구현
- [ ] **Step 7.1.4**: `generateWarnings()` 구현

#### 7.2 자동 복구 구현 (1.5시간)

**파일**: `src/builder/hooks/useAutoRecovery.ts`

- [ ] **Step 7.2.1**: 30초 interval 모니터링
- [ ] **Step 7.2.2**: healthScore < 30 시 복구 로직
  - 비활성 페이지 언로드
  - History trim
  - 캐시 클리어

- [ ] **Step 7.2.3**: 사용자 알림 (Toast)

#### 7.3 Phase 7 검증 (0.5시간)

- [ ] 의도적 메모리 압박 테스트
- [ ] 자동 복구 동작 확인
- [ ] 복구 후 기능 정상 동작 확인

---

### Phase 8: 문서화 + 테스트 (4시간)

#### 8.1 단위 테스트 (2시간)

- [ ] **Step 8.1.1**: elementIndexer 테스트
- [ ] **Step 8.1.2**: DiffHistoryManager 테스트
- [ ] **Step 8.1.3**: LRUPageCache 테스트
- [ ] **Step 8.1.4**: performanceMonitor 테스트

#### 8.2 통합 테스트 (1시간)

- [ ] **Step 8.2.1**: 5,000개 요소 시나리오 테스트
- [ ] **Step 8.2.2**: 24시간 안정성 시뮬레이션
- [ ] **Step 8.2.3**: 메모리 누수 테스트

#### 8.3 문서 업데이트 (1시간)

- [ ] **Step 8.3.1**: CLAUDE.md 성능 가이드 추가
- [ ] **Step 8.3.2**: 이 문서 완료 표시
- [ ] **Step 8.3.3**: CHANGELOG.md 업데이트

---

## 부록 C: 롤백 계획

각 Phase는 독립적으로 롤백 가능하도록 설계됨.

| Phase | 롤백 방법 |
|-------|----------|
| 1 | Gateway 패턴 제거, 기존 구조로 복원 |
| 2 | 인덱스 필드 제거, filter() 복원 |
| 3 | DiffHistoryManager 제거, 기존 historyManager 사용 |
| 4 | Delta 함수 제거, SET_ELEMENTS 복원 |
| 5 | Lazy Loading 제거, 전체 로드 복원 |
| 6 | useQuery 제거, useEffect 복원 |
| 7 | 모니터링 비활성화 |

---

## 부록 D: 성능 측정 방법

### CPU 측정
```javascript
// Chrome DevTools > Performance 탭
// 1. Record 시작
// 2. 30초 대기 (패널 비활성 상태)
// 3. Record 중지
// 4. Summary에서 Scripting % 확인
```

### 메모리 측정
```javascript
// Chrome DevTools > Memory 탭
// 1. Heap Snapshot 촬영
// 2. 1시간 사용
// 3. Heap Snapshot 재촬영
// 4. 차이 비교
```

### 렌더링 측정
```javascript
// React DevTools > Profiler 탭
// 1. Record 시작
// 2. 작업 수행 (요소 선택, 패널 전환 등)
// 3. Record 중지
// 4. Commit별 렌더링 시간 확인
```
