# 아키텍처 설계

> **관련 문서**: [01-problem-analysis.md](./01-problem-analysis.md) | [03-phase-1-4.md](./03-phase-1-4.md)
> **최종 수정**: 2025-12-10

---

## 1. 엔터프라이즈 아키텍처

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

---

## 2. 데이터 흐름

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

## 3. 레이어별 상세 설계

### 3.1 Data Layer

**정규화된 Store 구조:**

```typescript
interface NormalizedElementStore {
  // 정규화된 데이터 (ID를 키로 사용)
  byId: Map<string, Element>;

  // 인덱스 (조회 최적화)
  indices: {
    byPage: Map<string, Set<string>>;      // pageId → elementIds
    byParent: Map<string, Set<string>>;    // parentId → childIds
    byTag: Map<string, Set<string>>;       // tag → elementIds
    byCustomId: Map<string, string>;       // customId → elementId
    rootElements: Map<string, Set<string>>; // pageId → rootElementIds
  };

  // 메타데이터
  meta: {
    totalCount: number;
    loadedPages: Set<string>;
    lastUpdated: number;
  };
}
```

### 3.2 Memory Layer

**LRU 캐시 구현:**

```typescript
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // LRU: 접근 시 맨 뒤로 이동
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 가장 오래된 항목 제거
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// 페이지별 요소 캐시 (최대 5개 페이지)
const pageElementsCache = new LRUCache<string, Element[]>(5);
```

### 3.3 Sync Layer

**Delta 업데이트 흐름:**

```typescript
interface DeltaUpdate {
  type: 'add' | 'update' | 'delete';
  elementId: string;
  changes?: Partial<Element>;
  timestamp: number;
}

class SyncManager {
  private batchQueue: DeltaUpdate[] = [];
  private rafId: number | null = null;

  /**
   * 변경 사항을 큐에 추가하고 RAF로 배치 처리
   */
  queueUpdate(update: DeltaUpdate): void {
    this.batchQueue.push(update);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  /**
   * 큐의 모든 업데이트를 Canvas로 전송
   */
  private flush(): void {
    if (this.batchQueue.length === 0) return;

    const updates = this.batchQueue.splice(0);

    // Canvas에 배치로 전송
    iframe.contentWindow?.postMessage({
      type: 'DELTA_UPDATES',
      updates,
    }, '*');

    this.rafId = null;
  }
}
```

### 3.4 History Layer

**Diff 기반 히스토리:**

```typescript
interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;

  // Diff만 저장 (전체 스냅샷 대신)
  forward: DeltaUpdate[];  // redo용
  backward: DeltaUpdate[]; // undo용
}

class DiffHistory {
  private entries: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxEntries: number = 100;

  /**
   * 새 히스토리 엔트리 추가
   */
  push(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    // 현재 위치 이후의 엔트리 제거 (분기 방지)
    this.entries = this.entries.slice(0, this.currentIndex + 1);

    // 새 엔트리 추가
    this.entries.push({
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    });

    // 최대 개수 제한
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    } else {
      this.currentIndex++;
    }

    // IndexedDB에 비동기 저장
    this.persistToIndexedDB();
  }

  /**
   * Undo: backward diff 적용
   */
  undo(): DeltaUpdate[] | null {
    if (this.currentIndex < 0) return null;

    const entry = this.entries[this.currentIndex];
    this.currentIndex--;

    return entry.backward;
  }

  /**
   * Redo: forward diff 적용
   */
  redo(): DeltaUpdate[] | null {
    if (this.currentIndex >= this.entries.length - 1) return null;

    this.currentIndex++;
    const entry = this.entries[this.currentIndex];

    return entry.forward;
  }
}
```

---

## 4. 컴포넌트 간 통신

### 4.1 Builder ↔ Canvas 통신

```
┌─────────────────────┐                    ┌─────────────────────┐
│      Builder        │                    │       Canvas        │
│   (Parent Window)   │                    │      (iframe)       │
├─────────────────────┤                    ├─────────────────────┤
│                     │                    │                     │
│  Store Update       │                    │                     │
│       │             │                    │                     │
│       ▼             │   postMessage      │                     │
│  Delta Calculator   │──────────────────▶│  Message Handler    │
│       │             │  DELTA_UPDATES     │       │             │
│       │             │                    │       ▼             │
│       │             │                    │  Runtime Store      │
│       │             │                    │       │             │
│       │             │   postMessage      │       ▼             │
│  ACK Handler        │◀──────────────────│  Render Complete    │
│                     │  RENDER_COMPLETE   │                     │
│                     │                    │                     │
└─────────────────────┘                    └─────────────────────┘
```

### 4.2 메시지 타입 정의

```typescript
// Builder → Canvas
type BuilderToCanvasMessage =
  | { type: 'INIT_ELEMENTS'; elements: Element[] }
  | { type: 'DELTA_UPDATES'; updates: DeltaUpdate[] }
  | { type: 'SELECT_ELEMENT'; elementId: string }
  | { type: 'NAVIGATE_TO_PAGE'; pageSlug: string };

// Canvas → Builder
type CanvasToBuilderMessage =
  | { type: 'CANVAS_READY' }
  | { type: 'ELEMENTS_UPDATED_ACK' }
  | { type: 'ELEMENT_CLICKED'; elementId: string }
  | { type: 'COMPUTED_STYLES'; elementId: string; styles: CSSStyleDeclaration };
```

---

## 5. 성능 최적화 전략 요약

| 레이어 | 현재 문제 | 최적화 전략 | 예상 효과 |
|--------|----------|------------|----------|
| **Data** | O(n) 순회 | Multi-Index | 조회 200x ↑ |
| **Memory** | 무제한 증가 | LRU Cache + Auto GC | 메모리 70% ↓ |
| **Sync** | 전체 직렬화 | Delta Updates + Batch | 전송량 95% ↓ |
| **History** | 전체 스냅샷 | Diff Storage | 메모리 99% ↓ |

---

> **다음 문서**: [03-phase-1-4.md](./03-phase-1-4.md) - Phase 1-4 구현 상세
