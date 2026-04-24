/**
 * @fileoverview Canonical Resolver Cache — ADR-903 P2 Stream B
 *
 * P0에서 박제된 `ResolverCache` 인터페이스와 fingerprint 시그니처의 실 구현체.
 *
 * 설계 결정:
 * - LRU: Map insertion order + delete/set 로 구현. doubly-linked list 불필요 —
 *   JS Map 의 ordered iteration (insertion order 보장) 활용
 * - Fingerprint: Object.keys.sort() 후 정렬 직렬화. djb2/cyrb53 hash 대신
 *   JSON.stringify 직렬화 문자열을 그대로 cache key 에 사용 — key 비교 비용은
 *   문자열 === 비교이므로 길이 무관하게 O(n) 이고, 1000-node 수준에서 실측
 *   허용 범위 내. 충돌 없이 complete 일치 보장
 * - singleton: Preview/Skia 공유 인스턴스 패턴 — P2 S2/S3 에서 활용
 */

import type {
  CanonicalNode,
  ResolverCache,
  ResolverCacheKey,
  ResolvedNode,
} from "@composition/shared";

// ──────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 객체를 key 정렬된 stable JSON 문자열로 직렬화한다.
 *
 * `JSON.stringify` 는 key 순서 비결정적이므로, `Object.keys().sort()` 를 명시적
 * 적용하여 deep nested 구조도 stable 직렬화.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return JSON.stringify(k) + ":" + stableStringify(v);
    })
    .join(",");
  return "{" + sorted + "}";
}

/**
 * `ResolverCacheKey` (readonly 4-tuple) 를 Map 의 string key 로 직렬화한다.
 *
 * U+0001 (SOH) 를 구분자로 사용 — tuple 요소 값에 포함될 가능성이 극히 낮음.
 */
function serializeCacheKey(key: ResolverCacheKey): string {
  return key[0] + "" + key[1] + "" + key[2] + "" + key[3];
}

// ──────────────────────────────────────────────────────────────────────────────
// Fingerprint Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * `descendants` 객체의 stable fingerprint 를 계산한다.
 *
 * - `undefined` 또는 `{}` → `""` 반환 (빈 fingerprint — cache key 비교 최적화)
 * - key 정렬 후 deep-equal 기반 stable 직렬화
 *
 * @param overrides — `RefNode.descendants` 또는 undefined
 */
export function computeDescendantsFingerprint(
  overrides: Record<string, unknown> | undefined,
): string {
  if (overrides === undefined) return "";
  const keys = Object.keys(overrides);
  if (keys.length === 0) return "";
  return stableStringify(overrides);
}

/**
 * slot children 배열 구조의 stable fingerprint 를 계산한다.
 *
 * - `undefined` 또는 `[]` → `""` 반환
 * - 배열의 `id:type` 쌍 순서만 hash — 자식 속성 patch 는 제외.
 *   (자식 속성 patch 는 자식 자체 subtree dirty 로 처리되므로 부모 cache 는 영향 없음)
 *
 * @param slotChildren — slot 에 채워진 CanonicalNode 배열 또는 undefined
 */
export function computeSlotBindingFingerprint(
  slotChildren: CanonicalNode[] | undefined,
): string {
  if (slotChildren === undefined || slotChildren.length === 0) return "";
  return slotChildren.map((c) => `${c.id}:${c.type}`).join("|");
}

// ──────────────────────────────────────────────────────────────────────────────
// ResolverCacheOptions
// ──────────────────────────────────────────────────────────────────────────────

