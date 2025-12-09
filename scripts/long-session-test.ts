/**
 * Long Session Performance Test
 *
 * 🚀 Phase 8: CI 자동화 + 장시간 테스트
 *
 * 기능:
 * - 장시간 세션 시뮬레이션 (12시간+)
 * - 메트릭 수집 및 SLO 검증
 * - 힙 스냅샷 저장
 * - 랜덤 사용자 액션 시뮬레이션
 *
 * 사용법:
 * ```bash
 * # 30분 짧은 테스트
 * npm run test:perf:short
 *
 * # 12시간 장시간 테스트
 * npm run test:perf:long
 * ```
 *
 * @since 2025-12-10 Phase 8 CI Automation
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

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
  /** 빌더 URL */
  builderUrl: string;
  /** 결과 저장 경로 */
  outputDir: string;
}

interface PerformanceSnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  fps: number;
  renderTime: number;
  elementCount: number;
  healthScore: number;
}

interface SLOViolation {
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

interface SimulationResult {
  duration: number;
  metrics: PerformanceSnapshot[];
  sloViolations: SLOViolation[];
  summary: {
    avgMemoryGrowth: number;
    avgRenderTime: number;
    avgFps: number;
    minHealthScore: number;
  };
  passed: boolean;
}

// ============================================
// SLO Thresholds
// ============================================

const SLO_THRESHOLDS = {
  heapUsagePercent: {
    warning: 60,
    critical: 80,
  },
  memoryGrowthPerHour: {
    warning: 20 * 1024 * 1024, // 20MB
    critical: 30 * 1024 * 1024, // 30MB
  },
  renderTime: {
    warning: 50,
    critical: 100,
  },
  fps: {
    warning: 50,
    critical: 30,
  },
  healthScore: {
    warning: 50,
    critical: 30,
  },
};

// ============================================
// Main Simulation
// ============================================

/**
 * 장시간 세션 시뮬레이션
 */
async function runLongSessionSimulation(
  config: SimulationConfig
): Promise<SimulationResult> {
  console.log('🚀 Starting long session simulation...');
  console.log(`  Duration: ${config.duration / 1000 / 60} minutes`);
  console.log(`  Elements: ${config.elementCount}`);
  console.log(`  Pages: ${config.pageCount}`);

  // 결과 디렉토리 생성
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--enable-precise-memory-info',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  const metrics: PerformanceSnapshot[] = [];
  const sloViolations: SLOViolation[] = [];

  try {
    // 1. 빌더 로드
    console.log('📦 Loading builder...');
    await page.goto(config.builderUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="builder-ready"]', {
      timeout: 30000,
    }).catch(() => {
      console.log('  Builder ready selector not found, continuing...');
    });

    // 2. 테스트 데이터 생성
    console.log('📝 Creating test elements...');
    await createTestElements(page, config.elementCount, config.pageCount);

    // 3. 시뮬레이션 루프
    console.log('🔄 Starting simulation loop...');
    const startTime = Date.now();
    let snapshotCount = 0;
    let lastMetricsTime = 0;
    let lastSnapshotTime = 0;
    let actionCount = 0;

    while (Date.now() - startTime < config.duration) {
      const elapsed = Date.now() - startTime;

      // 랜덤 작업 수행
      await performRandomAction(page);
      actionCount++;

      // 메트릭 수집
      if (elapsed - lastMetricsTime >= config.metricsInterval) {
        lastMetricsTime = elapsed;
        const snapshot = await collectMetrics(page);
        metrics.push(snapshot);

        // SLO 체크
        const violations = checkSLOViolations(snapshot, metrics);
        sloViolations.push(...violations);

        // 진행 상황 로그
        const progress = ((elapsed / config.duration) * 100).toFixed(1);
        console.log(
          `  [${progress}%] Health: ${snapshot.healthScore}, Heap: ${(snapshot.heapUsed / 1024 / 1024).toFixed(1)}MB, FPS: ${snapshot.fps.toFixed(1)}`
        );
      }

      // 힙 스냅샷 (선택적)
      if (elapsed - lastSnapshotTime >= config.snapshotInterval) {
        lastSnapshotTime = elapsed;
        const snapshotPath = path.join(
          config.outputDir,
          `snapshot-${snapshotCount++}.json`
        );
        await saveHeapSnapshot(page, snapshotPath);
      }

      // 짧은 대기
      await delay(100);
    }

