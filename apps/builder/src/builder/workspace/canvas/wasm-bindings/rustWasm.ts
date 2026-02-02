/**
 * Rust WASM 모듈 초기화 래퍼
 *
 * wasm-pack --target bundler 출력을 동적 임포트하여 로드한다.
 * Feature Flag가 활성화된 경우에만 init.ts에서 호출된다.
 *
 * @see docs/WASM.md §0.1 Rust + wasm-pack 개발 환경
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RustWasmModule = any;

let wasmModule: RustWasmModule | null = null;

export async function initRustWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    // Vite 정적 분석을 우회하기 위해 변수 경로 사용.
    // ./pkg/xstudio_wasm은 Rust wasm-pack 빌드 산출물로, Phase 1-2 구현 전까지 존재하지 않는다.
    const path = './pkg/xstudio_wasm';
    const mod = await import(/* @vite-ignore */ path);
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
