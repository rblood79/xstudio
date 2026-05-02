/**
 * @fileoverview ResolverCache 단위 테스트 — ADR-903 P2 Stream C
 *
 * Stream B (cache.ts) 의 contract 를 검증한다:
 * - computeDescendantsFingerprint
 * - computeSlotBindingFingerprint
 * - createResolverCache (LRU, invalidation, stats)
 * - getSharedResolverCache / resetSharedResolverCache
 */

import { afterEach, describe, expect, it } from "vitest";
import type {
  CanonicalNode,
  ResolvedNode,
  ResolverCacheKey,
} from "@composition/shared";
import {
  computeDescendantsFingerprint,
  computeSlotBindingFingerprint,
  createResolverCache,
  getSharedResolverCache,
  resetSharedResolverCache,
} from "../cache";

// ──────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeKey(
  docVersion: string,
  rootRefId: string,
  desc = "",
  slot = "",
): ResolverCacheKey {
  return [docVersion, rootRefId, desc, slot] as const;
}

function makeResolvedNode(id: string): ResolvedNode {
  return { id, type: "Button" } as ResolvedNode;
}

function makeCanonicalNode(
  id: string,
  type: CanonicalNode["type"] = "Button",
): CanonicalNode {
  return { id, type };
}

// ──────────────────────────────────────────────────────────────────────────────
// computeDescendantsFingerprint
// ──────────────────────────────────────────────────────────────────────────────

