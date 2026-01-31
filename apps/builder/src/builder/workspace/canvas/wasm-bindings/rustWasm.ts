/**
 * Rust WASM 모듈 초기화 래퍼
 *
 * wasm-pack --target bundler 출력을 동적 임포트하여 로드한다.
 * Feature Flag가 활성화된 경우에만 init.ts에서 호출된다.
 *
 * @see docs/WASM.md §0.1 Rust + wasm-pack 개발 환경
 */

type RustWasmModule = typeof import('./pkg/xstudio_wasm');

let wasmModule: RustWasmModule | null = null;

export async function initRustWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    const mod = await import('./pkg/xstudio_wasm');
    wasmModule = mod;

    if (import.meta.env.DEV) {
      // 파이프라인 검증: ping/pong 테스트
      const result = mod.ping();
      console.log(`[RustWasm] 초기화 완료 — ping() = "${result}"`);
    }
  } catch (error) {
    console.error('[RustWasm] 초기화 실패:', error);
    throw error;
  }
}

export function getRustWasm(): RustWasmModule | null {
  return wasmModule;
}

export function isRustWasmReady(): boolean {
  return wasmModule !== null;
}
