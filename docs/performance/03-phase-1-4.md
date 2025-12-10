# Phase 1-4: Panel, Store, History, Canvas

> **관련 문서**: [02-architecture.md](./02-architecture.md) | [04-phase-5-8.md](./04-phase-5-8.md)
> **최종 수정**: 2025-12-10

---

## Phase 1: Panel Gateway 패턴

### 1.1 올바른 패턴 (Good Pattern)

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

### 1.2 MonitorPanel 수정

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

### 1.3 useMemoryStats 수정

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

### 1.4 적용 대상 패널

| 패널 | 수정 내용 |
|------|----------|
| MonitorPanel | Gateway 패턴 + 훅 enabled 파라미터 |
| PropertiesPanel | Gateway 패턴 적용 |
| StylesPanel | Gateway 패턴 적용 |
| ComponentsPanel | Gateway 패턴 적용 |

### 1.5 공통 Panel Guard HOC

**파일**: `src/builder/panels/common/PanelShell.tsx`

```tsx
import { ComponentType, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface PanelShellOptions {
  name: string;
  suspense?: boolean;
  errorBoundary?: boolean;
}

export function withPanelShell<P extends { isActive: boolean }>(
  PanelContent: ComponentType<Omit<P, 'isActive'>>,
  options: PanelShellOptions
) {
  const { name, suspense = true, errorBoundary = true } = options;

  function PanelShell(props: P) {
    const { isActive, ...contentProps } = props;

    // 🛡️ Gateway 가드: 비활성 시 즉시 반환
    if (!isActive) {
      return null;
    }

    let content = <PanelContent {...(contentProps as Omit<P, 'isActive'>)} />;

    if (suspense) {
      content = (
        <Suspense fallback={<PanelFallback name={name} />}>
          {content}
        </Suspense>
      );
    }

    if (errorBoundary) {
      content = (
        <ErrorBoundary FallbackComponent={PanelErrorFallback}>
          {content}
        </ErrorBoundary>
      );
    }

    return content;
  }

  PanelShell.displayName = `PanelShell(${name})`;
  return PanelShell;
}
```

**사용 예시:**

```tsx
// After: HOC로 일괄 적용
function MonitorPanelContent() {
  const { stats } = useMemoryStats({ enabled: true });
  return <div>...</div>;
}

export const MonitorPanel = withPanelShell(MonitorPanelContent, {
  name: 'MonitorPanel',
  suspense: true,
  errorBoundary: true,
});
```

---

## Phase 2: Store 인덱스 시스템

### 2.1 현재 문제

```typescript
// 현재: O(n) 필터링 매번 실행
const currentPageElements = elements.filter(el => el.page_id === currentPageId);
// 5,000개 요소 → 매 렌더링마다 5,000번 순회
```

### 2.2 인덱스 구조

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

### 2.3 인덱스 자동 업데이트

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

  return { indexElement, getPageElements };
}
```

### 2.4 성능 비교

| 연산 | 현재 O(n) | 인덱스 후 | 개선율 |
|------|----------|----------|--------|
| 페이지 요소 조회 | 2ms (5,000개) | 0.01ms | **200x** |
| 자식 요소 조회 | 2ms | 0.01ms | **200x** |
| 요소 추가 | 0.1ms | 0.2ms | 2x 느림 (허용) |
| 요소 삭제 | 2ms | 0.1ms | **20x** |

---

## Phase 3: History Diff 시스템

### 3.1 현재 문제

```typescript
// 현재: 전체 스냅샷 저장
historyManager.push({
  elements: [...allElements],  // 5,000개 복사 = ~10MB
  timestamp: Date.now()
});

// 50회 Undo = 50 × 10MB = 500MB 메모리 사용!
```

### 3.2 Command Pattern + Diff 저장

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
}
```

### 3.3 메모리 비교

| 시나리오 | 현재 (스냅샷) | Diff 기반 | 절감률 |
|----------|-------------|-----------|--------|
| 5,000요소 × 100회 | ~500MB | ~3MB | **99.4%** |
| props 1개 변경 | ~10KB | ~300B | **97%** |
| 요소 이동 | ~10KB | ~200B | **98%** |

---

## Phase 4: Canvas Delta 업데이트

### 4.1 현재 문제

```typescript
// 현재: 변경마다 전체 요소 전송
postMessage({
  type: 'SET_ELEMENTS',
  elements: allPageElements  // 100개 × 2KB = 200KB
});
```

### 4.2 Delta Message 시스템

**파일**: `src/builder/hooks/useCanvasDeltaSync.ts`

```typescript
type DeltaType =
  | 'ELEMENT_ADD'
  | 'ELEMENT_UPDATE'
  | 'ELEMENT_DELETE'
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

  return {
    iframeRef,
    sendElementUpdate,
    sendElementAdd,
    sendElementDelete,
    sendFullSync
  };
}
```

### 4.3 Canvas Runtime 수신

**파일**: `src/canvas/hooks/useDeltaReceiver.ts`

```typescript
export function useDeltaReceiver() {
  const { updateElement, addElement, removeElement, setElements } = useRuntimeStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, deltas, elements } = event.data;

      switch (type) {
        case 'BATCH_DELTA':
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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
}
```

### 4.4 전송량 비교

| 작업 | 현재 | Delta | 절감률 |
|------|------|-------|--------|
| props 변경 | ~2KB | ~100B | **95%** |
| 요소 이동 | ~2KB | ~50B | **97%** |
| 연속 10회 변경 | ~20KB | ~1KB | **95%** |
| 페이지 전환 | ~200KB | ~200KB | 동일 |

### 4.5 Backpressure 정책

| 시나리오 | 큐 상태 | 정책 | 동작 |
|----------|--------|------|------|
| 정상 | < 80% | - | 메시지 정상 추가 |
| 경고 | 80-99% | 경고 로그 | SLO 모니터에 기록 |
| 포화 | 100% | drop-oldest | 오래된 low priority 제거 |
| 포화 + high | 100% | 우선 처리 | oldest normal 제거 후 추가 |
| 연속 동일 | 100% | debounce | 같은 타입 병합 |

---

> **다음 문서**: [04-phase-5-8.md](./04-phase-5-8.md) - Phase 5-8 구현 상세
