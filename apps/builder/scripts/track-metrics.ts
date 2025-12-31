/**
 * Performance Metrics Tracking
 *
 * 🚀 Phase 8: 메트릭 추세 추적 및 회귀 감지
 *
 * 기능:
 * - 최근 테스트 결과 분석
 * - 추세 감지 (메모리, 렌더링, FPS)
 * - 회귀 알림
 *
 * @since 2025-12-10 Phase 8 CI Automation
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

interface MetricTrend {
  date: string;
  commit: string;
  memoryGrowth: number;
  avgRenderTime: number;
  avgFps: number;
  minHealthScore: number;
  sloViolations: number;
  passed: boolean;
}

interface TrendAnalysis {
  regression: boolean;
  regressionDetails: string | null;
  recentAvg: {
    memoryGrowth: number;
    renderTime: number;
    fps: number;
    healthScore: number;
  };
  previousAvg: {
    memoryGrowth: number;
    renderTime: number;
    fps: number;
    healthScore: number;
  };
  percentChange: {
    memoryGrowth: number;
    renderTime: number;
    fps: number;
    healthScore: number;
  };
}

// ============================================
// Trend Analysis
// ============================================

/**
 * 추세 분석
 */
function analyzeTrends(trends: MetricTrend[]): TrendAnalysis {
  if (trends.length < 2) {
    return {
      regression: false,
      regressionDetails: null,
      recentAvg: { memoryGrowth: 0, renderTime: 0, fps: 60, healthScore: 100 },
      previousAvg: { memoryGrowth: 0, renderTime: 0, fps: 60, healthScore: 100 },
      percentChange: { memoryGrowth: 0, renderTime: 0, fps: 0, healthScore: 0 },
    };
  }

  // 최근 7일 vs 이전 7일
  const recentTrends = trends.slice(0, Math.min(7, Math.floor(trends.length / 2)));
  const previousTrends = trends.slice(
    Math.min(7, Math.floor(trends.length / 2)),
    Math.min(14, trends.length)
  );

  const recentAvg = calculateAverages(recentTrends);
  const previousAvg = calculateAverages(previousTrends);

  // 변화율 계산
  const percentChange = {
    memoryGrowth: calculatePercentChange(previousAvg.memoryGrowth, recentAvg.memoryGrowth),
    renderTime: calculatePercentChange(previousAvg.renderTime, recentAvg.renderTime),
    fps: calculatePercentChange(previousAvg.fps, recentAvg.fps),
    healthScore: calculatePercentChange(previousAvg.healthScore, recentAvg.healthScore),
  };

  // 회귀 감지 (20% 이상 악화 시)
  const regression =
    percentChange.memoryGrowth > 20 ||
    percentChange.renderTime > 20 ||
    percentChange.fps < -20 ||
    percentChange.healthScore < -20;

  const regressionDetails = regression
    ? [
        percentChange.memoryGrowth > 20
          ? `Memory growth: ${previousAvg.memoryGrowth.toFixed(2)} → ${recentAvg.memoryGrowth.toFixed(2)} MB/h (+${percentChange.memoryGrowth.toFixed(1)}%)`
          : null,
        percentChange.renderTime > 20
          ? `Render time: ${previousAvg.renderTime.toFixed(2)} → ${recentAvg.renderTime.toFixed(2)} ms (+${percentChange.renderTime.toFixed(1)}%)`
          : null,
        percentChange.fps < -20
          ? `FPS: ${previousAvg.fps.toFixed(1)} → ${recentAvg.fps.toFixed(1)} (${percentChange.fps.toFixed(1)}%)`
          : null,
        percentChange.healthScore < -20
          ? `Health: ${previousAvg.healthScore.toFixed(0)} → ${recentAvg.healthScore.toFixed(0)} (${percentChange.healthScore.toFixed(1)}%)`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : null;

  return {
    regression,
    regressionDetails,
    recentAvg,
    previousAvg,
    percentChange,
  };
}

/**
 * 평균 계산
 */
function calculateAverages(trends: MetricTrend[]) {
  if (trends.length === 0) {
    return { memoryGrowth: 0, renderTime: 0, fps: 60, healthScore: 100 };
  }

  return {
    memoryGrowth: average(trends.map((t) => t.memoryGrowth)),
    renderTime: average(trends.map((t) => t.avgRenderTime)),
    fps: average(trends.map((t) => t.avgFps)),
    healthScore: average(trends.map((t) => t.minHealthScore)),
  };
}

/**
 * 배열 평균
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * 변화율 계산
 */
function calculatePercentChange(previous: number, current: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// ============================================
// Report Generation
// ============================================

/**
 * 분석 리포트 생성
 */
function generateReport(trends: MetricTrend[], analysis: TrendAnalysis): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    '           Performance Trend Analysis Report               ',
    '═══════════════════════════════════════════════════════════',
    '',
    `Analysis Date: ${new Date().toISOString()}`,
    `Data Points: ${trends.length} test results`,
    '',
    '─── Recent Average (Last 7 runs) ──────────────────────────',
    `  Memory Growth:  ${analysis.recentAvg.memoryGrowth.toFixed(2)} MB/h`,
    `  Render Time:    ${analysis.recentAvg.renderTime.toFixed(2)} ms`,
    `  FPS:            ${analysis.recentAvg.fps.toFixed(1)}`,
    `  Health Score:   ${analysis.recentAvg.healthScore.toFixed(0)}`,
    '',
    '─── Previous Average (Prior 7 runs) ───────────────────────',
    `  Memory Growth:  ${analysis.previousAvg.memoryGrowth.toFixed(2)} MB/h`,
    `  Render Time:    ${analysis.previousAvg.renderTime.toFixed(2)} ms`,
    `  FPS:            ${analysis.previousAvg.fps.toFixed(1)}`,
    `  Health Score:   ${analysis.previousAvg.healthScore.toFixed(0)}`,
    '',
    '─── Change Analysis ────────────────────────────────────────',
    `  Memory Growth:  ${analysis.percentChange.memoryGrowth > 0 ? '+' : ''}${analysis.percentChange.memoryGrowth.toFixed(1)}%`,
    `  Render Time:    ${analysis.percentChange.renderTime > 0 ? '+' : ''}${analysis.percentChange.renderTime.toFixed(1)}%`,
    `  FPS:            ${analysis.percentChange.fps > 0 ? '+' : ''}${analysis.percentChange.fps.toFixed(1)}%`,
    `  Health Score:   ${analysis.percentChange.healthScore > 0 ? '+' : ''}${analysis.percentChange.healthScore.toFixed(1)}%`,
    '',
  ];

  if (analysis.regression) {
    lines.push(
      '═══════════════════════════════════════════════════════════',
      '⚠️  REGRESSION DETECTED                                    ',
      '═══════════════════════════════════════════════════════════',
      '',
      analysis.regressionDetails || '',
      ''
    );
  } else {
    lines.push(
      '═══════════════════════════════════════════════════════════',
      '✅ No significant regression detected                      ',
      '═══════════════════════════════════════════════════════════',
      ''
    );
  }

  // 최근 테스트 결과 테이블
  lines.push(
    '',
    '─── Recent Test Results ────────────────────────────────────',
    ''
  );

  const recentResults = trends.slice(0, 10);
  lines.push(
    '| Date       | Memory  | Render | FPS  | Health | Status |'
  );
  lines.push(
    '|------------|---------|--------|------|--------|--------|'
  );

  for (const trend of recentResults) {
    lines.push(
      `| ${trend.date.padEnd(10)} | ${trend.memoryGrowth.toFixed(1).padStart(5)} MB | ${trend.avgRenderTime.toFixed(1).padStart(4)} ms | ${trend.avgFps.toFixed(0).padStart(4)} | ${trend.minHealthScore.toString().padStart(6)} | ${trend.passed ? '✅' : '❌'}     |`
    );
  }

  lines.push('');

  return lines.join('\n');
}

