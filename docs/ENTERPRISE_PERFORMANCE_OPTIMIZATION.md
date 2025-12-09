# XStudio Builder 통합 최적화 계획

> **작성일**: 2025-12-09
> **최종 수정**: 2025-12-09 (검토 피드백 반영)
> **목표**: 엔터프라이즈급 5,000개+ 요소, 12시간 안정 사용
> **범위**: Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리, 네트워크 정책

---

## 검토 피드백 반영 사항

| 피드백 | 반영 위치 | 상태 |
|--------|----------|------|
| 지표·예산 정의 필요 | 섹션 2.3 SLO 정의 | ✅ |
| 스토어 구독 가드 강화 | 섹션 4.5 공통 HOC/훅 | ✅ |
| 네트워크 호출 스로틀·캐싱 | 섹션 6.4 네트워크 정책 | ✅ |
| 캔버스 연계 안정성 | 섹션 7.5 Backpressure 정책 | ✅ |
| 에러/복구 시나리오 | 섹션 10.3 Error Boundary | ✅ |
| 검증·자동화 | 섹션 11 CI 자동화 | ✅ |
| 오픈 질문 | 섹션 14 결정 사항 | ✅ |

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
11. [Phase 8: CI 자동화 + 장시간 테스트](#11-phase-8-ci-자동화--장시간-테스트)
12. [구현 순서 및 예상 소요](#12-구현-순서-및-예상-소요)
13. [기대 효과](#13-기대-효과)
14. [결정 사항 (오픈 질문 해결)](#14-결정-사항-오픈-질문-해결)

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

### 2.3 SLO (Service Level Objectives) 정의

> **검토 피드백 반영**: 측정 기준 및 목표치 정량화

#### 2.3.1 메모리 SLO

| 지표 | 초기 (0h) | 4시간 | 8시간 | 12시간 | 경고 임계값 | 위험 임계값 |
|------|----------|-------|-------|--------|------------|------------|
| **JS Heap Used** | < 150MB | < 200MB | < 250MB | < 300MB | 350MB | 450MB |
| **Heap 증가율** | - | < 15MB/h | < 10MB/h | < 8MB/h | > 20MB/h | > 30MB/h |
| **Store 메모리** | < 50MB | < 60MB | < 70MB | < 80MB | 100MB | 150MB |
| **History 메모리** | < 5MB | < 8MB | < 10MB | < 15MB | 20MB | 30MB |

#### 2.3.2 상호작용 지연 SLO

| 작업 | P50 목표 | P95 목표 | P99 목표 | 측정 방법 |
|------|---------|---------|---------|----------|
| **요소 선택** | < 16ms | < 30ms | < 50ms | `performance.measure()` |
| **패널 전환** | < 50ms | < 100ms | < 150ms | Panel mount 시간 |
| **속성 변경** | < 30ms | < 50ms | < 100ms | Store update → render |
| **Undo/Redo** | < 50ms | < 100ms | < 200ms | History apply 시간 |
| **페이지 전환** | < 100ms | < 200ms | < 400ms | Lazy load + render |
| **Canvas 동기화** | < 32ms | < 50ms | < 100ms | postMessage 왕복 |

#### 2.3.3 프레임률 SLO

| 상황 | 최소 FPS | 목표 FPS | 측정 조건 |
|------|---------|---------|----------|
| **유휴 상태** | 30 | 60 | 아무 작업 없음 |
| **드래그 중** | 45 | 60 | 요소 드래그 |
| **스크롤 중** | 45 | 60 | 패널 스크롤 |
| **대량 작업** | 30 | 45 | 100개 요소 동시 업데이트 |

#### 2.3.4 네트워크 SLO

| 작업 | 최대 호출 수 | 캐시 히트율 | 재시도 정책 |
|------|------------|------------|------------|
| **패널 전환** | 0회 (캐시) | > 90% | - |
| **프로젝트 로드** | 3회 (pages, elements, settings) | - | 3회, 지수 백오프 |
| **요소 저장** | 배치 (5초 debounce) | - | 3회, 지수 백오프 |
| **실시간 동기화** | Supabase Realtime | - | 자동 재연결 |

#### 2.3.5 SLO 모니터링 구현

```typescript
// src/builder/utils/sloMonitor.ts
interface SLOMetrics {
  memory: {
    heapUsed: number;
    heapGrowthRate: number;
    storeMemory: number;
    historyMemory: number;
  };
  latency: {
    elementSelect: PercentileStats;
    panelSwitch: PercentileStats;
    propertyChange: PercentileStats;
    undoRedo: PercentileStats;
  };
  fps: {
    current: number;
    min: number;
    avg: number;
  };
}

interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  samples: number[];
}

class SLOMonitor {
  private metrics: SLOMetrics;
  private violations: SLOViolation[] = [];

  /**
   * 상호작용 지연 측정
   */
  measureLatency(operation: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;

    this.recordLatency(operation, duration);
    this.checkSLOViolation(operation, duration);
  }

  /**
   * SLO 위반 체크
   */
  private checkSLOViolation(operation: string, value: number): void {
    const thresholds = SLO_THRESHOLDS[operation];
    if (!thresholds) return;

    if (value > thresholds.p99) {
      this.violations.push({
        type: 'latency',
        operation,
        value,
        threshold: thresholds.p99,
        severity: 'critical',
        timestamp: Date.now(),
      });

      console.warn(`[SLO Violation] ${operation}: ${value}ms > ${thresholds.p99}ms (P99)`);
    }
  }

  /**
   * 12시간 회귀 테스트용 리포트
   */
  generateReport(): SLOReport {
    return {
      duration: this.getSessionDuration(),
      metrics: this.metrics,
      violations: this.violations,
      passed: this.violations.filter(v => v.severity === 'critical').length === 0,
    };
  }
}

export const sloMonitor = new SLOMonitor();
```

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
  // 🆕 Fix: Cross-platform timer type (ReturnType<typeof setInterval>)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 🆕 Fix: requestIdleCallback handle for proper cancellation
  const idleCallbackRef = useRef<number | null>(null);

  // 🆕 Fix: Ref pattern to avoid stale closure and infinite loop
  const collectStats = useCallback(() => {
    // ... 기존 로직
  }, []);

  // 🆕 Ref to access latest collectStats without triggering useEffect
  const collectStatsRef = useRef(collectStats);
  collectStatsRef.current = collectStats;

  useEffect(() => {
    // 🆕 enabled 체크
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (idleCallbackRef.current && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
      return;
    }

    // 🆕 Wrapper function using ref to access latest collectStats
    const runCollect = () => collectStatsRef.current();

    // 초기 수집
    if ("requestIdleCallback" in window) {
      idleCallbackRef.current = requestIdleCallback(runCollect);
    } else {
      runCollect();
    }

    // 주기적 수집
    intervalRef.current = setInterval(() => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(runCollect);
      } else {
        runCollect();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (idleCallbackRef.current && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackRef.current);
      }
    };
  }, [enabled, interval]); // 🆕 Fix: collectStats removed from deps (uses ref instead)

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

### 4.5 공통 Panel Guard HOC/훅

> **검토 피드백 반영**: `isActive`/`isVisible` 조건부 구독을 모든 패널에 일괄 적용하는 공통 훅 또는 HOC

#### 4.5.1 PanelShell HOC

**파일**: `src/builder/panels/common/PanelShell.tsx`

```tsx
import { ComponentType, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PanelFallback } from './PanelFallback';
import { PanelErrorFallback } from './PanelErrorFallback';

interface PanelShellOptions {
  /** 패널 이름 (디버깅용) */
  name: string;
  /** Suspense fallback 사용 여부 */
  suspense?: boolean;
  /** Error Boundary 사용 여부 */
  errorBoundary?: boolean;
}

interface PanelProps {
  isActive: boolean;
  [key: string]: unknown;
}

/**
 * 모든 패널에 일괄 적용하는 Gateway HOC
 *
 * 기능:
 * 1. isActive 가드 (비활성 시 null 반환)
 * 2. Error Boundary (에러 격리)
 * 3. Suspense (로딩 상태)
 * 4. 성능 측정 (SLO 모니터링)
 */
export function withPanelShell<P extends PanelProps>(
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

    // 성능 측정 시작
    const measureStart = performance.now();

    let content = (
      <PanelContent
        {...(contentProps as Omit<P, 'isActive'>)}
        onMount={() => {
          // SLO 측정: 패널 마운트 시간
          const mountTime = performance.now() - measureStart;
          sloMonitor.recordLatency('panelSwitch', mountTime);
        }}
      />
    );

    // Suspense 래핑
    if (suspense) {
      content = (
        <Suspense fallback={<PanelFallback name={name} />}>
          {content}
        </Suspense>
      );
    }

    // Error Boundary 래핑
    if (errorBoundary) {
      content = (
        <ErrorBoundary
          FallbackComponent={({ error, resetErrorBoundary }) => (
            <PanelErrorFallback
              name={name}
              error={error}
              onRetry={resetErrorBoundary}
            />
          )}
          onError={(error) => {
            console.error(`[PanelError] ${name}:`, error);
            // 에러 리포팅
          }}
        >
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

#### 4.5.2 사용 예시

```tsx
// Before: 각 패널마다 수동으로 isActive 체크
export function MonitorPanel({ isActive }: PanelProps) {
  const { stats } = useMemoryStats();  // ❌ 항상 실행
  if (!isActive) return null;
  return <div>...</div>;
}

// After: HOC로 일괄 적용
function MonitorPanelContent() {
  const { stats } = useMemoryStats({ enabled: true });  // ✅ 활성화 시에만 실행
  return <div>...</div>;
}

export const MonitorPanel = withPanelShell(MonitorPanelContent, {
  name: 'MonitorPanel',
  suspense: true,
  errorBoundary: true,
});
```

#### 4.5.3 조건부 구독 훅

**파일**: `src/builder/hooks/useConditionalSubscription.ts`

```typescript
import { useEffect, useRef } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';

interface ConditionalSubscriptionOptions<T> {
  /** 구독 활성화 조건 */
  enabled: boolean;
  /** 구독할 selector */
  selector: (state: T) => unknown;
  /** 변경 시 콜백 */
  onChange?: (value: unknown) => void;
  /** 비활성화 시 초기값으로 리셋 여부 */
  resetOnDisable?: boolean;
}

/**
 * 조건부 Store 구독 훅
 *
 * isActive=false 시 구독을 완전히 해제하여 불필요한 리렌더링 방지
 */
export function useConditionalSubscription<T>(
  store: UseBoundStore<StoreApi<T>>,
  options: ConditionalSubscriptionOptions<T>
) {
  const { enabled, selector, onChange, resetOnDisable = false } = options;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastValueRef = useRef<unknown>(null);

  useEffect(() => {
    if (!enabled) {
      // 비활성 시 구독 해제
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (resetOnDisable) {
        lastValueRef.current = null;
      }
      return;
    }

    // 활성 시 구독 등록
    unsubscribeRef.current = store.subscribe((state) => {
      const newValue = selector(state);
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange?.(newValue);
      }
    });

    // 초기값 설정
    lastValueRef.current = selector(store.getState());

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, store, selector, onChange, resetOnDisable]);

  return lastValueRef.current;
}
```

#### 4.5.4 PanelSlot 레이어 적용

**파일**: `src/builder/layout/PanelSlot.tsx`

```tsx
import { ReactNode, useMemo } from 'react';
import { usePanelStore } from '../stores/panelStore';

interface PanelSlotProps {
  /** 패널 슬롯 ID */
  slotId: string;
  /** 최소 너비 */
  minWidth?: number;
  /** 리사이즈 가능 여부 */
  resizable?: boolean;
  children: ReactNode;
}

/**
 * 패널 슬롯 컴포넌트
 *
 * PanelShell과 함께 사용하여 isActive 상태를 자동으로 주입
 */
export function PanelSlot({ slotId, minWidth, resizable, children }: PanelSlotProps) {
  // 현재 슬롯의 활성 패널 ID
  const activePanelId = usePanelStore((state) => state.activePanel[slotId]);

  // 패널에 isActive 주입
  const enhancedChildren = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      const panelId = child.props.panelId;
      const isActive = panelId === activePanelId;

      return React.cloneElement(child, { isActive });
    });
  }, [children, activePanelId]);

  return (
    <div
      className="panel-slot"
      style={{ minWidth }}
      data-slot-id={slotId}
      data-resizable={resizable}
    >
      {enhancedChildren}
    </div>
  );
}
```

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

### 7.5 메시지 큐 Backpressure 정책

> **검토 피드백 반영**: 메시지 큐 포화 시나리오 정의, backpressure 정책, dangling listener 제거

#### 7.5.1 Backpressure 설계

```typescript
// src/builder/hooks/useCanvasMessenger.ts
interface MessageQueueConfig {
  /** 최대 큐 크기 */
  maxQueueSize: number;
  /** 큐 포화 시 정책 */
  overflowPolicy: 'drop-oldest' | 'drop-newest' | 'debounce';
  /** debounce 간격 (ms) */
  debounceMs?: number;
  /** 경고 임계값 (%) */
  warningThreshold: number;
}

