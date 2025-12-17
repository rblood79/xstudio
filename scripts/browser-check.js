// scripts/browser-check.js
const { chromium } = require("playwright");
const fs = require("fs");

async function checkPage(url = "http://localhost:5173", options = {}) {
  const { quick = false, screenshot = true, json = false } = options;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    url,
    timestamp: new Date().toISOString(),
    console: { errors: [], warnings: [], logs: [] },
    network: { requests: [], totalSize: 0 },
    webVitals: {},
    memory: {},
  };

  // Console 로그 수집
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") results.console.errors.push(msg.text());
    else if (type === "warning") results.console.warnings.push(msg.text());
    else results.console.logs.push(msg.text());
  });
  page.on("pageerror", (err) => results.console.errors.push(err.message));

  // Network 요청 수집
  if (!quick) {
    const requestStart = new Map();
    page.on("request", (req) => requestStart.set(req.url(), Date.now()));
    page.on("response", async (res) => {
      const size = (await res.body().catch(() => Buffer.alloc(0))).length;
      results.network.requests.push({
        url: res.url().substring(0, 80),
        status: res.status(),
        size,
      });
      results.network.totalSize += size;
    });
  }

  // 전체 성능 측정 모드
  if (!quick) {
    const client = await context.newCDPSession(page);
    await client.send("Performance.enable");

    // Web Vitals 측정 스크립트 주입
    await page.addInitScript(() => {
      window.__webVitals = {
        LCP: null,
        CLS: 0,
        INP: null,
        FCP: null,
        TTFB: null,
        FID: null,
        lcpElement: null,
        clsEntries: [],
        inpEntries: [],
      };

      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.__webVitals.LCP = lastEntry.startTime;
        window.__webVitals.lcpElement = lastEntry.element?.tagName || "unknown";
      }).observe({ type: "largest-contentful-paint", buffered: true });

      // CLS
      let clsValue = 0,
        sessionValue = 0,
        sessionEntries = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            const firstEntry = sessionEntries[0];
            const lastEntry = sessionEntries[sessionEntries.length - 1];
            if (
              sessionValue &&
              entry.startTime - lastEntry?.startTime < 1000 &&
              entry.startTime - firstEntry?.startTime < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              window.__webVitals.clsEntries = sessionEntries.map((e) => ({
                value: e.value,
                sources: e.sources?.map((s) => s.node?.tagName) || [],
              }));
            }
          }
        }
        window.__webVitals.CLS = clsValue;
      }).observe({ type: "layout-shift", buffered: true });

      // INP
      const inpEntries = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) {
            inpEntries.push({
              duration: entry.duration,
              name: entry.name,
              target: entry.target?.tagName || "unknown",
            });
          }
        }
        if (inpEntries.length > 0) {
          const sorted = [...inpEntries].sort(
            (a, b) => b.duration - a.duration
          );
          window.__webVitals.INP =
            sorted[Math.floor(sorted.length * 0.02)]?.duration;
          window.__webVitals.inpEntries = sorted.slice(0, 5);
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });

      // FCP
      new PerformanceObserver((list) => {
        const fcp = list
          .getEntries()
          .find((e) => e.name === "first-contentful-paint");
        if (fcp) window.__webVitals.FCP = fcp.startTime;
      }).observe({ type: "paint", buffered: true });

      // FID
      new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        if (entry)
          window.__webVitals.FID = entry.processingStart - entry.startTime;
      }).observe({ type: "first-input", buffered: true });
    });
  }

  // 페이지 로드
  const startTime = Date.now();
  await page.goto(url, { waitUntil: "networkidle" });
  results.loadTime = Date.now() - startTime;

  if (!quick) {
    // TTFB
    results.webVitals.TTFB = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return nav ? nav.responseStart - nav.requestStart : null;
    });

    // 사용자 상호작용 시뮬레이션 (INP 측정)
    console.log("🖱️  Simulating interactions...");
    for (const selector of ["button", "a", '[role="button"]', "input"]) {
      const elements = await page.$$(selector);
      for (const el of elements.slice(0, 3)) {
        await el.click({ timeout: 300 }).catch(() => {});
        await page.waitForTimeout(50);
      }
    }

    // 스크롤 (CLS 측정)
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight / 2)
    );
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Web Vitals 수집
    const vitals = await page.evaluate(() => window.__webVitals);
    results.webVitals = { ...results.webVitals, ...vitals };

    // Memory 메트릭
    const client = await context.newCDPSession(page);
    const metrics = await client.send("Performance.getMetrics");
    const m = Object.fromEntries(metrics.metrics.map((x) => [x.name, x.value]));
    results.memory = {
      jsHeapUsedMB: (m.JSHeapUsedSize / 1024 / 1024).toFixed(2),
      jsHeapTotalMB: (m.JSHeapTotalSize / 1024 / 1024).toFixed(2),
      domNodes: m.Nodes,
      eventListeners: m.JSEventListeners,
      layoutCount: m.LayoutCount,
      styleRecalcCount: m.RecalcStyleCount,
    };
  }

  // 스크린샷
  if (screenshot) {
    await page.screenshot({ path: "scripts/screenshot.png", fullPage: true });
  }

  await browser.close();

  // 출력
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printResults(results, quick);
  }

  // JSON 저장 (전체 모드만)
  if (!quick) {
    fs.writeFileSync(
      "scripts/perf-report.json",
      JSON.stringify(results, null, 2)
    );
  }

  return results;
}

