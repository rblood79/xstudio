/**
 * Layout Worker 싱글톤 엔트리포인트
 *
 * bridge + scheduler 를 한 번만 생성하고 전역에서 참조.
 *
 * @see docs/WASM.md §Phase 4: Web Worker
 */

import { WasmWorkerBridge } from './bridge';
import { LayoutScheduler } from './LayoutScheduler';

let bridge: WasmWorkerBridge | null = null;
let scheduler: LayoutScheduler | null = null;

/**
 * Worker 초기화.
 * WASM_FLAGS.LAYOUT_WORKER가 true일 때 init.ts에서 호출.
 */
export async function initLayoutWorker(): Promise<void> {
  if (bridge) return;

  bridge = new WasmWorkerBridge();
  await bridge.init();

  scheduler = new LayoutScheduler(bridge);

  if (import.meta.env.DEV) {
    console.log('[LayoutWorker] scheduler 준비 완료');
  }
}

export function getLayoutScheduler(): LayoutScheduler | null {
  return scheduler;
}

export function getWorkerBridge(): WasmWorkerBridge | null {
  return bridge;
}

export function disposeLayoutWorker(): void {
  scheduler?.dispose();
  bridge?.dispose();
  scheduler = null;
  bridge = null;
}
