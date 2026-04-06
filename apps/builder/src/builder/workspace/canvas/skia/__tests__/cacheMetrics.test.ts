import { describe, test, expect, beforeEach } from "vitest";
import {
  CacheMetrics,
  getCacheMetrics,
  getAllCacheMetrics,
  resetAllCacheMetrics,
} from "../cacheMetrics";

describe("CacheMetrics", () => {
  let metrics: CacheMetrics;

  beforeEach(() => {
    metrics = new CacheMetrics("test");
  });

  test("initial hitRate is 1 (no requests)", () => {
    expect(metrics.hitRate).toBe(1);
  });

  test("hits increase hitRate", () => {
    metrics.recordHit();
    metrics.recordHit();
    metrics.recordMiss();
    expect(metrics.hitRate).toBeCloseTo(2 / 3, 3);
  });

  test("100% hit rate", () => {
    metrics.recordHit();
    metrics.recordHit();
    expect(metrics.hitRate).toBe(1);
  });

  test("0% hit rate", () => {
    metrics.recordMiss();
    metrics.recordMiss();
    expect(metrics.hitRate).toBe(0);
  });

  test("snapshot returns formatted data", () => {
    metrics.recordHit();
    metrics.recordHit();
    metrics.recordMiss();
    metrics.recordEviction();
    metrics.setSize(42);

    const snap = metrics.snapshot();
    expect(snap.name).toBe("test");
    expect(snap.hits).toBe(2);
    expect(snap.misses).toBe(1);
    expect(snap.hitRate).toBeCloseTo(66.67, 1);
    expect(snap.evictions).toBe(1);
    expect(snap.size).toBe(42);
  });

  test("reset clears all counters", () => {
    metrics.recordHit();
    metrics.recordMiss();
    metrics.reset();
    expect(metrics.hitRate).toBe(1);
    expect(metrics.totalRequests).toBe(0);
  });
});

describe("Cache metrics registry", () => {
  beforeEach(() => {
    resetAllCacheMetrics();
  });

  test("getCacheMetrics returns same instance for same name", () => {
    const a = getCacheMetrics("surface");
    const b = getCacheMetrics("surface");
    expect(a).toBe(b);
  });

  test("getAllCacheMetrics returns all registered", () => {
    getCacheMetrics("surface").recordHit();
    getCacheMetrics("paragraph").recordMiss();
    const all = getAllCacheMetrics();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.find((m) => m.name === "surface")).toBeTruthy();
    expect(all.find((m) => m.name === "paragraph")).toBeTruthy();
  });

  test("resetAllCacheMetrics resets all", () => {
    getCacheMetrics("x").recordHit();
    getCacheMetrics("y").recordMiss();
    resetAllCacheMetrics();
    for (const snap of getAllCacheMetrics()) {
      expect(snap.hits).toBe(0);
      expect(snap.misses).toBe(0);
    }
  });
});
