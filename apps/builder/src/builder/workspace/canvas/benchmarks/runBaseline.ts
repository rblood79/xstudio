import { SCENARIOS } from "./scenarios";
import {
  runBenchmark,
  computeScalingExponent,
  type BenchmarkResult,
} from "./canvasBenchmark";

export async function runFullBaseline(): Promise<{
  results: BenchmarkResult[];
  scalingExponent: number;
  timestamp: string;
}> {
  console.log("=== ADR-100 Baseline Benchmark ===\n");

  const results: BenchmarkResult[] = [];

  for (const scenario of SCENARIOS) {
    console.log(`Running: ${scenario.name}...`);
    const result = await runBenchmark(scenario, () => {});
    results.push(result);

    console.log(
      `  FPS: p50=${result.fps.p50} p95=${result.fps.p95} p99=${result.fps.p99}`,
    );
    console.log(
      `  Frame: p50=${result.frameTime.p50}ms p95=${result.frameTime.p95}ms`,
    );
    console.log(`  Memory: ${result.memory.jsHeapMB}MB`);
  }

  const scalingExponent = computeScalingExponent(results);
  console.log(`\nScaling exponent (b): ${scalingExponent.toFixed(3)}`);
  console.log("  b < 1.0 = sub-linear (good)");
  console.log("  b > 1.0 = super-linear (problem)");

  const output = {
    timestamp: new Date().toISOString(),
    results,
    scalingExponent,
  };

  console.log("\n=== Results JSON ===");
  console.log(JSON.stringify(output, null, 2));

  return output;
}
