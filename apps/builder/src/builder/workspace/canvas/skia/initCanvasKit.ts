/**
 * CanvasKit/Skia WASM 초기화
 *
 * canvaskit-wasm npm 패키지를 로드하고 싱글톤 인스턴스를 관리한다.
 * initYoga.ts의 HMR 안전 패턴(window 전역 캐시)을 적용한다.
 *
 * @see docs/WASM.md §5.2 CanvasKit WASM 로드 및 Surface 생성
 */

import type { CanvasKit } from 'canvaskit-wasm';

const CK_GLOBAL_KEY = '__XSTUDIO_CANVASKIT_INSTANCE__';
const CK_PROMISE_KEY = '__XSTUDIO_CANVASKIT_PROMISE__';

declare global {
  interface Window {
    [CK_GLOBAL_KEY]?: CanvasKit;
    [CK_PROMISE_KEY]?: Promise<CanvasKit>;
  }
}

let canvasKit: CanvasKit | null = null;

/**
 * CanvasKit WASM을 비동기 초기화한다.
 *
 * - HMR 시 기존 인스턴스를 재사용하여 중복 초기화를 방지한다.
 * - .wasm 파일은 apps/builder/public/wasm/canvaskit.wasm에서 로드된다.
 *   (scripts/prepare-wasm.mjs가 pnpm install 시 자동 복사)
 */
export async function initCanvasKit(): Promise<CanvasKit> {
  // 1. 모듈 레벨 캐시 확인
  if (canvasKit) return canvasKit;

  // 2. HMR 후 전역에 저장된 인스턴스 복원
  const globalCK = window[CK_GLOBAL_KEY];
  if (globalCK) {
    canvasKit = globalCK;
    return canvasKit;
  }

  // 3. 초기화 중인 Promise 대기 (중복 초기화 방지)
  const existingPromise = window[CK_PROMISE_KEY];
  if (existingPromise) {
    canvasKit = await existingPromise;
    return canvasKit;
  }

  // 4. 새로 초기화
  const promise = (async () => {
    const CanvasKitInit = (await import('canvaskit-wasm')).default;

    // .wasm 파일 경로: apps/builder/public/wasm/canvaskit.wasm
    // Vite의 BASE_URL이 배포 환경에 맞는 prefix를 제공한다.
    const ck = await CanvasKitInit({
      locateFile: (file: string) =>
        `${import.meta.env.BASE_URL}wasm/${file}`,
    });

    return ck;
  })();

  window[CK_PROMISE_KEY] = promise;

  try {
    canvasKit = await promise;
    window[CK_GLOBAL_KEY] = canvasKit;

    if (import.meta.env.DEV) {
      console.log('[CanvasKit] 초기화 완료');
    }

    return canvasKit;
  } catch (error) {
    // Promise 캐시 제거하여 재시도 가능하게 함
    delete window[CK_PROMISE_KEY];
    throw new Error(
      `CanvasKit 초기화 실패. canvaskit.wasm 파일이 존재하는지 확인하세요.\n` +
      `pnpm run prepare:wasm 또는 pnpm install을 실행하세요.\n` +
      `원인: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * 초기화된 CanvasKit 인스턴스를 동기적으로 반환한다.
 *
 * @throws initCanvasKit()이 먼저 호출되지 않았으면 에러
 */
export function getCanvasKit(): CanvasKit {
  if (!canvasKit) {
    throw new Error(
      'CanvasKit이 초기화되지 않았습니다. initCanvasKit()을 먼저 호출하세요.'
    );
  }
  return canvasKit;
}

/**
 * CanvasKit이 초기화되었는지 확인
 */
export function isCanvasKitInitialized(): boolean {
  return canvasKit !== null;
}
