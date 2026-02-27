/**
 * Layout Web Worker
 *
 * 독립 스레드에서 Rust WASM 레이아웃 계산을 수행한다.
 * Main Thread가 전처리한 Float32Array를 받아 WASM에 전달하고
 * 결과를 Transferable로 반환한다.
 *
 * @see docs/WASM.md §Phase 4: Web Worker
 */

import {
  WorkerRequestType,
  WorkerResponseType,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol';

type WasmModule = typeof import('../wasm-bindings/pkg/xstudio_wasm');

let wasm: WasmModule | null = null;

// ── Message Handler ──

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  try {
    switch (req.type) {
      case WorkerRequestType.INIT:
        await handleInit(req.requestId);
        break;

      case WorkerRequestType.BLOCK_LAYOUT:
        handleBlockLayout(req);
        break;

      case WorkerRequestType.GRID_LAYOUT:
        handleGridLayout(req);
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    respond({
      type: WorkerResponseType.ERROR,
      requestId: req.requestId,
      message: msg,
    });
  }
};

// ── Handlers ──

async function handleInit(requestId: number): Promise<void> {
  if (!wasm) {
    const mod = await import(/* @vite-ignore */ '../wasm-bindings/pkg/xstudio_wasm');
    wasm = mod;
  }
  respond({ type: WorkerResponseType.INIT_OK, requestId });
}

function handleBlockLayout(req: Extract<WorkerRequest, { type: WorkerRequestType.BLOCK_LAYOUT }>): void {
  if (!wasm) {
    respond({
      type: WorkerResponseType.ERROR,
      requestId: req.requestId,
      message: 'WASM not initialized',
    });
    return;
  }

  const result = wasm.block_layout(
    req.data,
    req.availableWidth,
    req.availableHeight,
    req.canCollapseTop,
    req.canCollapseBottom,
    req.prevSiblingMarginBottom,
  );

  // WASM linear memory에서 복사 (Transferable로 전송하기 위함)
  const metaOff = req.childCount * 4;
  const positions = new Float32Array(result.slice(0, metaOff));
  const firstChildMarginTop = result[metaOff] ?? 0;
  const lastChildMarginBottom = result[metaOff + 1] ?? 0;

  const response: WorkerResponse = {
    type: WorkerResponseType.BLOCK_LAYOUT_RESULT,
    requestId: req.requestId,
    positions,
    firstChildMarginTop,
    lastChildMarginBottom,
  };

  // Transfer the positions buffer
  (self as unknown as { postMessage: (msg: WorkerResponse, transfer?: Transferable[]) => void }).postMessage(response, [positions.buffer]);
}

function handleGridLayout(req: Extract<WorkerRequest, { type: WorkerRequestType.GRID_LAYOUT }>): void {
  if (!wasm) {
    respond({
      type: WorkerResponseType.ERROR,
      requestId: req.requestId,
      message: 'WASM not initialized',
    });
    return;
  }

  // 1. Track 파싱
  const tracksX = wasm.parse_tracks(req.colTemplate, req.availableWidth, req.colGap);
  const tracksY = wasm.parse_tracks(req.rowTemplate, req.availableHeight, req.rowGap);

  // 기본 트랙 (비어있으면 1 column/row)
  const effectiveTracksX = tracksX.length > 0
    ? tracksX
    : new Float32Array([req.availableWidth]);
  const effectiveTracksY = tracksY.length > 0
    ? tracksY
    : new Float32Array([50]);

  // 2. Cell 위치 계산
  const result = wasm.calculate_cell_positions(
    effectiveTracksX, effectiveTracksY,
    req.colGap, req.rowGap,
    req.childCount,
  );

  // WASM memory에서 복사
  const positions = new Float32Array(result);

  const response: WorkerResponse = {
    type: WorkerResponseType.GRID_LAYOUT_RESULT,
    requestId: req.requestId,
    positions,
  };

  (self as unknown as { postMessage: (msg: WorkerResponse, transfer?: Transferable[]) => void }).postMessage(response, [positions.buffer]);
}

// ── Helper ──

function respond(msg: WorkerResponse): void {
  (self as unknown as { postMessage: (msg: WorkerResponse) => void }).postMessage(msg);
}
