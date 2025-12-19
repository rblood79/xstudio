import fs from "fs";
import path from "path";
import { chromium, type Browser, type Page } from "playwright";

interface ViewportConfig {
  label: string;
  viewport: { width: number; height: number };
}

interface RunMode {
  label: "baseline" | "throttled";
  throttleMs: number;
}

interface PanelToggleSummary {
  resolution: string;
  mode: RunMode["label"];
  throttleMs: number;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  avgFps: number;
  maxFps: number;
  resizeCount: number;
  resizePerToggle: number;
  gcEvents: number;
  gcTotalDurationMs: number;
  forcedGcDurationMs: number | null;
  fpsSamples: number[];
  gcDurationsMs: number[];
  resizeTimestamps: Array<{ time: number; width: number; height: number }>;
}

interface ScriptOptions {
  baseUrl: string;
  toggleCount: number;
  toggleIntervalMs: number;
  settleDelayMs: number;
  headless: boolean;
  outputDir: string;
  throttleMs: number;
  panelAriaLabel: string;
}

const DEFAULT_VIEWPORTS: ViewportConfig[] = [
  { label: "low", viewport: { width: 1366, height: 768 } },
  { label: "4k", viewport: { width: 3840, height: 2160 } },
];

const RUN_MODES: RunMode[] = [
  { label: "baseline", throttleMs: 0 },
  { label: "throttled", throttleMs: 50 },
];

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);

  const getArg = (name: string, fallback: string): string => {
    const match = args.find((arg) => arg.startsWith(`--${name}=`));
    return match ? match.split("=")[1] : fallback;
  };

  const baseUrl = getArg("url", "http://localhost:5173/builder/dev");
  const toggleCount = Number.parseInt(getArg("toggles", "50"), 10) || 50;
  const toggleIntervalMs = Number.parseInt(getArg("interval", "120"), 10) || 120;
  const settleDelayMs = Number.parseInt(getArg("settle", "600"), 10) || 600;
  const throttleMs = Number.parseInt(getArg("throttle", "50"), 10) || 50;
  const headless = args.includes("--headless");
  const outputDir = getArg("output", "test-results/performance");
  const panelAriaLabel = getArg("panel", "속성|Properties");

  return {
    baseUrl,
    toggleCount,
    toggleIntervalMs,
    settleDelayMs,
    headless,
    outputDir,
    throttleMs,
    panelAriaLabel,
  };
}

async function injectPanelMetrics(page: Page, throttleMs: number): Promise<void> {
  await page.addInitScript(({ throttle }) => {
    (window as unknown as { __panelToggleConfig?: { throttleMs: number } }).__panelToggleConfig = {
      throttleMs: throttle,
    };

    const fpsSamples: number[] = [];
    const resizeTimestamps: Array<{ time: number; width: number; height: number }> = [];
    const gcDurationsMs: number[] = [];
    let rafHandle = 0;
    let gcObserver: PerformanceObserver | null = null;

    const metrics = {
      start() {
        fpsSamples.length = 0;
        resizeTimestamps.length = 0;
        gcDurationsMs.length = 0;

        let frameCount = 0;
        let lastMark = performance.now();
        const loop = () => {
          frameCount += 1;
          const now = performance.now();
          if (now - lastMark >= 1000) {
            fpsSamples.push(frameCount);
            frameCount = 0;
            lastMark = now;
          }
          rafHandle = requestAnimationFrame(loop);
        };
        rafHandle = requestAnimationFrame(loop);

        if (typeof PerformanceObserver !== "undefined") {
          try {
            gcObserver = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                gcDurationsMs.push(entry.duration);
              }
            });
            gcObserver.observe({ entryTypes: ["gc"], buffered: true });
          } catch (error) {
            console.warn("[panel-metrics] GC observer unavailable", error);
          }
        }
      },
      stop() {
        if (rafHandle) {
          cancelAnimationFrame(rafHandle);
          rafHandle = 0;
        }
        gcObserver?.disconnect();
        gcObserver = null;
      },
      summarize(meta: Record<string, unknown>) {
        const avgFps = fpsSamples.length
          ? fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length
          : 0;
        const maxFps = fpsSamples.length ? Math.max(...fpsSamples) : 0;
        const gcTotalDurationMs = gcDurationsMs.reduce((sum, value) => sum + value, 0);

        return {
          ...meta,
          avgFps,
          maxFps,
          resizeCount: resizeTimestamps.length,
          resizeTimestamps: [...resizeTimestamps],
          fpsSamples: [...fpsSamples],
          gcEvents: gcDurationsMs.length,
          gcDurationsMs: [...gcDurationsMs],
          gcTotalDurationMs,
        };
      },
      recordResize(width: number, height: number) {
        resizeTimestamps.push({ time: performance.now(), width, height });
      },
    };

    const patchRenderer = () => {
      const globalPixi = (window as unknown as { PIXI?: unknown }).PIXI as
        | { Renderer?: { prototype?: { resize?: (...args: number[]) => void } } }
        | undefined;
      const resize = globalPixi?.Renderer?.prototype?.resize;
      if (!resize) return false;

      const throttleInterval = (window as unknown as { __panelToggleConfig?: { throttleMs: number } })
        .__panelToggleConfig?.throttleMs;
      let lastCall = 0;
      let scheduled: number | null = null;

      globalPixi.Renderer!.prototype.resize = function patchedResize(width: number, height: number) {
        const invoke = () => {
          metrics.recordResize(width, height);
          return resize.call(this, width, height);
        };

        if (!throttleInterval) {
          lastCall = performance.now();
          return invoke();
        }

        const now = performance.now();
        const elapsed = now - lastCall;
        if (elapsed >= throttleInterval) {
          lastCall = now;
          return invoke();
        }

        if (scheduled) {
          clearTimeout(scheduled);
        }
        scheduled = window.setTimeout(() => {
          lastCall = performance.now();
          scheduled = null;
          invoke();
        }, throttleInterval - elapsed);
        return undefined;
      };
      return true;
    };

    let attempts = 0;
    const tryPatchInterval = window.setInterval(() => {
      attempts += 1;
      if (patchRenderer()) {
        window.clearInterval(tryPatchInterval);
      } else if (attempts > 50) {
        console.warn("[panel-metrics] PIXI.Renderer.patch 실패 - 글로벌 PIXI 확인 필요");
        window.clearInterval(tryPatchInterval);
      }
    }, 200);

    (window as unknown as { __panelToggleMetrics?: typeof metrics }).__panelToggleMetrics = metrics;
  }, { throttle: throttleMs });
}

