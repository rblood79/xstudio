export interface ConstitutionalResult {
  invariant: string;
  passed: boolean;
  actual: number;
  threshold: number;
}

export const INVARIANTS = {
  fps_p95_min: 30,
  dragLatency_p99_max: 50,
  initialLoad_max: 3000,
  featureParity_min: 78,
  screenshotDiff_max: 0.001,
} as const;

export function checkConstitution(
  metrics: Record<string, number>,
): ConstitutionalResult[] {
  const results: ConstitutionalResult[] = [];

  for (const [key, threshold] of Object.entries(INVARIANTS)) {
    const actual = metrics[key] ?? 0;
    const isMin = key.endsWith("_min");
    const passed = isMin ? actual >= threshold : actual <= threshold;

    results.push({ invariant: key, passed, actual, threshold });
  }

  return results;
}

export function allPassed(results: ConstitutionalResult[]): boolean {
  return results.every((r) => r.passed);
}
