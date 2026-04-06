import { beforeEach, describe, expect, test } from "vitest";
import { LRUTextureCache } from "../gpuTextureCache";

describe("LRUTextureCache", () => {
  let cache: LRUTextureCache<{ id: string; delete?: () => void }>;

  beforeEach(() => {
    cache = new LRUTextureCache(1024, 10); // 1KB, 10 entries
  });

  test("get/set basic", () => {
    cache.set("a", { id: "a" }, 100);
    expect(cache.get("a")?.id).toBe("a");
    expect(cache.size).toBe(1);
  });

  test("miss returns undefined", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  test("VRAM tracking", () => {
    cache.set("a", { id: "a" }, 100);
    cache.set("b", { id: "b" }, 200);
    expect(cache.vramUsage).toBe(300);
  });

  test("eviction by maxEntries", () => {
    const smallCache = new LRUTextureCache(1024 * 1024, 3);
    smallCache.set("a", { id: "a" }, 10);
    smallCache.set("b", { id: "b" }, 10);
    smallCache.set("c", { id: "c" }, 10);
    smallCache.set("d", { id: "d" }, 10); // triggers eviction
    expect(smallCache.size).toBe(3);
    expect(smallCache.has("a")).toBe(false); // oldest evicted
  });

  test("eviction by maxSize", () => {
    const tinyCache = new LRUTextureCache(250, 100);
    tinyCache.set("a", { id: "a" }, 100);
    tinyCache.set("b", { id: "b" }, 100);
    tinyCache.set("c", { id: "c" }, 100); // triggers eviction (300 > 250)
    expect(tinyCache.size).toBe(2);
    expect(tinyCache.vramUsage).toBeLessThanOrEqual(250);
  });

  test("delete removes entry and updates VRAM", () => {
    cache.set("a", { id: "a" }, 100);
    cache.delete("a");
    expect(cache.size).toBe(0);
    expect(cache.vramUsage).toBe(0);
  });

  test("clear removes all", () => {
    cache.set("a", { id: "a" }, 100);
    cache.set("b", { id: "b" }, 200);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.vramUsage).toBe(0);
  });

  test("delete() called on evicted entries", () => {
    let deleted = false;
    const tinyCache = new LRUTextureCache(150, 100);
    tinyCache.set(
      "a",
      {
        id: "a",
        delete: () => {
          deleted = true;
        },
      },
      100,
    );
    tinyCache.set("b", { id: "b" }, 100); // evicts "a"
    expect(deleted).toBe(true);
  });

  test("hitRate tracking", () => {
    cache.set("a", { id: "a" }, 100);
    cache.getWithStats("a"); // hit
    cache.getWithStats("b"); // miss
    cache.getWithStats("a"); // hit
    expect(cache.hitRate).toBeCloseTo(2 / 3, 2);
  });

  test("vramUsageMB", () => {
    cache.set("a", { id: "a" }, 1024 * 1024); // 1MB
    expect(cache.vramUsageMB).toBe(1);
  });

  test("replace existing key updates VRAM", () => {
    cache.set("a", { id: "a1" }, 100);
    cache.set("a", { id: "a2" }, 200);
    expect(cache.size).toBe(1);
    expect(cache.vramUsage).toBe(200);
  });
});
