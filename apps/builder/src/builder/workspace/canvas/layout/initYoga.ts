/**
 * Yoga 초기화
 *
 * 🚀 Phase 7: @pixi/layout용 Yoga 초기화
 * 🔧 HMR 안정성: 전역 상태로 Yoga 인스턴스 보존
 *
 * yoga-layout을 로드하고 @pixi/layout에 설정합니다.
 *
 * @since 2025-01-06 Phase 7
 * @updated 2026-01-28 HMR 안정성 개선
 */

import { loadYoga } from 'yoga-layout/load';
import { setYoga, getYoga } from '@pixi/layout';

/**
 * HMR 시에도 Yoga 인스턴스를 보존하기 위한 전역 키
 *
 * 문제: Vite HMR이 모듈을 다시 로드하면 새 Yoga WASM 인스턴스가 생성됨
 * 이전 인스턴스에서 생성된 Node와 새 인스턴스의 Node가 호환되지 않아
 * "Expected null or instance of Node, got an instance of Node" 에러 발생
 *
 * 해결: window 객체에 Yoga 인스턴스와 Promise를 저장하여 HMR 후에도 재사용
 */
const YOGA_GLOBAL_KEY = '__XSTUDIO_YOGA_INSTANCE__';
const YOGA_PROMISE_KEY = '__XSTUDIO_YOGA_PROMISE__';

interface YogaGlobal {
  [YOGA_GLOBAL_KEY]?: ReturnType<typeof getYoga>;
  [YOGA_PROMISE_KEY]?: Promise<void>;
}

declare const window: Window & YogaGlobal;

/**
 * Yoga 초기화
 *
 * yoga-layout WASM 모듈을 로드하고 @pixi/layout에 설정합니다.
 * 여러 번 호출해도 한 번만 초기화됩니다.
 * HMR 시에도 기존 인스턴스를 재사용합니다.
 */
export async function initYoga(): Promise<void> {
  // 1. @pixi/layout에 이미 설정된 Yoga 확인
  const existingYoga = getYoga();
  if (existingYoga) {
    // 전역에도 저장 (HMR 후 복원용)
    window[YOGA_GLOBAL_KEY] = existingYoga;
    return;
  }

  // 2. HMR 후 전역에 저장된 Yoga 인스턴스 복원
  const globalYoga = window[YOGA_GLOBAL_KEY];
  if (globalYoga) {
    setYoga(globalYoga);
    console.log('🧘 Yoga restored from global (HMR)');
    return;
  }

  // 3. 초기화 중인 Promise가 있으면 대기
  const existingPromise = window[YOGA_PROMISE_KEY];
  if (existingPromise) {
    return existingPromise;
  }

  // 4. 새로 초기화
  const yogaPromise = (async () => {
    try {
      const yoga = await loadYoga();
      setYoga(yoga);
      // 전역에 저장 (HMR 후 복원용)
      window[YOGA_GLOBAL_KEY] = yoga;
      console.log('🧘 Yoga initialized for @pixi/layout');
    } catch (error) {
      console.error('Failed to initialize Yoga:', error);
      window[YOGA_PROMISE_KEY] = undefined;
      throw error;
    }
  })();

  window[YOGA_PROMISE_KEY] = yogaPromise;
  return yogaPromise;
}

/**
 * Yoga 초기화 여부 확인
 */
export function isYogaInitialized(): boolean {
  return getYoga() !== undefined || window[YOGA_GLOBAL_KEY] !== undefined;
}

export default initYoga;
