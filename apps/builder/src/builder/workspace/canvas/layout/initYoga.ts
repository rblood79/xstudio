/**
 * Yoga 초기화
 *
 * 🚀 Phase 7: @pixi/layout용 Yoga 초기화
 *
 * yoga-layout을 로드하고 @pixi/layout에 설정합니다.
 *
 * @since 2025-01-06 Phase 7
 */

import { loadYoga } from 'yoga-layout/load';
import { setYoga, getYoga } from '@pixi/layout';

let yogaPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Yoga 초기화
 *
 * yoga-layout WASM 모듈을 로드하고 @pixi/layout에 설정합니다.
 * 여러 번 호출해도 한 번만 초기화됩니다.
 */
export async function initYoga(): Promise<void> {
  // 이미 초기화됨
  if (isInitialized && getYoga()) {
    return;
  }

  // 초기화 중
  if (yogaPromise) {
    return yogaPromise;
  }

  yogaPromise = (async () => {
    try {
      const yoga = await loadYoga();
      setYoga(yoga);
      isInitialized = true;
      console.log('🧘 Yoga initialized for @pixi/layout');
    } catch (error) {
      console.error('Failed to initialize Yoga:', error);
      yogaPromise = null;
      throw error;
    }
  })();

  return yogaPromise;
}

/**
 * Yoga 초기화 여부 확인
 */
export function isYogaInitialized(): boolean {
  return isInitialized && getYoga() !== undefined;
}

export default initYoga;
