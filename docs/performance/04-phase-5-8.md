# Phase 5-8: Lazy Loading, React Query, 모니터링, CI

> **관련 문서**: [03-phase-1-4.md](./03-phase-1-4.md) | [05-supplement.md](./05-supplement.md)
> **최종 수정**: 2025-12-10

---

## Phase 5: Lazy Loading + LRU 캐시

### 5.1 페이지별 Lazy Loading

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

    return data as Element[] ?? [];
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
  };

  return { loadPageElements, unloadPage };
}
```

### 5.2 LRU 캐시

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

  get size(): number {
    return this.accessOrder.length;
  }
}
```

### 5.3 메모리 관리 효과

| 시나리오 | 전체 로드 | LRU (5 pages) | 절감률 |
|----------|----------|---------------|--------|
| 50페이지 × 100요소 | ~100MB | ~10MB | **90%** |
| 페이지 전환 | 즉시 | ~50ms 로드 | 허용 |

---

## Phase 6: React Query 서버 상태 ✅ 구현 완료

### 6.1 설치

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### 6.2 Provider 설정

**파일**: `src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 30 * 60 * 1000,   // 30분
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 6.3 DataTablePanel 적용 ✅ (2025-12-10)

**파일**: `src/builder/panels/datatable/DataTablePanel.tsx`

#### 아키텍처

DataTablePanel은 **이중 데이터 소스** 구조를 사용:

1. **React Query** (`useDataPanelQuery`) - IndexedDB 캐싱, 중복 요청 방지
2. **Zustand Store** (`useDataStore`) - UI 렌더링용 메모리 상태, Canvas 동기화

```
┌─────────────────────────────────────────────────────────────┐
│                    DataTablePanel                           │
├─────────────────────────────────────────────────────────────┤
│  React Query (useDataPanelQuery)                            │
│  ├─ staleTime: 5분 캐싱                                     │
│  ├─ enabled: isActive && !!projectId                        │
│  └─ 중복 요청 자동 방지 (deduplication)                      │
├─────────────────────────────────────────────────────────────┤
│  Zustand Store (useDataStore)                               │
│  ├─ DataTableList가 구독 (UI 렌더링)                         │
│  ├─ Canvas 동기화 (postMessage)                             │
│  └─ CRUD mutations                                          │
└─────────────────────────────────────────────────────────────┘
```

#### 발견된 이슈 및 해결

**문제**: 페이지 새로고침 후 DataTable 목록이 비어있음 (IndexedDB에는 데이터 존재)

**원인**: React Query는 IndexedDB에서 데이터를 로드했지만, Zustand Store에는 동기화되지 않음

**해결**: 패널 활성화 시 Zustand Store 초기화 추가

```typescript
import { useState, useEffect, useRef } from "react";

export function DataTablePanel({ isActive }: PanelProps) {
  const { projectId } = useParams<{ projectId: string }>();

  // 초기 로딩 트래킹 - 프로젝트별로 한 번만 로드
  const initialLoadedRef = useRef<string | null>(null);

  // React Query - 캐싱 및 중복 요청 방지
  const { isLoading, refetch } = useDataPanelQuery(projectId, {
    enabled: isActive,
  });

  // Zustand Store 액션
  const fetchDataTables = useDataStore((state) => state.fetchDataTables);
  const fetchApiEndpoints = useDataStore((state) => state.fetchApiEndpoints);
  const fetchVariables = useDataStore((state) => state.fetchVariables);
  const fetchTransformers = useDataStore((state) => state.fetchTransformers);

  // 🆕 패널 활성화 시 IndexedDB → Zustand Store 동기화
  useEffect(() => {
    if (isActive && projectId && initialLoadedRef.current !== projectId) {
      console.log(`📥 [DataTablePanel] 초기 로딩: projectId=${projectId}`);
      initialLoadedRef.current = projectId;

      Promise.all([
        fetchDataTables(projectId),
        fetchApiEndpoints(projectId),
        fetchVariables(projectId),
        fetchTransformers(projectId),
      ]).then(() => {
        console.log(`✅ [DataTablePanel] Zustand Store 초기화 완료`);
      });
    }
  }, [isActive, projectId, fetchDataTables, fetchApiEndpoints, fetchVariables, fetchTransformers]);

  if (!isActive) return null;
  // ...
}
```

### 6.4 Request Manager (Deduplication + Abort)

**파일**: `src/services/api/RequestManager.ts`

```typescript
class RequestManager {
  private inFlight: Map<string, InFlightRequest> = new Map();
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  /**
   * 요청 실행 (deduplication + cache)
   */
  async execute<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const { retries = 3, backoff = [1000, 2000, 4000], cacheTTL } = config;

