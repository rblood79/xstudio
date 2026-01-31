/**
 * Web Worker 통신 프로토콜
 *
 * Main Thread ↔ Layout Worker 간 메시지 타입 정의.
 * Float32Array Transferable을 사용하여 zero-copy 전송.
 *
 * @see docs/WASM.md §Phase 4: Web Worker
 */

// ── Request Types ──

export const enum WorkerRequestType {
  INIT = 0,
  BLOCK_LAYOUT = 1,
  GRID_LAYOUT = 2,
}

export interface WorkerInitRequest {
  type: WorkerRequestType.INIT;
  requestId: number;
}

export interface WorkerBlockLayoutRequest {
  type: WorkerRequestType.BLOCK_LAYOUT;
  requestId: number;
  /** Flat Float32Array: 19 fields per child */
  data: Float32Array;
  childCount: number;
  availableWidth: number;
  availableHeight: number;
  canCollapseTop: boolean;
  canCollapseBottom: boolean;
  prevSiblingMarginBottom: number;
}

export interface WorkerGridLayoutRequest {
  type: WorkerRequestType.GRID_LAYOUT;
  requestId: number;
  colTemplate: string;
  rowTemplate: string;
  availableWidth: number;
  availableHeight: number;
  colGap: number;
  rowGap: number;
  childCount: number;
}

export type WorkerRequest =
  | WorkerInitRequest
  | WorkerBlockLayoutRequest
  | WorkerGridLayoutRequest;

// ── Response Types ──

export const enum WorkerResponseType {
  INIT_OK = 0,
  BLOCK_LAYOUT_RESULT = 1,
  GRID_LAYOUT_RESULT = 2,
  ERROR = 99,
}

export interface WorkerInitResponse {
  type: WorkerResponseType.INIT_OK;
  requestId: number;
}

export interface WorkerBlockLayoutResponse {
  type: WorkerResponseType.BLOCK_LAYOUT_RESULT;
  requestId: number;
  /** [x, y, w, h, ...] per child */
  positions: Float32Array;
  firstChildMarginTop: number;
  lastChildMarginBottom: number;
}

export interface WorkerGridLayoutResponse {
  type: WorkerResponseType.GRID_LAYOUT_RESULT;
  requestId: number;
  /** [x, y, w, h, ...] per child */
  positions: Float32Array;
}

export interface WorkerErrorResponse {
  type: WorkerResponseType.ERROR;
  requestId: number;
  message: string;
}

export type WorkerResponse =
  | WorkerInitResponse
  | WorkerBlockLayoutResponse
  | WorkerGridLayoutResponse
  | WorkerErrorResponse;
