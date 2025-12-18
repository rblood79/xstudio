/**
 * Interactive Performance Test with Playwright
 *
 * 사용자가 직접 로그인하고 프로젝트를 생성한 후 성능 테스트를 진행합니다.
 *
 * 사용법:
 * ```bash
 * npx tsx scripts/interactive-perf-test.ts
 * npx tsx scripts/interactive-perf-test.ts --duration=5  # 5분 테스트
 * npx tsx scripts/interactive-perf-test.ts --actions     # 자동 액션 포함
 * ```
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ============================================
// Types
// ============================================

interface PerformanceMetrics {
  timestamp: number;
  memory: {
    jsHeapUsedMB: number;
    jsHeapTotalMB: number;
    domNodes: number;
    eventListeners: number;
    layoutCount: number;
    styleRecalcCount: number;
  };
  webVitals: {
    LCP: number | null;
    CLS: number | null;
    INP: number | null;
    FCP: number | null;
    TTFB: number | null;
  };
  fps: number;
  longTasks: number;
  renderTime: number;
}

interface TestResult {
  startTime: string;
  endTime: string;
  duration: number;
  url: string;
  samples: PerformanceMetrics[];
  summary: {
    avgMemoryMB: number;
    maxMemoryMB: number;
    memoryGrowthMB: number;
    avgFps: number;
    minFps: number;
    totalLongTasks: number;
    avgRenderTime: number;
    webVitals: {
      LCP: number | null;
      CLS: number | null;
      INP: number | null;
    };
  };
  console: {
    errors: string[];
    warnings: string[];
  };
}

// ============================================
// CLI Configuration
// ============================================

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : defaultValue;
}

const CONFIG = {
  duration: parseInt(getArg("duration", "3"), 10) * 60 * 1000, // 분 -> ms
  sampleInterval: 5000, // 5초마다 샘플링
  autoActions: args.includes("--actions"),
  autoStart: args.includes("--auto-start"), // 빌더 감지 후 자동 시작
  baseUrl: getArg("url", "http://localhost:5173"),
  outputDir: "test-results",
};

// ============================================
// User Input Helper
// ============================================

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function waitForUserInput(prompt: string): Promise<void> {
  const rl = createReadline();
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

// ============================================
// Performance Collection
// ============================================

async function injectPerformanceMonitor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // FPS 측정
    let frameCount = 0;
    let lastTime = performance.now();
    let currentFps = 60;

    function measureFps() {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(measureFps);
    }
    requestAnimationFrame(measureFps);

    // Long Tasks 측정
    let longTaskCount = 0;
    const longTaskObserver = new PerformanceObserver((list) => {
      longTaskCount += list.getEntries().length;
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });

    // Web Vitals
    const webVitals: {
      LCP: number | null;
      CLS: number;
      INP: number | null;
      FCP: number | null;
      TTFB: number | null;
    } = {
      LCP: null,
      CLS: 0,
      INP: null,
      FCP: null,
      TTFB: null,
    };

    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        webVitals.LCP = entries[entries.length - 1].startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });

    // CLS
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!layoutShift.hadRecentInput) {
          const firstEntry = sessionEntries[0];
          const lastEntry = sessionEntries[sessionEntries.length - 1];
          if (
            sessionEntries.length &&
            entry.startTime - (lastEntry?.startTime || 0) < 1000 &&
            entry.startTime - (firstEntry?.startTime || 0) < 5000
          ) {
            sessionValue += layoutShift.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = layoutShift.value;
            sessionEntries = [entry];
          }
          if (sessionValue > webVitals.CLS) {
            webVitals.CLS = sessionValue;
          }
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    // INP
    const inpEntries: number[] = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEntry & {
          interactionId?: number;
          duration: number;
        };
        if (eventEntry.interactionId) {
          inpEntries.push(eventEntry.duration);
        }
      }
      if (inpEntries.length > 0) {
        const sorted = [...inpEntries].sort((a, b) => b - a);
        webVitals.INP = sorted[Math.floor(sorted.length * 0.02)] ?? sorted[0];
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });

    // FCP
    new PerformanceObserver((list) => {
      const fcp = list
        .getEntries()
        .find((e) => e.name === "first-contentful-paint");
      if (fcp) webVitals.FCP = fcp.startTime;
    }).observe({ type: "paint", buffered: true });

    // TTFB
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      webVitals.TTFB = nav.responseStart - nav.requestStart;
    }

    // Render time 측정
    let lastRenderTime = 0;
    const renderObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        lastRenderTime = entries[entries.length - 1].duration;
      }
    });
    try {
      renderObserver.observe({ entryTypes: ["frame", "measure"] });
    } catch {
      // Not all browsers support these
    }

    // Global accessor
    (
      window as Window & {
        __perfMetrics: () => {
          fps: number;
          longTasks: number;
          webVitals: typeof webVitals;
          renderTime: number;
        };
      }
    ).__perfMetrics = () => ({
      fps: currentFps,
      longTasks: longTaskCount,
      webVitals,
      renderTime: lastRenderTime,
    });
  });
}

async function collectMetrics(
  page: Page,
  context: BrowserContext
): Promise<PerformanceMetrics> {
  // CDP metrics
  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  const cdpMetrics = await client.send("Performance.getMetrics");
  const m = Object.fromEntries(
    cdpMetrics.metrics.map((x) => [x.name, x.value])
  );

  // Page metrics
  const pageMetrics = await page.evaluate(() => {
    const win = window as Window & {
      __perfMetrics?: () => {
        fps: number;
        longTasks: number;
        webVitals: {
          LCP: number | null;
          CLS: number | null;
          INP: number | null;
          FCP: number | null;
          TTFB: number | null;
        };
        renderTime: number;
      };
    };
    if (win.__perfMetrics) {
      return win.__perfMetrics();
    }
    return {
      fps: 60,
      longTasks: 0,
      webVitals: { LCP: null, CLS: null, INP: null, FCP: null, TTFB: null },
      renderTime: 0,
    };
  });

  return {
    timestamp: Date.now(),
    memory: {
      jsHeapUsedMB: Number(((m.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)),
      jsHeapTotalMB: Number(((m.JSHeapTotalSize || 0) / 1024 / 1024).toFixed(2)),
      domNodes: m.Nodes || 0,
      eventListeners: m.JSEventListeners || 0,
      layoutCount: m.LayoutCount || 0,
      styleRecalcCount: m.RecalcStyleCount || 0,
    },
    webVitals: pageMetrics.webVitals,
    fps: pageMetrics.fps,
    longTasks: pageMetrics.longTasks,
    renderTime: pageMetrics.renderTime,
  };
}

// ============================================
// Auto Actions
// ============================================

async function performRandomActions(page: Page): Promise<void> {
  const actions = [
    // 요소 클릭
    async () => {
      const elements = await page.$$("[data-element-id]");
      if (elements.length > 0) {
        const idx = Math.floor(Math.random() * elements.length);
        await elements[idx].click({ timeout: 1000 }).catch(() => {});
      }
    },
    // 패널 탭 클릭
    async () => {
      const tabs = await page.$$('[role="tab"]');
      if (tabs.length > 0) {
        const idx = Math.floor(Math.random() * tabs.length);
        await tabs[idx].click({ timeout: 1000 }).catch(() => {});
      }
    },
    // 인풋 입력
    async () => {
      const inputs = await page.$$('input[type="text"], input:not([type])');
      if (inputs.length > 0) {
        const idx = Math.floor(Math.random() * inputs.length);
        await inputs[idx].fill("test " + Date.now()).catch(() => {});
      }
    },
    // Undo/Redo
    async () => {
      await page.keyboard.press("Meta+z").catch(() => {});
    },
    // 스크롤
    async () => {
      await page
        .evaluate(() => {
          const scrollable = document.querySelector(
            '[data-panel-content], .overflow-auto, .overflow-y-auto'
          );
          if (scrollable) {
            scrollable.scrollTop = Math.random() * scrollable.scrollHeight;
          }
        })
        .catch(() => {});
    },
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  await action();
}

// ============================================
// Results
// ============================================

function calculateSummary(samples: PerformanceMetrics[]): TestResult["summary"] {
  if (samples.length === 0) {
    return {
      avgMemoryMB: 0,
      maxMemoryMB: 0,
      memoryGrowthMB: 0,
      avgFps: 60,
      minFps: 60,
      totalLongTasks: 0,
      avgRenderTime: 0,
      webVitals: { LCP: null, CLS: null, INP: null },
    };
  }

  const memories = samples.map((s) => s.memory.jsHeapUsedMB);
  const fpsList = samples.map((s) => s.fps);
  const renderTimes = samples.map((s) => s.renderTime);
  const lastSample = samples[samples.length - 1];

  return {
    avgMemoryMB: Number(
      (memories.reduce((a, b) => a + b, 0) / memories.length).toFixed(2)
    ),
    maxMemoryMB: Math.max(...memories),
    memoryGrowthMB: Number(
      (memories[memories.length - 1] - memories[0]).toFixed(2)
    ),
    avgFps: Number((fpsList.reduce((a, b) => a + b, 0) / fpsList.length).toFixed(1)),
    minFps: Math.min(...fpsList),
    totalLongTasks: lastSample.longTasks,
    avgRenderTime: Number(
      (renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length).toFixed(2)
    ),
    webVitals: {
      LCP: lastSample.webVitals.LCP,
      CLS: lastSample.webVitals.CLS,
      INP: lastSample.webVitals.INP,
    },
  };
}

function printResults(result: TestResult): void {
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const red = "\x1b[31m";
  const dim = "\x1b[2m";

  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║          📊 Performance Test Results                          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  console.log(`\n${bold}📍 URL:${reset} ${result.url}`);
  console.log(
    `${bold}⏱️  Duration:${reset} ${(result.duration / 1000 / 60).toFixed(1)} minutes`
  );
  console.log(`${bold}📈 Samples:${reset} ${result.samples.length}`);

  // Memory
  console.log(`\n${bold}── Memory ──${reset}`);
  const memColor =
    result.summary.memoryGrowthMB > 50
      ? red
      : result.summary.memoryGrowthMB > 20
        ? yellow
        : green;
  console.log(`  Average:  ${result.summary.avgMemoryMB} MB`);
  console.log(`  Maximum:  ${result.summary.maxMemoryMB} MB`);
  console.log(`  ${memColor}Growth:   ${result.summary.memoryGrowthMB} MB${reset}`);

  // FPS
  console.log(`\n${bold}── FPS ──${reset}`);
  const fpsColor =
    result.summary.minFps < 30
      ? red
      : result.summary.minFps < 50
        ? yellow
        : green;
  console.log(`  Average:  ${result.summary.avgFps}`);
  console.log(`  ${fpsColor}Minimum:  ${result.summary.minFps}${reset}`);

  // Performance
  console.log(`\n${bold}── Performance ──${reset}`);
  console.log(`  Long Tasks:     ${result.summary.totalLongTasks}`);
  console.log(`  Avg Render:     ${result.summary.avgRenderTime} ms`);

  // Web Vitals
  console.log(`\n${bold}── Core Web Vitals ──${reset}`);
  const lcp = result.summary.webVitals.LCP;
  const cls = result.summary.webVitals.CLS;
  const inp = result.summary.webVitals.INP;

  const lcpColor = !lcp ? dim : lcp <= 2500 ? green : lcp <= 4000 ? yellow : red;
  const clsColor = cls === null ? dim : cls <= 0.1 ? green : cls <= 0.25 ? yellow : red;
  const inpColor = !inp ? dim : inp <= 200 ? green : inp <= 500 ? yellow : red;

  console.log(`  ${lcpColor}LCP: ${lcp?.toFixed(0) ?? "-"} ms${reset}`);
  console.log(`  ${clsColor}CLS: ${cls?.toFixed(3) ?? "-"}${reset}`);
  console.log(`  ${inpColor}INP: ${inp?.toFixed(0) ?? "-"} ms${reset}`);

  // Console Errors
  if (result.console.errors.length > 0) {
    console.log(`\n${bold}── Console Errors (${result.console.errors.length}) ──${reset}`);
    result.console.errors.slice(0, 5).forEach((e) => {
      console.log(`  ${red}❌${reset} ${dim}${e.substring(0, 80)}${reset}`);
    });
  }

  if (result.console.warnings.length > 0) {
    console.log(`\n${bold}── Warnings (${result.console.warnings.length}) ──${reset}`);
    result.console.warnings.slice(0, 3).forEach((w) => {
      console.log(`  ${yellow}⚠️${reset} ${dim}${w.substring(0, 80)}${reset}`);
    });
  }

  console.log("\n");
}

function saveResults(result: TestResult): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(
    CONFIG.outputDir,
    `interactive-perf-${timestamp}.json`
  );
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`📄 Results saved: ${filePath}`);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const step3 = CONFIG.autoStart
    ? "3. 빌더 화면 감지 후 5초 뒤 자동 시작                      "
    : "3. 빌더 화면에서 준비가 되면 터미널에서 Enter를 누르세요     ";

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🚀 Interactive Performance Test with Playwright         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   1. 브라우저가 열립니다                                       ║
║   2. 로그인하고 프로젝트를 생성하세요                          ║
║   ${step3}║
║   4. 성능 테스트가 ${(CONFIG.duration / 1000 / 60).toString().padEnd(3)} 분간 진행됩니다                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ["--enable-precise-memory-info"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  // Console 로그 수집
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") consoleErrors.push(msg.text());
    else if (type === "warning") consoleWarnings.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // 성능 모니터 주입
  await injectPerformanceMonitor(page);

  // 초기 페이지 로드
  console.log("🌐 Opening browser...\n");
  await page.goto(CONFIG.baseUrl);

  // 사용자 작업 대기
  console.log("👆 브라우저에서 로그인하고 프로젝트를 생성하세요.");
  console.log("   빌더 화면(/builder/...)에 도달하면 자동 감지됩니다.\n");

  // 빌더 URL 감지 대기
  let builderDetected = false;
  const detectTimeout = 10 * 60 * 1000; // 10분
  const detectStart = Date.now();

  while (!builderDetected && Date.now() - detectStart < detectTimeout) {
    const currentUrl = page.url();
    if (currentUrl.includes("/builder/")) {
      builderDetected = true;
      console.log(`✅ 빌더 감지됨: ${currentUrl}\n`);
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (!builderDetected) {
    console.log("⚠️  빌더 URL이 감지되지 않았습니다.");
  }

  if (CONFIG.autoStart) {
    console.log("🎯 --auto-start 옵션: 5초 후 자동으로 테스트를 시작합니다...\n");
    await page.waitForTimeout(5000);
  } else {
    await waitForUserInput(
      "🎯 준비가 되면 Enter를 눌러 성능 테스트를 시작하세요..."
    );
  }

  // 성능 테스트 시작
  console.log("\n🔬 성능 테스트 시작...\n");
  const testUrl = page.url();
  const startTime = new Date();
  const samples: PerformanceMetrics[] = [];

  const testStartMs = Date.now();
  let lastSampleTime = 0;
  let sampleCount = 0;

  while (Date.now() - testStartMs < CONFIG.duration) {
    const elapsed = Date.now() - testStartMs;

    // 샘플링
    if (elapsed - lastSampleTime >= CONFIG.sampleInterval) {
      lastSampleTime = elapsed;
      sampleCount++;

      try {
        const metrics = await collectMetrics(page, context);
        samples.push(metrics);

        const progress = ((elapsed / CONFIG.duration) * 100).toFixed(0);
        const memMB = metrics.memory.jsHeapUsedMB;
        const fps = metrics.fps;

        process.stdout.write(
          `\r  [${progress.padStart(3)}%] Memory: ${memMB.toString().padStart(6)} MB | FPS: ${fps.toString().padStart(2)} | Samples: ${sampleCount}`
        );
      } catch (e) {
        console.log(`\n  ⚠️  샘플링 오류: ${e}`);
      }
    }

    // 자동 액션 (옵션)
    if (CONFIG.autoActions) {
      await performRandomActions(page);
    }

    await page.waitForTimeout(500);
  }

  console.log("\n\n✅ 테스트 완료!\n");

  const endTime = new Date();
  const result: TestResult = {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: Date.now() - testStartMs,
    url: testUrl,
    samples,
    summary: calculateSummary(samples),
    console: {
      errors: consoleErrors,
      warnings: consoleWarnings,
    },
  };

  // 결과 출력
  printResults(result);

  // 결과 저장
  saveResults(result);

  // 스크린샷
  const screenshotPath = path.join(CONFIG.outputDir, "final-screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot: ${screenshotPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