    // 1. 캐시 확인
    if (cacheTTL) {
      const cached = this.cache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
      }
    }

    // 2. In-flight 요청 확인 (deduplication)
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    // 3. 새 요청 생성
    const controller = new AbortController();
    const promise = this.executeWithRetry(fetcher, controller.signal, retries, backoff);

    this.inFlight.set(key, { promise, controller, timestamp: Date.now() });

    try {
      const result = await promise;
      if (cacheTTL) {
        this.cache.set(key, { data: result, expiry: Date.now() + cacheTTL });
      }
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * 특정 패턴의 요청 모두 취소 (패널 전환 시)
   */
  abortByPattern(pattern: string | RegExp): void {
    this.inFlight.forEach((request, key) => {
      const matches = typeof pattern === 'string'
        ? key.includes(pattern)
        : pattern.test(key);

      if (matches) {
        request.controller.abort();
        this.inFlight.delete(key);
      }
    });
  }
}

export const requestManager = new RequestManager();
```

### 6.5 효과

| 항목 | Before | After |
|------|--------|-------|
| 패널 전환 시 API | 4회 호출 | 0회 (캐시) |
| 캐시 히트율 | 0% | 90%+ |
| 에러 재시도 | 수동 | 자동 (지수 백오프) |
| 중복 요청 | 발생 | 방지 (deduplication) |
| 미사용 요청 | 지속 | 취소 (AbortController) |

---

## Phase 7: 성능 모니터링 + 자동 복구

### 7.1 성능 메트릭 수집

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
}
```

### 7.2 자동 복구

```typescript
function useAutoRecovery() {
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = performanceMonitor.collect();

      // 심각한 성능 저하 감지
      if (metrics.healthScore < 30) {
        console.warn('[AutoRecovery] Critical performance detected');

        // 1. 비활성 페이지 언로드
        const { unloadInactivePages } = useStore.getState();
        unloadInactivePages();

        // 2. 히스토리 정리
        const historyManager = getHistoryManager();
        historyManager.trim(50); // 최근 50개만 유지

        // 3. 캐시 클리어
        const { clearCaches } = useStore.getState();
        clearCaches();
      }
    }, 30000); // 30초마다 체크

    return () => clearInterval(interval);
  }, []);
}
```

### 7.3 Scoped Error Boundary

```tsx
export class ScopedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { name, onError } = this.props;

    console.error(`[ErrorBoundary:${name}]`, error, errorInfo);
    onError?.(error, errorInfo);

    // 자동 복구 시도
    if (this.props.autoRecover && this.state.retryCount < (this.props.maxRetries ?? 3)) {
      setTimeout(() => {
        this.setState((state) => ({
          hasError: false,
          error: null,
          retryCount: state.retryCount + 1,
        }));
      }, 1000 * Math.pow(2, this.state.retryCount)); // 지수 백오프
    }
  }
}
```

### 7.4 적용 범위

| 컴포넌트 | Error Boundary | Fail-soft | 복구 정책 |
|----------|---------------|-----------|----------|
| **패널** | PanelShell HOC | ✅ | 자동 3회 재시도 |
| **Canvas** | 별도 Boundary | Canvas 재로드 | 전체 동기화 |
| **Inspector** | PanelShell HOC | ✅ | 선택 해제 |
| **Header** | 별도 Boundary | 최소 UI | 새로고침 유도 |
| **저장** | 별도 처리 | SaveFailureRecovery | 백업 + 재시도 |