async function performToggleRun(
  browser: Browser,
  viewportConfig: ViewportConfig,
  mode: RunMode,
  options: ScriptOptions
): Promise<PanelToggleSummary> {
  const context = await browser.newContext({
    viewport: viewportConfig.viewport,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    // DevTools performance timeline에서 GC 이벤트를 수집할 수 있도록 노출
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).collectGarbage = () => (window as any).gc?.();
  });

  const page = await context.newPage();
  await injectPanelMetrics(page, mode.throttleMs);

  await page.goto(options.baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".panel-nav", { timeout: 30000 });

  await page.evaluate(() => (window as unknown as { __panelToggleMetrics: { start: () => void } }).__panelToggleMetrics.start());

  const panelButton = page.getByRole("button", { name: new RegExp(options.panelAriaLabel, "i") });
  if ((await panelButton.count()) === 0) {
    throw new Error(`패널 토글 버튼을 찾지 못했습니다: ${options.panelAriaLabel}`);
  }

  for (let i = 0; i < options.toggleCount; i += 1) {
    await panelButton.first().click();
    await page.waitForTimeout(options.toggleIntervalMs);
  }

  await page.waitForTimeout(options.settleDelayMs);

  const forcedGcDurationMs = await page.evaluate(() => {
    const gcFn = (window as unknown as { gc?: () => void }).gc;
    if (typeof gcFn === "function") {
      const start = performance.now();
      gcFn();
      return performance.now() - start;
    }
    return null;
  });

  const summary = await page.evaluate(
    ({ viewport, modeLabel, throttle, toggles }: { viewport: { width: number; height: number }; modeLabel: string; throttle: number; toggles: number }) => {
      const metrics = (window as unknown as { __panelToggleMetrics: { stop: () => void; summarize: (meta: Record<string, unknown>) => unknown } })
        .__panelToggleMetrics;
      metrics.stop();
      return metrics.summarize({
        viewport,
        mode: modeLabel,
        throttleMs: throttle,
        toggleCount: toggles,
        devicePixelRatio: window.devicePixelRatio,
      });
    },
    {
      viewport: viewportConfig.viewport,
      modeLabel: mode.label,
      throttle: mode.throttleMs,
      toggles: options.toggleCount,
    }
  ) as PanelToggleSummary;

  await context.close();

  return {
    ...summary,
    resolution: viewportConfig.label,
    mode: mode.label,
    throttleMs: mode.throttleMs,
    viewport: viewportConfig.viewport,
    devicePixelRatio: summary.devicePixelRatio,
    resizePerToggle: summary.resizeCount / options.toggleCount,
    forcedGcDurationMs,
  };
}

function ensureOutputDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createChartHtml(results: PanelToggleSummary[], options: ScriptOptions): string {
  const labels = Array.from(new Set(results.map((result) => result.resolution)));
  const baselineFps = labels.map((label) => results.find((result) => result.resolution === label && result.mode === "baseline")?.avgFps ?? 0);
  const throttledFps = labels.map((label) => results.find((result) => result.resolution === label && result.mode === "throttled")?.avgFps ?? 0);
  const baselineResize = labels.map((label) => results.find((result) => result.resolution === label && result.mode === "baseline")?.resizePerToggle ?? 0);
  const throttledResize = labels.map((label) => results.find((result) => result.resolution === label && result.mode === "throttled")?.resizePerToggle ?? 0);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>Panel Toggle Performance</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@4.1.2"></script>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; }
      .chart { width: 960px; margin-bottom: 48px; }
      .meta { margin-bottom: 16px; color: #334155; }
      code { background: #f8fafc; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>패널 토글 성능 비교 (${options.toggleCount}회)</h1>
    <div class="meta">
      <div>기준 URL: <code>${options.baseUrl}</code></div>
      <div>패널: <code>${options.panelAriaLabel}</code> | 토글 간격: ${options.toggleIntervalMs}ms | 정착 대기: ${options.settleDelayMs}ms</div>
      <div>쓰로틀: ${options.throttleMs}ms 적용 시나리오 비교</div>
    </div>
    <div class="chart">
      <canvas id="fpsChart" height="360"></canvas>
    </div>
    <div class="chart">
      <canvas id="resizeChart" height="360"></canvas>
    </div>
    <script>
      const annotationPlugin = (window as any).chartjsPluginAnnotation || (window as any).ChartAnnotation;
      if (annotationPlugin) {
        Chart.register(annotationPlugin);
      }

      const labels = ${JSON.stringify(labels)};
      const fpsData = {
        labels,
        datasets: [
          {
            label: 'Baseline 평균 FPS',
            data: ${JSON.stringify(baselineFps)},
            backgroundColor: 'rgba(59, 130, 246, 0.35)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
          },
          {
            label: 'Throttled 평균 FPS',
            data: ${JSON.stringify(throttledFps)},
            backgroundColor: 'rgba(34, 197, 94, 0.35)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 2,
          },
        ],
      };

      const resizeData = {
        labels,
        datasets: [
          {
            label: 'Baseline resize/토글',
            data: ${JSON.stringify(baselineResize)},
            backgroundColor: 'rgba(248, 113, 113, 0.35)',
            borderColor: 'rgb(248, 113, 113)',
            borderWidth: 2,
          },
          {
            label: 'Throttled resize/토글',
            data: ${JSON.stringify(throttledResize)},
            backgroundColor: 'rgba(168, 85, 247, 0.35)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 2,
          },
        ],
      };

      const targetFps = 55;
      const resizeTarget = 1;

      const fpsCtx = document.getElementById('fpsChart');
      new Chart(fpsCtx, {
        type: 'line',
        data: fpsData,
        options: {
          plugins: {
            title: { display: true, text: '평균 FPS (토글 ${options.toggleCount}회)' },
            legend: { position: 'bottom' },
            annotation: {
              annotations: {
                fpsLine: {
                  type: 'line',
                  yMin: targetFps,
                  yMax: targetFps,
                  borderColor: 'rgba(34, 197, 94, 0.6)',
                  borderWidth: 2,
                  label: { display: true, content: '목표 FPS 55+' },
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, suggestedMax: 70 },
          },
        },
      });

      const resizeCtx = document.getElementById('resizeChart');
      new Chart(resizeCtx, {
        type: 'bar',
        data: resizeData,
        options: {
          plugins: {
            title: { display: true, text: 'renderer.resize 호출/토글' },
            legend: { position: 'bottom' },
            annotation: {
              annotations: {
                resizeLine: {
                  type: 'line',
                  yMin: resizeTarget,
                  yMax: resizeTarget,
                  borderColor: 'rgba(234, 179, 8, 0.8)',
                  borderWidth: 2,
                  label: { display: true, content: '1회/토글 목표' },
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    </script>
  </body>
</html>`;
}

async function main() {
  const options = parseArgs();
  ensureOutputDir(options.outputDir);

  const browser = await chromium.launch({
    headless: options.headless,
    args: ["--js-flags=--expose-gc"],
  });

  const results: PanelToggleSummary[] = [];

  for (const viewportConfig of DEFAULT_VIEWPORTS) {
    for (const mode of RUN_MODES.map((modeConfig) =>
      modeConfig.label === "throttled"
        ? { ...modeConfig, throttleMs: options.throttleMs }
        : modeConfig
    )) {
      const runResult = await performToggleRun(browser, viewportConfig, mode, {
        ...options,
        throttleMs: mode.throttleMs,
      });
      results.push(runResult);
      console.log(
        `✅ ${viewportConfig.label} / ${mode.label} → FPS(avg/max): ${runResult.avgFps.toFixed(
          1
        )}/${runResult.maxFps.toFixed(1)}, resize: ${runResult.resizePerToggle.toFixed(2)} per toggle`
      );
    }
  }

  await browser.close();

  const outputJson = {
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    toggleCount: options.toggleCount,
    toggleIntervalMs: options.toggleIntervalMs,
    settleDelayMs: options.settleDelayMs,
    throttleMs: options.throttleMs,
    results,
  };

  const jsonPath = path.join(options.outputDir, "panel-toggle-metrics.json");
  fs.writeFileSync(jsonPath, JSON.stringify(outputJson, null, 2));

  const chartHtml = createChartHtml(results, options);
  const chartPath = path.join(options.outputDir, "panel-toggle-report.html");
  fs.writeFileSync(chartPath, chartHtml, "utf-8");

  console.log("\n보고서 출력:");
  console.log("- JSON:", jsonPath);
  console.log("- 그래프:", chartPath);
}

main().catch((error) => {
  console.error("패널 토글 성능 측정 실패", error);
  process.exit(1);
});
