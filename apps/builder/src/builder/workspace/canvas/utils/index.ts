/**
 * Canvas Utils
 *
 * PixiJS Canvas를 위한 유틸리티 모음
 *
 * @since 2025-12-15
 */

// Border-box 유틸리티
export * from './borderUtils';
export * from './graphicsUtils';

// CSS 변수 읽기
export * from './cssVariableReader';

// GPU 프로파일링
export * from './gpuProfilerCore';

// 메모리 풀링 (Phase E)
export { spritePool, SpritePool } from './SpritePool';

// 캐싱 최적화 (Phase F)
export { useCacheOptimization, useStaticCache } from './useCacheOptimization';