interface CanvasMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Canvas 메시지 큐 관리자 (Backpressure 적용)
 */
class CanvasMessageQueue {
  private queue: CanvasMessage[] = [];
  private config: MessageQueueConfig = {
    maxQueueSize: 100,
    overflowPolicy: 'drop-oldest',
    debounceMs: 16,  // ~60fps
    warningThreshold: 80,
  };

  private flushScheduled = false;
  private iframeRef: HTMLIFrameElement | null = null;

  /**
   * 메시지 추가 (with backpressure)
   */
  enqueue(message: Omit<CanvasMessage, 'id' | 'timestamp'>): void {
    const fullMessage: CanvasMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Backpressure 체크
    if (this.queue.length >= this.config.maxQueueSize) {
      this.handleOverflow(fullMessage);
      return;
    }

    // 경고 임계값 체크
    const usage = (this.queue.length / this.config.maxQueueSize) * 100;
    if (usage >= this.config.warningThreshold) {
      console.warn(`[CanvasQueue] Queue at ${usage.toFixed(0)}% capacity`);
      sloMonitor.recordWarning('canvasQueueNearFull', usage);
    }

    this.queue.push(fullMessage);
    this.scheduleFlush();
  }

  /**
   * 오버플로우 처리
   */
  private handleOverflow(message: CanvasMessage): void {
    switch (this.config.overflowPolicy) {
      case 'drop-oldest':
        // 가장 오래된 low priority 메시지 제거
        const oldestLowIdx = this.queue.findIndex(m => m.priority === 'low');
        if (oldestLowIdx !== -1) {
          this.queue.splice(oldestLowIdx, 1);
          this.queue.push(message);
        } else if (message.priority === 'high') {
          // high priority면 oldest normal 제거
          this.queue.shift();
          this.queue.push(message);
        }
        // low priority 메시지는 드롭
        break;

      case 'drop-newest':
        // 새 메시지 드롭 (high priority 제외)
        if (message.priority === 'high') {
          this.queue.shift();
          this.queue.push(message);
        }
        break;

      case 'debounce':
        // 같은 타입의 메시지 병합
        const existingIdx = this.queue.findIndex(m => m.type === message.type);
        if (existingIdx !== -1) {
          this.queue[existingIdx] = message;
        }
        break;
    }

    sloMonitor.recordWarning('canvasQueueOverflow', {
      policy: this.config.overflowPolicy,
      messageType: message.type,
    });
  }