export interface ResolverCacheOptions {
  /** 최대 엔트리 수 (default: 1000) */
  maxEntries?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// createResolverCache — LRU 구현체
// ──────────────────────────────────────────────────────────────────────────────

/**
 * `ResolverCache` 인터페이스를 만족하는 LRU 캐시 factory.
 *
 * ### LRU 구현 방식
 * Map 의 insertion order 보장을 활용:
 * - `get` hit: `delete(k)` → `set(k, v)` 로 가장 최근 위치로 이동
 * - `set` 신규: 추가 후 `size > maxEntries` 이면 `Map.entries().next()` (oldest) evict
 * - `invalidateSubtree`: key tuple 의 두 번째 요소 (`rootRefId`) 일치 엔트리 일괄 제거
 */
export function createResolverCache(
  options?: ResolverCacheOptions,
): ResolverCache {
  const maxEntries = options?.maxEntries ?? 1000;

  // string-keyed Map: key = serializeCacheKey(tuple)
  // Map 의 insertion order = LRU recency order (oldest = first entry)
  const store = new Map<string, ResolvedNode>();

  // tuple 복원 없이 rootRefId 만 조회하기 위해 raw key → tuple[1] 역매핑 유지
  // (invalidateSubtree 성능을 O(n) 전체 순회 없이 구현하기 위해 rootRefId → Set<rawKey> 유지)
  const refIndex = new Map<string, Set<string>>();

  let hits = 0;
  let misses = 0;

  function addToRefIndex(rawKey: string, rootRefId: string): void {
    let bucket = refIndex.get(rootRefId);
    if (!bucket) {
      bucket = new Set();
      refIndex.set(rootRefId, bucket);
    }
    bucket.add(rawKey);
  }

  function removeFromRefIndex(rawKey: string, rootRefId: string): void {
    const bucket = refIndex.get(rootRefId);
    if (!bucket) return;
    bucket.delete(rawKey);
    if (bucket.size === 0) refIndex.delete(rootRefId);
  }

  /** rootRefId 추출: U+0001 구분자 기준 두 번째 토큰 */
  function extractRootRefId(rawKey: string): string {
    const first = rawKey.indexOf("");
    const second = rawKey.indexOf("", first + 1);
    return rawKey.slice(first + 1, second);
  }

  return {
    get(key: ResolverCacheKey): ResolvedNode | undefined {
      const rawKey = serializeCacheKey(key);
      const value = store.get(rawKey);
      if (value === undefined) {
        misses++;
        return undefined;
      }
      // LRU 갱신: 가장 최근 위치로 이동
      store.delete(rawKey);
      store.set(rawKey, value);
      hits++;
      return value;
    },

    set(key: ResolverCacheKey, tree: ResolvedNode): void {
      const rawKey = serializeCacheKey(key);
      const rootRefId = key[1];

      if (store.has(rawKey)) {
        // 기존 key 갱신 — LRU 갱신 겸 값 교체
        store.delete(rawKey);
      } else {
        // 신규 key — refIndex 등록
        addToRefIndex(rawKey, rootRefId);

        // maxEntries 초과 시 oldest(first) evict
        if (store.size >= maxEntries) {
          const oldestKey = store.keys().next().value;
          if (oldestKey !== undefined) {
            store.delete(oldestKey);
            removeFromRefIndex(oldestKey, extractRootRefId(oldestKey));
          }
        }
      }

      store.set(rawKey, tree);
    },

    invalidateSubtree(rootRefId: string): void {
      const bucket = refIndex.get(rootRefId);
      if (!bucket) return;
      for (const rawKey of bucket) {
        store.delete(rawKey);
      }
      refIndex.delete(rootRefId);
      // 통계(hits/misses/size) 는 유지 — size 는 store.size 로 실시간 반환
    },

    invalidateAll(): void {
      store.clear();
      refIndex.clear();
      hits = 0;
      misses = 0;
    },

    stats(): { hits: number; misses: number; size: number } {
      return { hits, misses, size: store.size };
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Singleton Helper
// ──────────────────────────────────────────────────────────────────────────────

let sharedInstance: ResolverCache | null = null;

/**
 * Preview/Skia 양쪽이 동일 인스턴스를 공유하는 singleton cache.
 *
 * P2 S2/S3 (consumer 전환) 에서 활용. 문서 교체 시 `resetSharedResolverCache()`
 * 호출 또는 `invalidateAll()` 로 flush.
 */
export function getSharedResolverCache(): ResolverCache {
  if (!sharedInstance) {
    sharedInstance = createResolverCache();
  }
  return sharedInstance;
}

/**
 * singleton 인스턴스를 null 로 리셋한다.
 *
 * 테스트 격리 / 문서 교체 시 다음 `getSharedResolverCache()` 호출에서
 * 새 인스턴스가 생성되도록 보장.
 */
export function resetSharedResolverCache(): void {
  sharedInstance = null;
}
