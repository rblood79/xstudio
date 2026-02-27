/**
 * Rust WASM 모듈 초기화 래퍼
 *
 * wasm-pack --target bundler 출력을 동적 임포트하여 로드한다.
 * Feature Flag가 활성화된 경우에만 init.ts에서 호출된다.
 *
 * 초기화 순서:
 * 1. JS glue 코드 import (class/function export)
 * 2. default export(__wbg_init) 호출로 WASM 바이너리 인스턴스화
 * 3. 유효성 검증 (TaffyLayoutEngine 존재 확인)
 * 4. DEV 모드에서 ping/pong 파이프라인 테스트
 *
 * @see docs/WASM.md §0.1 Rust + wasm-pack 개발 환경
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RustWasmModule = any;

let wasmModule: RustWasmModule | null = null;

export async function initRustWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    // wasm-pack --target bundler 출력을 Vite가 처리하도록 직접 경로 사용
    // vite-plugin-wasm이 .wasm 바이너리 서빙을 담당
    const mod = await import('./pkg/xstudio_wasm');

    // wasm-pack bundler 타겟은 import만으로 내부 wasm 바인딩이 초기화되지 않음
    // default export(__wbg_init)를 명시적으로 호출하여 .wasm 바이너리를
    // fetch → instantiate → __wbg_finalize_init 순서로 초기화해야 함
    if (typeof mod.default === 'function') {
      await (mod.default as unknown as () => Promise<void>)();
    }

    // 모듈 유효성 검증: WASM 바이너리가 완전히 초기화되었는지 확인
    if (!mod || typeof mod.TaffyLayoutEngine !== 'function') {
      wasmModule = null;
      if (import.meta.env.DEV) {
        console.warn('[RustWasm] WASM 모듈 불완전 — TaffyLayoutEngine 미포함, JS 폴백 사용');
      }
      return;
    }

    wasmModule = mod;

    if (import.meta.env.DEV) {
      // 파이프라인 검증: ping/pong 테스트
      const result = mod.ping();
      console.log(`[RustWasm] 초기화 완료 — ping() = "${result}"`);
    }
  } catch (err) {
    wasmModule = null; // HMR 잔류 방지
    if (import.meta.env.DEV) {
      console.warn('[RustWasm] WASM 초기화 실패, JS 폴백 사용:', err);
    }
  }
}

export function getRustWasm(): RustWasmModule | null {
  return wasmModule;
}

export function isRustWasmReady(): boolean {
  return wasmModule !== null;
}
