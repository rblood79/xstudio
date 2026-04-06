import { percentile } from "../utils/gpuProfilerCore";
import type { BenchmarkScenario } from "./scenarios";

export interface BenchmarkResult {
  scenario: string;
  fps: { p50: number; p95: number; p99: number };
  frameTime: { p50: number; p95: number; p99: number };
  memory: { jsHeapMB: number };
  scalingExponent?: number;
}

export function runBenchmark(
  scenario: BenchmarkScenario,
  onFrame: () => void,
): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const frameTimes: number[] = [];
    let lastTime = performance.now();
    let elapsed = 0;

    function tick() {
      const now = performance.now();
      const dt = now - lastTime;
      frameTimes.push(dt);
      lastTime = now;
      elapsed += dt;

      onFrame();

      if (elapsed < scenario.duration) {
        requestAnimationFrame(tick);
      } else {
        const mem = (
          performance as unknown as { memory?: { usedJSHeapSize: number } }
        ).memory;
        resolve({
          scenario: scenario.name,
          fps: {
            p50: Math.round(1000 / percentile(frameTimes, 50)),
            p95: Math.round(1000 / percentile(frameTimes, 95)),
            p99: Math.round(1000 / percentile(frameTimes, 99)),
          },
          frameTime: {
            p50: Math.round(percentile(frameTimes, 50) * 100) / 100,
            p95: Math.round(percentile(frameTimes, 95) * 100) / 100,
            p99: Math.round(percentile(frameTimes, 99) * 100) / 100,
          },
          memory: {
            jsHeapMB: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : -1,
          },
        });
      }
    }

    requestAnimationFrame(tick);
  });
}

export function computeScalingExponent(results: BenchmarkResult[]): number {
  const points = results
    .filter((r) => r.scenario.startsWith("static-"))
    .map((r) => ({
      logN: Math.log(parseInt(r.scenario.split("-")[1])),
      logT: Math.log(r.frameTime.p50),
    }));

  if (points.length < 2) return 1;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.logN, 0);
  const sumY = points.reduce((s, p) => s + p.logT, 0);
  const sumXY = points.reduce((s, p) => s + p.logN * p.logT, 0);
  const sumXX = points.reduce((s, p) => s + p.logN * p.logN, 0);

  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}