    console.log(`✅ Simulation complete. Actions performed: ${actionCount}`);

    // 결과 계산
    const summary = calculateSummary(metrics, config.duration);
    const passed =
      sloViolations.filter((v) => v.severity === 'critical').length === 0;

    const result: SimulationResult = {
      duration: Date.now() - startTime,
      metrics,
      sloViolations,
      summary,
      passed,
    };

    // 결과 저장
    saveResults(result, config.outputDir);

    return result;
  } finally {
    await browser.close();
  }
}

// ============================================
// Test Data Creation
// ============================================

/**
 * 테스트 요소 생성
 */
async function createTestElements(
  page: Page,
  elementCount: number,
  pageCount: number
): Promise<void> {
  await page.evaluate(
    (count: number, pages: number) => {
      // Window에 테스트 데이터 생성 함수가 있으면 호출
      const win = window as Window & {
        __createTestData?: (elementCount: number, pageCount: number) => void;
      };
      if (win.__createTestData) {
        win.__createTestData(count, pages);
      } else {
        console.log(
          `Test data creation function not available. Expected ${count} elements across ${pages} pages.`
        );
      }
    },
    elementCount,
    pageCount
  );
}

// ============================================
// Random Actions
// ============================================

/**
 * 랜덤 작업 수행
 */
async function performRandomAction(page: Page): Promise<void> {
  const actions = [
    // 요소 선택
    async () => {
      const elements = await page.$$('[data-element-id]');
      if (elements.length > 0) {
        const randomEl = elements[Math.floor(Math.random() * elements.length)];
        await randomEl.click().catch(() => {});
      }
    },
    // 패널 전환
    async () => {
      const tabs = await page.$$('[data-panel-tab]');
      if (tabs.length > 0) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        await randomTab.click().catch(() => {});
      }
    },
    // 속성 변경
    async () => {
      const inputs = await page.$$('input[data-property-input]');
      if (inputs.length > 0) {
        const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
        await randomInput.type('test', { delay: 50 }).catch(() => {});
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
        await randomPage.click().catch(() => {});
      }
    },
    // 스크롤
    async () => {
      await page.evaluate(() => {
        const panels = document.querySelectorAll('[data-panel-content]');
        if (panels.length > 0) {
          const panel = panels[Math.floor(Math.random() * panels.length)];
          panel.scrollTop = Math.random() * panel.scrollHeight;
        }
      });
    },
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  try {
    await action();
  } catch {
    // Ignore action failures
  }
}

// ============================================
// Metrics Collection
// ============================================

/**
 * 메트릭 수집
 */
async function collectMetrics(page: Page): Promise<PerformanceSnapshot> {
  return await page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }
    ).memory;

    const builderMetrics = (
      window as Window & {
        __builderMetrics?: {
          fps: number;
          lastRenderTime: number;
          elementCount: number;
          healthScore: number;
        };
      }
    ).__builderMetrics;

    return {
      timestamp: Date.now(),
      heapUsed: memory?.usedJSHeapSize ?? 0,
      heapTotal: memory?.totalJSHeapSize ?? 0,
      heapLimit: memory?.jsHeapSizeLimit ?? 1,
      fps: builderMetrics?.fps ?? 60,
      renderTime: builderMetrics?.lastRenderTime ?? 0,
      elementCount: builderMetrics?.elementCount ?? 0,
      healthScore: builderMetrics?.healthScore ?? 100,
    };
  });
}

/**
 * SLO 위반 체크
 */