---

## Phase 8: CI 자동화 + 장시간 테스트

### 8.1 장시간 시뮬레이션 스크립트

**파일**: `scripts/long-session-test.ts`

```typescript
interface SimulationConfig {
  duration: number;       // 시뮬레이션 시간 (ms)
  elementCount: number;   // 요소 수
  pageCount: number;      // 페이지 수
  metricsInterval: number;// 메트릭 수집 간격 (ms)
}

async function runLongSessionSimulation(
  config: SimulationConfig
): Promise<SimulationResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--enable-precise-memory-info'],
  });

  const page = await browser.newPage();
  const metrics: PerformanceSnapshot[] = [];
  const sloViolations: SLOViolation[] = [];

  try {
    await page.goto('http://localhost:5173/builder/test-project');
    await createTestElements(page, config.elementCount, config.pageCount);

    const startTime = Date.now();
    while (Date.now() - startTime < config.duration) {
      await performRandomAction(page);

      if ((Date.now() - startTime) % config.metricsInterval < 100) {
        const snapshot = await collectMetrics(page);
        metrics.push(snapshot);

        const violations = checkSLOViolations(snapshot);
        sloViolations.push(...violations);
      }
    }

    return {
      duration: Date.now() - startTime,
      metrics,
      sloViolations,
      passed: sloViolations.filter(v => v.severity === 'critical').length === 0,
    };
  } finally {
    await browser.close();
  }
}
```

### 8.2 GitHub Actions Workflow

**파일**: `.github/workflows/performance.yml`

```yaml
name: Performance Regression Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 매일 새벽 2시 (주간 장시간 테스트)

jobs:
  # PR 테스트 (빠른 버전)
  quick-performance:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Run Quick Performance Test
        run: npm run test:perf -- --duration=5m --elements=1000

  # 주간 장시간 테스트
  long-session:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 780  # 13시간
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Run 12-Hour Simulation
        run: npm run test:perf -- --duration=12h --elements=5000
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: performance-report-${{ github.run_id }}
          path: |
            test-results/performance/
            test-results/heap-snapshots/
```

### 8.3 회귀 검출

```typescript
/**
 * 기준치 대비 회귀 검출
 */
function detectRegressions(
  current: PerformanceMetrics,
  baseline: PerformanceMetrics
): Regression[] {
  const regressions: Regression[] = [];
  const threshold = 0.2; // 20% 이상 악화 시 회귀로 판정

  // 메모리 회귀
  const memoryDiff = (current.browserHeapUsed - baseline.browserHeapUsed) / baseline.browserHeapUsed;
  if (memoryDiff > threshold) {
    regressions.push({
      metric: 'memory',
      baseline: baseline.browserHeapUsed,
      current: current.browserHeapUsed,
      change: memoryDiff,
      severity: memoryDiff > 0.5 ? 'critical' : 'warning',
    });
  }

  // 렌더링 시간 회귀
  const renderDiff = (current.avgRenderTime - baseline.avgRenderTime) / baseline.avgRenderTime;
  if (renderDiff > threshold) {
    regressions.push({
      metric: 'renderTime',
      baseline: baseline.avgRenderTime,
      current: current.avgRenderTime,
      change: renderDiff,
      severity: renderDiff > 0.5 ? 'critical' : 'warning',
    });
  }

  return regressions;
}
```

### 8.4 체크리스트

- [ ] 12시간 세션 안정성 테스트 통과
- [ ] 5,000개 요소 시나리오 테스트 통과
- [ ] 메모리 증가율 < 8MB/h
- [ ] P99 렌더링 < 100ms
- [ ] SLO 위반 0건

---

> **다음 문서**: [05-supplement.md](./05-supplement.md) - 보완 제안