function getGrade(metric, value) {
  if (value == null) return { grade: "-", color: "\x1b[90m" };
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
    FID: { good: 100, poor: 300 },
  };
  const t = thresholds[metric];
  if (!t) return { grade: "-", color: "\x1b[90m" };
  if (value <= t.good) return { grade: "Good", color: "\x1b[32m" };
  if (value <= t.poor) return { grade: "Needs Work", color: "\x1b[33m" };
  return { grade: "Poor", color: "\x1b[31m" };
}

function printResults(r, quick) {
  const reset = "\x1b[0m",
    bold = "\x1b[1m",
    dim = "\x1b[2m";

  console.log(
    "\n╔═══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    `║  ${quick ? "⚡ Quick Check" : "🔍 Full Performance Report"}`.padEnd(64) +
      "║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝"
  );

  console.log(`\n📍 ${r.url}`);
  console.log(`⏱️  Load: ${r.loadTime} ms`);

  // Console
  console.log(`\n${bold}── Console ──${reset}`);
  const errColor = r.console.errors.length ? "\x1b[31m" : "\x1b[32m";
  const warnColor = r.console.warnings.length ? "\x1b[33m" : "\x1b[32m";
  console.log(`${errColor}❌ Errors: ${r.console.errors.length}${reset}`);
  r.console.errors
    .slice(0, 5)
    .forEach((e) => console.log(`   ${dim}${e.substring(0, 100)}${reset}`));
  console.log(`${warnColor}⚠️  Warnings: ${r.console.warnings.length}${reset}`);

  if (!quick) {
    // Core Web Vitals
    console.log(`\n${bold}── Core Web Vitals ──${reset}`);
    const printMetric = (name, value, unit = "ms", desc = "") => {
      const { grade, color } = getGrade(name, value);
      const v =
        value != null
          ? unit === "ms"
            ? value.toFixed(0)
            : value.toFixed(3)
          : "-";
      console.log(
        `  ${color}${name.padEnd(5)}${reset} ${v.padStart(8)} ${unit.padEnd(
          3
        )} ${color}[${grade}]${reset} ${dim}${desc}${reset}`
      );
    };

    printMetric("LCP", r.webVitals.LCP, "ms", "Largest Contentful Paint");
    if (r.webVitals.lcpElement)
      console.log(`        ${dim}└─ <${r.webVitals.lcpElement}>${reset}`);
    printMetric("CLS", r.webVitals.CLS, "", "Cumulative Layout Shift");
    printMetric("INP", r.webVitals.INP, "ms", "Interaction to Next Paint");
    if (r.webVitals.inpEntries?.[0]) {
      const s = r.webVitals.inpEntries[0];
      console.log(
        `        ${dim}└─ ${s.name} on <${s.target}> (${s.duration}ms)${reset}`
      );
    }
    printMetric("TTFB", r.webVitals.TTFB, "ms", "Time to First Byte");
    printMetric("FCP", r.webVitals.FCP, "ms", "First Contentful Paint");

    // Memory
    console.log(`\n${bold}── Memory ──${reset}`);
    console.log(
      `  Heap: ${r.memory.jsHeapUsedMB} / ${r.memory.jsHeapTotalMB} MB`
    );
    console.log(
      `  DOM Nodes: ${r.memory.domNodes} | Listeners: ${r.memory.eventListeners}`
    );

    // Network
    console.log(`\n${bold}── Network ──${reset}`);
    console.log(
      `  Requests: ${r.network.requests.length} | Size: ${(
        r.network.totalSize / 1024
      ).toFixed(1)} KB`
    );
  }

  console.log(`\n📸 scripts/screenshot.png`);
  if (!quick) console.log(`📄 scripts/perf-report.json`);
  console.log("");
}

// CLI 파싱
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) || "http://localhost:5173";
const options = {
  quick: args.includes("--quick") || args.includes("-q"),
  screenshot: !args.includes("--no-screenshot"),
  json: args.includes("--json"),
};

checkPage(url, options);