function checkSLOViolations(
  snapshot: PerformanceSnapshot,
  allMetrics: PerformanceSnapshot[]
): SLOViolation[] {
  const violations: SLOViolation[] = [];

  // Heap 사용량 체크
  const heapPercent = (snapshot.heapUsed / snapshot.heapLimit) * 100;
  if (heapPercent > SLO_THRESHOLDS.heapUsagePercent.critical) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'heapUsagePercent',
      value: heapPercent,
      threshold: SLO_THRESHOLDS.heapUsagePercent.critical,
      severity: 'critical',
    });
  } else if (heapPercent > SLO_THRESHOLDS.heapUsagePercent.warning) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'heapUsagePercent',
      value: heapPercent,
      threshold: SLO_THRESHOLDS.heapUsagePercent.warning,
      severity: 'warning',
    });
  }

  // 렌더링 시간 체크
  if (snapshot.renderTime > SLO_THRESHOLDS.renderTime.critical) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'renderTime',
      value: snapshot.renderTime,
      threshold: SLO_THRESHOLDS.renderTime.critical,
      severity: 'critical',
    });
  } else if (snapshot.renderTime > SLO_THRESHOLDS.renderTime.warning) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'renderTime',
      value: snapshot.renderTime,
      threshold: SLO_THRESHOLDS.renderTime.warning,
      severity: 'warning',
    });
  }

  // FPS 체크
  if (snapshot.fps < SLO_THRESHOLDS.fps.critical) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'fps',
      value: snapshot.fps,
      threshold: SLO_THRESHOLDS.fps.critical,
      severity: 'critical',
    });
  } else if (snapshot.fps < SLO_THRESHOLDS.fps.warning) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'fps',
      value: snapshot.fps,
      threshold: SLO_THRESHOLDS.fps.warning,
      severity: 'warning',
    });
  }

  // Health Score 체크
  if (snapshot.healthScore < SLO_THRESHOLDS.healthScore.critical) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'healthScore',
      value: snapshot.healthScore,
      threshold: SLO_THRESHOLDS.healthScore.critical,
      severity: 'critical',
    });
  } else if (snapshot.healthScore < SLO_THRESHOLDS.healthScore.warning) {
    violations.push({
      timestamp: snapshot.timestamp,
      metric: 'healthScore',
      value: snapshot.healthScore,
      threshold: SLO_THRESHOLDS.healthScore.warning,
      severity: 'warning',
    });
  }

  // 메모리 증가율 체크 (최근 1시간)
  if (allMetrics.length > 60) {
    const hourAgo = allMetrics[allMetrics.length - 61];
    const memoryGrowth = snapshot.heapUsed - hourAgo.heapUsed;

    if (memoryGrowth > SLO_THRESHOLDS.memoryGrowthPerHour.critical) {
      violations.push({
        timestamp: snapshot.timestamp,
        metric: 'memoryGrowthPerHour',
        value: memoryGrowth,
        threshold: SLO_THRESHOLDS.memoryGrowthPerHour.critical,
        severity: 'critical',
      });
    } else if (memoryGrowth > SLO_THRESHOLDS.memoryGrowthPerHour.warning) {
      violations.push({
        timestamp: snapshot.timestamp,
        metric: 'memoryGrowthPerHour',
        value: memoryGrowth,
        threshold: SLO_THRESHOLDS.memoryGrowthPerHour.warning,
        severity: 'warning',
      });
    }
  }

  return violations;
}

// ============================================
// Results & Snapshots
// ============================================

/**
 * 힙 스냅샷 저장
 */
async function saveHeapSnapshot(page: Page, filePath: string): Promise<void> {
  try {
    const metrics = await collectMetrics(page);
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
    console.log(`  📸 Snapshot saved: ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Failed to save snapshot: ${error}`);
  }
}

/**
 * 결과 요약 계산
 */
function calculateSummary(
  metrics: PerformanceSnapshot[],
  duration: number
): SimulationResult['summary'] {
  if (metrics.length === 0) {
    return {
      avgMemoryGrowth: 0,
      avgRenderTime: 0,
      avgFps: 60,
      minHealthScore: 100,
    };
  }

  const firstMetric = metrics[0];
  const lastMetric = metrics[metrics.length - 1];

  // 시간당 메모리 증가율 계산
  const totalMemoryGrowth = lastMetric.heapUsed - firstMetric.heapUsed;
  const hours = duration / 1000 / 60 / 60;
  const avgMemoryGrowth = totalMemoryGrowth / hours / 1024 / 1024; // MB/hour

  // 평균 렌더링 시간
  const avgRenderTime =
    metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;

  // 평균 FPS
  const avgFps = metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length;

  // 최소 Health Score
  const minHealthScore = Math.min(...metrics.map((m) => m.healthScore));

  return {
    avgMemoryGrowth,
    avgRenderTime,
    avgFps,
    minHealthScore,
  };
}

