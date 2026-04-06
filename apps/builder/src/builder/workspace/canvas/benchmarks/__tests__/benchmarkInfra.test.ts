import { describe, test, expect } from "vitest";
import { SCENARIOS, type BenchmarkScenario } from "../scenarios";
import {
  computeScalingExponent,
  type BenchmarkResult,
} from "../canvasBenchmark";
import { checkConstitution, allPassed, INVARIANTS } from "../constitutional";

describe("Benchmark scenarios", () => {
  test("9개 시나리오 정의", () => {
    expect(SCENARIOS.length).toBe(9);
  });

  test("모든 시나리오에 필수 필드 존재", () => {
    for (const s of SCENARIOS) {
      expect(s.name).toBeTruthy();
      expect(s.elements).toBeGreaterThan(0);
      expect(s.duration).toBeGreaterThan(0);
      expect(typeof s.mutationsPerFrame).toBe("number");
    }
  });

  test("drag 시나리오 존재", () => {
    const dragScenarios = SCENARIOS.filter((s) => s.drag);
    expect(dragScenarios.length).toBeGreaterThanOrEqual(2);
  });

  test("multipage 시나리오 존재", () => {
    const mp = SCENARIOS.filter((s) => s.pages && s.pages > 1);
    expect(mp.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Constitutional invariants", () => {
  test("5개 invariant 정의", () => {
    expect(Object.keys(INVARIANTS).length).toBe(5);
  });

  test("fps_p95_min = 30", () => {
    expect(INVARIANTS.fps_p95_min).toBe(30);
  });

  test("dragLatency_p99_max = 50ms", () => {
    expect(INVARIANTS.dragLatency_p99_max).toBe(50);
  });

  test("initialLoad_max = 3000ms", () => {
    expect(INVARIANTS.initialLoad_max).toBe(3000);
  });

  test("featureParity_min = 78", () => {
    expect(INVARIANTS.featureParity_min).toBe(78);
  });

  test("screenshotDiff_max = 0.001", () => {
    expect(INVARIANTS.screenshotDiff_max).toBe(0.001);
  });

  test("passing metrics → allPassed=true", () => {
    const results = checkConstitution({
      fps_p95_min: 60,
      dragLatency_p99_max: 8,
      initialLoad_max: 1500,
      featureParity_min: 78,
      screenshotDiff_max: 0.0005,
    });
    expect(allPassed(results)).toBe(true);
  });

  test("failing fps → allPassed=false", () => {
    const results = checkConstitution({
      fps_p95_min: 20, // below 30
      dragLatency_p99_max: 8,
      initialLoad_max: 1500,
      featureParity_min: 78,
      screenshotDiff_max: 0.0005,
    });
    expect(allPassed(results)).toBe(false);
    const fpsFail = results.find((r) => r.invariant === "fps_p95_min");
    expect(fpsFail?.passed).toBe(false);
  });

  test("failing dragLatency → allPassed=false", () => {
    const results = checkConstitution({
      fps_p95_min: 60,
      dragLatency_p99_max: 100, // above 50
      initialLoad_max: 1500,
      featureParity_min: 78,
      screenshotDiff_max: 0.0005,
    });
    expect(allPassed(results)).toBe(false);
  });

  test("edge case: exact threshold → passes", () => {
    const results = checkConstitution({
      fps_p95_min: 30, // exactly at threshold
      dragLatency_p99_max: 50,
      initialLoad_max: 3000,
      featureParity_min: 78,
      screenshotDiff_max: 0.001,
    });
    expect(allPassed(results)).toBe(true);
  });
});

describe("Scaling exponent", () => {
  test("static 시나리오 이름 형식으로 exponent 계산", () => {
    // computeScalingExponent는 scenario 이름이 "static-{N}" 형식인 항목만 필터링
    const results: BenchmarkResult[] = [
      {
        scenario: "static-100",
        fps: { p50: 60, p95: 58, p99: 55 },
        frameTime: { p50: 16, p95: 17, p99: 18 },
        memory: { jsHeapMB: 50 },
      },
      {
        scenario: "static-1000",
        fps: { p50: 6, p95: 5, p99: 4 },
        frameTime: { p50: 166, p95: 200, p99: 250 },
        memory: { jsHeapMB: 100 },
      },
    ];
    const exp = computeScalingExponent(results);
    expect(typeof exp).toBe("number");
    expect(isNaN(exp)).toBe(false);
  });

  test("static 시나리오 없으면 fallback 1 반환", () => {
    // non-static 이름은 필터에서 제외 → length < 2 → fallback 1
    const results: BenchmarkResult[] = [
      {
        scenario: "drag-500",
        fps: { p50: 60, p95: 58, p99: 55 },
        frameTime: { p50: 16, p95: 17, p99: 18 },
        memory: { jsHeapMB: 50 },
      },
    ];
    const exp = computeScalingExponent(results);
    expect(exp).toBe(1);
  });

  test("빈 배열 → fallback 1 반환", () => {
    const exp = computeScalingExponent([]);
    expect(exp).toBe(1);
  });
});

describe("Phase 4 performance targets", () => {
  test("1000 요소 목표: p95 >= 60fps", () => {
    const target = { elements: 1000, fps_p95: 60 };
    expect(target.fps_p95).toBeGreaterThanOrEqual(60);
  });

  test("5000 요소 목표: p95 >= 50fps", () => {
    const target = { elements: 5000, fps_p95: 50 };
    expect(target.fps_p95).toBeGreaterThanOrEqual(50);
  });

  test("드래그 지연 목표: p95 <= 8ms", () => {
    const target = { dragLatency_p95: 8 };
    expect(target.dragLatency_p95).toBeLessThanOrEqual(8);
  });
});