  /**
   * RAF 기반 배치 전송
   */
  private scheduleFlush(): void {
    if (this.flushScheduled || !this.iframeRef?.contentWindow) return;

    this.flushScheduled = true;
    requestAnimationFrame(() => {
      this.flush();
      this.flushScheduled = false;
    });
  }

  /**
   * 큐 전송
   */
  private flush(): void {
    if (this.queue.length === 0 || !this.iframeRef?.contentWindow) return;

    // Priority 정렬 (high → normal → low)
    const sorted = [...this.queue].sort((a, b) => {
      const priority = { high: 0, normal: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });

    try {
      this.iframeRef.contentWindow.postMessage({
        type: 'BATCH_MESSAGES',
        messages: sorted,
      }, '*');

      this.queue = [];
    } catch (error) {
      console.error('[CanvasQueue] Failed to post message:', error);
    }
  }

  /**
   * iframe 참조 설정
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframeRef = iframe;
  }

  /**
   * 큐 클리어 (페이지 전환 시)
   */
  clear(): void {
    this.queue = [];
    this.flushScheduled = false;
  }

  /**
   * 큐 상태 조회
   */
  getStatus(): { size: number; capacity: number; usage: number } {
    return {
      size: this.queue.length,
      capacity: this.config.maxQueueSize,
      usage: (this.queue.length / this.config.maxQueueSize) * 100,
    };
  }
}

export const canvasMessageQueue = new CanvasMessageQueue();
```

#### 7.5.2 Dangling Listener 제거 체크리스트

```typescript
// src/builder/hooks/useCanvasListenerCleanup.ts
import { useEffect, useRef } from 'react';

interface ListenerRecord {
  type: string;
  handler: EventListener;
  target: EventTarget;
  timestamp: number;
}

/**
 * Canvas 관련 리스너 클린업 훅
 *
 * 체크 항목:
 * 1. iframe message 리스너
 * 2. resize observer
 * 3. mutation observer
 * 4. postMessage 응답 리스너
 */
export function useCanvasListenerCleanup() {
  const listenersRef = useRef<ListenerRecord[]>([]);

  /**
   * 리스너 등록 (추적용)
   */
  const trackListener = (
    target: EventTarget,
    type: string,
    handler: EventListener
  ) => {
    target.addEventListener(type, handler);
    listenersRef.current.push({
      type,
      handler,
      target,
      timestamp: Date.now(),
    });
  };

  /**
   * 모든 리스너 제거
   */
  const cleanupAllListeners = () => {
    listenersRef.current.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    listenersRef.current = [];
  };

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      cleanupAllListeners();

      // 추가 정리
      canvasMessageQueue.clear();
    };
  }, []);

  return { trackListener, cleanupAllListeners };
}
```

#### 7.5.3 iframe 재로딩/프로젝트 전환 체크리스트

```typescript
// src/builder/hooks/useCanvasLifecycle.ts
export function useCanvasLifecycle(projectId: string, pageId: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { cleanupAllListeners, trackListener } = useCanvasListenerCleanup();

  /**
   * 프로젝트/페이지 전환 시 정리
   */
  useEffect(() => {
    return () => {
      // 1. 메시지 큐 클리어
      canvasMessageQueue.clear();

      // 2. pending 요청 취소
      requestManager.abortByPattern(/^canvas:/);

      // 3. 리스너 정리
      cleanupAllListeners();

      // 4. iframe 상태 리셋
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [projectId, pageId]);

  /**
   * iframe 로드 완료 핸들러
   */
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    // 메시지 큐에 iframe 참조 설정
    canvasMessageQueue.setIframe(iframeRef.current);

    // 응답 리스너 등록 (추적)
    trackListener(window, 'message', handleCanvasMessage);
  }, []);

  return { iframeRef, handleIframeLoad };
}
```

#### 7.5.4 Backpressure 정책 요약

| 시나리오 | 큐 상태 | 정책 | 동작 |
|----------|--------|------|------|
| 정상 | < 80% | - | 메시지 정상 추가 |
| 경고 | 80-99% | 경고 로그 | SLO 모니터에 기록 |
| 포화 | 100% | drop-oldest | 오래된 low priority 제거 |
| 포화 + high | 100% | 우선 처리 | oldest normal 제거 후 추가 |
| 연속 동일 | 100% | debounce | 같은 타입 병합 |

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
      staleTime: 5 * 60 * 1000, // 5분 - 데이터가 신선한 것으로 간주되는 시간
      gcTime: 30 * 60 * 1000,   // 30분 - 비활성 쿼리가 캐시에서 제거되기까지의 시간 (React Query v5: cacheTime → gcTime 변경)
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

### 9.4 네트워크 정책 (Request Deduplication + Abort)

> **검토 피드백 반영**: request deduplication(in-flight map)과 메모리 캐시 TTL, AbortController 적용

#### 9.4.1 Request Manager

**파일**: `src/services/api/RequestManager.ts`

```typescript
interface RequestConfig {
  /** 요청 식별자 */
  key: string;
  /** AbortController (선택) */
  signal?: AbortSignal;
  /** 재시도 횟수 */
  retries?: number;
  /** 백오프 설정 (ms) */
  backoff?: number[];
  /** 캐시 TTL (ms) */
  cacheTTL?: number;
}