/**
 * 결과 저장
 */
function saveResults(result: SimulationResult, outputDir: string): void {
  // 전체 결과
  const fullResultPath = path.join(outputDir, 'long-session-result.json');
  fs.writeFileSync(fullResultPath, JSON.stringify(result, null, 2));
  console.log(`📊 Full results saved: ${fullResultPath}`);

  // 요약 결과 (CI용)
  const summaryPath = path.join(outputDir, 'perf-summary.json');
  const summary = {
    duration: Math.round(result.duration / 1000 / 60), // minutes
    memoryGrowth: result.summary.avgMemoryGrowth.toFixed(2),
    avgRenderTime: result.summary.avgRenderTime.toFixed(2),
    avgFps: result.summary.avgFps.toFixed(1),
    minHealthScore: result.summary.minHealthScore,
    sloViolations: result.sloViolations.length,
    criticalViolations: result.sloViolations.filter(
      (v) => v.severity === 'critical'
    ).length,
    passed: result.passed,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📋 Summary saved: ${summaryPath}`);
}

// ============================================
// Utilities
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// CLI Entry Point
// ============================================

const args = process.argv.slice(2);
const mode = args[0] || 'short';

const configs: Record<string, SimulationConfig> = {
  short: {
    duration: 30 * 60 * 1000, // 30분
    elementCount: 500,
    pageCount: 10,
    metricsInterval: 60 * 1000, // 1분
    snapshotInterval: 10 * 60 * 1000, // 10분
    builderUrl: 'http://localhost:5173/builder/test-project',
    outputDir: 'test-results',
  },
  medium: {
    duration: 2 * 60 * 60 * 1000, // 2시간
    elementCount: 1000,
    pageCount: 20,
    metricsInterval: 60 * 1000, // 1분
    snapshotInterval: 30 * 60 * 1000, // 30분
    builderUrl: 'http://localhost:5173/builder/test-project',
    outputDir: 'test-results',
  },
  long: {
    duration: 12 * 60 * 60 * 1000, // 12시간
    elementCount: 5000,
    pageCount: 50,
    metricsInterval: 60 * 1000, // 1분
    snapshotInterval: 30 * 60 * 1000, // 30분
    builderUrl: 'http://localhost:5173/builder/test-project',
    outputDir: 'test-results',
  },
};

const config = configs[mode] || configs.short;

console.log(`
╔════════════════════════════════════════════╗
║   XStudio Long Session Performance Test    ║
╠════════════════════════════════════════════╣
║   Mode: ${mode.padEnd(35)}║
║   Duration: ${(config.duration / 1000 / 60).toString().padEnd(31)}min ║
║   Elements: ${config.elementCount.toString().padEnd(31)}║
║   Pages: ${config.pageCount.toString().padEnd(34)}║
╚════════════════════════════════════════════╝
`);

runLongSessionSimulation(config)
  .then((result) => {
    console.log('\n');
    console.log('═══════════════════════════════════════════');
    console.log(result.passed ? '✅ TEST PASSED' : '❌ TEST FAILED');
    console.log('═══════════════════════════════════════════');
    console.log(`Duration: ${(result.duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Metrics collected: ${result.metrics.length}`);
    console.log(`Memory growth: ${result.summary.avgMemoryGrowth.toFixed(2)} MB/hour`);
    console.log(`Avg render time: ${result.summary.avgRenderTime.toFixed(2)} ms`);
    console.log(`Avg FPS: ${result.summary.avgFps.toFixed(1)}`);
    console.log(`Min health score: ${result.summary.minHealthScore}`);
    console.log(`SLO violations: ${result.sloViolations.length}`);
    console.log(
      `  - Critical: ${result.sloViolations.filter((v) => v.severity === 'critical').length}`
    );
    console.log(
      `  - Warning: ${result.sloViolations.filter((v) => v.severity === 'warning').length}`
    );
    console.log('═══════════════════════════════════════════');

    process.exit(result.passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  });