describe("computeDescendantsFingerprint", () => {
  it("TC1: undefined 입력 → 빈 문자열 반환", () => {
    expect(computeDescendantsFingerprint(undefined)).toBe("");
  });

  it("TC2: 빈 객체 → 빈 문자열 반환", () => {
    expect(computeDescendantsFingerprint({})).toBe("");
  });

  it("TC3: 같은 입력 두 번 → 동일한 fingerprint (deterministic)", () => {
    const overrides = { label: { text: "OK" }, icon: { size: 16 } };
    const a = computeDescendantsFingerprint(overrides);
    const b = computeDescendantsFingerprint(overrides);
    expect(a).toBe(b);
    expect(a).not.toBe(""); // 실제 값이 있어야 함
  });

  it("TC4: key 순서가 다른 동일 객체 → 같은 fingerprint (정렬 보장)", () => {
    const a = computeDescendantsFingerprint({
      label: { text: "A" },
      icon: { size: 8 },
    });
    const b = computeDescendantsFingerprint({
      icon: { size: 8 },
      label: { text: "A" },
    });
    expect(a).toBe(b);
  });

  it("TC5: 다른 입력 → 다른 fingerprint", () => {
    const a = computeDescendantsFingerprint({ label: { text: "OK" } });
    const b = computeDescendantsFingerprint({ label: { text: "Cancel" } });
    expect(a).not.toBe(b);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// computeSlotBindingFingerprint
// ──────────────────────────────────────────────────────────────────────────────

describe("computeSlotBindingFingerprint", () => {
  it("TC6: undefined → 빈 문자열 반환", () => {
    expect(computeSlotBindingFingerprint(undefined)).toBe("");
  });

  it("TC7: 빈 배열 → 빈 문자열 반환", () => {
    expect(computeSlotBindingFingerprint([])).toBe("");
  });

  it("TC8: 배열 순서가 다르면 fingerprint 가 다르다", () => {
    const a = computeSlotBindingFingerprint([
      makeCanonicalNode("c1", "Card"),
      makeCanonicalNode("c2", "Button"),
    ]);
    const b = computeSlotBindingFingerprint([
      makeCanonicalNode("c2", "Button"),
      makeCanonicalNode("c1", "Card"),
    ]);
    expect(a).not.toBe(b);
  });

  it("TC9: id/type 같고 다른 props 만 다르면 fingerprint 가 같다 (구조 기반)", () => {
    // cache 는 slot 구조(id+type) 만 추적, 자식 속성 patch 는 subtree 내부 dirty
    const nodeA: CanonicalNode = {
      id: "card-1",
      type: "Card",
      props: { title: "A" },
    };
    const nodeB: CanonicalNode = {
      id: "card-1",
      type: "Card",
      props: { title: "B" },
    };
    const fpA = computeSlotBindingFingerprint([nodeA]);
    const fpB = computeSlotBindingFingerprint([nodeB]);
    expect(fpA).toBe(fpB);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// createResolverCache — 기본 get/set/stats
// ──────────────────────────────────────────────────────────────────────────────

describe("createResolverCache", () => {
  it("TC10: set 후 get → 동일 ResolvedNode 반환 + stats().hits === 1", () => {
    // Arrange
    const cache = createResolverCache();
    const key = makeKey("composition-1.0", "btn-1");
    const node = makeResolvedNode("btn-1");

    // Act
    cache.set(key, node);
    const result = cache.get(key);

    // Assert
    expect(result).toBe(node);
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().misses).toBe(0);
  });

  it("TC11: miss → undefined 반환 + stats().misses === 1", () => {
    // Arrange
    const cache = createResolverCache();
    const key = makeKey("composition-1.0", "non-existent");

    // Act
    const result = cache.get(key);

    // Assert
    expect(result).toBeUndefined();
    expect(cache.stats().misses).toBe(1);
    expect(cache.stats().hits).toBe(0);
  });

  it("TC12: maxEntries: 2 로 생성 → 3번째 set 시 oldest evict + stats().size === 2", () => {
    // Arrange
    const cache = createResolverCache({ maxEntries: 2 });
    const key1 = makeKey("v1", "ref-A");
    const key2 = makeKey("v1", "ref-B");
    const key3 = makeKey("v1", "ref-C");

    // Act
    cache.set(key1, makeResolvedNode("A"));
    cache.set(key2, makeResolvedNode("B"));
    cache.set(key3, makeResolvedNode("C")); // key1 evict

    // Assert
    expect(cache.stats().size).toBe(2);
    // oldest(key1) 가 evict 됨
    expect(cache.get(key1)).toBeUndefined();
    // key2, key3 는 유지
    expect(cache.get(key2)).toBeDefined();
    expect(cache.get(key3)).toBeDefined();
  });

  it("TC13: invalidateSubtree(rootRefId) → 해당 ref 엔트리 제거 + 다른 ref 엔트리 유지", () => {
    // Arrange
    const cache = createResolverCache();
    const keyA1 = makeKey("v1", "btn-A", "fp1");
    const keyA2 = makeKey("v1", "btn-A", "fp2"); // 같은 rootRefId, 다른 fingerprint
    const keyB = makeKey("v1", "btn-B");

    cache.set(keyA1, makeResolvedNode("A1"));
    cache.set(keyA2, makeResolvedNode("A2"));
    cache.set(keyB, makeResolvedNode("B"));

    // Act
    cache.invalidateSubtree("btn-A");

    // Assert
    expect(cache.get(keyA1)).toBeUndefined();
    expect(cache.get(keyA2)).toBeUndefined();
    // btn-B 는 영향 없음
    expect(cache.get(keyB)).toBeDefined();
  });

  it("TC14: invalidateAll() → 전체 제거 + hits/misses 리셋 + size === 0", () => {
    // Arrange
    const cache = createResolverCache();
    const key1 = makeKey("v1", "r1");
    const key2 = makeKey("v1", "r2");

    cache.set(key1, makeResolvedNode("r1"));
    cache.set(key2, makeResolvedNode("r2"));
    cache.get(key1); // hit 1회

    // Act
    cache.invalidateAll();

    // Assert
    expect(cache.stats().size).toBe(0);
    expect(cache.stats().hits).toBe(0);
    expect(cache.stats().misses).toBe(0);
    expect(cache.get(key1)).toBeUndefined();
  });

  it("TC15: LRU — get 한 엔트리는 evict 우선순위가 가장 낮다", () => {
    // Arrange: maxEntries=3, 4개 set + 첫 엔트리 get 후 한 개 더 set
    // 삽입 순서: A → B → C (hit A, LRU: B가 oldest) → D (B evict)
    const cache = createResolverCache({ maxEntries: 3 });
    const keyA = makeKey("v1", "ref-A");
    const keyB = makeKey("v1", "ref-B");
    const keyC = makeKey("v1", "ref-C");
    const keyD = makeKey("v1", "ref-D");

    cache.set(keyA, makeResolvedNode("A")); // LRU order: [A]
    cache.set(keyB, makeResolvedNode("B")); // LRU order: [A, B]
    cache.set(keyC, makeResolvedNode("C")); // LRU order: [A, B, C] (full)
    cache.get(keyA); // A 를 recently used 로 이동 → LRU order: [B, C, A]
    cache.set(keyD, makeResolvedNode("D")); // B evict → LRU order: [C, A, D]

    // Assert
    expect(cache.get(keyB)).toBeUndefined(); // B 는 evict 됨
    expect(cache.get(keyA)).toBeDefined(); // A 는 유지 (recently used)
    expect(cache.get(keyC)).toBeDefined(); // C 는 유지
    expect(cache.get(keyD)).toBeDefined(); // D 는 유지
    expect(cache.stats().size).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getSharedResolverCache / resetSharedResolverCache
// ──────────────────────────────────────────────────────────────────────────────

describe("getSharedResolverCache / resetSharedResolverCache", () => {
  afterEach(() => {
    // 테스트 격리: singleton 상태 초기화
    resetSharedResolverCache();
  });

  it("TC16: 두 번 호출 → 같은 instance 반환 (singleton)", () => {
    const a = getSharedResolverCache();
    const b = getSharedResolverCache();
    expect(a).toBe(b);
  });

  it("TC17: resetSharedResolverCache 후 getSharedResolverCache → 새 instance 반환", () => {
    const before = getSharedResolverCache();
    resetSharedResolverCache();
    const after = getSharedResolverCache();
    expect(after).not.toBe(before);
  });
});