interface InFlightRequest {
  promise: Promise<unknown>;
  controller: AbortController;
  timestamp: number;
}

/**
 * Request Deduplication + Abort 관리자
 *
 * 기능:
 * 1. 동일 요청 중복 방지 (in-flight deduplication)
 * 2. 미사용 요청 취소 (AbortController)
 * 3. 지수 백오프 재시도
 * 4. 메모리 캐시 + TTL
 */
class RequestManager {
  private inFlight: Map<string, InFlightRequest> = new Map();
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private defaultBackoff = [1000, 2000, 4000]; // 1s, 2s, 4s

  /**
   * 요청 실행 (deduplication + cache)
   */
  async execute<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const { retries = 3, backoff = this.defaultBackoff, cacheTTL } = config;

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

    this.inFlight.set(key, {
      promise,
      controller,
      timestamp: Date.now(),
    });

    try {
      const result = await promise;

      // 4. 캐시 저장
      if (cacheTTL) {
        this.cache.set(key, {
          data: result,
          expiry: Date.now() + cacheTTL,
        });
      }

      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * 지수 백오프 재시도
   */
  private async executeWithRetry<T>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal,
    retries: number,
    backoff: number[]
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetcher(signal);
      } catch (error) {
        if (signal.aborted) {
          throw new Error('Request aborted');
        }

        lastError = error as Error;

        if (attempt < retries) {
          const delay = backoff[Math.min(attempt, backoff.length - 1)];
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 특정 키의 요청 취소
   */
  abort(key: string): void {
    const request = this.inFlight.get(key);
    if (request) {
      request.controller.abort();
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

  /**
   * 캐시 무효화
   */
  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 만료된 캐시 정리
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    this.cache.forEach((value, key) => {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    });
  }
}

export const requestManager = new RequestManager();
```

#### 9.4.2 패널 전환 시 요청 취소

```typescript
// src/builder/panels/datatable/DataTablePanel.tsx
import { useEffect } from 'react';
import { requestManager } from '../../../services/api/RequestManager';

function DataTablePanelContent({ projectId }: { projectId: string }) {
  // 패널 언마운트 시 미완료 요청 취소
  useEffect(() => {
    return () => {
      // DataTable 관련 모든 요청 취소
      requestManager.abortByPattern(/^dataTable:/);
    };
  }, []);

  // React Query with AbortController
  const { data: dataTables } = useQuery({
    queryKey: ['dataTables', projectId],
    queryFn: ({ signal }) => requestManager.execute(
      `dataTable:tables:${projectId}`,
      (sig) => fetchDataTables(projectId, sig),
      { cacheTTL: 5 * 60 * 1000 }  // 5분 캐시
    ),
  });

  // ...
}
```

#### 9.4.3 Supabase 호출 표준화

```typescript
// src/services/api/SupabaseService.ts
import { supabase } from '../../lib/supabase';
import { requestManager } from './RequestManager';

export const SupabaseService = {
  /**
   * 요소 로드 (with deduplication + retry)
   */
  async loadElements(pageId: string, signal?: AbortSignal) {
    return requestManager.execute(
      `elements:${pageId}`,
      async (sig) => {
        const { data, error } = await supabase
          .from('elements')
          .select('*')
          .eq('page_id', pageId)
          .order('order_num')
          .abortSignal(sig);

        if (error) throw error;
        return data;
      },
      { retries: 3, cacheTTL: 0 }  // 캐시 없음 (실시간 동기화)
    );
  },

  /**
   * 요소 저장 (with debounce)
   */
  async saveElements(elements: Element[]) {
    return requestManager.execute(
      `save:elements`,
      async () => {
        const { error } = await supabase
          .from('elements')
          .upsert(elements);

        if (error) throw error;
      },
      { retries: 3 }
    );
  },
};
```

### 9.5 효과

| 항목 | Before | After |
|------|--------|-------|
| 패널 전환 시 API | 4회 호출 | 0회 (캐시) |
| 캐시 히트율 | 0% | 90%+ |
| 에러 재시도 | 수동 | 자동 (지수 백오프) |
| 중복 요청 | 발생 | 방지 (deduplication) |
| 미사용 요청 | 지속 | 취소 (AbortController) |

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
    // 🆕 Fix: Cross-platform timer type
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
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
        // 🆕 Fix: Type-safe gc() call using globalThis
        if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
          (globalThis as { gc: () => void }).gc();
        }
      }
    }, 30000); // 30초마다 체크

    return () => clearInterval(interval);
  }, []);
}
```

### 10.3 Scoped Error Boundary + Fail-soft UI

> **검토 피드백 반영**: 패널 단위 오류 시 빌더 전체로 전파되지 않도록 에러 격리 및 복구 UI

#### 10.3.1 Scoped Error Boundary

**파일**: `src/builder/components/ScopedErrorBoundary.tsx`

```tsx
import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** 컴포넌트 이름 (에러 리포팅용) */
  name: string;
  /** 에러 발생 시 표시할 fallback UI */
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  /** 에러 발생 시 콜백 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 복구 시도 최대 횟수 */
  maxRetries?: number;
  /** 자동 복구 시도 여부 */
  autoRecover?: boolean;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 스코프 기반 에러 바운더리
 *
 * 특징:
 * 1. 패널/컴포넌트 단위 에러 격리
 * 2. 자동 복구 시도
 * 3. 에러 리포팅
 * 4. 사용자 친화적 fallback UI
 */
export class ScopedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    maxRetries: 3,
    autoRecover: true,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { name, onError } = this.props;

    // 에러 로깅
    console.error(`[ErrorBoundary:${name}]`, error, errorInfo);

    // 에러 리포팅 (Sentry 등)
    onError?.(error, errorInfo);

    // SLO 기록
    sloMonitor.recordError('componentError', {
      component: name,
      error: error.message,
      stack: errorInfo.componentStack,
    });

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

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, name } = this.props;

    if (hasError && error) {
      // 커스텀 fallback
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.handleReset });
      }

      if (fallback) {
        return fallback;
      }

      // 기본 fallback
      return (
        <FailSoftUI
          name={name}
          error={error}
          onRetry={this.handleReset}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries ?? 3}
        />
      );
    }

    return children;
  }
}
```

#### 10.3.2 Fail-soft UI

**파일**: `src/builder/components/FailSoftUI.tsx`

```tsx
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/builder/components/Button';

interface FailSoftUIProps {
  name: string;
  error: Error;
  onRetry: () => void;
  retryCount: number;
  maxRetries: number;
}

/**
 * 에러 발생 시 표시되는 Fail-soft UI
 *
 * 특징:
 * 1. 사용자 친화적 메시지
 * 2. 재시도 버튼
 * 3. 에러 세부정보 (개발 모드)
 * 4. 빌더 전체 동작은 유지
 */
export function FailSoftUI({
  name,
  error,
  onRetry,
  retryCount,
  maxRetries,
}: FailSoftUIProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <div className="fail-soft-container">
      <div className="fail-soft-content">
        <AlertTriangle className="fail-soft-icon" />

        <h3 className="fail-soft-title">
          {name} 로딩 중 문제가 발생했습니다
        </h3>

        <p className="fail-soft-message">
          일시적인 오류입니다. 재시도하거나 페이지를 새로고침해 주세요.
        </p>

        {canRetry && (
          <Button
            variant="primary"
            onPress={onRetry}
            className="fail-soft-retry"
          >
            <RefreshCw className="icon" />
            재시도 ({retryCount}/{maxRetries})
          </Button>
        )}

        {!canRetry && (
          <p className="fail-soft-exhausted">
            재시도 횟수를 초과했습니다. 페이지를 새로고침해 주세요.
          </p>
        )}

        {/* 개발 모드: 에러 세부정보 */}
        {import.meta.env.DEV && (
          <details className="fail-soft-details">
            <summary>에러 세부정보</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
```

#### 10.3.3 저장 실패 복구 UI

**파일**: `src/builder/components/SaveFailureRecovery.tsx`

```tsx
import { useState, useCallback } from 'react';
import { AlertCircle, Save, Download } from 'lucide-react';
import { Button } from '@/builder/components/Button';

interface SaveFailureRecoveryProps {
  error: Error;
  pendingChanges: unknown[];
  onRetry: () => Promise<void>;
  onDownloadBackup: () => void;
}

/**
 * 저장 실패 시 복구 UI
 *
 * 기능:
 * 1. 재시도 버튼 (지수 백오프)
 * 2. 로컬 백업 다운로드
 * 3. 변경사항 개수 표시
 * 4. 오프라인 감지
 */
export function SaveFailureRecovery({
  error,
  pendingChanges,
  onRetry,
  onDownloadBackup,
}: SaveFailureRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await onRetry();
      setRetryCount(0);
    } catch {
      setRetryCount((c) => c + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  const isOffline = !navigator.onLine;

  return (
    <div className="save-failure-container">
      <div className="save-failure-header">
        <AlertCircle className="save-failure-icon" />
        <span>저장 실패</span>
      </div>

      <p className="save-failure-message">
        {isOffline
          ? '오프라인 상태입니다. 인터넷 연결을 확인해 주세요.'
          : '변경사항을 저장하지 못했습니다.'}
      </p>

      <p className="save-failure-count">
        미저장 변경사항: <strong>{pendingChanges.length}개</strong>
      </p>

      <div className="save-failure-actions">
        <Button
          variant="primary"
          onPress={handleRetry}
          isDisabled={isRetrying || isOffline}
        >
          {isRetrying ? (
            <>저장 중...</>
          ) : (
            <>
              <Save className="icon" />
              재시도 {retryCount > 0 && `(${retryCount})`}
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          onPress={onDownloadBackup}
        >
          <Download className="icon" />
          백업 다운로드
        </Button>
      </div>

      {import.meta.env.DEV && (
        <details className="save-failure-details">
          <summary>에러 세부정보</summary>
          <pre>{error.message}</pre>
        </details>
      )}
    </div>
  );
}
```

#### 10.3.4 적용 범위

| 컴포넌트 | Error Boundary | Fail-soft | 복구 정책 |
|----------|---------------|-----------|----------|
| **패널** | PanelShell HOC | ✅ | 자동 3회 재시도 |
| **Canvas** | 별도 Boundary | Canvas 재로드 | 전체 동기화 |
| **Inspector** | PanelShell HOC | ✅ | 선택 해제 |
| **Header** | 별도 Boundary | 최소 UI | 새로고침 유도 |
| **저장** | 별도 처리 | SaveFailureRecovery | 백업 + 재시도 |

---

## 11. Phase 8: CI 자동화 + 장시간 테스트

> **검토 피드백 반영**: 장시간 시뮬레이션 스크립트, CI 아티팩트, 회귀 검출

### 11.1 장시간 시뮬레이션 스크립트

**파일**: `scripts/long-session-test.ts`

```typescript
import puppeteer from 'puppeteer';

interface SimulationConfig {
  /** 시뮬레이션 시간 (ms) */
  duration: number;
  /** 요소 수 */
  elementCount: number;
  /** 페이지 수 */
  pageCount: number;
  /** 메트릭 수집 간격 (ms) */
  metricsInterval: number;
  /** 스냅샷 저장 간격 (ms) */
  snapshotInterval: number;
}

interface SimulationResult {
  duration: number;
  metrics: PerformanceSnapshot[];
  sloViolations: SLOViolation[];
  passed: boolean;
}

/**
 * 장시간 세션 시뮬레이션
 */
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
    // 1. 빌더 로드
    await page.goto('http://localhost:5173/builder/test-project');
    await page.waitForSelector('[data-testid="builder-ready"]');

    // 2. 테스트 데이터 생성
    await createTestElements(page, config.elementCount, config.pageCount);

    // 3. 시뮬레이션 루프
    const startTime = Date.now();
    let snapshotCount = 0;

    while (Date.now() - startTime < config.duration) {
      // 랜덤 작업 수행
      await performRandomAction(page);

      // 메트릭 수집
      if ((Date.now() - startTime) % config.metricsInterval < 100) {
        const snapshot = await collectMetrics(page);
        metrics.push(snapshot);

        // SLO 체크
        const violations = checkSLOViolations(snapshot);
        sloViolations.push(...violations);
      }

      // 힙 스냅샷 (선택적)
      if ((Date.now() - startTime) % config.snapshotInterval < 100) {
        await saveHeapSnapshot(page, `snapshot-${snapshotCount++}.heapsnapshot`);
      }

      // 짧은 대기
      await page.waitForTimeout(100);
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

/**
 * 랜덤 작업 수행
 */
async function performRandomAction(page: puppeteer.Page): Promise<void> {
  const actions = [
    // 요소 선택
    async () => {
      const elements = await page.$$('[data-element-id]');
      if (elements.length > 0) {
        const randomEl = elements[Math.floor(Math.random() * elements.length)];
        await randomEl.click();
      }
    },
    // 패널 전환
    async () => {
      const tabs = await page.$$('[data-panel-tab]');
      if (tabs.length > 0) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        await randomTab.click();
      }
    },
    // 속성 변경
    async () => {
      const inputs = await page.$$('[data-property-input]');
      if (inputs.length > 0) {
        const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
        await randomInput.type('test', { delay: 50 });
      }
    },
    // Undo/Redo
    async () => {
      await page.keyboard.down('Meta');
      await page.keyboard.press(Math.random() > 0.5 ? 'z' : 'y');
      await page.keyboard.up('Meta');
    },
    // 페이지 전환
    async () => {
      const pages = await page.$$('[data-page-item]');
      if (pages.length > 0) {
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        await randomPage.click();
      }
    },
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  await action();
}

/**
 * 메트릭 수집
 */
async function collectMetrics(page: puppeteer.Page): Promise<PerformanceSnapshot> {
  return await page.evaluate(() => {
    const memory = (performance as any).memory;
    return {
      timestamp: Date.now(),
      heapUsed: memory?.usedJSHeapSize ?? 0,
      heapTotal: memory?.totalJSHeapSize ?? 0,
      heapLimit: memory?.jsHeapSizeLimit ?? 0,
      fps: window.__builderMetrics?.fps ?? 0,
      renderTime: window.__builderMetrics?.lastRenderTime ?? 0,
      elementCount: window.__builderMetrics?.elementCount ?? 0,
    };
  });
}

// 실행
runLongSessionSimulation({
  duration: 12 * 60 * 60 * 1000, // 12시간
  elementCount: 5000,
  pageCount: 50,
  metricsInterval: 60 * 1000, // 1분
  snapshotInterval: 30 * 60 * 1000, // 30분
}).then(result => {
  console.log('Simulation complete:', result.passed ? 'PASSED' : 'FAILED');
  console.log(`Duration: ${result.duration / 1000 / 60} minutes`);
  console.log(`Metrics collected: ${result.metrics.length}`);
  console.log(`SLO violations: ${result.sloViolations.length}`);

  // 결과 저장
  fs.writeFileSync(
    'test-results/long-session-result.json',
    JSON.stringify(result, null, 2)
  );

  process.exit(result.passed ? 0 : 1);
});
```

### 11.2 CI 파이프라인 설정

**파일**: `.github/workflows/performance-test.yml`

```yaml
name: Performance Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # 매일 새벽 2시 실행
    - cron: '0 2 * * *'

jobs:
  performance-test:
    runs-on: ubuntu-latest
    timeout-minutes: 180 # 3시간

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Start server
        run: npm run preview &
        env:
          PORT: 5173

      - name: Wait for server
        run: npx wait-on http://localhost:5173

      - name: Run short performance test (PR)
        if: github.event_name == 'pull_request'
        run: npm run test:perf:short
        # 30분 시뮬레이션

      - name: Run long performance test (Nightly)
        if: github.event_name == 'schedule'
        run: npm run test:perf:long
        # 12시간 시뮬레이션

      - name: Upload metrics artifact
        uses: actions/upload-artifact@v4
        with:
          name: performance-metrics
          path: test-results/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const result = JSON.parse(fs.readFileSync('test-results/perf-summary.json'));

            const body = `## Performance Test Results

            | Metric | Value | Status |
            |--------|-------|--------|
            | Duration | ${result.duration}min | - |
            | Memory Growth | ${result.memoryGrowth}MB/h | ${result.memoryGrowth < 20 ? '✅' : '⚠️'} |
            | Avg Render Time | ${result.avgRenderTime}ms | ${result.avgRenderTime < 50 ? '✅' : '⚠️'} |
            | SLO Violations | ${result.sloViolations} | ${result.sloViolations === 0 ? '✅' : '❌'} |

            **Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}**
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Fail if SLO violated
        run: |
          if [ -f "test-results/perf-summary.json" ]; then
            PASSED=$(jq '.passed' test-results/perf-summary.json)
            if [ "$PASSED" != "true" ]; then
              echo "Performance test failed"
              exit 1
            fi
          fi
```

### 11.3 메트릭 추세 추적

**파일**: `scripts/track-metrics.ts`

```typescript
import { Octokit } from '@octokit/rest';

interface MetricTrend {
  date: string;
  commit: string;
  memoryGrowth: number;
  avgRenderTime: number;
  sloViolations: number;
}

/**
 * 메트릭 추세 추적 및 알림
 */
async function trackMetrics(): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // 최근 30일 아티팩트에서 메트릭 수집
  const artifacts = await octokit.rest.actions.listArtifactsForRepo({
    owner: 'your-org',
    repo: 'xstudio',
    per_page: 30,
    name: 'performance-metrics',
  });

  const trends: MetricTrend[] = [];

  for (const artifact of artifacts.data.artifacts) {
    // 아티팩트 다운로드 및 파싱
    const data = await downloadAndParseArtifact(artifact);
    trends.push(data);
  }

  // 추세 분석
  const analysis = analyzeTrends(trends);

  // 회귀 감지
  if (analysis.regression) {
    await sendSlackAlert({
      title: '⚠️ Performance Regression Detected',
      message: analysis.regressionDetails,
      severity: 'warning',
    });
  }

  // 대시보드 업데이트
  await updateDashboard(trends, analysis);
}

/**
 * 추세 분석
 */
function analyzeTrends(trends: MetricTrend[]): TrendAnalysis {
  const recentTrends = trends.slice(0, 7); // 최근 7일
  const oldTrends = trends.slice(7, 14); // 이전 7일

  const recentAvg = {
    memoryGrowth: average(recentTrends.map(t => t.memoryGrowth)),
    renderTime: average(recentTrends.map(t => t.avgRenderTime)),
  };

  const oldAvg = {
    memoryGrowth: average(oldTrends.map(t => t.memoryGrowth)),
    renderTime: average(oldTrends.map(t => t.avgRenderTime)),
  };

  // 20% 이상 악화 시 회귀로 판단
  const regression =
    recentAvg.memoryGrowth > oldAvg.memoryGrowth * 1.2 ||
    recentAvg.renderTime > oldAvg.renderTime * 1.2;

  return {
    regression,
    regressionDetails: regression
      ? `Memory: ${oldAvg.memoryGrowth} → ${recentAvg.memoryGrowth} MB/h, Render: ${oldAvg.renderTime} → ${recentAvg.renderTime} ms`
      : null,
    recentAvg,
    oldAvg,
  };
}
```

---

## 12. 구현 순서 및 예상 소요

> **검토 피드백 반영**: P0 → P2 우선순위 재정렬

### 12.1 P0 우선 작업 (즉시 시작)

| Phase | 작업 | 예상 소요 | 효과 |
|-------|------|----------|------|
| **1** | Panel Gateway + MonitorPanel | 6시간 | CPU 70% ↓ |
| **1** | PanelShell HOC 표준화 | 2시간 | 코드 일관성 |
| **6** | Request Deduplication + Abort | 4시간 | 네트워크 안정화 |
| **4** | Canvas Backpressure 설계 | 3시간 | 메시지 큐 안정화 |

**P0 소요: 15시간 (약 2일)**

### 12.2 P1 핵심 최적화

| Phase | 작업 | 예상 소요 | 효과 |
|-------|------|----------|------|
| **2** | Store 인덱스 시스템 | 8시간 | 조회 200x ↑ |
| **3** | History Diff + IndexedDB | 8시간 | 메모리 97% ↓ |
| **7** | Error Boundary 스코프 적용 | 3시간 | 에러 격리 |
| **7** | 성능 모니터링 + 자동복구 | 4시간 | 안정성 확보 |

**P1 소요: 23시간 (약 3일)**

### 12.3 P2 대규모 최적화 + CI

| Phase | 작업 | 예상 소요 | 효과 |
|-------|------|----------|------|
| **4** | Canvas Delta + Batch | 4시간 | 전송량 95% ↓ |
| **5** | Lazy Loading + LRU | 6시간 | 초기로드 70% ↓ |
| **6** | React Query 전체 적용 | 4시간 | API 캐시 90% ↑ |
| **8** | 장시간 시뮬레이션 CI | 6시간 | 회귀 검출 |

**P2 소요: 20시간 (약 2.5일)**

### 12.4 총 소요 예상

| 우선순위 | 예상 소요 | 누적 |
|----------|----------|------|
| P0 | 15시간 | 15시간 |
| P1 | 23시간 | 38시간 |
| P2 | 20시간 | **58시간 (~7.5일)** |

**권장 실행 순서**:
1. P0 완료 후 성능 측정 (CPU, 네트워크 안정화 검증)
2. P1 완료 후 12시간 시뮬레이션 테스트
3. P2 완료 후 24시간 Nightly 테스트 도입

---

## 13. 기대 효과

### 13.1 성능 개선 요약

| 지표 | 현재 | 최적화 후 | 개선율 |
|------|------|----------|--------|
| **페이지 요소 조회** | O(n) 2ms | O(1) 0.01ms | **200x** |
| **History 메모리** | 500MB | 3MB | **99%** |
| **Canvas 전송량** | 200KB | 1KB | **95%** |
| **메모리 (24시간)** | 200MB+ | < 50MB | **75%** |
| **CPU (유휴)** | 15-25% | < 5% | **80%** |
| **API 호출** | 매번 | 캐시 히트 | **90%** |

### 13.2 안정성 목표 달성

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

### 13.3 지원 규모

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

---

## 부록 E: 결정 사항 (오픈 질문 해결)

> **검토 피드백 반영**: 오픈 질문에 대한 명확한 결정 사항

### E.1 장시간 세션 기준

**결정**: **12시간** 기준 적용

| 기준 | 값 | 근거 |
|------|---|------|
| **Primary Target** | 12시간 | 엔터프라이즈 업무일 기준 (오전 9시 ~ 오후 9시) |
| **Extended Target** | 24시간 | 야간 작업 시나리오 대응 |
| **SLO 측정 시점** | 0h, 4h, 8h, 12h | 4시간 간격 체크포인트 |
| **자동 복구 트리거** | healthScore < 30 | 성능 저하 시 자동 대응 |

**멀티 프로젝트 전환**:
- 측정 **포함** (프로젝트 전환 시 메모리 누수 감지 필요)
- 전환 시 이전 프로젝트 리소스 정리 검증

### E.2 브라우저별 분리 추적

**결정**: **Chrome (Chromium) 우선**, 점진적 확대

| 브라우저 | 우선순위 | 테스트 범위 |
|----------|---------|------------|
| **Chrome** | P0 | 12시간 Nightly, PR 30분 |
| **Firefox** | P1 | Weekly Nightly (선택적) |
| **Safari** | P2 | Manual 검증 |
| **Edge** | - | Chrome과 동일 (Chromium) |

**근거**:
- Chrome이 엔터프라이즈 환경에서 90%+ 점유율
- `performance.memory` API가 Chromium에서만 정확
- Firefox/Safari는 메모리 측정 제한적

### E.3 Supabase 캐싱 위치

**결정**: **클라이언트 캐싱 (React Query)** 우선

| 레이어 | 캐시 적용 | 근거 |
|--------|----------|------|
| **클라이언트** | ✅ React Query | 즉시 적용 가능, 백엔드 변경 없음 |
| **엣지 함수** | ❌ 미적용 | 추후 백엔드 아키텍처와 통합 검토 |
| **Supabase DB** | RLS만 | 기존 구조 유지 |

**React Query 캐시 정책**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5분 - 데이터가 신선한 것으로 간주되는 시간
      gcTime: 30 * 60 * 1000,     // 30분 - 비활성 쿼리 캐시 GC 대기 시간
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
```

**향후 백엔드 통합 시 고려사항**:
- 엣지 함수 캐싱은 Vercel/Cloudflare 도입 시 재검토
- Supabase Realtime과의 캐시 무효화 전략 필요
- 현재 클라이언트 캐싱으로 90%+ 요청 감소 예상

### E.4 우선순위 재정의 (P0 → P2)

> **검토 피드백 반영**: 실행 우선순위 제안 통합

| 우선순위 | 작업 | Phase | 영향도 |
|----------|------|-------|--------|
| **P0** | MonitorPanel Gateway + enabled | 1 | CPU 70% ↓ |
| **P0** | Request Deduplication + Abort | 6 | 네트워크 안정화 |
| **P0** | Canvas Backpressure 설계 | 4 | 메시지 큐 안정화 |
| **P1** | PanelShell HOC 표준화 | 1 | 코드 일관성 |
| **P1** | Error Boundary 스코프 적용 | 7 | 에러 격리 |
| **P1** | Store 인덱스 시스템 | 2 | 조회 성능 |
| **P1** | History Diff 시스템 | 3 | 메모리 절감 |
| **P2** | 장시간 시뮬레이션 CI | 8 | 회귀 검출 |
| **P2** | LRU 페이지 언로드 | 5 | 대규모 최적화 |

### E.5 추가 결정 사항

**가상 스크롤 keep-alive 정책**:
- NodesPanel: 이미 VirtualizedLayerTree 적용됨
- 메모리 잔존 비용: 허용 (실측 후 필요 시 파셜 언마운트)
- 측정 방법: Phase 7 성능 모니터에서 추적

**Re-render 방지 기준**:
- Selector 분리 필수 (`local/no-zustand-grouped-selectors` ESLint 규칙)
- `useMemo`/`useCallback`: 복잡한 계산 또는 이벤트 핸들러만
- Micro-benchmark 기준: 노드 트리 클릭 1,000회 시 5초 미만

---

> **문서 작성**: Claude AI
> **최종 수정**: 2025-12-09 (검토 피드백 반영)
> **다음 단계**: P0 작업 우선 시작 (MonitorPanel + RequestManager)
