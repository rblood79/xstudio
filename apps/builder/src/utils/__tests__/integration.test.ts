/**
 * Integration Test - React Query 스타일 최적화 시스템
 *
 * 전체 Phase 통합 테스트:
 * - Phase 2: SmartCache + Request Deduplication
 * - Phase 3: Realtime Batcher
 * - Phase 4: useAsyncData Hook
 * - Phase 5: Performance Monitor
 * - History System: batch/group/ungroup Undo/Redo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartCache } from '../smartCache';
import { RequestDeduplicator } from '../requestDeduplication';
import { RealtimeBatcher, RealtimeFilters, type RealtimeEvent } from '../realtimeBatcher';
import { PerformanceMonitor } from '../performanceMonitor';

describe('Integration Test: React Query-style Optimization', () => {
  describe('Phase 2: SmartCache + Request Deduplication', () => {
    let cache: SmartCache<string, unknown>;
    let deduplicator: RequestDeduplicator;

    beforeEach(() => {
      cache = new SmartCache({ max: 10, ttl: 1000 });
      deduplicator = new RequestDeduplicator();
    });

    it('should cache data with LRU eviction', () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      // Add one more (should evict oldest)
      cache.set('key-10', 'value-10');

      // First key should be evicted
      expect(cache.get('key-0')).toBeUndefined();
      expect(cache.get('key-10')).toBe('value-10');
    });

    it('should evict items after TTL expires', async () => {
      cache.set('temp', 'data');
      expect(cache.get('temp')).toBe('data');

      // Wait for TTL
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cache.get('temp')).toBeUndefined();
    });

    it('should deduplicate concurrent requests', async () => {
      let executionCount = 0;

      const fetchFn = async () => {
        executionCount++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      };

      // 3 concurrent requests
      const promises = [
        deduplicator.deduplicate('test-key', fetchFn),
        deduplicator.deduplicate('test-key', fetchFn),
        deduplicator.deduplicate('test-key', fetchFn),
      ];

      const results = await Promise.all(promises);

      // Should execute only once
      expect(executionCount).toBe(1);
      expect(results).toEqual(['result', 'result', 'result']);
    });

    it('should integrate cache and deduplication', async () => {
      const monitor = new PerformanceMonitor();
      let fetchCount = 0;

      const fetchWithCache = async (key: string) => {
        // Check cache
        const cached = cache.get(key);
        if (cached) {
          monitor.recordCacheHit(key, 0);
          return cached;
        }

        // Cache miss - deduplicate fetch
        const wasDeduplicated = deduplicator.isPending(key);
        const result = await deduplicator.deduplicate(key, async () => {
          fetchCount++;
          return `data-${key}`;
        });

        monitor.recordCacheMiss(key, 100);
        monitor.recordDeduplication(key, wasDeduplicated);

        cache.set(key, result);
        return result;
      };

      // First call - cache miss, fetch
      const result1 = await fetchWithCache('item-1');
      expect(result1).toBe('data-item-1');
      expect(fetchCount).toBe(1);

      // Second call - cache hit, no fetch
      const result2 = await fetchWithCache('item-1');
      expect(result2).toBe('data-item-1');
      expect(fetchCount).toBe(1);

      // Check monitor stats
      const stats = monitor.getStats();
      expect(stats.cache.hits).toBe(1);
      expect(stats.cache.misses).toBe(1);
      expect(stats.cache.hitRate).toBe(50);
    });
  });

  describe('Phase 3: Realtime Batcher', () => {
    it('should batch events within delay window', async () => {
      const batches: RealtimeEvent[][] = [];

      const batcher = new RealtimeBatcher({
        batchDelay: 50,
        onBatch: (events) => {
          batches.push(events);
        },
      });

      // Add 3 events quickly
      batcher.addEvent({ eventType: 'INSERT', table: 'users', new: { id: '1' } });
      batcher.addEvent({ eventType: 'UPDATE', table: 'users', new: { id: '2' } });
      batcher.addEvent({ eventType: 'DELETE', table: 'users', old: { id: '3' } });

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should batch all 3 events
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);

      batcher.destroy();
    });

    it('should filter events by table', async () => {
      const batches: RealtimeEvent[][] = [];

      const batcher = new RealtimeBatcher({
        batchDelay: 50,
        onBatch: (events) => {
          batches.push(events);
        },
        filter: RealtimeFilters.tableFilter(['users']),
      });

      // Add events from different tables
      batcher.addEvent({ eventType: 'INSERT', table: 'users', new: { id: '1' } });
      batcher.addEvent({ eventType: 'INSERT', table: 'posts', new: { id: '2' } }); // Filtered out

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should only process users table
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);
      expect(batches[0][0].table).toBe('users');

      batcher.destroy();
    });

    it('should deduplicate events', async () => {
      const batches: RealtimeEvent[][] = [];

      const batcher = new RealtimeBatcher({
        batchDelay: 50,
        onBatch: (events) => {
          batches.push(events);
        },
        deduplication: true,
      });

      // Add duplicate events (same table + id + eventType)
      batcher.addEvent({ eventType: 'UPDATE', table: 'users', new: { id: '1' } });
      batcher.addEvent({ eventType: 'UPDATE', table: 'users', new: { id: '1' } }); // Duplicate

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should deduplicate
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);

      batcher.destroy();
    });
  });

  describe('Phase 5: Performance Monitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should calculate cache hit rate correctly', () => {
      monitor.recordCacheHit('key-1', 10);
      monitor.recordCacheHit('key-2', 5);
      monitor.recordCacheMiss('key-3', 100);

      const stats = monitor.getStats();

      expect(stats.cache.totalRequests).toBe(3);
      expect(stats.cache.hits).toBe(2);
      expect(stats.cache.misses).toBe(1);
      expect(stats.cache.hitRate).toBeCloseTo(66.67, 1);
      expect(stats.cache.avgResponseTime).toBeCloseTo(38.33, 1);
    });

    it('should calculate deduplication rate correctly', () => {
      monitor.recordDeduplication('query-1', false); // Executed
      monitor.recordDeduplication('query-1', true); // Deduplicated
      monitor.recordDeduplication('query-1', true); // Deduplicated

      const stats = monitor.getStats();

      expect(stats.deduplication.totalRequests).toBe(3);
      expect(stats.deduplication.executed).toBe(1);
      expect(stats.deduplication.deduplicated).toBe(2);
      expect(stats.deduplication.deduplicationRate).toBeCloseTo(66.67, 1);
    });

    it('should track batcher metrics correctly', () => {
      monitor.recordBatcherEvents(10, 2, 8); // Received 10, filtered 2, batched 8

      const stats = monitor.getStats();

      expect(stats.batcher.totalEvents).toBe(10);
      expect(stats.batcher.filtered).toBe(2);
      expect(stats.batcher.batched).toBe(8);
      expect(stats.batcher.batchCount).toBe(1);
      expect(stats.batcher.avgBatchSize).toBe(8);
      expect(stats.batcher.filterEfficiency).toBe(20);
    });

    it('should track query states correctly', () => {
      monitor.recordQueryState('query-1', 'loading');
      monitor.recordQueryState('query-2', 'loading');
      monitor.recordQueryState('query-1', 'success');

      const stats = monitor.getStats();

      expect(stats.query.activeQueries).toBe(2);
      expect(stats.query.loadingQueries).toBe(1);
      expect(stats.query.successQueries).toBe(1);
    });

    it('should calculate avg fetch time correctly', () => {
      monitor.recordFetchComplete('query-1', 100, true);
      monitor.recordFetchComplete('query-2', 200, true);
      monitor.recordFetchComplete('query-3', 150, false);

      const stats = monitor.getStats();

      expect(stats.query.totalFetches).toBe(3);
      expect(stats.query.avgFetchTime).toBeCloseTo(150, 1);
      expect(stats.query.successQueries).toBe(2);
      expect(stats.query.errorQueries).toBe(1);
    });

    it('should reset stats correctly', () => {
      monitor.recordCacheHit('key-1', 10);
      monitor.recordDeduplication('query-1', false);
      monitor.recordBatcherEvents(5, 1, 4);

      let stats = monitor.getStats();
      expect(stats.cache.hits).toBe(1);

      monitor.reset();

      stats = monitor.getStats();
      expect(stats.cache.hits).toBe(0);
      expect(stats.deduplication.totalRequests).toBe(0);
      expect(stats.batcher.totalEvents).toBe(0);
    });
  });

  describe('Full Integration: All Phases Together', () => {
    it('should work end-to-end with all optimizations', async () => {
      const cache = new SmartCache<string, unknown>({ max: 50, ttl: 5000 });
      const deduplicator = new RequestDeduplicator();
      const monitor = new PerformanceMonitor();

      // Simulate API fetch with all optimizations
      const fetchWithOptimizations = async (queryKey: string) => {
        // 1. Check cache (Phase 2)
        const cached = cache.get(queryKey);
        if (cached) {
          monitor.recordCacheHit(queryKey, 0);
          monitor.recordQueryState(queryKey, 'success');
          return cached;
        }

        // 2. Deduplicate request (Phase 2)
        monitor.recordQueryState(queryKey, 'loading');
        const wasDeduplicated = deduplicator.isPending(queryKey);

        const fetchStart = performance.now();

        const result = await deduplicator.deduplicate(queryKey, async () => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { data: `result-${queryKey}` };
        });

        const fetchTime = performance.now() - fetchStart;

        // 3. Record metrics (Phase 5)
        // ✅ Cache miss는 첫 번째 요청만 기록 (실제 fetch 실행한 경우)
        if (!wasDeduplicated) {
          monitor.recordCacheMiss(queryKey, fetchTime);
        }

        monitor.recordDeduplication(queryKey, wasDeduplicated);

        // ✅ Fetch complete는 첫 번째 요청만 기록
        if (!wasDeduplicated) {
          monitor.recordFetchComplete(queryKey, fetchTime, true);
        }

        // 4. Save to cache (첫 번째 요청만)
        if (!wasDeduplicated) {
          cache.set(queryKey, result);
        }

        return result;
      };

      // Test scenario: 3 concurrent requests for same data
      const promises = [
        fetchWithOptimizations('user-profile'),
        fetchWithOptimizations('user-profile'),
        fetchWithOptimizations('user-profile'),
      ];

      const results = await Promise.all(promises);

      // All should get same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // Stats validation
      const stats = monitor.getStats();

      // Only 1 cache miss (first request)
      expect(stats.cache.misses).toBe(1);
      expect(stats.cache.hits).toBe(0); // No cache hits yet

      // Total 3 requests: 1 executed + 2 deduplicated
      expect(stats.deduplication.totalRequests).toBe(3);
      expect(stats.deduplication.executed).toBe(1);
      expect(stats.deduplication.deduplicated).toBe(2);
      expect(stats.deduplication.deduplicationRate).toBeCloseTo(66.67, 1);

      // 1 actual fetch
      expect(stats.query.totalFetches).toBe(1);

      // Second call should be cache hit
      const cachedResult = await fetchWithOptimizations('user-profile');
      expect(cachedResult).toEqual(results[0]);

      const finalStats = monitor.getStats();
      expect(finalStats.cache.hits).toBe(1);
      expect(finalStats.cache.hitRate).toBe(50); // 1 hit, 1 miss = 50%
    });

    it('should handle Realtime events with Performance Monitor', async () => {
      const monitor = new PerformanceMonitor();
      const batches: RealtimeEvent[][] = [];

      // Create batcher with monitor integration
      const batcher = new RealtimeBatcher({
        batchDelay: 50,
        onBatch: (events) => {
          batches.push(events);

          // Simulate monitor recording (like in actual integration)
          monitor.recordBatcherEvents(events.length, 0, events.length);
        },
        filter: RealtimeFilters.tableFilter(['design_tokens']),
        deduplication: true,
      });

      // Add events
      for (let i = 0; i < 5; i++) {
        batcher.addEvent({
          eventType: 'UPDATE',
          table: 'design_tokens',
          new: { id: `token-${i}` },
        });
      }

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify batching
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(5);

      // Verify monitor stats
      const stats = monitor.getStats();
      expect(stats.batcher.totalEvents).toBe(5);
      expect(stats.batcher.batched).toBe(5);
      expect(stats.batcher.avgBatchSize).toBe(5);

      batcher.destroy();
    });
  });
});
