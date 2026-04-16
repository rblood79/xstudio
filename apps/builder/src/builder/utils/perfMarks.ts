/**
 * Performance Marks — labeled duration tracker
 *
 * ADR-069 Phase 0 measurement infrastructure.
 *
 * Purpose: automate Gate G1/G2 verification without relying on manual
 * Chrome DevTools Performance recordings. Captures labeled durations,
 * maintains ring buffer per label, and exposes p50/p95/p99/violation
 * statistics via `window.__composition_PERF__`.
 *
 * Overhead: two `performance.now()` + one array push per observation.
 * Negligible relative to the work being measured. Enabled in both dev
 * and prod — production snapshots are the primary data source for the
 * ADR's gates.
 *
 * Usage:
 *   observe("input.pointerdown", () => handlePointerDown(event));
 *   // Later in DevTools console:
 *   window.__composition_PERF__.snapshot("input.pointerdown");
 */

const BUFFER_SIZE = 1000;
const VIOLATION_THRESHOLDS = [50, 100] as const;

// --- Long Task correlation (ADR-069 Phase 2 관찰성 2.0) ---
//
// observe() wrapper는 함수 본체 duration만 측정한다. Chrome이 집계하는
// "task 전체 시간"은 wrapper 종료 직후 동기적으로 이어지는 React commit +
// subscriber fan-out + scheduler.development.js message handler를 포함한다.
// 따라서 PerformanceObserver('longtask')로 task 경계를 직접 관찰하고,
// 최근 observe() 호출 trace와 시간 겹침으로 분류한다.
const TRACE_RING_MAX = 256;
const TRACE_AGE_WINDOW_MS = 5_000;

interface LabelBuffer {
  /** Ring buffer of recent durations (ms). Newest entries at the end. */
  durations: number[];
  /** Running total samples seen (can exceed BUFFER_SIZE). */
  totalCount: number;
  /** Count of durations exceeding 50 ms threshold. */
  violations50ms: number;
  /** Count of durations exceeding 100 ms threshold. */
  violations100ms: number;
}

interface MeasurementTrace {
  label: string;
  start: number;
  end: number;
}

export interface PerfSnapshot {
  label: string;
  /** Samples retained in ring buffer (capped at BUFFER_SIZE). */
  count: number;
  /** Total samples observed (uncapped). */
  totalCount: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** Count of durations > 50 ms (Chrome Violation threshold). */
  violations50ms: number;
  /** Count of durations > 100 ms (severe). */
  violations100ms: number;
}

const buffers = new Map<string, LabelBuffer>();
const measurementTraces: MeasurementTrace[] = [];

function pushTrace(label: string, start: number, end: number): void {
  measurementTraces.push({ label, start, end });
  // Drop aged-out entries (older than window) from the head.
  const cutoff = end - TRACE_AGE_WINDOW_MS;
  while (measurementTraces.length > 0 && measurementTraces[0].end < cutoff) {
    measurementTraces.shift();
  }
  // Cap overall size (defensive).
  while (measurementTraces.length > TRACE_RING_MAX) {
    measurementTraces.shift();
  }
}

function getOrCreateBuffer(label: string): LabelBuffer {
  let buf = buffers.get(label);
  if (!buf) {
    buf = {
      durations: [],
      totalCount: 0,
      violations50ms: 0,
      violations100ms: 0,
    };
    buffers.set(label, buf);
  }
  return buf;
}

function record(label: string, duration: number): void {
  const buf = getOrCreateBuffer(label);
  buf.durations.push(duration);
  if (buf.durations.length > BUFFER_SIZE) {
    buf.durations.shift();
  }
  buf.totalCount += 1;
  if (duration > VIOLATION_THRESHOLDS[0]) buf.violations50ms += 1;
  if (duration > VIOLATION_THRESHOLDS[1]) buf.violations100ms += 1;
}

/**
 * Wrap a synchronous function and record its duration under `label`.
 * Also emits `performance.measure()` so durations appear in DevTools
 * Performance panel flame graph (bonus observability).
 */
