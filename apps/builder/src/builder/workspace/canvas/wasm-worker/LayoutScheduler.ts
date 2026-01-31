/**
 * Layout Scheduler — Stale-While-Revalidate 전략
 *
 * 초기 레이아웃: 메인 스레드 WASM (동기)
 * 변경분 재계산: Worker (비동기) → RAF에서 적용
 *
 * 캐시 키: `${parentId}:${childIds.join(',')}:${availW}:${availH}`
 * 같은 입력이면 캐시된 결과를 즉시 반환하고 백그라운드에서 재계산.
 *
 * @see docs/WASM.md §Phase 4: Web Worker
 */

import type { ComputedLayout } from '../layout/engines/LayoutEngine';
import { WasmWorkerBridge } from './bridge';
import { WorkerResponseType } from './protocol';

// ── Types ──

export interface BlockLayoutParams {
  kind: 'block';
  parentId: string;
  childIds: string[];
  data: Float32Array;
  childCount: number;
  availableWidth: number;
  availableHeight: number;
  canCollapseTop: boolean;
  canCollapseBottom: boolean;
  prevSiblingMarginBottom: number;
}

export interface GridLayoutParams {
  kind: 'grid';
  parentId: string;
  childIds: string[];
  colTemplate: string;
  rowTemplate: string;
  availableWidth: number;
  availableHeight: number;
  colGap: number;
  rowGap: number;
  childCount: number;
}

export type LayoutParams = BlockLayoutParams | GridLayoutParams;

interface CachedResult {
  layouts: ComputedLayout[];
  firstChildMarginTop?: number;
  lastChildMarginBottom?: number;
}

// ── Scheduler ──

export class LayoutScheduler {
  private bridge: WasmWorkerBridge;
  private cache = new Map<string, CachedResult>();
  private pendingUpdates = new Map<string, CachedResult>();
  private rafScheduled = false;
  private onUpdate: ((parentId: string, layouts: ComputedLayout[]) => void) | null = null;

  constructor(bridge: WasmWorkerBridge) {
    this.bridge = bridge;
  }

  /**
   * 레이아웃 결과 업데이트 콜백 등록.
   * Worker 결과가 RAF에서 적용될 때 호출.
   */
  setUpdateCallback(cb: (parentId: string, layouts: ComputedLayout[]) => void): void {
    this.onUpdate = cb;
  }

  /**
   * 캐시된 결과 조회 (동기).
   * 없으면 null 반환 — 호출자가 메인 스레드 WASM 결과를 사용해야 함.
   */
  getCached(params: LayoutParams): CachedResult | null {
    const key = this.buildKey(params);
    return this.cache.get(key) ?? null;
  }

  /**
   * Worker에 비동기 레이아웃 요청.
   * 결과는 RAF에서 적용되고 onUpdate 콜백으로 전달.
   */
  scheduleAsync(params: LayoutParams): void {
    if (!this.bridge.isReady()) return;

    const key = this.buildKey(params);

    if (params.kind === 'block') {
      this.bridge.calculateBlockLayout(
        params.data,
        params.childCount,
        params.availableWidth,
        params.availableHeight,
        params.canCollapseTop,
        params.canCollapseBottom,
        params.prevSiblingMarginBottom,
      ).then((res) => {
        if (res.type !== WorkerResponseType.BLOCK_LAYOUT_RESULT) return;

        const layouts = this.positionsToLayouts(
          res.positions, params.childIds,
        );
        const result: CachedResult = {
          layouts,
          firstChildMarginTop: res.firstChildMarginTop,
          lastChildMarginBottom: res.lastChildMarginBottom,
        };

        this.cache.set(key, result);
        this.pendingUpdates.set(params.parentId, result);
        this.scheduleRAF();
      }).catch(this.logError);

    } else {
      this.bridge.calculateGridLayout(
        params.colTemplate,
        params.rowTemplate,
        params.availableWidth,
        params.availableHeight,
        params.colGap,
        params.rowGap,
        params.childCount,
      ).then((res) => {
        if (res.type !== WorkerResponseType.GRID_LAYOUT_RESULT) return;

        const layouts = this.positionsToLayouts(
          res.positions, params.childIds,
        );
        const result: CachedResult = { layouts };

        this.cache.set(key, result);
        this.pendingUpdates.set(params.parentId, result);
        this.scheduleRAF();
      }).catch(this.logError);
    }
  }

  /**
   * 캐시 무효화 (특정 부모).
   */
  invalidate(parentId: string): void {
    // 해당 부모 관련 캐시 엔트리 제거
    for (const [key] of this.cache) {
      if (key.startsWith(parentId + ':')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 클리어.
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingUpdates.clear();
  }

  dispose(): void {
    this.clearCache();
    this.onUpdate = null;
  }

  // ── Internal ──

  private buildKey(params: LayoutParams): string {
    const base = `${params.parentId}:${params.childIds.join(',')}`;
    if (params.kind === 'block') {
      return `${base}:${params.availableWidth}:${params.availableHeight}`;
    }
    return `${base}:${params.availableWidth}:${params.availableHeight}:${params.colTemplate}:${params.rowTemplate}`;
  }

  private positionsToLayouts(
    positions: Float32Array,
    childIds: string[],
  ): ComputedLayout[] {
    const layouts: ComputedLayout[] = [];
    for (let i = 0; i < childIds.length; i++) {
      layouts.push({
        elementId: childIds[i],
        x: positions[i * 4],
        y: positions[i * 4 + 1],
        width: positions[i * 4 + 2],
        height: positions[i * 4 + 3],
      });
    }
    return layouts;
  }

  private scheduleRAF(): void {
    if (this.rafScheduled) return;
    this.rafScheduled = true;

    requestAnimationFrame(() => {
      this.rafScheduled = false;
      this.flushPendingUpdates();
    });
  }

  private flushPendingUpdates(): void {
    if (!this.onUpdate || this.pendingUpdates.size === 0) return;

    for (const [parentId, result] of this.pendingUpdates) {
      this.onUpdate(parentId, result.layouts);
    }
    this.pendingUpdates.clear();
  }

  private logError = (err: unknown): void => {
    if (import.meta.env.DEV) {
      console.warn('[LayoutScheduler] Worker 계산 실패:', err);
    }
  };
}
