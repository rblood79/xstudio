# 현재 문제 분석 및 목표 성능 지표

> **관련 문서**: [README.md](./README.md) | [02-architecture.md](./02-architecture.md)
> **최종 수정**: 2025-12-11 (A1.1 Panel Gateway 완료: Properties/Styles/Components)

---

## 1. 현재 문제 분석

### 1.1 패널별 상태

| 패널 | 상태 | 주요 문제 | 우선순위 |
|------|------|----------|----------|
| **MonitorPanel** | ✅ Fixed | Gateway 패턴 + enabled 파라미터 적용 완료 (2025-12-11) | - |
| **PropertiesPanel** | ✅ Fixed | Gateway 패턴 적용 완료 (2025-12-11) | - |
| **StylesPanel** | ✅ Fixed | Gateway 패턴 적용 완료 (2025-12-11) | - |
| **ComponentsPanel** | ✅ Fixed | Gateway 패턴 적용 완료 (2025-12-11) | - |
| **DataTablePanel** | ✅ Fixed | React Query + Zustand Store 동기화 구현 (2025-12-10) | - |
| **NodesPanel** | ✅ OK | Virtual Scrolling 이미 적용 (VirtualizedLayerTree) | - |
| **EventsPanel** | ✅ OK | Early return 패턴 적용됨 | - |
| **AIPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **SettingsPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **ThemesPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **DataTableEditorPanel** | ✅ OK | 컴포넌트 분리 패턴 적용됨 | - |
| **CodePreviewPanel** | ✅ OK | Props 기반, Lazy 코드 생성 | - |

### 1.2 MonitorPanel 상세 분석 (✅ 해결됨)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx`

> **✅ 2025-12-11 수정 완료**: Gateway 패턴 + enabled 파라미터 적용

| Line | 코드 | 상태 |
|------|------|------|
| 49-56 | `MonitorPanelContent` 분리 | ✅ Gateway 패턴 적용 |
| 54 | `useMemoryStats({ enabled: true })` | ✅ enabled 파라미터 지원 |
| 26 | `useWebVitals({ enabled })` | ✅ enabled 파라미터 지원 |
| 26 | `useFPSMonitor({ enabled })` | ✅ enabled 파라미터 지원 |

**현재 상태**: 패널 비활성 시 모든 훅이 정지됨

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

#### 2.3.5 측정 환경 및 기준값

> **⚠️ 아래 기준값은 측정 전 추정치입니다. 실측 후 업데이트 필요**

**측정 환경 (기준)**:
- **하드웨어**: MacBook Pro M1/M2, 16GB RAM
- **브라우저**: Chrome 120+, Firefox 120+
- **프로젝트 규모**: 1,000개 요소 / 10페이지
- **측정 도구**: Chrome DevTools Performance, `performance.measure()`

**현재 실측치** (TODO: 실측 후 업데이트):
| 작업 | 현재 P50 | 현재 P99 | 샘플 수 | 측정일 |
|------|---------|---------|--------|-------|
| 요소 선택 | TBD | TBD | - | - |
| 패널 전환 | TBD | TBD | - | - |
| 속성 변경 | TBD | TBD | - | - |

**측정 스크립트 위치**: `scripts/perf-benchmark.ts` (TODO: 작성 필요)

#### 2.3.6 Phase 7 모니터링 적용 위치

> **현재 상태**: 🟡 구현만 완료, 실사용 안 함 ([task.md](./task.md) 참조)

**구현된 파일**:
- `src/builder/utils/performanceMonitor.ts` (370줄+)
- `src/builder/hooks/useAutoRecovery.ts` (185줄)

**적용 필요 위치**: `src/builder/main/BuilderCore.tsx:39` (BuilderCore 컴포넌트 내부)

```typescript
// src/builder/main/BuilderCore.tsx
import { useAutoRecovery } from '../hooks/useAutoRecovery';

export const BuilderCore: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // 🆕 Phase 7: 성능 모니터링 + 자동 복구 (line ~44)
  useAutoRecovery();

  // ... 기존 Store 상태들
}
```

**삽입 위치 상세**:
- 파일: `src/builder/main/BuilderCore.tsx`
- 위치: `const { projectId }` 선언 바로 다음 (약 line 44)
- 이유: BuilderCore가 모든 패널/캔버스의 최상위 컴포넌트

**측정 포인트 추가 예시**:
```typescript
// 요소 선택 측정
import { sloMonitor } from '../utils/sloMonitor';

const handleElementSelect = async (elementId: string) => {
  await sloMonitor.measureLatencyAsync('elementSelect', async () => {
    await selectElement(elementId);
  });
};
```

#### 2.3.7 SLO 모니터링 구현

```typescript
// src/builder/utils/sloMonitor.ts

/**
 * SLO 임계값 정의 (단위: ms)
 * 2.3.2 상호작용 지연 SLO 기준
 */
const SLO_THRESHOLDS: Record<string, { p50: number; p95: number; p99: number }> = {
  elementSelect: { p50: 16, p95: 30, p99: 50 },
  panelSwitch: { p50: 50, p95: 100, p99: 150 },
  propertyChange: { p50: 30, p95: 50, p99: 100 },
  undoRedo: { p50: 50, p95: 100, p99: 200 },
  pageSwitch: { p50: 100, p95: 200, p99: 400 },
  canvasSync: { p50: 32, p95: 50, p99: 100 },
  // Phase 10 WebGL 전용 메트릭
  webglRender: { p50: 8, p95: 12, p99: 16 },
  vramUsage: { p50: 128, p95: 192, p99: 256 }, // MB 단위
};

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
   * 동기 함수 지연 측정
   */
  measureLatency(operation: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;

    this.recordLatency(operation, duration);
    this.checkSLOViolation(operation, duration);
  }

  /**
   * 비동기 함수 지연 측정 (API 호출, postMessage 등)
   */
  async measureLatencyAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordLatency(operation, duration);
      this.checkSLOViolation(operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordLatency(operation, duration);
      this.checkSLOViolation(operation, duration);
      throw error;
    }
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

> **다음 문서**: [02-architecture.md](./02-architecture.md) - 아키텍처 설계