// ============================================
// File Operations
// ============================================

/**
 * 테스트 결과 로드
 */
function loadTestResults(resultsDir: string): MetricTrend[] {
  const trends: MetricTrend[] = [];

  if (!fs.existsSync(resultsDir)) {
    console.log(`Results directory not found: ${resultsDir}`);
    return trends;
  }

  const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(resultsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // perf-summary.json 형식
      if (data.duration && data.memoryGrowth !== undefined) {
        trends.push({
          date: new Date(fs.statSync(filePath).mtime).toISOString().split('T')[0],
          commit: data.commit || 'unknown',
          memoryGrowth: parseFloat(data.memoryGrowth),
          avgRenderTime: parseFloat(data.avgRenderTime),
          avgFps: parseFloat(data.avgFps),
          minHealthScore: data.minHealthScore || 100,
          sloViolations: data.sloViolations || 0,
          passed: data.passed,
        });
      }
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  }

  // 날짜순 정렬 (최신순)
  trends.sort((a, b) => b.date.localeCompare(a.date));

  return trends;
}

/**
 * 히스토리 파일에 추가
 */
function appendToHistory(trend: MetricTrend, historyFile: string): void {
  let history: MetricTrend[] = [];

  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch {
      history = [];
    }
  }

  // 중복 방지
  const exists = history.some((h) => h.date === trend.date && h.commit === trend.commit);
  if (!exists) {
    history.unshift(trend);
  }

  // 최대 90일 유지
  history = history.slice(0, 90);

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

// ============================================
// CLI Entry Point
// ============================================

async function main(): Promise<void> {
  console.log('📈 Starting performance metrics analysis...\n');

  const resultsDir = process.argv[2] || 'test-results';
  const historyFile = path.join(resultsDir, 'perf-history.json');

  // 테스트 결과 로드
  const trends = loadTestResults(resultsDir);

  if (trends.length === 0) {
    console.log('No test results found.');
    process.exit(0);
  }

  console.log(`Found ${trends.length} test result(s)\n`);

  // 최신 결과를 히스토리에 추가
  if (trends.length > 0) {
    appendToHistory(trends[0], historyFile);
  }

  // 히스토리 로드 (더 긴 기간 분석용)
  let historyTrends: MetricTrend[] = [];
  if (fs.existsSync(historyFile)) {
    try {
      historyTrends = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch {
      historyTrends = trends;
    }
  } else {
    historyTrends = trends;
  }

  // 추세 분석
  const analysis = analyzeTrends(historyTrends);

  // 리포트 생성
  const report = generateReport(historyTrends, analysis);
  console.log(report);

  // 리포트 저장
  const reportFile = path.join(resultsDir, 'trend-analysis.txt');
  fs.writeFileSync(reportFile, report);
  console.log(`Report saved to: ${reportFile}`);

  // 회귀 감지 시 비정상 종료
  if (analysis.regression) {
    console.error('\n⚠️ Performance regression detected!');
    process.exit(1);
  }

  console.log('\n✅ Performance analysis complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
