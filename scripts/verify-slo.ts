/**
 * SLO Verification Script
 *
 * 🚀 Phase 8 C4: SLO 검증 자동화
 *
 * 성능 테스트 결과를 분석하고 SLO 위반 여부를 판정합니다.
 *
 * 사용법:
 * ```bash
 * # 단일 파일 검증
 * npx tsx scripts/verify-slo.ts test-results/perf-summary.json
 *
 * # 여러 파일 비교 (회귀 분석)
 * npx tsx scripts/verify-slo.ts --compare baseline.json current.json
 *
 * # CI 모드 (종료 코드 반환)
 * npx tsx scripts/verify-slo.ts --ci test-results/perf-summary.json
 * ```
 *
 * @since 2025-12-11 Phase 8 C4
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

interface PerformanceSummary {
  timestamp?: string;
  seed?: number;
  duration: number;
  memoryGrowth: string | number;
  avgRenderTime: string | number;
  avgFps: string | number;
  minHealthScore: number;
  sloViolations: number;
  criticalViolations: number;
  passed: boolean;
}

interface SLOThresholds {
  memoryGrowthPerHour: { warning: number; critical: number };
  renderTime: { warning: number; critical: number };
  fps: { warning: number; critical: number };
  healthScore: { warning: number; critical: number };
}

interface VerificationResult {
  passed: boolean;
  summary: PerformanceSummary;
  violations: {
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }[];
  regression?: {
    metric: string;
    baseline: number;
    current: number;
    change: number;
    changePercent: number;
    significant: boolean;
  }[];
}

// ============================================
// SLO Thresholds
// ============================================

const SLO_THRESHOLDS: SLOThresholds = {
  memoryGrowthPerHour: {
    warning: 20, // MB/hour
    critical: 30,
  },
  renderTime: {
    warning: 50, // ms
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

// 회귀 임계값 (5% 이상 저하 = significant)
const REGRESSION_THRESHOLD = 0.05;

// ============================================
// CLI Parsing
// ============================================

interface CLIArgs {
  mode: 'verify' | 'compare';
  files: string[];
  ci: boolean;
  verbose: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    mode: 'verify',
    files: [],
    ci: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--compare') {
      result.mode = 'compare';
    } else if (arg === '--ci') {
      result.ci = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (!arg.startsWith('-')) {
      result.files.push(arg);
    }
  }

  return result;
}

// ============================================
// File Loading
// ============================================

function loadSummary(filePath: string): PerformanceSummary | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as PerformanceSummary;
  } catch (error) {
    console.error(`❌ Failed to load ${filePath}:`, error);
    return null;
  }
}

// ============================================
// SLO Verification
// ============================================

function verifySLO(summary: PerformanceSummary): VerificationResult {
  const violations: VerificationResult['violations'] = [];

  // Memory Growth
  const memoryGrowth = parseFloat(String(summary.memoryGrowth));
  if (memoryGrowth > SLO_THRESHOLDS.memoryGrowthPerHour.critical) {
    violations.push({
      metric: 'memoryGrowthPerHour',
      value: memoryGrowth,
      threshold: SLO_THRESHOLDS.memoryGrowthPerHour.critical,
      severity: 'critical',
    });
  } else if (memoryGrowth > SLO_THRESHOLDS.memoryGrowthPerHour.warning) {
    violations.push({
      metric: 'memoryGrowthPerHour',
      value: memoryGrowth,
      threshold: SLO_THRESHOLDS.memoryGrowthPerHour.warning,
      severity: 'warning',
    });
  }

  // Render Time
  const renderTime = parseFloat(String(summary.avgRenderTime));
  if (renderTime > SLO_THRESHOLDS.renderTime.critical) {
    violations.push({
      metric: 'renderTime',
      value: renderTime,
      threshold: SLO_THRESHOLDS.renderTime.critical,
      severity: 'critical',
    });
  } else if (renderTime > SLO_THRESHOLDS.renderTime.warning) {
    violations.push({
      metric: 'renderTime',
      value: renderTime,
      threshold: SLO_THRESHOLDS.renderTime.warning,
      severity: 'warning',
    });
  }

  // FPS (lower is worse)
  const fps = parseFloat(String(summary.avgFps));
  if (fps < SLO_THRESHOLDS.fps.critical) {
    violations.push({
      metric: 'fps',
      value: fps,
      threshold: SLO_THRESHOLDS.fps.critical,
      severity: 'critical',
    });
  } else if (fps < SLO_THRESHOLDS.fps.warning) {
    violations.push({
      metric: 'fps',
      value: fps,
      threshold: SLO_THRESHOLDS.fps.warning,
      severity: 'warning',
    });
  }

  // Health Score (lower is worse)
  const healthScore = summary.minHealthScore;
  if (healthScore < SLO_THRESHOLDS.healthScore.critical) {
    violations.push({
      metric: 'healthScore',
      value: healthScore,
      threshold: SLO_THRESHOLDS.healthScore.critical,
      severity: 'critical',
    });
  } else if (healthScore < SLO_THRESHOLDS.healthScore.warning) {
    violations.push({
      metric: 'healthScore',
      value: healthScore,
      threshold: SLO_THRESHOLDS.healthScore.warning,
      severity: 'warning',
    });
  }

  const criticalCount = violations.filter((v) => v.severity === 'critical').length;

  return {
    passed: criticalCount === 0,
    summary,
    violations,
  };
}

// ============================================
// Regression Analysis
// ============================================

function compareResults(
  baseline: PerformanceSummary,
  current: PerformanceSummary
): VerificationResult['regression'] {
  const regression: VerificationResult['regression'] = [];

  // Memory Growth (higher is worse)
  const baselineMemory = parseFloat(String(baseline.memoryGrowth));
  const currentMemory = parseFloat(String(current.memoryGrowth));
  const memoryChange = currentMemory - baselineMemory;
  const memoryChangePercent = baselineMemory > 0 ? memoryChange / baselineMemory : 0;

  regression.push({
    metric: 'memoryGrowthPerHour',
    baseline: baselineMemory,
    current: currentMemory,
    change: memoryChange,
    changePercent: memoryChangePercent,
    significant: memoryChangePercent > REGRESSION_THRESHOLD,
  });

  // Render Time (higher is worse)
  const baselineRender = parseFloat(String(baseline.avgRenderTime));
  const currentRender = parseFloat(String(current.avgRenderTime));
  const renderChange = currentRender - baselineRender;
  const renderChangePercent = baselineRender > 0 ? renderChange / baselineRender : 0;

  regression.push({
    metric: 'renderTime',
    baseline: baselineRender,
    current: currentRender,
    change: renderChange,
    changePercent: renderChangePercent,
    significant: renderChangePercent > REGRESSION_THRESHOLD,
  });

  // FPS (lower is worse, so negative change is bad)
  const baselineFps = parseFloat(String(baseline.avgFps));
  const currentFps = parseFloat(String(current.avgFps));
  const fpsChange = currentFps - baselineFps;
  const fpsChangePercent = baselineFps > 0 ? fpsChange / baselineFps : 0;

  regression.push({
    metric: 'fps',
    baseline: baselineFps,
    current: currentFps,
    change: fpsChange,
    changePercent: fpsChangePercent,
    significant: fpsChangePercent < -REGRESSION_THRESHOLD, // Negative change is bad
  });

  // Health Score (lower is worse, so negative change is bad)
  const baselineHealth = baseline.minHealthScore;
  const currentHealth = current.minHealthScore;
  const healthChange = currentHealth - baselineHealth;
  const healthChangePercent = baselineHealth > 0 ? healthChange / baselineHealth : 0;

  regression.push({
    metric: 'healthScore',
    baseline: baselineHealth,
    current: currentHealth,
    change: healthChange,
    changePercent: healthChangePercent,
    significant: healthChangePercent < -REGRESSION_THRESHOLD, // Negative change is bad
  });

  return regression;
}

// ============================================
// Output Formatting
// ============================================

function printVerificationResult(result: VerificationResult, verbose: boolean): void {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║          SLO Verification Report           ║');
  console.log('╠════════════════════════════════════════════╣');

  const { summary } = result;

  console.log(`║  Duration: ${String(summary.duration).padEnd(30)}║`);
  console.log(`║  Memory Growth: ${String(summary.memoryGrowth + ' MB/h').padEnd(25)}║`);
  console.log(`║  Avg Render Time: ${String(summary.avgRenderTime + ' ms').padEnd(23)}║`);
  console.log(`║  Avg FPS: ${String(summary.avgFps).padEnd(31)}║`);
  console.log(`║  Min Health Score: ${String(summary.minHealthScore).padEnd(22)}║`);
  console.log('╠════════════════════════════════════════════╣');

  if (result.violations.length === 0) {
    console.log('║  ✅ All SLO thresholds met                  ║');
  } else {
    console.log(`║  ⚠️  ${result.violations.length} SLO violation(s) detected             ║`);

    if (verbose) {
      console.log('╠════════════════════════════════════════════╣');
      for (const v of result.violations) {
        const icon = v.severity === 'critical' ? '❌' : '⚠️';
        console.log(
          `║  ${icon} ${v.metric}: ${v.value} > ${v.threshold}`.padEnd(43) + '║'
        );
      }
    }
  }

  console.log('╠════════════════════════════════════════════╣');
  console.log(
    `║  Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`.padEnd(43) + '║'
  );
  console.log('╚════════════════════════════════════════════╝\n');
}

function printRegressionReport(regression: VerificationResult['regression']): void {
  if (!regression) return;

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║          Regression Analysis               ║');
  console.log('╠════════════════════════════════════════════╣');

  const hasSignificant = regression.some((r) => r.significant);

  for (const r of regression) {
    const icon = r.significant ? '⚠️' : '✅';
    const sign = r.change >= 0 ? '+' : '';
    const changeStr = `${sign}${(r.changePercent * 100).toFixed(1)}%`;

    console.log(
      `║  ${icon} ${r.metric}: ${r.baseline.toFixed(2)} → ${r.current.toFixed(2)} (${changeStr})`.padEnd(
        43
      ) + '║'
    );
  }

  console.log('╠════════════════════════════════════════════╣');
  console.log(
    `║  Regression: ${hasSignificant ? '⚠️ DETECTED' : '✅ NONE'}`.padEnd(43) + '║'
  );
  console.log('╚════════════════════════════════════════════╝\n');
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.files.length === 0) {
    console.log('Usage:');
    console.log('  npx tsx scripts/verify-slo.ts <file.json>');
    console.log('  npx tsx scripts/verify-slo.ts --compare <baseline.json> <current.json>');
    console.log('  npx tsx scripts/verify-slo.ts --ci <file.json>');
    process.exit(1);
  }

  if (args.mode === 'compare') {
    if (args.files.length < 2) {
      console.error('❌ Compare mode requires two files: baseline and current');
      process.exit(1);
    }

    const baseline = loadSummary(args.files[0]);
    const current = loadSummary(args.files[1]);

    if (!baseline || !current) {
      process.exit(1);
    }

    const result = verifySLO(current);
    result.regression = compareResults(baseline, current);

    printVerificationResult(result, args.verbose);
    printRegressionReport(result.regression);

    const hasSignificantRegression = result.regression.some((r) => r.significant);

    if (args.ci) {
      if (!result.passed) {
        console.error('::error::SLO verification failed with critical violations');
        process.exit(1);
      }
      if (hasSignificantRegression) {
        console.error('::warning::Significant performance regression detected');
        // Don't fail CI for regressions, just warn
      }
    }
  } else {
    // Single file verification
    const summary = loadSummary(args.files[0]);

    if (!summary) {
      process.exit(1);
    }

    const result = verifySLO(summary);
    printVerificationResult(result, args.verbose);

    if (args.ci && !result.passed) {
      console.error('::error::SLO verification failed with critical violations');
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
