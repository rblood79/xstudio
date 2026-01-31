/**
 * Main Thread ↔ Layout Worker 통신 브리지
 *
 * Worker 생성, 초기화, Promise 기반 요청/응답 매칭.
 * Float32Array는 Transferable로 전송하여 zero-copy.
 *
 * @see docs/WASM.md §Phase 4: Web Worker
 */

import {
  WorkerRequestType,
  WorkerResponseType,
  type WorkerRequest,
  type WorkerBlockLayoutRequest,
  type WorkerGridLayoutRequest,
  type WorkerResponse,
  type WorkerBlockLayoutResponse,
  type WorkerGridLayoutResponse,
} from './protocol';

interface PendingRequest {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}

export class WasmWorkerBridge {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<number, PendingRequest>();
  private ready = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Worker 생성 및 WASM 초기화.
   * 중복 호출 시 기존 Promise 반환.
   */
  async init(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    this.worker = new Worker(
      new URL('./layoutWorker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleResponse(e.data);
    };

    this.worker.onerror = (e: ErrorEvent) => {
      console.error('[LayoutWorker] error:', e.message);
    };

    // WASM 초기화 요청
    await this.send<WorkerResponse>({
      type: WorkerRequestType.INIT,
      requestId: this.allocId(),
    });

    this.ready = true;

    if (import.meta.env.DEV) {
      console.log('[LayoutWorker] 초기화 완료');
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Block layout 계산 요청 (비동기).
   */
  async calculateBlockLayout(
    data: Float32Array,
    childCount: number,
    availableWidth: number,
    availableHeight: number,
    canCollapseTop: boolean,
    canCollapseBottom: boolean,
    prevSiblingMarginBottom: number,
  ): Promise<WorkerBlockLayoutResponse> {
    const requestId = this.allocId();

    // data를 복사하여 Transferable로 전송 (원본은 caller가 계속 사용 가능)
    const transferData = new Float32Array(data);

    const req: WorkerBlockLayoutRequest = {
      type: WorkerRequestType.BLOCK_LAYOUT,
      requestId,
      data: transferData,
      childCount,
      availableWidth,
      availableHeight,
      canCollapseTop,
      canCollapseBottom,
      prevSiblingMarginBottom,
    };

    return this.send<WorkerBlockLayoutResponse>(req, [transferData.buffer]);
  }

  /**
   * Grid layout 계산 요청 (비동기).
   */
  async calculateGridLayout(
    colTemplate: string,
    rowTemplate: string,
    availableWidth: number,
    availableHeight: number,
    colGap: number,
    rowGap: number,
    childCount: number,
  ): Promise<WorkerGridLayoutResponse> {
    const requestId = this.allocId();

    const req: WorkerGridLayoutRequest = {
      type: WorkerRequestType.GRID_LAYOUT,
      requestId,
      colTemplate,
      rowTemplate,
      availableWidth,
      availableHeight,
      colGap,
      rowGap,
      childCount,
    };

    return this.send<WorkerGridLayoutResponse>(req);
  }

  /**
   * Worker 정리.
   */
  dispose(): void {
    // 미완료 요청 모두 reject
    for (const [, pending] of this.pending) {
      pending.reject(new Error('Worker disposed'));
    }
    this.pending.clear();

    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
  }

  // ── Internal ──

  private allocId(): number {
    return this.nextRequestId++;
  }

  private send<T extends WorkerResponse>(
    req: WorkerRequest,
    transfer?: Transferable[],
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not created'));
        return;
      }

      this.pending.set(req.requestId, {
        resolve: resolve as (r: WorkerResponse) => void,
        reject,
      });

      if (transfer?.length) {
        this.worker.postMessage(req, transfer);
      } else {
        this.worker.postMessage(req);
      }
    });
  }

  private handleResponse(res: WorkerResponse): void {
    const p = this.pending.get(res.requestId);
    if (!p) return;

    this.pending.delete(res.requestId);

    if (res.type === WorkerResponseType.ERROR) {
      p.reject(new Error(res.message));
    } else {
      p.resolve(res);
    }
  }
}
