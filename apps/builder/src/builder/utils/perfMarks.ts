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
    const duration = performance.now() - start;
    performance.mark(endMark);
    try {
      performance.measure(`composition:${label}`, beginMark, endMark);
    } catch {
      // User Timing API quota exceeded — safe to ignore
    }
    record(label, duration);
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
    const duration = performance.now() - start;
    record(label, duration);
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
  const duration = performance.now() - beginTimestamp;
  record(label, duration);
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

// Global exposure for DevTools console inspection.
// `window.__composition_PERF__.snapshot("input.pointerdown")`
if (typeof window !== "undefined") {
  const w = window as unknown as {
    __composition_PERF__?: {
      snapshot: typeof getSnapshot;
      snapshotAll: typeof getAllSnapshots;
      reset: typeof resetPerfMarks;
      observe: typeof observe;
    };
  };
  w.__composition_PERF__ = {
    snapshot: getSnapshot,
    snapshotAll: getAllSnapshots,
    reset: resetPerfMarks,
    observe,
  };
}