export function observe<T>(label: string, fn: () => T): T {
  const beginMark = `composition:${label}:begin`;
  const endMark = `composition:${label}:end`;
  const start = performance.now();
  try {
    performance.mark(beginMark);
    return fn();
  } finally {
    const end = performance.now();
    const duration = end - start;
    performance.mark(endMark);
    try {
      performance.measure(`composition:${label}`, beginMark, endMark);
    } catch {
      // User Timing API quota exceeded — safe to ignore
    }
    record(label, duration);
    pushTrace(label, start, end);
  }
}

/**
 * Async variant — duration covers the promise resolution.
 */
export async function observeAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const end = performance.now();
    record(label, end - start);
    pushTrace(label, start, end);
  }
}

/**
 * Manual markers for regions that cannot be expressed as a single function
 * (e.g., rAF body spread across conditional branches).
 */
export function markBegin(): number {
  return performance.now();
}

export function markEnd(label: string, beginTimestamp: number): number {
  const end = performance.now();
  const duration = end - beginTimestamp;
  record(label, duration);
  pushTrace(label, beginTimestamp, end);
  return duration;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export function getSnapshot(label: string): PerfSnapshot | null {
  const buf = buffers.get(label);
  if (!buf || buf.durations.length === 0) return null;
  const sorted = [...buf.durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    label,
    count: sorted.length,
    totalCount: buf.totalCount,
    mean: Number((sum / sorted.length).toFixed(2)),
    p50: Number(percentile(sorted, 0.5).toFixed(2)),
    p95: Number(percentile(sorted, 0.95).toFixed(2)),
    p99: Number(percentile(sorted, 0.99).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    violations50ms: buf.violations50ms,
    violations100ms: buf.violations100ms,
  };
}

export function getAllSnapshots(): PerfSnapshot[] {
  return [...buffers.keys()]
    .map((label) => getSnapshot(label))
    .filter((s): s is PerfSnapshot => s !== null);
}

export function resetPerfMarks(label?: string): void {
  if (label) {
    buffers.delete(label);
  } else {
    buffers.clear();
  }
}

// ============================================================
// Long Task Observer (ADR-069 Phase 2 관찰성 2.0)
// ============================================================
//
// Chrome은 50ms 초과 task를 Violation으로 보고한다. observe() wrapper는
// 함수 본체만 측정하므로, wrapper 종료 이후의 React commit + subscriber
// fan-out + scheduler message handler를 놓친다. PerformanceObserver로
// task 전체를 잡고, 최근 observe() 호출 trace와 시간 겹침으로
// longtask.input / longtask.render / longtask.unclassified 로 분류한다.

interface LongTaskAttribution {
  containerType?: string;
  containerSrc?: string;
  containerId?: string;
  containerName?: string;
  name?: string;
}

interface LongTaskBuffer extends LabelBuffer {
  /** Script/container attribution counts — useful for inspection only. */
  attributions: Map<string, number>;
}

export interface LongTaskSnapshot extends PerfSnapshot {
  /** Top attributions (by frequency), up to 5 — for diagnostic inspection. */
  topAttributions: Array<{ name: string; count: number }>;
}

const longTaskBuffers = new Map<string, LongTaskBuffer>();
const LONG_TASK_LABELS = [
  "longtask.input",
  "longtask.render",
  "longtask.unclassified",
] as const;
type LongTaskLabel = (typeof LONG_TASK_LABELS)[number];

function getOrCreateLongTaskBuffer(label: LongTaskLabel): LongTaskBuffer {
  let buf = longTaskBuffers.get(label);
  if (!buf) {
    buf = {
      durations: [],
      totalCount: 0,
      violations50ms: 0,
      violations100ms: 0,
      attributions: new Map(),
    };
    longTaskBuffers.set(label, buf);
  }
  return buf;
}

function classifyLongTask(startTime: number, duration: number): LongTaskLabel {
  const end = startTime + duration;
  // Find the trace with the largest overlap with the longtask window.
  let bestLabel: string | null = null;
  let bestOverlap = 0;
  for (const trace of measurementTraces) {
    const overlap = Math.min(trace.end, end) - Math.max(trace.start, startTime);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestLabel = trace.label;
    }
  }
  if (bestLabel) {
    if (bestLabel.startsWith("input.")) return "longtask.input";
    if (bestLabel.startsWith("render.")) return "longtask.render";
  }
  return "longtask.unclassified";
}

function recordLongTask(entry: PerformanceEntry): void {
  const duration = entry.duration;
  const label = classifyLongTask(entry.startTime, duration);
  const buf = getOrCreateLongTaskBuffer(label);
  buf.durations.push(duration);
  if (buf.durations.length > BUFFER_SIZE) buf.durations.shift();
  buf.totalCount += 1;
  if (duration > VIOLATION_THRESHOLDS[0]) buf.violations50ms += 1;
  if (duration > VIOLATION_THRESHOLDS[1]) buf.violations100ms += 1;
  // Attribution capture — optional per spec, mostly empty for SPA main-document tasks.
  const attrs = (entry as unknown as { attribution?: LongTaskAttribution[] })
    .attribution;
  if (attrs && attrs.length > 0) {
    const first = attrs[0];
    const key =
      first.containerSrc ||
      first.containerName ||
      first.containerId ||
      first.containerType ||
      first.name ||
      "self";
    buf.attributions.set(key, (buf.attributions.get(key) ?? 0) + 1);
  }
}

export function getLongTaskSnapshot(
  label: LongTaskLabel,
): LongTaskSnapshot | null {
  const buf = longTaskBuffers.get(label);
  if (!buf || buf.durations.length === 0) return null;
  const sorted = [...buf.durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const topAttributions = [...buf.attributions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  return {
    label,
    count: sorted.length,
    totalCount: buf.totalCount,
    mean: Number((sum / sorted.length).toFixed(2)),
    p50: Number(percentile(sorted, 0.5).toFixed(2)),
    p95: Number(percentile(sorted, 0.95).toFixed(2)),
    p99: Number(percentile(sorted, 0.99).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    violations50ms: buf.violations50ms,
    violations100ms: buf.violations100ms,
    topAttributions,
  };
}

export function getAllLongTaskSnapshots(): LongTaskSnapshot[] {
  return LONG_TASK_LABELS.map((label) => getLongTaskSnapshot(label)).filter(
    (s): s is LongTaskSnapshot => s !== null,
  );
}

export function resetLongTasks(label?: LongTaskLabel): void {
  if (label) {
    longTaskBuffers.delete(label);
  } else {
    longTaskBuffers.clear();
  }
}

let longTaskObserverStarted = false;

function initLongTaskObserver(): void {
  if (longTaskObserverStarted) return;
  if (typeof window === "undefined") return;
  if (typeof PerformanceObserver === "undefined") return;
  try {
    // Feature-detect 'longtask' support without throwing in unsupported browsers.
    const supported = (
      PerformanceObserver as unknown as {
        supportedEntryTypes?: readonly string[];
      }
    ).supportedEntryTypes;
    if (supported && !supported.includes("longtask")) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordLongTask(entry);
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
    longTaskObserverStarted = true;
  } catch {
    // Some browsers (Safari) throw on unsupported entryType — silently skip.
  }
}

// Global exposure for DevTools console inspection.
// `window.__composition_PERF__.snapshot("input.pointerdown")`
// `window.__composition_PERF__.snapshotLongTasks()`
if (typeof window !== "undefined") {
  const w = window as unknown as {
    __composition_PERF__?: {
      snapshot: typeof getSnapshot;
      snapshotAll: typeof getAllSnapshots;
      reset: typeof resetPerfMarks;
      observe: typeof observe;
      snapshotLongTask: typeof getLongTaskSnapshot;
      snapshotLongTasks: typeof getAllLongTaskSnapshots;
      resetLongTasks: typeof resetLongTasks;
    };
  };
  w.__composition_PERF__ = {
    snapshot: getSnapshot,
    snapshotAll: getAllSnapshots,
    reset: resetPerfMarks,
    observe,
    snapshotLongTask: getLongTaskSnapshot,
    snapshotLongTasks: getAllLongTaskSnapshots,
    resetLongTasks,
  };
  initLongTaskObserver();
}
